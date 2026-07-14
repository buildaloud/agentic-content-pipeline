import { gradeBriefFile, type GraderResult } from './graders';

const HARD_GRADERS = new Set([
  'schema',
  'title-keyword',
  'meta-keyword',
  'internal-links',
  'slug-kebab',
  'banned-terms',
  'headline-variants-distinct',
  'source-urls-reachable',
]);

function mark(result: GraderResult): string {
  return result.pass ? '✓' : '✗';
}

async function runFile(filePath: string): Promise<boolean> {
  console.log(`\n${filePath}`);
  let anyHardFail = false;
  try {
    const results = await gradeBriefFile(filePath);
    for (const r of results) {
      console.log(`  ${mark(r)} [${r.id}] ${r.message}`);
      if (!r.pass && HARD_GRADERS.has(r.id)) anyHardFail = true;
    }
  } catch (e) {
    console.error(`  ✗ [error] ${e}`);
    anyHardFail = true;
  }
  return anyHardFail;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: npx tsx run.ts <brief-file...>');
  process.exit(1);
}

let exitCode = 0;
for (const f of files) {
  const failed = await runFile(f);
  if (failed) exitCode = 1;
}
process.exit(exitCode);
