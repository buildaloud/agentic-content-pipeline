import { describe, expect, it } from 'vitest';
import { classifyDisposition, isConverged } from './review-disposition';

describe('classifyDisposition', () => {
  it.each([
    'flatness',
    'formulaic',
    'voice',
    'fact-checker',
    'bullshit-detector',
    'link-integrity',
    'outline-structure',
    'linkedin',
    'email',
    'bluesky',
  ])('classifies %s as gate', (name) => {
    expect(classifyDisposition(name)).toBe('gate');
  });

  it.each(['grammar', 'wordsmith', 'structure'])('classifies %s as auto-apply', (name) => {
    expect(classifyDisposition(name)).toBe('auto-apply');
  });

  it.each([
    'impact',
    'emotion',
    'seo',
    'link-opportunity',
    'meta-content',
    'hook',
  ])('classifies %s as advisory', (name) => {
    expect(classifyDisposition(name)).toBe('advisory');
  });

  it('accepts the -reviewer suffix', () => {
    expect(classifyDisposition('flatness-reviewer')).toBe('gate');
    expect(classifyDisposition('grammar-reviewer')).toBe('auto-apply');
    expect(classifyDisposition('hook-reviewer')).toBe('advisory');
  });

  it.each(['linkedin-reviewer', 'email-reviewer', 'bluesky-reviewer'])(
    'classifies %s as gate (medium-fit axis)',
    (name) => {
      expect(classifyDisposition(name)).toBe('gate');
    },
  );

  it('returns unknown for an unrecognized name', () => {
    expect(classifyDisposition('made-up-reviewer')).toBe('unknown');
  });
});

describe('isConverged', () => {
  it('is true when there are no gate findings and both flags are clear', () => {
    expect(isConverged([], true, true)).toBe(true);
  });

  it('is false when a gate finding remains', () => {
    expect(isConverged([{ location: 'p1' }], true, true)).toBe(false);
  });

  it('is false when safety is not clear', () => {
    expect(isConverged([], false, true)).toBe(false);
  });

  it('is false when banned content is not clear', () => {
    expect(isConverged([], true, false)).toBe(false);
  });
});

describe('isConverged — round sequence simulation', () => {
  it('flips from not-converged to converged across a round 1 -> round 2 sequence', () => {
    const rounds = [
      { gateFindings: [{ location: 'p1' }, { location: 'p3' }], safetyClear: true, bannedClear: true },
      { gateFindings: [], safetyClear: true, bannedClear: true },
    ];

    const results = rounds.map((r) => isConverged(r.gateFindings, r.safetyClear, r.bannedClear));

    expect(results).toEqual([false, true]);
    const convergedRound = results.findIndex(Boolean);
    expect(convergedRound).toBeLessThan(3); // within the round cap
  });
});
