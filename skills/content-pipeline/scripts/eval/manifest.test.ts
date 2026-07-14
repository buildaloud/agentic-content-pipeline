import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gradeBriefFile } from './graders';
import { goldBadDefects } from './gold/manifest';

const here = dirname(fileURLToPath(import.meta.url));
const goldGood = join(here, 'gold/gold-good.brief.md');
const goldBad = join(here, 'gold/gold-bad.brief.md');

// The eval-of-the-eval: every deterministic seeded defect must be caught by its
// expected grader, and the clean brief must throw zero false positives. Runs
// offline (network defects are validated separately via the online runner).
describe('gold brief manifest', () => {
  it('gold-good passes every grader (no false positives)', async () => {
    const results = await gradeBriefFile(goldGood, { offline: true });
    const failed = results.filter((r) => !r.pass);
    expect(failed, JSON.stringify(failed)).toHaveLength(0);
  });

  describe('gold-bad seeded defects are each caught by their grader', () => {
    const deterministic = goldBadDefects.filter((d) => d.layer === 'deterministic' && !d.network);
    for (const defect of deterministic) {
      it(`${defect.id} (${defect.type}/${defect.difficulty}) → ${defect.graderId}`, async () => {
        const results = await gradeBriefFile(goldBad, { offline: true });
        const grader = results.find((r) => r.id === defect.graderId);
        expect(grader, `no grader result with id ${defect.graderId}`).toBeDefined();
        expect(grader!.pass, `${defect.id}: expected ${defect.graderId} to FAIL`).toBe(false);
      });
    }
  });
});
