#!/usr/bin/env node
// The npm front door: `npx agentic-content-pipeline <command>`. Routes to
// the TypeScript scripts inside the packaged skills/ via `npx tsx` (tsx is
// a declared dependency of this package, so npx resolves it from the
// installed package's own node_modules).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseCommand(argv) {
  if (argv[0] === '--help' || argv[0] === '-h') return { command: 'help', rest: [] };
  if (argv[0] === '--version') return { command: 'version', rest: [] };
  if (argv[0] === 'setup') return { command: 'setup', rest: argv.slice(1) };
  if (argv[0] === 'tone') return { command: 'tone', rest: argv.slice(1) };
  // No recognized subcommand word — treat the whole argv as setup flags
  // (including the no-args case, so `npx agentic-content-pipeline` alone runs setup).
  return { command: 'setup', rest: argv };
}

export function buildSetupSpawnArgs(packageDir, rest) {
  return ['tsx', path.join(packageDir, 'skills/content-pipeline/scripts/setup.ts'), ...rest];
}

export function buildToneSpawnArgs(packageDir, rest) {
  return ['tsx', path.join(packageDir, 'skills/human-tone/scripts/eval/score-file.ts'), ...rest];
}

function printHelp() {
  console.log(`Usage: agentic-content-pipeline <command> [args]

Commands:
  setup [flags]      Install the content-pipeline + human-tone skills into
                      this repo, register agents, seed config/ledgers.
                      (default command — also runs if you pass no
                      subcommand, or only flags)
  tone <file>         Score one file's aiScore/banned tells against the
                      ship gate (aiScore < 15, banned === 0).

Flags:
  --help, -h          Show this message.
  --version           Print the installed package version.

Run 'agentic-content-pipeline setup --help' for setup's own flags.
`);
}

function printVersion() {
  const pkg = JSON.parse(readFileSync(path.join(PACKAGE_DIR, 'package.json'), 'utf-8'));
  console.log(pkg.version);
}

function main() {
  const { command, rest } = parseCommand(process.argv.slice(2));
  if (command === 'help') {
    printHelp();
    return;
  }
  if (command === 'version') {
    printVersion();
    return;
  }
  const args = command === 'tone' ? buildToneSpawnArgs(PACKAGE_DIR, rest) : buildSetupSpawnArgs(PACKAGE_DIR, rest);
  const result = spawnSync('npx', args, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
