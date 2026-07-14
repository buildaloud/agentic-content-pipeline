// Minimal, deliberately duplicated content-pipeline.config.json loader.
// The canonical schema + loader lives at
// skills/content-pipeline/scripts/lib/config-schema.ts — this skill ships
// standalone (no cross-skill imports), so this ~15-line walk-up+parse is
// duplicated here on purpose rather than shared.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

export interface ToneConfig {
  contentDir: string;
  toneCorpusDir: string;
}

function findConfigFile(startDir: string): string | null {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, 'content-pipeline.config.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadToneConfig(startDir: string = process.cwd()): ToneConfig {
  const defaults: ToneConfig = { contentDir: join(startDir, 'src', 'content', 'blog'), toneCorpusDir: '' };
  const configPath = findConfigFile(startDir);
  if (!configPath) return defaults;
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8'));
    const base = dirname(configPath);
    const contentDir =
      typeof raw.contentDir === 'string' && raw.contentDir ? join(base, raw.contentDir) : defaults.contentDir;
    const toneCorpusDir = typeof raw.toneCorpusDir === 'string' && raw.toneCorpusDir ? join(base, raw.toneCorpusDir) : '';
    return { contentDir, toneCorpusDir };
  } catch {
    return defaults;
  }
}
