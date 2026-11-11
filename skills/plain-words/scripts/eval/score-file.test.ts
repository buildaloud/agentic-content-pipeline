import { describe, expect, it, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { scoreFile, runCli, AI_SCORE_GATE } from './score-file';

const tmpFiles: string[] = [];

function makeTmpFile(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-file-test-'));
  const file = path.join(dir, 'draft.md');
  fs.writeFileSync(file, content);
  tmpFiles.push(dir);
  return file;
}

afterEach(() => {
  while (tmpFiles.length) fs.rmSync(tmpFiles.pop()!, { recursive: true, force: true });
});

describe('scoreFile', () => {
  it('passes clean, human-sounding prose (below the aiScore gate, no banned hits)', () => {
    const file = makeTmpFile(
      '---\ntitle: fixture\n---\n\nI wrote this by hand. It has short sentences. Some are longer than others, which is normal for a person typing quickly.\n',
    );
    const result = scoreFile(file);
    expect(result.pass).toBe(true);
    expect(result.metrics.banned).toBe(0);
    expect(result.metrics.aiScore).toBeLessThan(AI_SCORE_GATE);
  });

  it('fails a draft containing a permabanned phrase regardless of aiScore', () => {
    const file = makeTmpFile("---\ntitle: fixture\n---\n\nAnd that's the whole point, really.\n");
    const result = scoreFile(file);
    expect(result.pass).toBe(false);
    expect(result.metrics.banned).toBeGreaterThan(0);
  });

  it('strips YAML frontmatter before scoring', () => {
    const file = makeTmpFile('---\ntitle: delve tapestry leverage\n---\n\nA short, plain sentence.\n');
    const result = scoreFile(file);
    expect(result.metrics.aiVocab).toBe(0);
  });

  it('scoreFile passes mode through', () => {
    const file = makeTmpFile('A short, plain sentence.\n');
    expect(scoreFile(file).metrics.mode).toBe('plain');
    expect(scoreFile(file, { mode: 'human' }).metrics.mode).toBe('human');
  });
});

describe('runCli', () => {
  it('main rejects an unknown --mode', () => {
    const file = makeTmpFile('A short, plain sentence.\n');
    const err = console.error;
    console.error = () => {};
    try {
      expect(runCli(['--mode', 'loud', file])).toBe(64);
      expect(runCli([])).toBe(64);
    } finally {
      console.error = err;
    }
  });

  it('exits 1 when any file fails, wherever it sits in the list', () => {
    const clean = makeTmpFile('I wrote this by hand. It has short sentences.\n');
    const banned = makeTmpFile("And that's the whole point, really.\n");
    const log = console.log;
    console.log = () => {};
    try {
      expect(runCli([clean, banned])).toBe(1);
      expect(runCli([banned, clean])).toBe(1);
    } finally {
      console.log = log;
    }
  });

  it('scores every file in the mode it is given and exits 0 when all pass', () => {
    const file = makeTmpFile('I wrote this by hand. It has short sentences.\n');
    const log = console.log;
    const lines: string[] = [];
    console.log = (x: string) => { lines.push(String(x)); };
    try {
      expect(runCli(['--mode', 'human', file, file])).toBe(0);
    } finally {
      console.log = log;
    }
    expect(lines.filter((l) => l.includes('"mode": "human"'))).toHaveLength(2);
  });
});
