import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  gradeKeywordBinding,
  gradeSeoFrontmatterForwarding,
  readFrontmatterFile,
  type PostSeoFrontmatter,
} from './graders';
import { BriefSchema } from '../lib/brief-schema';
import { chosenOpportunity } from './gold/gold-seo-normal.opportunity';

// Binding + forwarding are LLM-prose contracts with no prior test. This is a
// gold-fixture regression seam — it asserts the GRADER + FIXTURE shape, not
// live-LLM obedience at generation time.
const here = dirname(fileURLToPath(import.meta.url));

async function loadBrief(relPath: string) {
  const raw = await readFrontmatterFile(join(here, relPath));
  return BriefSchema.parse(raw);
}

async function loadPost(relPath: string): Promise<PostSeoFrontmatter> {
  return (await readFrontmatterFile(join(here, relPath))) as PostSeoFrontmatter;
}

describe('SEO forwarding contract (Assemble: Brief -> post frontmatter)', () => {
  it('normal path: post frontmatter forwards targetKeyword/secondaryKeywords/searchIntent verbatim', async () => {
    const brief = await loadBrief('gold/gold-seo-normal.brief.md');
    const post = await loadPost('gold/gold-seo-normal.post.md');
    const result = gradeSeoFrontmatterForwarding(brief, post);
    expect(result.pass, result.message).toBe(true);
  });

  it('drip path: discovery is skipped, but forwarding still holds', async () => {
    const brief = await loadBrief('gold/gold-seo-drip.brief.md');
    const post = await loadPost('gold/gold-seo-drip.post.md');
    const result = gradeSeoFrontmatterForwarding(brief, post);
    expect(result.pass, result.message).toBe(true);
  });

  it('mutation check: a flipped targetKeyword fails the grader (normal path)', async () => {
    const brief = await loadBrief('gold/gold-seo-normal.brief.md');
    const post = await loadPost('gold/gold-seo-normal.post.md');
    const mutated = { ...post, targetKeyword: 'some other keyword' };
    expect(gradeSeoFrontmatterForwarding(brief, mutated).pass).toBe(false);
  });

  it('mutation check: a flipped secondaryKeywords array fails the grader (normal path)', async () => {
    const brief = await loadBrief('gold/gold-seo-normal.brief.md');
    const post = await loadPost('gold/gold-seo-normal.post.md');
    const mutated = { ...post, secondaryKeywords: ['unrelated keyword'] };
    expect(gradeSeoFrontmatterForwarding(brief, mutated).pass).toBe(false);
  });

  it('mutation check: a flipped searchIntent fails the grader (normal path)', async () => {
    const brief = await loadBrief('gold/gold-seo-normal.brief.md');
    const post = await loadPost('gold/gold-seo-normal.post.md');
    const mutated = { ...post, searchIntent: 'commercial' };
    expect(gradeSeoFrontmatterForwarding(brief, mutated).pass).toBe(false);
  });

  it('mutation check: a flipped field fails the grader (drip path)', async () => {
    const brief = await loadBrief('gold/gold-seo-drip.brief.md');
    const post = await loadPost('gold/gold-seo-drip.post.md');
    const mutated = { ...post, targetKeyword: 'wrong keyword entirely' };
    expect(gradeSeoFrontmatterForwarding(brief, mutated).pass).toBe(false);
  });
});

describe('Keyword binding contract (refinement: chosen opportunity -> targetKeyword)', () => {
  it('binds targetKeyword to the chosen opportunity keyword verbatim', async () => {
    const brief = await loadBrief('gold/gold-seo-normal.brief.md');
    const result = gradeKeywordBinding(chosenOpportunity, brief.targetKeyword);
    expect(result.pass, result.message).toBe(true);
  });

  it('mutation check: a re-derived (flipped) targetKeyword fails the binding grader', async () => {
    const result = gradeKeywordBinding(chosenOpportunity, 'a re-derived keyword nobody approved');
    expect(result.pass).toBe(false);
  });

  it('mutation check: a flipped chosen-opportunity keyword fails the binding grader', async () => {
    const mutatedOpportunity = { ...chosenOpportunity, keyword: 'a different opportunity entirely' };
    const brief = await loadBrief('gold/gold-seo-normal.brief.md');
    const result = gradeKeywordBinding(mutatedOpportunity, brief.targetKeyword);
    expect(result.pass).toBe(false);
  });
});
