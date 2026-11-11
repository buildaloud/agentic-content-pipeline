import { describe, expect, it, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadToneConfig } from './tone-config';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tone-config-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('loadToneConfig', () => {
  it('falls back to defaults when no config file is present', () => {
    const dir = makeTmpDir();
    const config = loadToneConfig(dir);
    expect(config.contentDir).toBe(path.join(dir, 'src', 'content', 'blog'));
    expect(config.toneCorpusDir).toBe('');
  });

  it('reads contentDir and toneCorpusDir from content-pipeline.config.json', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, 'content-pipeline.config.json'),
      JSON.stringify({ contentDir: 'posts', toneCorpusDir: 'corpus' }),
    );
    const config = loadToneConfig(dir);
    expect(config.contentDir).toBe(path.join(dir, 'posts'));
    expect(config.toneCorpusDir).toBe(path.join(dir, 'corpus'));
  });

  it('walks up parent directories to find the config file', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'content-pipeline.config.json'), JSON.stringify({ contentDir: 'posts' }));
    const nested = path.join(dir, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    expect(loadToneConfig(nested).contentDir).toBe(path.join(dir, 'posts'));
  });

  it('falls back to defaults on malformed JSON instead of throwing', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'content-pipeline.config.json'), '{ not valid json');
    expect(() => loadToneConfig(dir)).not.toThrow();
    expect(loadToneConfig(dir).contentDir).toBe(path.join(dir, 'src', 'content', 'blog'));
  });
});
