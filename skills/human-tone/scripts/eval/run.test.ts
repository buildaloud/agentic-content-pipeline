import { describe, expect, it } from 'vitest';
import { runJudgePass, parseArgs, selectDraftFiles } from './run.ts';
import type { JudgeResult } from './judge.ts';

function makeJudgeResult(overrides: Partial<JudgeResult> = {}): JudgeResult {
  return {
    score: 8,
    verdict: 'test',
    authenticity: 8,
    authenticity_notes: 'test',
    emotion_impact: 8,
    emotion_impact_notes: 'test',
    ai_crutches: [],
    worst_lines: [],
    would_a_human_type_this: true,
    ...overrides,
  };
}

describe('runJudgePass', () => {
  it('returns null and never invokes the judge when no GEMINI_API_KEY is available', async () => {
    // The dev shell may export a real GEMINI_API_KEY; explicitly unset it so
    // this test exercises the "key unset" branch regardless of environment.
    const original = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      let called = false;
      const fakeJudge = async () => {
        called = true;
        return makeJudgeResult();
      };
      const result = await runJudgePass('some post body', { key: undefined, judge: fakeJudge });
      expect(result).toBeNull();
      expect(called).toBe(false);
    } finally {
      if (original !== undefined) process.env.GEMINI_API_KEY = original;
    }
  });

  it('invokes the judge and returns its result when a key is present', async () => {
    const expected = makeJudgeResult({ score: 3, would_a_human_type_this: false });
    const fakeJudge = async () => expected;
    const result = await runJudgePass('some post body', { key: 'fake-key', judge: fakeJudge });
    expect(result).toEqual(expected);
  });

  it('catches a judge failure and returns an error object instead of throwing', async () => {
    const fakeJudge = async () => {
      throw new Error('network down');
    };
    const result = await runJudgePass('some post body', { key: 'fake-key', judge: fakeJudge });
    expect(result).toEqual({ error: 'network down' });
  });
});

describe('parseArgs', () => {
  it('defaults to no --since and a limit of 20 when neither flag is given', () => {
    expect(parseArgs([])).toEqual({ since: null, limit: 20 });
  });

  it('parses --since', () => {
    expect(parseArgs(['--since', '2026-06-01'])).toEqual({ since: '2026-06-01', limit: 20 });
  });

  it('parses --limit', () => {
    expect(parseArgs(['--limit', '5'])).toEqual({ since: null, limit: 5 });
  });

  it('falls back to the default limit when --limit is not a valid positive number', () => {
    expect(parseArgs(['--limit', 'not-a-number']).limit).toBe(20);
    expect(parseArgs(['--limit', '0']).limit).toBe(20);
    expect(parseArgs(['--limit', '-5']).limit).toBe(20);
  });
});

describe('selectDraftFiles', () => {
  const files = ['2026-06-01-a.md', '2026-06-15-b.md', '2026-07-01-c.md', '2026-07-10-d.md'];

  it('filters by --since as a floor date, string-compared against filenames', () => {
    expect(selectDraftFiles(files, { since: '2026-07-01', limit: 20 })).toEqual([
      '2026-07-01-c.md',
      '2026-07-10-d.md',
    ]);
  });

  it('falls back to the most recent N files when no --since is given', () => {
    expect(selectDraftFiles(files, { since: null, limit: 2 })).toEqual(['2026-07-01-c.md', '2026-07-10-d.md']);
  });

  it('returns all files when the limit exceeds the count', () => {
    expect(selectDraftFiles(files, { since: null, limit: 100 })).toEqual(files);
  });
});
