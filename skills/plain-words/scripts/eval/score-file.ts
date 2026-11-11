// Single-file wrapper around tone-grader.ts's scoreText, for CLI use (see
// bin/tone). The multi-file aggregate report lives at run.ts; this is the
// one-shot gate check for a draft.
import { readFileSync } from 'node:fs';
import { scoreText, type ScoreOptions, type ToneMetrics, type ToneMode } from './tone-grader.ts';

// Mirrors the gate documented in skills/plain-words/SKILL.md: shipped prose
// must score aiScore < 15 with zero banned-phrase hits, in either mode.
export const AI_SCORE_GATE = 15;
const USAGE = 'usage: tone [--mode plain|human] <file> [...]';
const MODES: readonly ToneMode[] = ['plain', 'human'];

function stripFrontmatter(md: string): string {
  const m = md.match(/^---\n[\s\S]*?\n---\n?/);
  return (m ? md.slice(m[0].length) : md).trim();
}

export interface FileScoreResult {
  file: string;
  metrics: ToneMetrics;
  pass: boolean;
}

export function scoreFile(filePath: string, opts: ScoreOptions = {}): FileScoreResult {
  const raw = readFileSync(filePath, 'utf-8');
  const body = stripFrontmatter(raw);
  const metrics = scoreText(body, opts);
  const pass = metrics.banned === 0 && metrics.aiScore < AI_SCORE_GATE;
  return { file: filePath, metrics, pass };
}

function parseArgs(argv: string[]): { mode: ToneMode; files: string[] } | null {
  let mode: ToneMode = 'plain';
  const files = [...argv];
  if (files[0] === '--mode') {
    const value = files[1] as ToneMode;
    if (!MODES.includes(value)) return null;
    mode = value;
    files.splice(0, 2);
  }
  return files.length ? { mode, files } : null;
}

// Returns the exit code: 0 when every file passes, 1 when one fails, 64 on bad usage.
export function runCli(argv: string[]): number {
  const args = parseArgs(argv);
  if (!args) {
    console.error(USAGE);
    return 64;
  }
  let code = 0;
  for (const file of args.files) {
    const result = scoreFile(file, { mode: args.mode });
    console.log(JSON.stringify(result, null, 2));
    console.log(result.pass ? 'PASS' : 'FAIL');
    if (!result.pass) code = 1;
  }
  return code;
}

if (process.argv[1]?.endsWith('score-file.ts')) {
  process.exit(runCli(process.argv.slice(2)));
}
