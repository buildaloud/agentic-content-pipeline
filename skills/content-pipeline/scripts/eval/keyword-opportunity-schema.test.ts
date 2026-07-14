import { describe, expect, it } from 'vitest';
import { KeywordOpportunitySetSchema } from '../lib/keyword-opportunity-schema';

const validSet = {
  candidates: [
    {
      seedTopic: 'terminal videos as code',
      editorialCluster: 'agentic coding tutorials',
      opportunities: [
        {
          keyword: 'automate shorts with claude code',
          intent: 'informational' as const,
          signals: ['in Google autocomplete', '3 PAA questions'],
          sources: ['https://example.com/blog/terminal-videos'],
          estimate: 'high — recurring PAA cluster',
        },
        {
          keyword: 'record terminal demos for youtube shorts',
          intent: 'commercial' as const,
          signals: ['related search'],
          sources: ['https://example.com/blog/terminal-videos'],
          estimate: 'medium',
        },
      ],
    },
  ],
  cannibalization: [
    { keyword: 'automate shorts with claude code', conflictsWith: 'existing-post-slug' },
  ],
  caveat: 'heuristic until posts carry SEO frontmatter',
};

describe('KeywordOpportunitySetSchema', () => {
  it('parses a valid set', () => {
    expect(() => KeywordOpportunitySetSchema.parse(validSet)).not.toThrow();
  });

  it('rejects an opportunity missing intent', () => {
    const bad = structuredClone(validSet);
    // @ts-expect-error deliberately omitting a required field
    delete bad.candidates[0].opportunities[0].intent;
    expect(() => KeywordOpportunitySetSchema.parse(bad)).toThrow();
  });

  it('rejects an opportunity missing sources', () => {
    const bad = structuredClone(validSet);
    // @ts-expect-error deliberately omitting a required field
    delete bad.candidates[0].opportunities[0].sources;
    expect(() => KeywordOpportunitySetSchema.parse(bad)).toThrow();
  });

  it('rejects an opportunity with an empty sources array', () => {
    const bad = structuredClone(validSet);
    bad.candidates[0].opportunities[0].sources = [];
    expect(() => KeywordOpportunitySetSchema.parse(bad)).toThrow();
  });

  it('rejects an opportunity with a non-URL sources entry', () => {
    const bad = structuredClone(validSet);
    bad.candidates[0].opportunities[0].sources = ['not-a-url'];
    expect(() => KeywordOpportunitySetSchema.parse(bad)).toThrow();
  });

  it('rejects an opportunity with a numeric volume field', () => {
    const bad = structuredClone(validSet) as Record<string, unknown>;
    (bad.candidates as any[])[0].opportunities[0].volume = 12000;
    expect(() => KeywordOpportunitySetSchema.parse(bad)).toThrow();
  });

  it('rejects an opportunity carrying a rank field', () => {
    const bad = structuredClone(validSet) as Record<string, unknown>;
    (bad.candidates as any[])[0].opportunities[0].rank = 1;
    expect(() => KeywordOpportunitySetSchema.parse(bad)).toThrow();
  });

  it('rejects a set missing caveat', () => {
    const bad = structuredClone(validSet) as Record<string, unknown>;
    delete bad.caveat;
    expect(() => KeywordOpportunitySetSchema.parse(bad)).toThrow();
  });

  it('rejects an invalid intent enum value', () => {
    const bad = structuredClone(validSet) as any;
    bad.candidates[0].opportunities[0].intent = 'transactional';
    expect(() => KeywordOpportunitySetSchema.parse(bad)).toThrow();
  });
});
