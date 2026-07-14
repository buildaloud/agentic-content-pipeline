import { describe, it, expect } from 'vitest';
import {
  gradeSchema,
  gradeTitleKeyword,
  gradeMetaKeyword,
  gradeInternalLinks,
  gradeSlugKebab,
  gradeBannedTerms,
  gradeHeadlineVariantsDistinct,
  gradeSourceUrlsReachable,
  runGraders,
} from './graders';
import type { Brief } from '../lib/brief-schema';

const goodBrief: Brief = {
  topic: 'Building AI agents',
  targetKeyword: 'ai agents',
  secondaryKeywords: ['agent framework', 'autonomous ai'],
  searchIntent: 'informational',
  postFormula: 'how-i-built-x',
  seoTitle: 'How to Build AI Agents',
  metaDescription: 'Learn how to build ai agents from scratch in this guide.',
  hook: 'AI agents are changing everything about how we build software.',
  outline: ['What are agents', 'How they work', 'Getting started', 'Conclusion'],
  internalLinks: ['https://example.com/something', '/blog/intro-to-agents'],
  cta: 'Try it now',
  socialBlurb: 'Building ai agents in public. example.com/blog/ai-agents',
  imageConcept: 'A robot assembling building blocks on a dark background',
  marketResearch: [
    { claim: 'AI agents are growing rapidly', sourceUrl: 'https://example.com/ai-report' },
  ],
  keywordRationale: 'High search volume, low competition in the builder niche',
};

describe('gradeSchema', () => {
  it('passes a valid brief', () => {
    expect(gradeSchema(goodBrief).pass).toBe(true);
  });

  it('fails when seoTitle exceeds 60 characters', () => {
    expect(gradeSchema({ ...goodBrief, seoTitle: 'A'.repeat(61) }).pass).toBe(false);
  });

  it('fails when metaDescription exceeds 155 characters', () => {
    expect(gradeSchema({ ...goodBrief, metaDescription: 'B'.repeat(156) }).pass).toBe(false);
  });

  it('fails when marketResearch is empty', () => {
    expect(gradeSchema({ ...goodBrief, marketResearch: [] }).pass).toBe(false);
  });

  it('fails when internalLinks has fewer than 2 items', () => {
    expect(gradeSchema({ ...goodBrief, internalLinks: ['https://example.com'] }).pass).toBe(false);
  });

  it('fails when outline has fewer than 4 items', () => {
    expect(gradeSchema({ ...goodBrief, outline: ['one', 'two', 'three'] }).pass).toBe(false);
  });

  it('fails when marketResearch sourceUrl is not a valid URL', () => {
    expect(
      gradeSchema({ ...goodBrief, marketResearch: [{ claim: 'something', sourceUrl: 'not-a-url' }] }).pass,
    ).toBe(false);
  });

  it('fails when required fields are missing', () => {
    const { topic: _removed, ...rest } = goodBrief;
    expect(gradeSchema(rest).pass).toBe(false);
  });
});

describe('gradeTitleKeyword', () => {
  it('passes when seoTitle contains targetKeyword', () => {
    expect(gradeTitleKeyword(goodBrief).pass).toBe(true);
  });

  it('fails when seoTitle does not contain targetKeyword', () => {
    expect(gradeTitleKeyword({ ...goodBrief, seoTitle: 'Something Completely Different' }).pass).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(gradeTitleKeyword({ ...goodBrief, seoTitle: 'How to Build AI AGENTS Fast', targetKeyword: 'ai agents' }).pass).toBe(true);
  });
});

describe('gradeMetaKeyword', () => {
  it('passes when metaDescription contains targetKeyword', () => {
    expect(gradeMetaKeyword(goodBrief).pass).toBe(true);
  });

  it('fails when metaDescription does not contain targetKeyword', () => {
    expect(gradeMetaKeyword({ ...goodBrief, metaDescription: 'Nothing relevant here at all today.' }).pass).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(gradeMetaKeyword({ ...goodBrief, metaDescription: 'Learn to build AI AGENTS today.' }).pass).toBe(true);
  });
});

describe('gradeInternalLinks', () => {
  it('passes with valid allowlist links', () => {
    expect(gradeInternalLinks(goodBrief).pass).toBe(true);
  });

  it('fails when an absolute URL host is off-allowlist', () => {
    const brief = { ...goodBrief, internalLinks: ['https://example.com/a', 'https://evil.com/page'] };
    expect(gradeInternalLinks(brief).pass).toBe(false);
  });

  it('includes the bad link in the failure message', () => {
    const brief = { ...goodBrief, internalLinks: ['https://example.com/a', 'https://evil.com/page'] };
    expect(gradeInternalLinks(brief).message).toContain('https://evil.com/page');
  });

  it('passes with marketplace subdomain link', () => {
    const brief = { ...goodBrief, internalLinks: ['https://marketplace.example.com/skill', '/blog/foo'] };
    expect(gradeInternalLinks(brief).pass).toBe(true);
  });

  it('passes with a named subdomain link', () => {
    const brief = { ...goodBrief, internalLinks: ['https://demo.example.com/game', '/blog/foo'] };
    expect(gradeInternalLinks(brief).pass).toBe(true);
  });

  it('passes with /projects relative path', () => {
    const brief = { ...goodBrief, internalLinks: ['https://example.com/page', '/projects'] };
    expect(gradeInternalLinks(brief).pass).toBe(true);
  });

  it('passes with /projects/ nested path', () => {
    const brief = { ...goodBrief, internalLinks: ['/blog/post', '/projects/browser-puzzle-game'] };
    expect(gradeInternalLinks(brief).pass).toBe(true);
  });

  it('fails with an off-site relative path', () => {
    const brief = { ...goodBrief, internalLinks: ['https://example.com/a', '/about'] };
    expect(gradeInternalLinks(brief).pass).toBe(false);
  });

  it('honors a custom allowedHosts/allowedRelativePrefixes list (config-driven allowlist)', () => {
    const brief = { ...goodBrief, internalLinks: ['https://consumer-site.dev/a', '/docs/b'] };
    const opts = { allowedHosts: ['consumer-site.dev'], allowedRelativePrefixes: ['/docs/'] };
    expect(gradeInternalLinks(brief, opts).pass).toBe(true);
    expect(gradeInternalLinks(brief).pass).toBe(false);
  });
});

describe('gradeSlugKebab', () => {
  it('passes when no slug is present', () => {
    expect(gradeSlugKebab({ ...goodBrief, slug: undefined }).pass).toBe(true);
  });

  it('passes a valid kebab slug', () => {
    expect(gradeSlugKebab({ ...goodBrief, slug: 'my-post-slug' }).pass).toBe(true);
  });

  it('fails a slug with uppercase letters', () => {
    expect(gradeSlugKebab({ ...goodBrief, slug: 'My-Post' }).pass).toBe(false);
  });

  it('fails a slug with spaces', () => {
    expect(gradeSlugKebab({ ...goodBrief, slug: 'my post slug' }).pass).toBe(false);
  });

  it('fails a slug with more than 8 dash-segments', () => {
    expect(gradeSlugKebab({ ...goodBrief, slug: 'a-b-c-d-e-f-g-h-i' }).pass).toBe(false);
  });

  it('passes a slug with exactly 8 segments', () => {
    expect(gradeSlugKebab({ ...goodBrief, slug: 'a-b-c-d-e-f-g-h' }).pass).toBe(true);
  });
});

describe('gradeBannedTerms', () => {
  it('passes a clean brief', () => {
    expect(gradeBannedTerms(goodBrief).pass).toBe(true);
  });

  it('fails when the default banned term "acme-tool" appears in topic', () => {
    expect(gradeBannedTerms({ ...goodBrief, topic: 'Using the acme-tool approach' }).pass).toBe(false);
  });

  it('fails when "acme tool" (no hyphen) appears in hook', () => {
    expect(gradeBannedTerms({ ...goodBrief, hook: 'The acme tool is a methodology' }).pass).toBe(false);
  });

  it('is case-insensitive for banned terms', () => {
    expect(gradeBannedTerms({ ...goodBrief, cta: 'Try Acme-Tool today' }).pass).toBe(false);
  });

  it('fails when banned term appears in outline item', () => {
    expect(gradeBannedTerms({ ...goodBrief, outline: ['What is it', 'Acme-Tool pattern', 'How to use', 'Summary'] }).pass).toBe(false);
  });

  it('honors a custom bannedTerms list (config-driven, e.g. a consumer\'s private tool name)', () => {
    const brief = { ...goodBrief, topic: 'Using the widget-factory approach' };
    expect(gradeBannedTerms(brief, { bannedTerms: ['widget-factory'] }).pass).toBe(false);
    expect(gradeBannedTerms(brief).pass).toBe(true);
  });
});

describe('gradeHeadlineVariantsDistinct', () => {
  it('passes when headlineVariants is absent', () => {
    expect(gradeHeadlineVariantsDistinct({ ...goodBrief, headlineVariants: undefined }).pass).toBe(true);
  });

  it('passes when all variants are distinct', () => {
    const brief = { ...goodBrief, headlineVariants: ['Title A', 'Title B', 'Title C'] };
    expect(gradeHeadlineVariantsDistinct(brief).pass).toBe(true);
  });

  it('fails when there are duplicate variants', () => {
    const brief = { ...goodBrief, headlineVariants: ['Title A', 'Title B', 'Title A'] };
    expect(gradeHeadlineVariantsDistinct(brief).pass).toBe(false);
  });
});

describe('gradeSourceUrlsReachable', () => {
  it('skips network check when opts.offline is true', async () => {
    const result = await gradeSourceUrlsReachable(goodBrief, { offline: true });
    expect(result.pass).toBe(true);
    expect(result.message).toBe('skipped (offline)');
  });

  it('skips when EVAL_OFFLINE env var is set to "1"', async () => {
    process.env.EVAL_OFFLINE = '1';
    try {
      const result = await gradeSourceUrlsReachable(goodBrief);
      expect(result.pass).toBe(true);
      expect(result.message).toBe('skipped (offline)');
    } finally {
      delete process.env.EVAL_OFFLINE;
    }
  });
});

describe('runGraders', () => {
  it('returns an array with an entry for every grader', async () => {
    const results = await runGraders(goodBrief, { offline: true });
    expect(results.length).toBeGreaterThanOrEqual(8);
    expect(results.every(r => typeof r.id === 'string' && r.id.length > 0)).toBe(true);
    expect(results.every(r => typeof r.pass === 'boolean')).toBe(true);
    expect(results.every(r => typeof r.message === 'string')).toBe(true);
  });

  it('passes all graders for a known-good brief (offline)', async () => {
    const results = await runGraders(goodBrief, { offline: true });
    const failures = results.filter(r => !r.pass);
    expect(failures).toEqual([]);
  });
});
