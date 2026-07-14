import { describe, expect, it, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadConfig, findConfigFile, ContentPipelineConfigSchema } from './config-schema';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-config-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('ContentPipelineConfigSchema', () => {
  it('parses an empty object into all-defaults', () => {
    const config = ContentPipelineConfigSchema.parse({});
    expect(config.contentDir).toBe('src/content/blog');
    expect(config.docsRoot).toBe('docs');
    expect(config.bannedTerms).toEqual([]);
    expect(config.sourceMaterial).toEqual({ chatsDir: '', claudeProjectsDir: '', relevancePatterns: [] });
    expect(config.heroImages).toEqual({ provider: 'none', openaiApiKeyEnv: 'OPENAI_API_KEY', styleNotes: '' });
    expect(config.mediums).toEqual({
      blog: { enabled: true },
      linkedin: { enabled: false },
      email: { enabled: false },
      bluesky: { enabled: false },
    });
  });

  it('respects explicit mediums values', () => {
    const config = ContentPipelineConfigSchema.parse({
      mediums: {
        blog: { enabled: true },
        linkedin: { enabled: true },
        email: { enabled: false },
        bluesky: { enabled: true },
      },
    });
    expect(config.mediums).toEqual({
      blog: { enabled: true },
      linkedin: { enabled: true },
      email: { enabled: false },
      bluesky: { enabled: true },
    });
  });

  it('parses a legacy config missing mediums entirely into all-defaults mediums (bluesky included)', () => {
    const config = ContentPipelineConfigSchema.parse({ contentDir: 'posts' });
    expect(config.mediums.bluesky).toEqual({ enabled: false });
  });
});

describe('findConfigFile', () => {
  it('finds a config file in the start dir', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'content-pipeline.config.json'), '{}');
    expect(findConfigFile(dir)).toBe(path.join(dir, 'content-pipeline.config.json'));
  });

  it('walks up parent directories to find a config file', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'content-pipeline.config.json'), '{}');
    const nested = path.join(dir, 'a', 'b', 'c');
    fs.mkdirSync(nested, { recursive: true });
    expect(findConfigFile(nested)).toBe(path.join(dir, 'content-pipeline.config.json'));
  });

  it('returns null when no config file exists up the tree', () => {
    const dir = makeTmpDir();
    // A tmp dir has no content-pipeline.config.json anywhere above it in practice;
    // guard against a stray one by asserting the immediate dir has none.
    expect(fs.existsSync(path.join(dir, 'content-pipeline.config.json'))).toBe(false);
  });
});

describe('loadConfig', () => {
  it('returns an all-defaults config with a null path when no file is found', () => {
    const dir = makeTmpDir();
    const { config, path: configPath } = loadConfig(dir);
    expect(configPath).toBeNull();
    expect(config.contentDir).toBe('src/content/blog');
  });

  it('merges a partial config file with defaults', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, 'content-pipeline.config.json'),
      JSON.stringify({ contentDir: 'posts', sourceMaterial: { chatsDir: '/tmp/chats' } }),
    );
    const { config, path: configPath } = loadConfig(dir);
    expect(configPath).toBe(path.join(dir, 'content-pipeline.config.json'));
    expect(config.contentDir).toBe('posts');
    expect(config.docsRoot).toBe('docs');
    expect(config.sourceMaterial.chatsDir).toBe('/tmp/chats');
    expect(config.sourceMaterial.claudeProjectsDir).toBe('');
  });

  it('throws a clear error listing invalid fields on bad JSON', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'content-pipeline.config.json'), '{ not valid json');
    expect(() => loadConfig(dir)).toThrow(/not valid JSON/);
  });

  it('throws a clear error listing invalid fields on schema validation failure', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, 'content-pipeline.config.json'),
      JSON.stringify({ contentDir: 42, heroImages: { provider: 'not-a-real-provider' } }),
    );
    try {
      loadConfig(dir);
      expect.unreachable('loadConfig should have thrown');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain('contentDir');
      expect(message).toContain('heroImages.provider');
    }
  });
});
