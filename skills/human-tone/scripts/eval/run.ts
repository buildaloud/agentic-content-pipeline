import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { scoreText, type ToneMetrics } from './tone-grader.ts';
import { judgeText, type JudgeResult } from './judge.ts';
import { loadToneConfig } from './tone-config.ts';

// contentDir + toneCorpusDir are consumer-parameterized (config.contentDir /
// config.toneCorpusDir), read from content-pipeline.config.json — never
// hardcoded to this repo's own install location. toneCorpusDir defaults to
// '' (skip) since a human-writing corpus is private by nature and has no
// sane generic default.
const { contentDir: CONTENT_DIR, toneCorpusDir: TONE_CORPUS_DIR } = loadToneConfig();

const DEFAULT_LIMIT = 20;

export function parseArgs(argv: string[]): { since: string | null; limit: number } {
  const sinceIdx = argv.indexOf('--since');
  const since = sinceIdx !== -1 ? (argv[sinceIdx + 1] ?? null) : null;

  const limitIdx = argv.indexOf('--limit');
  const rawLimit = limitIdx !== -1 ? Number(argv[limitIdx + 1]) : NaN;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT;

  return { since, limit };
}

/** Applies --since (a floor date, YYYY-MM-DD, string-compared against date-prefixed filenames) or --limit (most-recent N posts) to a sorted file list. */
export function selectDraftFiles(sortedFiles: string[], opts: { since: string | null; limit: number }): string[] {
  if (opts.since) return sortedFiles.filter((f) => f >= opts.since!);
  return sortedFiles.slice(-opts.limit);
}

function stripFrontmatter(md: string): string {
  const m = md.match(/^---\n[\s\S]*?\n---\n?/);
  return (m ? md.slice(m[0].length) : md).trim();
}

function mean(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0) / (ns.length || 1);
}

export type JudgeOutcome = JudgeResult | { error: string } | null;

/**
 * Optional judge pass, gated on GEMINI_API_KEY. Mirrors judge.ts's own
 * defensive posture: no key -> null (regex-only, no network attempt); a
 * judge failure is caught and surfaced as { error } instead of thrown, so
 * it never takes down the regex scoring loop that calls it per post.
 */
export async function runJudgePass(
  body: string,
  opts: { key?: string; judge?: typeof judgeText } = {},
): Promise<JudgeOutcome> {
  const key = opts.key ?? process.env.GEMINI_API_KEY;
  if (!key) return null;
  const judge = opts.judge ?? judgeText;
  try {
    return await judge(body, key);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Scores the consumer's private, gitignored human corpus (config.toneCorpusDir), if configured and present. */
function scoreHumanCorpus(corpusDir: string): { humanScores: number[]; humanAgg: Record<string, number[]> } {
  const humanScores: number[] = [];
  const humanAgg: Record<string, number[]> = { emDashPer1k: [], tricolons: [], aiVocab: [], hedges: [], signposts: [] };
  if (!corpusDir || !existsSync(corpusDir)) return { humanScores, humanAgg };

  const files = readdirSync(corpusDir).filter((f) => f.endsWith('.txt'));
  const lines = files.flatMap((f) => readFileSync(join(corpusDir, f), 'utf8').split('\n'));
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 25) continue;
    const m = scoreText(t);
    humanScores.push(m.aiScore);
    for (const k of Object.keys(humanAgg)) humanAgg[k].push((m as any)[k]);
  }
  return { humanScores, humanAgg };
}

/** Extra report lines for one draft's judge outcome (0-2 lines). */
function formatJudgeLines(judge: JudgeOutcome): string[] {
  if (!judge) return [];
  if ('error' in judge) return [`       judge: ERROR — ${judge.error}`];
  const verdict = judge.would_a_human_type_this ? 'pass' : 'FAIL';
  const lines = [`       judge: ${judge.score}/10  emotion ${judge.emotion_impact}/10  crutches ${judge.ai_crutches.length}  would-a-human-type-this: ${verdict}`];
  if (judge.would_a_human_type_this && judge.emotion_impact > 3) return lines;
  const worst = judge.worst_lines[0];
  lines.push(`       judge flag: low signal — worst line: ${worst ? `"${worst.quote}" (${worst.why})` : 'n/a'}`);
  return lines;
}

function printReport(opts: {
  humanScores: number[];
  humanAgg: Record<string, number[]>;
  drafts: { slug: string; m: ToneMetrics; judge: JudgeOutcome }[];
  geminiKey?: string;
}): void {
  const { humanScores, humanAgg, drafts, geminiKey } = opts;
  console.log('\n=== AI-TONE EVAL ===\n');
  console.log(`Human corpus (${humanScores.length} snippets)  avg aiScore: ${mean(humanScores).toFixed(1)}`);
  console.log(`  em-dash/1k: ${mean(humanAgg.emDashPer1k).toFixed(2)}  tricolons: ${mean(humanAgg.tricolons).toFixed(2)}  ai-vocab: ${mean(humanAgg.aiVocab).toFixed(2)}`);
  console.log(`\nDrafts (${drafts.length}) ranked most-AI first  avg aiScore: ${mean(drafts.map((d) => d.m.aiScore)).toFixed(1)}\n`);
  if (geminiKey) console.log('Judge pass: ENABLED (GEMINI_API_KEY set) — Gemini score/emotion/crutches shown per post.\n');
  console.log('score  emˣ/1k  tri  hedge  sign  aiVoc  neg  burst  post');
  for (const { slug, m, judge } of drafts) {
    console.log(
      `${String(m.aiScore).padStart(4)}  ${m.emDashPer1k.toFixed(1).padStart(5)}  ${String(m.tricolons).padStart(3)}  ${String(m.hedges).padStart(5)}  ${String(m.signposts).padStart(4)}  ${String(m.aiVocab).padStart(5)}  ${String(m.negParallel).padStart(3)}  ${m.burstiness.toFixed(1).padStart(5)}  ${slug.slice(11)}`,
    );
    for (const line of formatJudgeLines(judge)) console.log(line);
  }
  console.log('\nTop tells in the worst 3 drafts:');
  for (const { slug, m } of drafts.slice(0, 3)) {
    const tells = Object.entries(m.hits).filter(([, v]) => v.length).map(([k, v]) => `${k}(${v.length})`).join(', ');
    console.log(`  ${slug.slice(11)}: ${tells || 'none'}`);
  }
  console.log('');
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.warn('GEMINI_API_KEY not set — judge pass skipped for this run; scores are regex-only (tone-grader.ts).');
  }
  const { humanScores, humanAgg } = scoreHumanCorpus(TONE_CORPUS_DIR);

  const { since, limit } = parseArgs(process.argv.slice(2));
  const allFiles = existsSync(CONTENT_DIR)
    ? readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).sort()
    : [];
  const draftFiles = selectDraftFiles(allFiles, { since, limit });
  if (!since) {
    console.log(
      `No --since given — scoring the ${limit} most recent post(s) (${draftFiles.length} found). Use --since YYYY-MM-DD to score by date instead, or --limit N to change the count.`,
    );
  }
  const drafts: { slug: string; m: ToneMetrics; judge: JudgeOutcome }[] = [];
  for (const f of draftFiles) {
    const body = stripFrontmatter(readFileSync(join(CONTENT_DIR, f), 'utf8'));
    const m = scoreText(body);
    const judge = await runJudgePass(body, { key: geminiKey });
    drafts.push({ slug: f.replace(/\.md$/, ''), m, judge });
  }
  drafts.sort((a, b) => b.m.aiScore - a.m.aiScore);

  printReport({ humanScores, humanAgg, drafts, geminiKey });
}

if (process.argv[1]?.endsWith('run.ts')) {
  main();
}
