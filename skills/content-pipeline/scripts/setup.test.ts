import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  parseAgentFile,
  tomlBasicString,
  tomlBodyLiteral,
  generateCodexAgentToml,
  copySeeds,
  deriveMemoryAgents,
  seedAgentMemory,
  installHarnessCodex,
  buildConfigFromFlags,
  parseArgs,
  resolveImagegenProvider,
  CODEX_MODEL_MAP,
  isInstalledUnderClaudeSkills,
  copyDirNoClobber,
  installSkillsIntoConsumer,
  contentPipelinePaths,
} from './setup';
import { ContentPipelineConfigSchema, loadConfig } from './lib/config-schema';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-setup-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('parseAgentFile', () => {
  it('splits frontmatter and body from a fixture agent file', () => {
    const content = `---
name: fixture-agent
description: A fixture agent for testing.
model: sonnet
effort: high
tools: Read, Write
---

# fixture-agent

Do the thing.
`;
    const { frontmatter, body } = parseAgentFile(content);
    expect(frontmatter.name).toBe('fixture-agent');
    expect(frontmatter.description).toBe('A fixture agent for testing.');
    expect(frontmatter.model).toBe('sonnet');
    expect(body).toContain('# fixture-agent');
    expect(body).toContain('Do the thing.');
  });

  it('throws when there is no frontmatter block', () => {
    expect(() => parseAgentFile('# no frontmatter here')).toThrow(/frontmatter/i);
  });
});

describe('tomlBasicString', () => {
  it('quotes and escapes backslashes and double quotes', () => {
    expect(tomlBasicString('plain')).toBe('"plain"');
    expect(tomlBasicString('has "quotes"')).toBe('"has \\"quotes\\""');
    expect(tomlBasicString('back\\slash')).toBe('"back\\\\slash"');
  });
});

describe('tomlBodyLiteral', () => {
  it('wraps a normal body in a triple-quoted literal string', () => {
    const out = tomlBodyLiteral('line one\nline two\n');
    expect(out.startsWith("'''\n")).toBe(true);
    expect(out.endsWith("'''")).toBe(true);
    expect(out).toContain('line one\nline two');
  });

  it('falls back to an escaped basic multi-line string when the body contains a literal triple-quote', () => {
    const body = "some text with a ''' triple quote inside it\n";
    const out = tomlBodyLiteral(body);
    expect(out.startsWith('"""\n')).toBe(true);
    expect(out.endsWith('"""')).toBe(true);
    expect(out).not.toContain("'''\ntriple");
  });
});

describe('CODEX_MODEL_MAP', () => {
  it('maps each Claude tier to its gpt-5.6 Codex model id', () => {
    expect(CODEX_MODEL_MAP.opus).toBe('gpt-5.6-sol');
    expect(CODEX_MODEL_MAP.sonnet).toBe('gpt-5.6-terra');
    expect(CODEX_MODEL_MAP.haiku).toBe('gpt-5.6-luna');
  });
});

describe('generateCodexAgentToml', () => {
  it('produces a well-formed toml with name, description, and developer_instructions', () => {
    const content = `---
name: fixture-agent
description: A fixture agent for testing.
model: sonnet
effort: high
tools: Read
---

Body text for the fixture agent.
`;
    const toml = generateCodexAgentToml(content, 'references/agents/fixture-agent.md');
    expect(toml).toContain('# generated from references/agents/fixture-agent.md');
    expect(toml).toContain('name="fixture-agent"');
    expect(toml).toContain('description="A fixture agent for testing."');
    expect(toml).toContain('developer_instructions=');
    expect(toml).toContain('Body text for the fixture agent.');
    expect(toml).toContain('model="gpt-5.6-terra"');
    expect(toml).toContain('model_reasoning_effort="high"');
  });

  it('omits the model line when the source tier is unknown or missing, but always emits model_reasoning_effort', () => {
    const content = `---
name: fixture-agent
description: A fixture agent for testing.
tools: Read
---

Body text for the fixture agent.
`;
    const toml = generateCodexAgentToml(content, 'references/agents/fixture-agent.md');
    expect(toml).not.toContain('model=');
    expect(toml).toContain('model_reasoning_effort="high"');
  });

  it('handles a body containing triple single-quotes without producing invalid toml', () => {
    const content = `---
name: fixture-agent
description: A fixture agent.
model: sonnet
effort: high
tools: Read
---

Body with a literal ''' sequence in it.
`;
    const toml = generateCodexAgentToml(content, 'references/agents/fixture-agent.md');
    expect(toml).toContain('developer_instructions="""');
  });
});

describe('copySeeds', () => {
  it('copies new files and skips existing ones without clobbering', () => {
    const seedDir = makeTmpDir();
    const destDir = makeTmpDir();
    fs.writeFileSync(path.join(seedDir, 'a.md'), 'new content a');
    fs.writeFileSync(path.join(seedDir, 'b.md'), 'new content b');
    fs.writeFileSync(path.join(destDir, 'a.md'), 'pre-existing content a');

    const result = copySeeds(seedDir, destDir);

    expect(result.copied).toEqual(['b.md']);
    expect(result.skipped).toEqual(['a.md']);
    expect(fs.readFileSync(path.join(destDir, 'a.md'), 'utf-8')).toBe('pre-existing content a');
    expect(fs.readFileSync(path.join(destDir, 'b.md'), 'utf-8')).toBe('new content b');
  });
});

describe('deriveMemoryAgents', () => {
  it('returns only agents whose file references .claude/agent-memory/', () => {
    const agentsDir = makeTmpDir();
    fs.writeFileSync(
      path.join(agentsDir, 'memory-agent.md'),
      '---\nname: memory-agent\ndescription: has memory\n---\n\nRead your MEMORY.md at `.claude/agent-memory/memory-agent/MEMORY.md`.\n',
    );
    fs.writeFileSync(
      path.join(agentsDir, 'no-memory-agent.md'),
      '---\nname: no-memory-agent\ndescription: no memory\n---\n\nJust do the task, no memory involved.\n',
    );

    const agents = deriveMemoryAgents(agentsDir);

    expect(agents).toEqual(['memory-agent']);
  });
});

describe('seedAgentMemory', () => {
  it('creates MEMORY.md from the template for each agent, skipping existing ones', () => {
    const memoryRoot = makeTmpDir();
    const templateDir = makeTmpDir();
    const templatePath = path.join(templateDir, 'agent-memory-MEMORY.template.md');
    fs.writeFileSync(templatePath, '---\nname: <agent-name>\ndescription: Precedent ledger for <agent-name>.\n---\n');

    fs.mkdirSync(path.join(memoryRoot, 'existing-agent'), { recursive: true });
    fs.writeFileSync(path.join(memoryRoot, 'existing-agent', 'MEMORY.md'), 'already has content');

    const result = seedAgentMemory(['new-agent', 'existing-agent'], templatePath, memoryRoot);

    expect(result.copied).toEqual(['new-agent']);
    expect(result.skipped).toEqual(['existing-agent']);
    const written = fs.readFileSync(path.join(memoryRoot, 'new-agent', 'MEMORY.md'), 'utf-8');
    expect(written).toContain('name: new-agent');
    expect(written).toContain('Precedent ledger for new-agent.');
    expect(fs.readFileSync(path.join(memoryRoot, 'existing-agent', 'MEMORY.md'), 'utf-8')).toBe('already has content');
  });
});

describe('installHarnessCodex', () => {
  it('generates one .toml per agent .md file, skipping already-generated ones', () => {
    const agentsDir = makeTmpDir();
    const destDir = makeTmpDir();
    fs.writeFileSync(
      path.join(agentsDir, 'fixture-agent.md'),
      '---\nname: fixture-agent\ndescription: A fixture agent.\nmodel: sonnet\neffort: high\ntools: Read\n---\n\nBody text.\n',
    );
    fs.writeFileSync(path.join(destDir, 'already-here.toml'), 'name="already-here"\n');

    const result = installHarnessCodex(agentsDir, destDir);

    expect(result.copied).toEqual(['fixture-agent.toml']);
    const written = fs.readFileSync(path.join(destDir, 'fixture-agent.toml'), 'utf-8');
    expect(written).toContain('name="fixture-agent"');
    expect(written).toContain('description="A fixture agent."');
    expect(written).toContain('developer_instructions=');
  });

  it('skips a toml file that already exists (no clobber)', () => {
    const agentsDir = makeTmpDir();
    const destDir = makeTmpDir();
    fs.writeFileSync(
      path.join(agentsDir, 'fixture-agent.md'),
      '---\nname: fixture-agent\ndescription: A fixture agent.\nmodel: sonnet\neffort: high\ntools: Read\n---\n\nBody text.\n',
    );
    fs.writeFileSync(path.join(destDir, 'fixture-agent.toml'), 'name="untouched"\n');

    const result = installHarnessCodex(agentsDir, destDir);

    expect(result.copied).toEqual([]);
    expect(result.skipped).toEqual(['fixture-agent.toml']);
    expect(fs.readFileSync(path.join(destDir, 'fixture-agent.toml'), 'utf-8')).toBe('name="untouched"\n');
  });
});

describe('parseArgs', () => {
  it('parses config flags and comma-separated lists', () => {
    const flags = parseArgs(['--content-dir', 'posts', '--banned-terms', 'foo, bar ,baz', '--yes']);
    expect(flags.contentDir).toBe('posts');
    expect(flags.bannedTerms).toEqual(['foo', 'bar', 'baz']);
    expect(flags.yes).toBe(true);
  });

  it('parses --harness and validates its value', () => {
    const flags = parseArgs(['--harness', 'codex']);
    expect(flags.harness).toBe('codex');
    expect(() => parseArgs(['--harness', 'not-a-real-harness'])).toThrow(/--harness/);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseArgs(['--not-a-real-flag'])).toThrow(/Unknown flag/);
  });
});

describe('buildConfigFromFlags + schema-validate roundtrip', () => {
  it('merges flags onto schema defaults and round-trips through write + loadConfig', () => {
    const defaults = ContentPipelineConfigSchema.parse({});
    const flags = parseArgs([
      '--content-dir',
      'posts',
      '--site-url',
      'https://example.com',
      '--banned-terms',
      'secretproject,codename-x',
      '--hero-provider',
      'none',
    ]);
    const merged = buildConfigFromFlags(flags, defaults);
    const validated = ContentPipelineConfigSchema.parse(merged);

    expect(validated.contentDir).toBe('posts');
    expect(validated.siteUrl).toBe('https://example.com');
    expect(validated.bannedTerms).toEqual(['secretproject', 'codename-x']);
    expect(validated.docsRoot).toBe('docs');

    const dir = makeTmpDir();
    const configPath = path.join(dir, 'content-pipeline.config.json');
    fs.writeFileSync(configPath, JSON.stringify(validated, null, 2) + '\n');

    const { config, path: loadedPath } = loadConfig(dir);
    expect(loadedPath).toBe(configPath);
    expect(config).toEqual(validated);
  });
});

describe('resolveImagegenProvider', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('keeps codex when the command is on PATH', () => {
    const verdict = resolveImagegenProvider('codex', 'OPENAI_API_KEY', { isOnPath: () => true });
    expect(verdict.provider).toBe('codex');
    expect(verdict.ok).toBe(true);
  });

  it('downgrades codex to none when the command is missing from PATH', () => {
    const verdict = resolveImagegenProvider('codex', 'OPENAI_API_KEY', { isOnPath: () => false });
    expect(verdict.provider).toBe('none');
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toMatch(/downgraded/i);
  });

  it('warns but does not downgrade openai-api when the key env var is unset', () => {
    delete process.env.MY_TEST_KEY;
    const verdict = resolveImagegenProvider('openai-api', 'MY_TEST_KEY');
    expect(verdict.provider).toBe('openai-api');
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toMatch(/not set/i);
  });

  it('is ok when the openai-api key env var is set', () => {
    process.env.MY_TEST_KEY = 'sk-fake';
    const verdict = resolveImagegenProvider('openai-api', 'MY_TEST_KEY');
    expect(verdict.provider).toBe('openai-api');
    expect(verdict.ok).toBe(true);
  });

  it('notes the screenshot provider needs a headless browser at run time', () => {
    const verdict = resolveImagegenProvider('screenshot', 'OPENAI_API_KEY');
    expect(verdict.provider).toBe('screenshot');
    expect(verdict.ok).toBe(true);
    expect(verdict.message).toMatch(/headless/i);
  });

  it('is a no-op for provider none', () => {
    const verdict = resolveImagegenProvider('none', 'OPENAI_API_KEY');
    expect(verdict.provider).toBe('none');
    expect(verdict.ok).toBe(true);
  });
});

describe('isInstalledUnderClaudeSkills', () => {
  it('is true when the path runs through a .claude/skills segment', () => {
    const dir = path.join('/repo', '.claude', 'skills', 'content-pipeline', 'scripts');
    expect(isInstalledUnderClaudeSkills(dir)).toBe(true);
  });

  it('is false for a path with no .claude/skills segment (e.g. the npx package cache)', () => {
    const dir = path.join('/repo', 'node_modules', 'agentic-content-pipeline', 'skills', 'content-pipeline', 'scripts');
    expect(isInstalledUnderClaudeSkills(dir)).toBe(false);
  });

  it('is false when .claude appears but is not immediately followed by skills', () => {
    const dir = path.join('/repo', '.claude', 'agent-memory', 'scripts');
    expect(isInstalledUnderClaudeSkills(dir)).toBe(false);
  });
});

describe('copyDirNoClobber', () => {
  it('recursively copies files and directories, skipping existing files', () => {
    const srcDir = makeTmpDir();
    const destDir = makeTmpDir();
    fs.writeFileSync(path.join(srcDir, 'a.md'), 'new a');
    fs.mkdirSync(path.join(srcDir, 'sub'));
    fs.writeFileSync(path.join(srcDir, 'sub', 'b.md'), 'new b');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, 'a.md'), 'pre-existing a');

    const result = copyDirNoClobber(srcDir, destDir);

    expect(result.copied).toEqual([path.join('sub', 'b.md')]);
    expect(result.skipped).toEqual(['a.md']);
    expect(fs.readFileSync(path.join(destDir, 'a.md'), 'utf-8')).toBe('pre-existing a');
    expect(fs.readFileSync(path.join(destDir, 'sub', 'b.md'), 'utf-8')).toBe('new b');
  });

  it('skips a named directory entirely (e.g. node_modules)', () => {
    const srcDir = makeTmpDir();
    const destDir = makeTmpDir();
    fs.mkdirSync(path.join(srcDir, 'node_modules'));
    fs.writeFileSync(path.join(srcDir, 'node_modules', 'junk.js'), 'junk');
    fs.writeFileSync(path.join(srcDir, 'keep.md'), 'keep me');

    const result = copyDirNoClobber(srcDir, destDir, { skipDirs: new Set(['node_modules']) });

    expect(result.copied).toEqual(['keep.md']);
    expect(fs.existsSync(path.join(destDir, 'node_modules'))).toBe(false);
  });
});

describe('installSkillsIntoConsumer', () => {
  it('copies content-pipeline and human-tone skill directories into <consumer>/.claude/skills/', () => {
    const packageDir = makeTmpDir();
    const consumerRoot = makeTmpDir();
    for (const skill of ['content-pipeline', 'human-tone']) {
      const skillDir = path.join(packageDir, 'skills', skill);
      fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `# ${skill}`);
      fs.writeFileSync(path.join(skillDir, 'scripts', 'index.ts'), 'export {}');
      fs.mkdirSync(path.join(skillDir, 'scripts', 'node_modules'), { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'scripts', 'node_modules', 'junk.js'), 'junk');
    }

    const result = installSkillsIntoConsumer(packageDir, consumerRoot);

    expect(result.installed).toBe(true);
    const destContentPipeline = path.join(consumerRoot, '.claude', 'skills', 'content-pipeline');
    const destHumanTone = path.join(consumerRoot, '.claude', 'skills', 'human-tone');
    expect(fs.readFileSync(path.join(destContentPipeline, 'SKILL.md'), 'utf-8')).toBe('# content-pipeline');
    expect(fs.readFileSync(path.join(destHumanTone, 'SKILL.md'), 'utf-8')).toBe('# human-tone');
    expect(fs.existsSync(path.join(destContentPipeline, 'scripts', 'node_modules'))).toBe(false);
  });

  it('no-clobbers a skill file that already exists in the consumer repo', () => {
    const packageDir = makeTmpDir();
    const consumerRoot = makeTmpDir();
    const skillDir = path.join(packageDir, 'skills', 'content-pipeline');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'new content');
    fs.mkdirSync(path.join(packageDir, 'skills', 'human-tone'), { recursive: true });

    const destDir = path.join(consumerRoot, '.claude', 'skills', 'content-pipeline');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, 'SKILL.md'), 'consumer-edited content');

    const result = installSkillsIntoConsumer(packageDir, consumerRoot);

    expect(result.results!['content-pipeline'].skipped).toEqual(['SKILL.md']);
    expect(fs.readFileSync(path.join(destDir, 'SKILL.md'), 'utf-8')).toBe('consumer-edited content');
  });
});

describe('contentPipelinePaths', () => {
  it('derives scripts/assets-seed/references-agents/agent-memory-template paths from a content-pipeline skill dir', () => {
    const paths = contentPipelinePaths('/repo/.claude/skills/content-pipeline');
    expect(paths.scriptsDir).toBe(path.join('/repo/.claude/skills/content-pipeline', 'scripts'));
    expect(paths.assetsSeedDir).toBe(path.join('/repo/.claude/skills/content-pipeline', 'assets', 'seed'));
    expect(paths.referencesAgentsDir).toBe(path.join('/repo/.claude/skills/content-pipeline', 'references', 'agents'));
    expect(paths.agentMemoryTemplate).toBe(
      path.join('/repo/.claude/skills/content-pipeline', 'assets', 'seed', 'agent-memory-MEMORY.template.md'),
    );
  });
});
