import type { KeywordOpportunitySet } from '../../lib/keyword-opportunity-schema';

type Opportunity = KeywordOpportunitySet['candidates'][number]['opportunities'][number];

// The strongest-ranked opportunity for gold-seo-normal's approved topic —
// binds verbatim into gold-seo-normal.brief.md's targetKeyword (Task 1
// binding contract, see spec §3.3; binding rule per seo-researcher.md).
export const chosenOpportunity: Opportunity = {
  keyword: 'automate shorts with claude code',
  intent: 'informational',
  signals: ['in Google autocomplete', '3 PAA questions'],
  sources: ['https://example.com/blog/terminal-videos'],
  estimate: 'high — recurring PAA cluster',
};
