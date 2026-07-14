import { describe, expect, it, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { scoreFile, AI_SCORE_GATE } from './score-file';

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
});
