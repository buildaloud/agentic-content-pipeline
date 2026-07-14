// Single-file wrapper around tone-grader.ts's scoreText, for CLI use (see
// bin/acp.mjs's `tone <file>` subcommand). The multi-file aggregate report
// lives at run.ts; this is the one-shot ship-gate check for a single draft.
import { readFileSync } from 'node:fs';
import { scoreText, type ToneMetrics } from './tone-grader.ts';

// Mirrors the gate documented in skills/human-tone/SKILL.md: shipped posts
// must score aiScore < 15 with zero banned-phrase hits.
export const AI_SCORE_GATE = 15;

function stripFrontmatter(md: string): string {
  const m = md.match(/^---\n[\s\S]*?\n---\n?/);
  return (m ? md.slice(m[0].length) : md).trim();
}

export interface FileScoreResult {
  file: string;
  metrics: ToneMetrics;
  pass: boolean;
}

export function scoreFile(filePath: string): FileScoreResult {
  const raw = readFileSync(filePath, 'utf-8');
  const body = stripFrontmatter(raw);
  const metrics = scoreText(body);
  const pass = metrics.banned === 0 && metrics.aiScore < AI_SCORE_GATE;
  return { file: filePath, metrics, pass };
}

function main(): void {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: score-file.ts <file>');
    process.exit(1);
    return;
  }
  const result = scoreFile(filePath);
  console.log(JSON.stringify(result, null, 2));
  console.log(result.pass ? 'PASS' : 'FAIL');
  if (!result.pass) process.exit(1);
}

if (process.argv[1]?.endsWith('score-file.ts')) {
  main();
}
