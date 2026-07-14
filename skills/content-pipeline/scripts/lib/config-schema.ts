import { z } from 'zod/v4';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const CONFIG_FILENAME = 'content-pipeline.config.json';

export const HeroImagesConfigSchema = z.object({
  provider: z.enum(['codex', 'openai-api', 'screenshot', 'none']).default('none'),
  openaiApiKeyEnv: z.string().default('OPENAI_API_KEY'),
  styleNotes: z.string().default(''),
});

export const SourceMaterialConfigSchema = z.object({
  chatsDir: z.string().default(''),
  claudeProjectsDir: z.string().default(''),
  relevancePatterns: z.array(z.string()).default([]),
});

// .loose() lets each per-medium object grow future medium-specific options
// (e.g. a posting cadence) without a schema migration.
const MediumConfigSchema = z.object({ enabled: z.boolean() }).loose();

export const MediumsConfigSchema = z.object({
  blog: MediumConfigSchema.default({ enabled: true }),
  linkedin: MediumConfigSchema.default({ enabled: false }),
  email: MediumConfigSchema.default({ enabled: false }),
  bluesky: MediumConfigSchema.default({ enabled: false }),
});

// Fields mirror assets/config.template.json. Everything is optional with a
// sane default so a consumer can start from a partial config and grow it —
// see SKILL.md Step 0 for the interview that produces this file.
export const ContentPipelineConfigSchema = z.object({
  voiceFile: z.string().default(''),
  editorialRulesFile: z.string().default(''),
  contentDir: z.string().default('src/content/blog'),
  docsRoot: z.string().default('docs'),
  siteUrl: z.string().default(''),
  bannedTerms: z.array(z.string()).default([]),
  // .default({}) on a nested object schema returns the literal {} without
  // re-running it through the schema's own field defaults — spell the full
  // default out so an absent key still yields fully-defaulted nested fields.
  sourceMaterial: SourceMaterialConfigSchema.default({ chatsDir: '', claudeProjectsDir: '', relevancePatterns: [] }),
  heroImages: HeroImagesConfigSchema.default({ provider: 'none', openaiApiKeyEnv: 'OPENAI_API_KEY', styleNotes: '' }),
  toneCorpusDir: z.string().default(''),
  statsFile: z.string().default(''),
  mediums: MediumsConfigSchema.default({
    blog: { enabled: true },
    linkedin: { enabled: false },
    email: { enabled: false },
    bluesky: { enabled: false },
  }),
});

export type ContentPipelineConfig = z.infer<typeof ContentPipelineConfigSchema>;

export interface LoadConfigResult {
  config: ContentPipelineConfig;
  /** Absolute path to the config file that was read, or null when none was found (config is all-defaults). */
  path: string | null;
}

/** Walks up from `startDir` (default cwd) looking for content-pipeline.config.json. */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`).join('; ');
}

/**
 * Loads + validates content-pipeline.config.json, walking up from `startDir`
 * (default cwd). No file found -> an all-defaults config (path: null), since
 * every field is optional-with-defaults. Invalid JSON or a field that fails
 * schema validation throws with every offending field listed.
 */
export function loadConfig(startDir?: string): LoadConfigResult {
  const configPath = findConfigFile(startDir);
  if (!configPath) {
    return { config: ContentPipelineConfigSchema.parse({}), path: null };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(
      `${CONFIG_FILENAME} at ${configPath} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const result = ContentPipelineConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`${CONFIG_FILENAME} at ${configPath} failed validation — ${formatIssues(result.error)}`);
  }
  return { config: result.data, path: configPath };
}
