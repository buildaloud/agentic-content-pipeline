import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCommand, buildSetupSpawnArgs, buildToneSpawnArgs } from './acp.mjs';

const BIN_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'acp.mjs');

describe('parseCommand', () => {
  it('defaults to setup when no subcommand is given', () => {
    expect(parseCommand([])).toEqual({ command: 'setup', rest: [] });
  });

  it('routes an explicit "setup" subcommand and passes remaining flags through', () => {
    expect(parseCommand(['setup', '--yes', '--harness', 'codex'])).toEqual({
      command: 'setup',
      rest: ['--yes', '--harness', 'codex'],
    });
  });

  it('treats a bare flag (no subcommand word) as setup flags', () => {
    expect(parseCommand(['--yes'])).toEqual({ command: 'setup', rest: ['--yes'] });
  });

  it('routes "tone <file>"', () => {
    expect(parseCommand(['tone', 'draft.md'])).toEqual({ command: 'tone', rest: ['draft.md'] });
  });

  it('routes --help and --version', () => {
    expect(parseCommand(['--help'])).toEqual({ command: 'help', rest: [] });
    expect(parseCommand(['-h'])).toEqual({ command: 'help', rest: [] });
    expect(parseCommand(['--version'])).toEqual({ command: 'version', rest: [] });
  });
});

describe('buildSetupSpawnArgs', () => {
  it('points tsx at the packaged setup.ts and passes flags through', () => {
    const args = buildSetupSpawnArgs('/pkg', ['--yes', '--harness', 'codex']);
    expect(args).toEqual(['tsx', '/pkg/skills/content-pipeline/scripts/setup.ts', '--yes', '--harness', 'codex']);
  });
});

describe('buildToneSpawnArgs', () => {
  it('points tsx at the packaged score-file.ts and passes the target file through', () => {
    const args = buildToneSpawnArgs('/pkg', ['draft.md']);
    expect(args).toEqual(['tsx', '/pkg/skills/human-tone/scripts/eval/score-file.ts', 'draft.md']);
  });
});

describe('bin/acp.mjs --help (smoke)', () => {
  // Spawning a fresh `node` process in this sandboxed dev environment
  // consistently takes ~4-6s (PATH/shim resolution overhead, not this
  // script) — well past vitest's 5000ms default.
  it(
    'exits 0 and prints usage',
    () => {
      const result = spawnSync('node', [BIN_PATH, '--help'], { encoding: 'utf-8' });
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Usage/i);
      expect(result.stdout).toMatch(/setup/);
      expect(result.stdout).toMatch(/tone/);
    },
    20000,
  );
});
