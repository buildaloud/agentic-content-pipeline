export type Disposition = 'gate' | 'auto-apply' | 'advisory' | 'unknown';

const GATE_REVIEWERS = new Set([
  'flatness',
  'formulaic',
  'voice',
  'fact-checker',
  'bullshit-detector',
  'link-integrity',
  'outline-structure',
  // medium-fit axis: does the rendition actually fit the medium it's for.
  'linkedin',
  'email',
  'bluesky',
]);

const AUTO_APPLY_REVIEWERS = new Set(['grammar', 'wordsmith', 'structure']);

const ADVISORY_REVIEWERS = new Set([
  'impact',
  'emotion',
  'seo',
  'link-opportunity',
  'meta-content',
  'hook',
]);

// hook is advisory by default; the spec escalates it to gate only when the hook
// is missing/broken. That escalation is a caller-side judgment (it needs the
// actual hook content), so it's exposed here as a note rather than baked into
// classifyDisposition.
export const HOOK_ESCALATION_NOTE =
  'hook classifies as advisory here; the caller must escalate to gate when the hook is missing or broken';

function stripReviewerSuffix(reviewerName: string): string {
  return reviewerName.endsWith('-reviewer') ? reviewerName.slice(0, -'-reviewer'.length) : reviewerName;
}

export function classifyDisposition(reviewerName: string): Disposition {
  const name = stripReviewerSuffix(reviewerName);
  if (GATE_REVIEWERS.has(name)) return 'gate';
  if (AUTO_APPLY_REVIEWERS.has(name)) return 'auto-apply';
  if (ADVISORY_REVIEWERS.has(name)) return 'advisory';
  return 'unknown';
}

export function isConverged(gateFindings: unknown[], safetyClear: boolean, bannedClear: boolean): boolean {
  return gateFindings.length === 0 && safetyClear && bannedClear;
}
