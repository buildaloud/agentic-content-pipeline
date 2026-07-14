import { describe, expect, it } from 'vitest';
import { BriefSchema } from './brief-schema';

const validBrief = {
  topic: 'Browser puzzle game dev',
  targetKeyword: 'build browser puzzle game with claude code',
  secondaryKeywords: ['agentic coding', 'claude code tutorial', 'ai game dev'],
  searchIntent: 'informational' as const,
  postFormula: 'how-i-built-x' as const,
  seoTitle: 'Build a Browser Puzzle Game with Claude Code',
  metaDescription: 'How I built a playable browser puzzle game using Claude Code in one weekend — with real agentic coding patterns.',
  hook: 'I shipped a working browser puzzle game in a weekend using nothing but Claude Code and a stubborn refusal to write boilerplate.',
  outline: [
    'Why a browser puzzle game makes a great agentic coding target',
    'Setting up the Claude Code workflow',
    'Core game loop implementation',
    'What surprised me about AI-assisted game dev',
  ],
  internalLinks: ['https://demo.example.com', 'https://example.com/projects'],
  cta: 'Play the game at demo.example.com',
  socialBlurb: 'Built a browser puzzle game with Claude Code last weekend. Here is what agentic coding actually feels like at the limit.',
  imageConcept: 'Isometric pixel-art browser puzzle game map with glowing Claude logo as the command tower',
  marketResearch: [
    { claim: "'claude code' searches up 3x YoY", sourceUrl: 'https://trends.google.com/trends/explore?q=claude+code' },
  ],
  keywordRationale: 'High intent from builders who want to see real Claude Code projects end-to-end, not just chat demos.',
};

describe('BriefSchema', () => {
  it('parses a valid brief', () => {
    expect(() => BriefSchema.parse(validBrief)).not.toThrow();
  });

  it('rejects seoTitle longer than 60 chars', () => {
    const bad = { ...validBrief, seoTitle: 'A'.repeat(61) };
    expect(() => BriefSchema.parse(bad)).toThrow();
  });

  it('rejects empty marketResearch', () => {
    const bad = { ...validBrief, marketResearch: [] };
    expect(() => BriefSchema.parse(bad)).toThrow();
  });

  it('rejects marketResearch entry with non-URL sourceUrl', () => {
    const bad = {
      ...validBrief,
      marketResearch: [{ claim: 'some claim', sourceUrl: 'not-a-url' }],
    };
    expect(() => BriefSchema.parse(bad)).toThrow();
  });
});
