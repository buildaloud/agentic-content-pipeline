/**
 * Ground truth for the eval's gold briefs.
 *
 * gold-good.brief.md has ZERO seeded defects (must pass every deterministic
 * grader and score clean on the judge). gold-bad.brief.md has the defects below,
 * spread across type (missing | wrong | not-good-enough) and difficulty, half
 * caught by the deterministic layer and half only by the LLM judge.
 *
 * Eval success = every deterministic defect is flagged by its expected grader,
 * the judge flags the judge-only defects, and gold-good yields zero false
 * positives. The runner bootstraps against these before the manifest is trusted.
 */

export type DefectType = 'missing' | 'wrong' | 'not-good-enough';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Layer = 'deterministic' | 'judge';

export interface SeededDefect {
  id: string;
  description: string;
  type: DefectType;
  difficulty: Difficulty;
  layer: Layer;
  /** For deterministic defects: the grader function expected to FAIL. */
  graderId?: string;
  /** Deterministic defect that requires a network probe (skipped when offline). */
  network?: boolean;
  location: string;
}

export const goldBadDefects: SeededDefect[] = [
  {
    id: 'D1',
    description: 'targetKeyword "browser puzzle game" is absent from the seoTitle',
    type: 'wrong',
    difficulty: 'easy',
    layer: 'deterministic',
    graderId: 'title-keyword',
    location: 'seoTitle',
  },
  {
    id: 'D2',
    description: 'targetKeyword is absent from the metaDescription',
    type: 'wrong',
    difficulty: 'easy',
    layer: 'deterministic',
    graderId: 'meta-keyword',
    location: 'metaDescription',
  },
  {
    id: 'D3',
    description: 'an internalLink points off the configured allowlist (some-random-unrelated-site.com)',
    type: 'wrong',
    difficulty: 'medium',
    layer: 'deterministic',
    graderId: 'internal-links',
    location: 'internalLinks[1]',
  },
  {
    id: 'D4',
    description: '"acme-tool" (a stand-in for a private tool name) leaks, buried in an outline beat',
    type: 'wrong',
    difficulty: 'medium',
    layer: 'deterministic',
    graderId: 'banned-terms',
    location: 'outline[2]',
  },
  {
    id: 'D5',
    description: 'a marketResearch sourceUrl is well-formed but unreachable (404) — fabricated-research signature',
    type: 'wrong',
    difficulty: 'medium',
    layer: 'deterministic',
    graderId: 'source-urls-reachable',
    network: true,
    location: 'marketResearch[0].sourceUrl',
  },
  {
    id: 'D6',
    description: 'the two headlineVariants are identical (no distinct second option)',
    type: 'missing',
    difficulty: 'easy',
    layer: 'deterministic',
    graderId: 'headline-variants-distinct',
    location: 'headlineVariants',
  },
  {
    id: 'D7',
    description: 'a limp, generic hook ("In this post, we\'ll explore...") — no configured voice, no pull',
    type: 'not-good-enough',
    difficulty: 'hard',
    layer: 'judge',
    location: 'hook',
  },
  {
    id: 'D8',
    description: 'searchIntent mislabeled "commercial" for an informational build log, with a thin keywordRationale',
    type: 'not-good-enough',
    difficulty: 'hard',
    layer: 'judge',
    location: 'searchIntent + keywordRationale',
  },
];
