import { describe, expect, it } from 'vitest';
import { OutlineSchema } from './outline-schema';

const validOutline = {
  point: 'Agentic coding lets a solo dev ship a full game in a weekend.',
  hook: 'I shipped a working browser puzzle game in a weekend using nothing but Claude Code.',
  emotionalCore: 'the thrill of watching an idea become playable overnight',
  flare: 'a screen recording of the first successful level clear, unedited',
  targetAudience: 'developers curious about agentic coding but skeptical it scales past toy demos',
  targetKeyword: 'build browser puzzle game with claude code',
  searchIntent: 'informational' as const,
  postFormula: 'how-i-built-x',
  paragraphs: [
    {
      order: 1,
      topic: 'why a browser puzzle game is a good agentic coding target',
      goal: 'hook' as const,
      paragraphFormula: 'cold-open-scene',
      audienceNote: 'skeptical builders who want proof before buy-in',
      intendedBeat: 'the aha that game dev is now a weekend project',
      ourTake: 'game dev was never the bottleneck, confidence was',
      facts: ['built in one weekend, ~14 hours total'],
      sources: ['https://example.com/projects/browser-puzzle-game-demo'],
      keyword: 'agentic coding',
      links: ['https://demo.example.com'],
      gateGuidance: 'flatness-reviewer: make sure the hour count lands as a real claim, not a stat dump',
      rendersAsProse: true,
    },
  ],
};

describe('OutlineSchema', () => {
  it('parses a valid outline', () => {
    expect(() => OutlineSchema.parse(validOutline)).not.toThrow();
  });

  it('permits extra meta fields', () => {
    const withExtra = { ...validOutline, novelMetaField: 'posts may add fields the schema does not know about' };
    expect(() => OutlineSchema.parse(withExtra)).not.toThrow();
  });

  it('rejects a missing required meta field', () => {
    const { flare, ...bad } = validOutline;
    expect(() => OutlineSchema.parse(bad)).toThrow();
  });

  it('rejects an empty paragraphs array', () => {
    const bad = { ...validOutline, paragraphs: [] };
    expect(() => OutlineSchema.parse(bad)).toThrow();
  });

  it('rejects a paragraph node missing a required field', () => {
    const { order, ...restParagraph } = validOutline.paragraphs[0];
    const bad = { ...validOutline, paragraphs: [restParagraph] };
    expect(() => OutlineSchema.parse(bad)).toThrow();
  });

  it('rejects a paragraph node with an invalid goal value', () => {
    const bad = {
      ...validOutline,
      paragraphs: [{ ...validOutline.paragraphs[0], goal: 'climax' }],
    };
    expect(() => OutlineSchema.parse(bad)).toThrow();
  });

  it('rejects a paragraph node with a non-URL source', () => {
    const bad = {
      ...validOutline,
      paragraphs: [{ ...validOutline.paragraphs[0], sources: ['not-a-url'] }],
    };
    expect(() => OutlineSchema.parse(bad)).toThrow();
  });
});
