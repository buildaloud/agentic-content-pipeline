import { describe, expect, it } from 'vitest';
import { scoreText } from './tone-grader.ts';

describe('negParallel', () => {
  it('catches the "X isn\'t Y, it\'s Z" negate-then-reframe family', () => {
    const { negParallel } = scoreText("that isn't a process, it's a LARP. and this isn't hard, it's tedious.");
    expect(negParallel).toBeGreaterThanOrEqual(2);
  });

  it('still catches the existing "not just X but Y" pattern (regression)', () => {
    const { negParallel } = scoreText('This is not just a bug fix but a full rewrite.');
    expect(negParallel).toBeGreaterThanOrEqual(1);
  });

  it('fires on causal prose with a bare "it" — accepted tradeoff (parity with humanizer)', () => {
    // accepted tradeoff: the broad reframe regex fires on some causal prose; the judge's ai_crutches axis is the semantic backstop. Parity with humanizer.
    const { negParallel } = scoreText("the code doesn't compile because it has a syntax error.");
    expect(negParallel).toBeGreaterThanOrEqual(1);
  });

  // Pins the humanizer-parity alternation branches (that's / bare-they /
  // they're) so a future accidental re-narrowing of the group is caught.
  it('fires on the "that\'s" reframe branch', () => {
    const { negParallel } = scoreText("This isn't a bug, that's a feature.");
    expect(negParallel).toBeGreaterThanOrEqual(1);
  });

  it('fires on the bare-"they" reframe branch', () => {
    const { negParallel } = scoreText("Those aren't warnings, they clutter the log.");
    expect(negParallel).toBeGreaterThanOrEqual(1);
  });

  it('isolates the negParallel cap via a delta test (cap=24 only)', () => {
    // Structurally matched fixtures: 4 sentences, 5 words each, burstiness=0
    // for both — so this delta isolates negParallelHits.length, not the
    // low-variance burstiness penalty. LOW=2 reframe hits, HIGH=4.
    // At cap=24: 2*6=12 vs 4*6=24 -> delta ~12. At cap=12: both saturate at
    // 12 -> delta 0. A regression to cap=12 collapses this delta to ~0.
    const low = "that isn't magic, it's math. the tests passed without issue. this isn't luck, it's grit. we merged the branch today.";
    const high = "that isn't magic, it's math. this isn't luck, it's grit. it wasn't broken, it's fine. that doesn't help, it's noise.";

    const lowResult = scoreText(low);
    const highResult = scoreText(high);

    expect(lowResult.negParallel).toBe(2);
    expect(highResult.negParallel).toBe(4);
    expect(highResult.aiScore - lowResult.aiScore).toBeGreaterThanOrEqual(10);
  });
});
