import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';
import { ContentPipelineConfigSchema, ContentPipelineConfig, CONFIG_FILENAME, findConfigFile, loadConfig } from './lib/config-schema';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..');
// The npm package root: skills/content-pipeline/scripts -> skills/content-pipeline -> skills -> <package root>.
const PACKAGE_DIR = path.resolve(SKILL_DIR, '..', '..');
export const SCRIPTS_DIR = SCRIPT_DIR;
export const ASSETS_SEED_DIR = path.join(SKILL_DIR, 'assets', 'seed');
export const REFERENCES_AGENTS_DIR = path.join(SKILL_DIR, 'references', 'agents');
export const AGENT_MEMORY_TEMPLATE = path.join(ASSETS_SEED_DIR, 'agent-memory-MEMORY.template.md');
const AGENT_MEMORY_MARKER = '.claude/agent-memory/';

// --- Agent frontmatter / TOML generation ---

export interface AgentFrontmatter {
  name: string;
  description: string;
  model?: string;
  effort?: string;
  tools?: string;
  [key: string]: unknown;
}

/**
 * Tier mapping per the package owner (sol↔opus, terra↔sonnet, luna↔haiku). ID
 * format verified against a live codex-cli 0.144.1 config (model =
 * "gpt-5.6-sol"); terra/luna inferred from the same format — run /model in
 * Codex to confirm and edit here if your version differs.
 */
export const CODEX_MODEL_MAP: Record<string, string> = {
  opus: 'gpt-5.6-sol',
  sonnet: 'gpt-5.6-terra',
  haiku: 'gpt-5.6-luna',
};

export function parseAgentFile(content: string): { frontmatter: AgentFrontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('Agent file has no YAML frontmatter block (expected a leading --- ... --- block).');
  }
  const frontmatter = yaml.load(match[1]) as AgentFrontmatter;
  const body = match[2].replace(/^\n+/, '');
  return { frontmatter, body };
}

export function tomlBasicString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

/**
 * TOML multi-line literal strings ('''...''') preserve content verbatim but
 * cannot themselves contain the ''' sequence. A markdown body containing a
 * literal ''' falls back to an escaped basic multi-line string ("""...""").
 */
export function tomlBodyLiteral(body: string): string {
  const trimmed = body.replace(/\s+$/, '') + '\n';
  if (!trimmed.includes("'''")) {
    return `'''\n${trimmed}'''`;
  }
  const escaped = trimmed.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
  return `"""\n${escaped}"""`;
}

export function generateCodexAgentToml(mdContent: string, sourceRelPath: string): string {
  const { frontmatter, body } = parseAgentFile(mdContent);
  const mappedModel = frontmatter.model ? CODEX_MODEL_MAP[frontmatter.model] : undefined;
  const lines = [
    `# generated from ${sourceRelPath} — model mapped from the source tier via CODEX_MODEL_MAP (see setup.ts); reasoning effort pinned high`,
    `name=${tomlBasicString(frontmatter.name)}`,
    `description=${tomlBasicString(frontmatter.description)}`,
    ...(mappedModel ? [`model=${tomlBasicString(mappedModel)}`] : []),
    `model_reasoning_effort=${tomlBasicString('high')}`,
    `developer_instructions=${tomlBodyLiteral(body)}`,
    '',
  ];
  return lines.join('\n');
}

// --- Install-skills step (npx front door: copy this package's skills/ into
// the consumer repo's .claude/skills/ before any other step runs) ---

/** True when `dir` runs through a `.claude/skills` segment — the marker for "already an installed skill" (either a prior run of this installer, or the `npx skills add` flow), vs. running from this package's own source/npx-cache copy. */
export function isInstalledUnderClaudeSkills(dir: string): boolean {
  const parts = path.resolve(dir).split(path.sep);
  const idx = parts.indexOf('.claude');
  return idx !== -1 && parts[idx + 1] === 'skills';
}

export function copyDirNoClobber(src: string, dest: string, opts: { skipDirs?: Set<string> } = {}): CopyResult {
  const skipDirs = opts.skipDirs ?? new Set(['node_modules']);
  fs.mkdirSync(dest, { recursive: true });
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const entry of fs.readdirSync(src, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      const sub = copyDirNoClobber(srcPath, destPath, opts);
      copied.push(...sub.copied.map((f) => path.join(entry.name, f)));
      skipped.push(...sub.skipped.map((f) => path.join(entry.name, f)));
      continue;
    }
    if (fs.existsSync(destPath)) {
      skipped.push(entry.name);
      continue;
    }
    fs.copyFileSync(srcPath, destPath);
    copied.push(entry.name);
  }
  return { copied, skipped };
}

export interface InstallSkillsResult {
  installed: boolean;
  note: string;
  results?: Record<string, CopyResult>;
}

const PACKAGED_SKILLS = ['content-pipeline', 'human-tone'];

/** Copies this package's skills/content-pipeline + skills/human-tone into <consumerRepoRoot>/.claude/skills/, per-file no-clobber, skipping scripts/node_modules. */
export function installSkillsIntoConsumer(packageDir: string, consumerRepoRoot: string): InstallSkillsResult {
  const destRoot = path.join(consumerRepoRoot, '.claude', 'skills');
  const results: Record<string, CopyResult> = {};
  let totalCopied = 0;
  for (const skill of PACKAGED_SKILLS) {
    const result = copyDirNoClobber(path.join(packageDir, 'skills', skill), path.join(destRoot, skill));
    results[skill] = result;
    totalCopied += result.copied.length;
  }
  return {
    installed: true,
    note: totalCopied
      ? `installed ${PACKAGED_SKILLS.join(' + ')} into ${destRoot}`
      : `${PACKAGED_SKILLS.join(' + ')} already present at ${destRoot} (no-clobber; nothing new copied)`,
    results,
  };
}

export interface ContentPipelinePaths {
  skillDir: string;
  scriptsDir: string;
  assetsSeedDir: string;
  referencesAgentsDir: string;
  agentMemoryTemplate: string;
}

/** Every path the rest of setup needs, derived from one content-pipeline skill dir — either the package's own source (not-yet-installed run) or the freshly-installed copy under <consumer>/.claude/skills/content-pipeline. */
export function contentPipelinePaths(skillDir: string): ContentPipelinePaths {
  return {
    skillDir,
    scriptsDir: path.join(skillDir, 'scripts'),
    assetsSeedDir: path.join(skillDir, 'assets', 'seed'),
    referencesAgentsDir: path.join(skillDir, 'references', 'agents'),
    agentMemoryTemplate: path.join(skillDir, 'assets', 'seed', 'agent-memory-MEMORY.template.md'),
  };
}

// --- Repo root / config resolution ---

/** Walks up from `startDir` looking for a `.git` marker. Falls back to `startDir` itself (documented: cwd) when none is found. */
export function findRepoRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(startDir);
    dir = parent;
  }
}

// --- CLI flags ---

export interface CliFlags {
  yes: boolean;
  harness: 'claude' | 'codex' | 'none' | null;
  help: boolean;
  voiceFile?: string;
  editorialRulesFile?: string;
  contentDir?: string;
  docsRoot?: string;
  siteUrl?: string;
  bannedTerms?: string[];
  chatsDir?: string;
  claudeProjectsDir?: string;
  relevancePatterns?: string[];
  heroProvider?: string;
  openaiApiKeyEnv?: string;
  styleNotes?: string;
  toneCorpusDir?: string;
  statsFile?: string;
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = { yes: false, harness: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} requires a value`);
      return v;
    };
    switch (arg) {
      case '--yes':
        flags.yes = true;
        break;
      case '--help':
      case '-h':
        flags.help = true;
        break;
      case '--harness': {
        const v = next();
        if (v !== 'claude' && v !== 'codex' && v !== 'none') {
          throw new Error(`--harness must be one of claude|codex|none, got: ${v}`);
        }
        flags.harness = v;
        break;
      }
      case '--voice-file':
        flags.voiceFile = next();
        break;
      case '--editorial-rules-file':
        flags.editorialRulesFile = next();
        break;
      case '--content-dir':
        flags.contentDir = next();
        break;
      case '--docs-root':
        flags.docsRoot = next();
        break;
      case '--site-url':
        flags.siteUrl = next();
        break;
      case '--banned-terms':
        flags.bannedTerms = splitCsv(next());
        break;
      case '--chats-dir':
        flags.chatsDir = next();
        break;
      case '--claude-projects-dir':
        flags.claudeProjectsDir = next();
        break;
      case '--relevance-patterns':
        flags.relevancePatterns = splitCsv(next());
        break;
      case '--hero-provider':
        flags.heroProvider = next();
        break;
      case '--openai-api-key-env':
        flags.openaiApiKeyEnv = next();
        break;
      case '--style-notes':
        flags.styleNotes = next();
        break;
      case '--tone-corpus-dir':
        flags.toneCorpusDir = next();
        break;
      case '--stats-file':
        flags.statsFile = next();
        break;
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return flags;
}

export function buildConfigFromFlags(flags: CliFlags, base: ContentPipelineConfig): ContentPipelineConfig {
  return {
    ...base,
    voiceFile: flags.voiceFile ?? base.voiceFile,
    editorialRulesFile: flags.editorialRulesFile ?? base.editorialRulesFile,
    contentDir: flags.contentDir ?? base.contentDir,
    docsRoot: flags.docsRoot ?? base.docsRoot,
    siteUrl: flags.siteUrl ?? base.siteUrl,
    bannedTerms: flags.bannedTerms ?? base.bannedTerms,
    sourceMaterial: {
      chatsDir: flags.chatsDir ?? base.sourceMaterial.chatsDir,
      claudeProjectsDir: flags.claudeProjectsDir ?? base.sourceMaterial.claudeProjectsDir,
      relevancePatterns: flags.relevancePatterns ?? base.sourceMaterial.relevancePatterns,
    },
    heroImages: {
      provider: (flags.heroProvider as ContentPipelineConfig['heroImages']['provider']) ?? base.heroImages.provider,
      openaiApiKeyEnv: flags.openaiApiKeyEnv ?? base.heroImages.openaiApiKeyEnv,
      styleNotes: flags.styleNotes ?? base.heroImages.styleNotes,
    },
    toneCorpusDir: flags.toneCorpusDir ?? base.toneCorpusDir,
    statsFile: flags.statsFile ?? base.statsFile,
  };
}

// --- Interactive interview ---

function ask(rl: readline.Interface, label: string, defaultValue: string): Promise<string> {
  const shown = defaultValue ? ` (default: ${defaultValue})` : '';
  return new Promise((resolve) => {
    rl.question(`${label}${shown}: `, (answer) => resolve(answer.trim() || defaultValue));
  });
}

async function askCsv(rl: readline.Interface, label: string, defaultValue: string[]): Promise<string[]> {
  const answer = await ask(rl, `${label} (comma-separated)`, defaultValue.join(','));
  return answer ? splitCsv(answer) : [];
}

export async function runInterview(
  flags: CliFlags,
  base: ContentPipelineConfig,
  io: { input: NodeJS.ReadableStream; output: NodeJS.WritableStream } = { input: process.stdin, output: process.stdout },
): Promise<ContentPipelineConfig> {
  const pre = buildConfigFromFlags(flags, base);
  const rl = readline.createInterface({ input: io.input, output: io.output });
  try {
    const voiceFile = await ask(rl, 'voiceFile — path to your writing-voice doc (optional)', pre.voiceFile);
    const editorialRulesFile = await ask(rl, 'editorialRulesFile — path to house editorial rules (optional)', pre.editorialRulesFile);
    const contentDir = await ask(rl, 'contentDir — where posts live', pre.contentDir);
    const docsRoot = await ask(rl, 'docsRoot — where this pipeline keeps its own working docs', pre.docsRoot);
    const siteUrl = await ask(rl, 'siteUrl — your site\'s public URL', pre.siteUrl);
    const bannedTerms = await askCsv(rl, 'bannedTerms — strings that must never appear in published content', pre.bannedTerms);
    const chatsDir = await ask(rl, 'sourceMaterial.chatsDir — chat-log source directory (optional)', pre.sourceMaterial.chatsDir);
    const claudeProjectsDir = await ask(
      rl,
      'sourceMaterial.claudeProjectsDir — Claude projects directory (optional)',
      pre.sourceMaterial.claudeProjectsDir,
    );
    const relevancePatterns = await askCsv(rl, 'sourceMaterial.relevancePatterns', pre.sourceMaterial.relevancePatterns);
    const heroProvider = await ask(rl, 'heroImages.provider — codex | openai-api | screenshot | none', pre.heroImages.provider);
    const openaiApiKeyEnv = await ask(rl, 'heroImages.openaiApiKeyEnv — env var holding the OpenAI key', pre.heroImages.openaiApiKeyEnv);
    const styleNotes = await ask(rl, 'heroImages.styleNotes — free text on visual style (optional)', pre.heroImages.styleNotes);
    const toneCorpusDir = await ask(rl, 'toneCorpusDir — corpus for calibrating tone baselines (optional)', pre.toneCorpusDir);
    const statsFile = await ask(rl, 'statsFile — JSON stats file with per-post performance data (optional)', pre.statsFile);

    return {
      voiceFile,
      editorialRulesFile,
      contentDir,
      docsRoot,
      siteUrl,
      bannedTerms,
      sourceMaterial: { chatsDir, claudeProjectsDir, relevancePatterns },
      heroImages: {
        provider: heroProvider as ContentPipelineConfig['heroImages']['provider'],
        openaiApiKeyEnv,
        styleNotes,
      },
      toneCorpusDir,
      statsFile,
    };
  } finally {
    rl.close();
  }
}

// --- Imagegen validation ---

export interface ImagegenVerdict {
  provider: ContentPipelineConfig['heroImages']['provider'];
  ok: boolean;
  message: string;
}

export function checkCommandOnPath(cmd: string): boolean {
  const result = spawnSync('command', ['-v', cmd], { shell: true });
  return result.status === 0;
}

export function resolveImagegenProvider(
  provider: ContentPipelineConfig['heroImages']['provider'],
  openaiApiKeyEnv: string,
  deps: { isOnPath?: (cmd: string) => boolean } = {},
): ImagegenVerdict {
  const isOnPath = deps.isOnPath ?? checkCommandOnPath;
  switch (provider) {
    case 'codex': {
      if (isOnPath('codex')) {
        return { provider: 'codex', ok: true, message: 'heroImages.provider=codex — `codex` found on PATH.' };
      }
      return {
        provider: 'none',
        ok: false,
        message:
          'heroImages.provider=codex — `codex` CLI not found on PATH; downgraded to "none". Install/configure it and re-run setup, or edit content-pipeline.config.json directly.',
      };
    }
    case 'openai-api': {
      if (process.env[openaiApiKeyEnv]) {
        return { provider: 'openai-api', ok: true, message: `heroImages.provider=openai-api — ${openaiApiKeyEnv} is set.` };
      }
      return {
        provider: 'openai-api',
        ok: false,
        message: `heroImages.provider=openai-api — ${openaiApiKeyEnv} is not set. Provider left as-is; the key may be added later.`,
      };
    }
    case 'screenshot':
      return {
        provider: 'screenshot',
        ok: true,
        message: 'heroImages.provider=screenshot — needs a headless Chrome/Playwright available at run time (not checked here).',
      };
    case 'none':
    default:
      return { provider: 'none', ok: true, message: 'heroImages.provider=none — hero image generation disabled.' };
  }
}

// --- Seeding ---

export interface CopyResult {
  copied: string[];
  skipped: string[];
}

export function copySeeds(seedDir: string, destDir: string): CopyResult {
  fs.mkdirSync(destDir, { recursive: true });
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const file of fs.readdirSync(seedDir).sort()) {
    const src = path.join(seedDir, file);
    if (fs.statSync(src).isDirectory()) continue;
    const dest = path.join(destDir, file);
    if (fs.existsSync(dest)) {
      skipped.push(file);
      continue;
    }
    fs.copyFileSync(src, dest);
    copied.push(file);
  }
  return { copied, skipped };
}

/** Grep-derived roster: an agent is memory-backed iff its file mentions the .claude/agent-memory/ path — self-correcting as agents are added/edited. */
export function deriveMemoryAgents(agentsDir: string): string[] {
  const agents: string[] = [];
  for (const file of fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
    if (content.includes(AGENT_MEMORY_MARKER)) agents.push(path.basename(file, '.md'));
  }
  return agents;
}

export function seedAgentMemory(agents: string[], templatePath: string, agentMemoryRoot: string): CopyResult {
  const template = fs.readFileSync(templatePath, 'utf-8');
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const agent of agents) {
    const dir = path.join(agentMemoryRoot, agent);
    const dest = path.join(dir, 'MEMORY.md');
    if (fs.existsSync(dest)) {
      skipped.push(agent);
      continue;
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, template.replaceAll('<agent-name>', agent));
    copied.push(agent);
  }
  return { copied, skipped };
}

// --- Harness registration ---

export function installHarnessClaude(agentsDir: string, destDir: string): CopyResult {
  fs.mkdirSync(destDir, { recursive: true });
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const file of fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()) {
    const dest = path.join(destDir, file);
    if (fs.existsSync(dest)) {
      skipped.push(file);
      continue;
    }
    fs.copyFileSync(path.join(agentsDir, file), dest);
    copied.push(file);
  }
  return { copied, skipped };
}

export function installHarnessCodex(agentsDir: string, destDir: string, sourceRelPrefix = 'references/agents'): CopyResult {
  fs.mkdirSync(destDir, { recursive: true });
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const file of fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()) {
    const mdContent = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
    const { frontmatter } = parseAgentFile(mdContent);
    const destFile = `${frontmatter.name}.toml`;
    const dest = path.join(destDir, destFile);
    if (fs.existsSync(dest)) {
      skipped.push(destFile);
      continue;
    }
    fs.writeFileSync(dest, generateCodexAgentToml(mdContent, `${sourceRelPrefix}/${file}`));
    copied.push(destFile);
  }
  return { copied, skipped };
}

// --- Deps ---

export function runNpmInstall(cwd: string): { ok: boolean; message: string } {
  const result = spawnSync('npm', ['install'], { cwd, stdio: 'pipe', encoding: 'utf-8', timeout: 120000 });
  if (result.status === 0) {
    return { ok: true, message: `npm install succeeded in ${cwd}` };
  }
  const detail = result.error ? result.error.message : (result.stderr || '').trim().split('\n').slice(-3).join(' ');
  return {
    ok: false,
    message: `npm install failed in ${cwd} (${detail || `exit ${result.status}`}). Run it manually: cd ${cwd} && npm install`,
  };
}

// --- CLI orchestration ---

interface ActionLog {
  step: string;
  status: string;
  detail: string;
}

function printUsage(): void {
  console.log(`Usage: npx tsx setup.ts [flags]

Deterministic install/setup for the content-pipeline skill: writes
content-pipeline.config.json, validates the hero-image provider, seeds
working ledgers + per-agent memory, installs runtime deps, and optionally
registers the reference agents with a harness. Safe to re-run (idempotent,
no-clobber on every file it writes except the deps install).

Config flags (each also promptable interactively when the config is missing):
  --voice-file <path>
  --editorial-rules-file <path>
  --content-dir <path>              (default: src/content/blog)
  --docs-root <path>                (default: docs)
  --site-url <url>
  --banned-terms <a,b,c>
  --chats-dir <path>
  --claude-projects-dir <path>
  --relevance-patterns <a,b,c>
  --hero-provider <codex|openai-api|screenshot|none>
  --openai-api-key-env <ENV_VAR>    (default: OPENAI_API_KEY)
  --style-notes <text>
  --tone-corpus-dir <path>
  --stats-file <path>

Other flags:
  --yes                             Skip the interview; use flags + schema defaults.
  --harness <claude|codex|none>     Register reference agents natively.
  --help                            Show this message.

Config is written to the consumer repo root, found by walking up for a
.git marker from the current directory; falls back to the current directory
itself when no .git is found.
`);
}

function printSummary(actions: ActionLog[]): void {
  console.log('\n=== setup summary ===');
  for (const a of actions) {
    console.log(`[${a.status}] ${a.step} — ${a.detail}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let flags: CliFlags;
  try {
    flags = parseArgs(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
    return;
  }
  if (flags.help) {
    printUsage();
    return;
  }

  const actions: ActionLog[] = [];
  const startDir = process.cwd();
  const existingConfigPath = findConfigFile(startDir);
  const repoRoot = existingConfigPath ? path.dirname(existingConfigPath) : findRepoRoot(startDir);

  // Install-skills step runs FIRST: if we're not already an installed skill
  // (the npx-skills-add layout, or a prior run of this installer), this is
  // the npx front door — copy skills/content-pipeline + skills/human-tone
  // from the package into <repoRoot>/.claude/skills/, then operate on that
  // installed copy for every step below.
  const alreadyInstalled = isInstalledUnderClaudeSkills(SCRIPT_DIR);
  const installResult = alreadyInstalled
    ? { installed: false, note: `running from an installed skill at ${SCRIPT_DIR} — skipping self-install` }
    : installSkillsIntoConsumer(PACKAGE_DIR, repoRoot);
  actions.push({
    step: 'install-skills',
    status: alreadyInstalled ? 'skipped' : installResult.note.startsWith('installed') ? 'installed' : 'no-op',
    detail: installResult.note,
  });
  const paths = contentPipelinePaths(
    alreadyInstalled ? SKILL_DIR : path.join(repoRoot, '.claude', 'skills', 'content-pipeline'),
  );

  let config: ContentPipelineConfig;
  if (existingConfigPath) {
    config = loadConfig(startDir).config;
    actions.push({ step: 'config', status: 'skipped', detail: `existing config at ${existingConfigPath}` });
  } else {
    const defaults = ContentPipelineConfigSchema.parse({});
    const useInterview = !flags.yes && Boolean((process.stdin as NodeJS.ReadStream).isTTY);
    const built = useInterview ? await runInterview(flags, defaults) : buildConfigFromFlags(flags, defaults);
    config = ContentPipelineConfigSchema.parse(built);
    const configPath = path.join(repoRoot, CONFIG_FILENAME);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    actions.push({ step: 'config', status: 'written', detail: configPath });
  }

  const verdict = resolveImagegenProvider(config.heroImages.provider, config.heroImages.openaiApiKeyEnv);
  console.log(verdict.message);
  if (verdict.provider !== config.heroImages.provider) {
    config.heroImages.provider = verdict.provider;
    if (!existingConfigPath) {
      const configPath = path.join(repoRoot, CONFIG_FILENAME);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    }
  }
  actions.push({ step: 'imagegen', status: verdict.ok ? 'ok' : 'warning', detail: verdict.message });

  const docsLedgerDir = path.join(repoRoot, config.docsRoot, 'content-pipeline');
  const seedResult = copySeeds(paths.assetsSeedDir, docsLedgerDir);
  actions.push({
    step: 'seeds',
    status: seedResult.copied.length ? 'copied' : 'no-op',
    detail: `copied: [${seedResult.copied.join(', ')}] skipped (exists): [${seedResult.skipped.join(', ')}]`,
  });

  const memoryAgents = deriveMemoryAgents(paths.referencesAgentsDir);
  const memoryResult = seedAgentMemory(memoryAgents, paths.agentMemoryTemplate, path.join(repoRoot, '.claude', 'agent-memory'));
  actions.push({
    step: 'agent-memory',
    status: memoryResult.copied.length ? 'seeded' : 'no-op',
    detail: `seeded: [${memoryResult.copied.join(', ')}] skipped (exists): [${memoryResult.skipped.join(', ')}]`,
  });

  const depsResult = runNpmInstall(paths.scriptsDir);
  actions.push({ step: 'deps', status: depsResult.ok ? 'ok' : 'warning', detail: depsResult.message });
  if (!depsResult.ok) console.error(depsResult.message);

  if (flags.harness === 'claude') {
    const r = installHarnessClaude(paths.referencesAgentsDir, path.join(repoRoot, '.claude', 'agents'));
    actions.push({
      step: 'harness:claude',
      status: r.copied.length ? 'registered' : 'no-op',
      detail: `registered: [${r.copied.join(', ')}] skipped (exists): [${r.skipped.join(', ')}]`,
    });
  } else if (flags.harness === 'codex') {
    const r = installHarnessCodex(paths.referencesAgentsDir, path.join(repoRoot, '.codex', 'agents'));
    actions.push({
      step: 'harness:codex',
      status: r.copied.length ? 'generated' : 'no-op',
      detail: `generated: [${r.copied.join(', ')}] skipped (exists): [${r.skipped.join(', ')}]`,
    });
  } else {
    actions.push({
      step: 'harness',
      status: 'skipped',
      detail: 'no --harness given; prompt-file dispatch (Agent tool + references/agents/*.md) works without registration',
    });
  }

  printSummary(actions);
}

if (process.argv[1] && process.argv[1].endsWith('setup.ts')) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
