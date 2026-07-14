import { readFile } from 'node:fs/promises';
import { load as loadYaml } from 'js-yaml';
import { BriefSchema, type Brief } from '../lib/brief-schema';

export type GraderResult = { id: string; pass: boolean; message: string };
export type GraderOpts = {
  offline?: boolean;
  allowedHosts?: string[];
  allowedRelativePrefixes?: string[];
  bannedTerms?: string[];
};

// Allowed hosts + relative prefixes for internal links. Consumers wire their
// real domain allowlist in via content-pipeline.config.json (siteUrl +
// any subdomains/marketplace listings) and pass it through GraderOpts; the
// generic examples below are only the fallback for standalone/offline use.
const DEFAULT_ALLOWED_HOSTS = ['example.com', 'marketplace.example.com', 'demo.example.com'];
const DEFAULT_ALLOWED_RELATIVE_PREFIXES = ['/blog/', '/projects'];

// Banned strings (case-insensitive). Consumers supply their own list via
// config.bannedTerms (e.g. a private tool/product name that must never leak
// into published content); the default below is just an illustrative example.
const DEFAULT_BANNED_TERMS = ['acme-tool', 'acme tool'];

export function gradeSchema(raw: unknown): GraderResult {
  const result = BriefSchema.safeParse(raw);
  if (result.success) return { id: 'schema', pass: true, message: 'schema valid' };
  return {
    id: 'schema',
    pass: false,
    message: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}

export function gradeTitleKeyword(brief: Brief): GraderResult {
  const pass = brief.seoTitle.toLowerCase().includes(brief.targetKeyword.toLowerCase());
  return {
    id: 'title-keyword',
    pass,
    message: pass
      ? 'keyword found in seoTitle'
      : `"${brief.targetKeyword}" not found in seoTitle`,
  };
}

export function gradeMetaKeyword(brief: Brief): GraderResult {
  const pass = brief.metaDescription.toLowerCase().includes(brief.targetKeyword.toLowerCase());
  return {
    id: 'meta-keyword',
    pass,
    message: pass
      ? 'keyword found in metaDescription'
      : `"${brief.targetKeyword}" not found in metaDescription`,
  };
}

function isAllowedLink(link: string, allowedHosts: string[], allowedRelativePrefixes: string[]): boolean {
  if (allowedRelativePrefixes.some(p => link.startsWith(p))) return true;
  try {
    return allowedHosts.includes(new URL(link).host);
  } catch {
    return false;
  }
}

export function gradeInternalLinks(brief: Brief, opts?: GraderOpts): GraderResult {
  const allowedHosts = opts?.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;
  const allowedRelativePrefixes = opts?.allowedRelativePrefixes ?? DEFAULT_ALLOWED_RELATIVE_PREFIXES;
  if (brief.internalLinks.length < 2) {
    return { id: 'internal-links', pass: false, message: 'fewer than 2 internalLinks' };
  }
  const bad = brief.internalLinks.filter(l => !isAllowedLink(l, allowedHosts, allowedRelativePrefixes));
  if (bad.length > 0) {
    return { id: 'internal-links', pass: false, message: `off-allowlist links: ${bad.join(', ')}` };
  }
  return { id: 'internal-links', pass: true, message: 'all links valid' };
}

export function gradeSlugKebab(brief: Brief): GraderResult {
  if (!brief.slug) return { id: 'slug-kebab', pass: true, message: 'no slug (optional)' };
  const kebabRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabRe.test(brief.slug)) {
    return { id: 'slug-kebab', pass: false, message: `slug "${brief.slug}" is not lowercase kebab` };
  }
  const segments = brief.slug.split('-');
  if (segments.length > 8) {
    return { id: 'slug-kebab', pass: false, message: `slug has ${segments.length} segments (max 8)` };
  }
  return { id: 'slug-kebab', pass: true, message: 'slug is valid kebab' };
}

export function gradeBannedTerms(brief: Brief, opts?: GraderOpts): GraderResult {
  const bannedTerms = opts?.bannedTerms ?? DEFAULT_BANNED_TERMS;
  const fields = [
    brief.topic,
    brief.targetKeyword,
    ...brief.secondaryKeywords,
    brief.seoTitle,
    brief.metaDescription,
    brief.slug ?? '',
    brief.hook,
    ...brief.outline,
    ...brief.internalLinks,
    brief.cta,
    brief.socialBlurb,
    brief.imageConcept,
    ...brief.marketResearch.map(r => `${r.claim} ${r.sourceUrl}`),
    brief.keywordRationale,
    ...(brief.headlineVariants ?? []),
  ];
  const haystack = fields.join(' ').toLowerCase();
  const found = bannedTerms.filter(t => haystack.includes(t.toLowerCase()));
  if (found.length > 0) {
    return { id: 'banned-terms', pass: false, message: `banned terms found: ${found.join(', ')}` };
  }
  return { id: 'banned-terms', pass: true, message: 'no banned terms' };
}

export type PostSeoFrontmatter = {
  targetKeyword?: unknown;
  secondaryKeywords?: unknown;
  searchIntent?: unknown;
};

// Assemble-forwarding contract: post frontmatter's SEO fields must equal the
// Brief's verbatim — no re-derivation.
export function gradeSeoFrontmatterForwarding(
  brief: Pick<Brief, 'targetKeyword' | 'secondaryKeywords' | 'searchIntent'>,
  postFrontmatter: PostSeoFrontmatter,
): GraderResult {
  const mismatches: string[] = [];
  if (postFrontmatter.targetKeyword !== brief.targetKeyword) {
    mismatches.push(
      `targetKeyword: brief=${JSON.stringify(brief.targetKeyword)} post=${JSON.stringify(postFrontmatter.targetKeyword)}`,
    );
  }
  const briefSecondary = JSON.stringify(brief.secondaryKeywords);
  const postSecondary = JSON.stringify(postFrontmatter.secondaryKeywords);
  if (briefSecondary !== postSecondary) {
    mismatches.push(`secondaryKeywords: brief=${briefSecondary} post=${postSecondary}`);
  }
  if (postFrontmatter.searchIntent !== brief.searchIntent) {
    mismatches.push(
      `searchIntent: brief=${JSON.stringify(brief.searchIntent)} post=${JSON.stringify(postFrontmatter.searchIntent)}`,
    );
  }
  if (mismatches.length > 0) {
    return { id: 'seo-frontmatter-forwarding', pass: false, message: mismatches.join('; ') };
  }
  return {
    id: 'seo-frontmatter-forwarding',
    pass: true,
    message: 'targetKeyword/secondaryKeywords/searchIntent forwarded verbatim',
  };
}

// Discovery-binding contract: refinement's targetKeyword must equal the
// chosen opportunity's keyword, not a re-derivation. See spec §3.3 + §9 risk.
export function gradeKeywordBinding(
  chosenOpportunity: { keyword: string },
  briefTargetKeyword: string,
): GraderResult {
  const pass = chosenOpportunity.keyword === briefTargetKeyword;
  return {
    id: 'keyword-binding',
    pass,
    message: pass
      ? 'targetKeyword bound to chosen opportunity keyword'
      : `targetKeyword "${briefTargetKeyword}" does not match chosen opportunity keyword "${chosenOpportunity.keyword}"`,
  };
}

export function gradeHeadlineVariantsDistinct(brief: Brief): GraderResult {
  if (!brief.headlineVariants || brief.headlineVariants.length === 0) {
    return { id: 'headline-variants-distinct', pass: true, message: 'no headlineVariants (optional)' };
  }
  const unique = new Set(brief.headlineVariants);
  if (unique.size < brief.headlineVariants.length) {
    return { id: 'headline-variants-distinct', pass: false, message: 'duplicate headlineVariants found' };
  }
  return { id: 'headline-variants-distinct', pass: true, message: 'all headlineVariants distinct' };
}

export async function gradeSourceUrlsReachable(
  brief: Brief,
  opts?: GraderOpts,
): Promise<GraderResult> {
  if (opts?.offline || process.env.EVAL_OFFLINE === '1') {
    return { id: 'source-urls-reachable', pass: true, message: 'skipped (offline)' };
  }
  const failures: string[] = [];
  for (const item of brief.marketResearch) {
    try {
      let res = await fetch(item.sourceUrl, { method: 'HEAD' });
      if (!res.ok) res = await fetch(item.sourceUrl, { method: 'GET' });
      if (res.status >= 400) failures.push(`${item.sourceUrl}: ${res.status}`);
    } catch (e) {
      failures.push(`${item.sourceUrl}: unreachable (${e})`);
    }
  }
  if (failures.length > 0) {
    return { id: 'source-urls-reachable', pass: false, message: failures.join('; ') };
  }
  return { id: 'source-urls-reachable', pass: true, message: 'all source URLs reachable' };
}

export async function runGraders(raw: unknown, opts?: GraderOpts): Promise<GraderResult[]> {
  const schemaResult = gradeSchema(raw);
  if (!schemaResult.pass) {
    return [schemaResult];
  }
  const brief = raw as Brief;
  return [
    schemaResult,
    gradeTitleKeyword(brief),
    gradeMetaKeyword(brief),
    gradeInternalLinks(brief, opts),
    gradeSlugKebab(brief),
    gradeBannedTerms(brief, opts),
    gradeHeadlineVariantsDistinct(brief),
    await gradeSourceUrlsReachable(brief, opts),
  ];
}

function parseFrontmatterYaml(yaml: string): Record<string, unknown> {
  const parsed = loadYaml(yaml);
  if (parsed === null || typeof parsed !== 'object') return {};
  return parsed as Record<string, unknown>;
}

export async function readFrontmatterFile(filePath: string): Promise<Record<string, unknown>> {
  const content = await readFile(filePath, 'utf-8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`no YAML frontmatter found in ${filePath}`);
  return parseFrontmatterYaml(match[1]);
}

export async function gradeBriefFile(filePath: string, opts?: GraderOpts): Promise<GraderResult[]> {
  const raw = await readFrontmatterFile(filePath);
  return runGraders(raw, opts);
}
