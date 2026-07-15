import { describe, expect, it } from 'vitest';
import { scoreText } from './tone-grader.ts';

describe('negParallel', () => {
  it('catches the "X isn\'t Y, it\'s Z" negate-then-reframe family', () => {
    const { negParallel } = scoreText("that isn't a process, it's a LARP. and this isn't hard, it's tedious.");
    expect(negParallel).toBeGreaterThanOrEqual(2);
  });

  it('still catches the existing "not just X but Y" pattern (regression)', () => {
    const { negParallel } = scoreText('This is not just a bug fix but a full rewrite.');
    expect(negParallel).toBeGreaterThanOrEqual(1);
  });

  it('fires on causal prose with a bare "it" — accepted tradeoff (parity with humanizer)', () => {
    // accepted tradeoff: the broad reframe regex fires on some causal prose; the judge's ai_crutches axis is the semantic backstop. Parity with humanizer.
    const { negParallel } = scoreText("the code doesn't compile because it has a syntax error.");
    expect(negParallel).toBeGreaterThanOrEqual(1);
  });

  // Pins the humanizer-parity alternation branches (that's / bare-they /
  // they're) so a future accidental re-narrowing of the group is caught.
  it('fires on the "that\'s" reframe branch', () => {
    const { negParallel } = scoreText("This isn't a bug, that's a feature.");
    expect(negParallel).toBeGreaterThanOrEqual(1);
  });

  it('fires on the bare-"they" reframe branch', () => {
    const { negParallel } = scoreText("Those aren't warnings, they clutter the log.");
    expect(negParallel).toBeGreaterThanOrEqual(1);
  });

  it('isolates the negParallel cap via a delta test (cap=24 only)', () => {
    // Structurally matched fixtures: 4 sentences, 5 words each, burstiness=0
    // for both — so this delta isolates negParallelHits.length, not the
    // low-variance burstiness penalty. LOW=2 reframe hits, HIGH=4.
    // At cap=24: 2*6=12 vs 4*6=24 -> delta ~12. At cap=12: both saturate at
    // 12 -> delta 0. A regression to cap=12 collapses this delta to ~0.
    const low = "that isn't magic, it's math. the tests passed without issue. this isn't luck, it's grit. we merged the branch today.";
    const high = "that isn't magic, it's math. this isn't luck, it's grit. it wasn't broken, it's fine. that doesn't help, it's noise.";

    const lowResult = scoreText(low);
    const highResult = scoreText(high);

    expect(lowResult.negParallel).toBe(2);
    expect(highResult.negParallel).toBe(4);
    expect(highResult.aiScore - lowResult.aiScore).toBeGreaterThanOrEqual(10);
  });
});

describe('dramaticInversions', () => {
  it('catches a "By the time..." sentence-initial opener', () => {
    const { dramaticInversions } = scoreText('By the time the draft ships, a dozen reviewers have already read it.');
    expect(dramaticInversions).toBeGreaterThanOrEqual(1);
  });

  it('catches a "Before a single..." sentence-initial opener', () => {
    const { dramaticInversions } = scoreText('Before a single word changes, two reviewers argue it out.');
    expect(dramaticInversions).toBeGreaterThanOrEqual(1);
  });

  it('catches the "<N things> run/happen before <X>" shape', () => {
    const { dramaticInversions } = scoreText('Twelve stages run before one of these posts ships.');
    expect(dramaticInversions).toBeGreaterThanOrEqual(1);
  });

  it('catches "have/has already <verb>" paired with before/by-the-time in the same sentence', () => {
    const { dramaticInversions } = scoreText('A dozen reviewers have already read it before the writer sees a single line.');
    expect(dramaticInversions).toBeGreaterThanOrEqual(1);
  });

  it('does NOT fire on mid-sentence "before"/"by the time" causal prose (calibration: real corpus usage)', () => {
    const { dramaticInversions } = scoreText(
      "Any snapshot I pull at build time is already a little stale by the time it renders on the page. If index doesn't return by the time the scan returns, just use the scan.",
    );
    expect(dramaticInversions).toBe(0);
  });

  it('does NOT fire on bare "already" without "have/has already" (calibration)', () => {
    const { dramaticInversions } = scoreText('The result is already stale by the time it renders.');
    expect(dramaticInversions).toBe(0);
  });

  it('first occurrence is free (0 score contribution); the second adds +6, capped at 18', () => {
    const one = scoreText('By the time this ships, the draft is done. The rest of this sentence is unrelated filler text that pads word count.');
    const two = scoreText(
      'By the time this ships, the draft is done. Before a single reviewer signs off, three edits already landed. The rest of this sentence is unrelated filler text that pads word count.',
    );
    expect(one.dramaticInversions).toBe(1);
    expect(two.dramaticInversions).toBe(2);
    expect(two.aiScore - one.aiScore).toBeGreaterThanOrEqual(6);
  });

  it('caps the contribution at 18 (4+ additional occurrences saturate)', () => {
    const text = [
      'By the time one ships, two land.',
      'By the time two ships, three land.',
      'By the time three ships, four land.',
      'By the time four ships, five land.',
      'By the time five ships, six land.',
    ].join(' ');
    const { dramaticInversions } = scoreText(text);
    expect(dramaticInversions).toBe(5);
    // 5 hits: (5-1)*6 = 24, capped at 18 -- assert via a same-shape lower-count comparison
    const four = scoreText(text.split(' ').slice(0, -8).join(' '));
    expect(four.dramaticInversions).toBeLessThan(5);
  });
});

describe('punchFragments', () => {
  it('catches a ≤3-word prose sentence ending in a period', () => {
    const { punchFragments } = scoreText(
      'This is a long enough sentence to establish some prose context here today. One lane. This is another long filler sentence to round out the paragraph nicely.',
    );
    expect(punchFragments).toBeGreaterThanOrEqual(1);
  });

  it('catches a ≤3-word prose sentence ending in an exclamation point', () => {
    const { punchFragments } = scoreText(
      'This is a long enough sentence to establish some prose context here today. Go look! This is another long filler sentence to round out the paragraph nicely.',
    );
    expect(punchFragments).toBeGreaterThanOrEqual(1);
  });

  it('does NOT count a fragment inside a heading line', () => {
    const { punchFragments } = scoreText('## Go look.\n\nThis is a long enough sentence to establish some prose context in this paragraph today.');
    expect(punchFragments).toBe(0);
  });

  it('does NOT count a fragment inside a list item', () => {
    const { punchFragments } = scoreText('- Go look.\n- One lane.\n\nThis is a long enough sentence to establish some prose context in this paragraph today.');
    expect(punchFragments).toBe(0);
  });

  // Calibrated against a real shipped blog corpus: a naive "first TWO free"
  // threshold blanket-failed clean posts — established bursty prose ("jam a
  // fragment against a run") routinely runs 5-25 short sentences per post.
  // Empirically retuned free-allowance to 10 — see the calibration comment
  // above the score formula in tone-grader.ts.
  const FRAGMENTS = ['Go look.', 'One lane.', 'Wrong lever.', 'Not today.', 'Say less.', 'Ship it.', 'Try again.', 'Stand down.', 'Hold on.', 'Not yet.', 'Fair enough.', 'Worth it.', 'Case closed.', 'Point taken.'];
  // 4-word structural twins of the first 10 FRAGMENTS -- same sentence count and
  // similar length, but each crosses the ≤3-word threshold so none count. Used to
  // isolate the punchFragments delta from the (unrelated) low-burstiness penalty,
  // which is sensitive to sentence-length variance regardless of fragment content.
  const NON_FRAGMENTS = ['Go look at this.', 'One clean simple lane.', 'Wrong lever got pulled.', 'Not today at all.', 'Say less about it.', 'Ship it out now.', 'Try again next time.', 'Stand down right now.', 'Hold on a second.', 'Not yet quite ready.'];
  const opener = 'This is a long filler sentence for prose context that opens this paragraph overall.';

  it('up to 10 fragments are free (0 score contribution) -- matches the established-style ceiling', () => {
    const tenFrag = scoreText([opener, ...FRAGMENTS.slice(0, 10)].join(' '));
    const tenNonFrag = scoreText([opener, ...NON_FRAGMENTS].join(' '));
    expect(tenFrag.punchFragments).toBe(10);
    expect(tenNonFrag.punchFragments).toBe(0);
    expect(tenFrag.aiScore - tenNonFrag.aiScore).toBeLessThan(4);
  });

  it('the 11th fragment adds +1 past the free ceiling', () => {
    const ten = scoreText([opener, ...FRAGMENTS.slice(0, 10)].join(' '));
    const eleven = scoreText([opener, ...FRAGMENTS.slice(0, 11)].join(' '));
    expect(eleven.punchFragments - ten.punchFragments).toBe(1);
    expect(eleven.aiScore - ten.aiScore).toBeGreaterThanOrEqual(1);
  });

  it('caps the contribution at 6 once density is 16+ raw fragments', () => {
    const sixteen = scoreText([opener, ...FRAGMENTS, ...FRAGMENTS.slice(0, 2)].join(' '));
    const thirty = scoreText([opener, ...FRAGMENTS, ...FRAGMENTS, ...FRAGMENTS.slice(0, 2)].join(' '));
    expect(sixteen.punchFragments).toBe(16);
    expect(thirty.punchFragments).toBeGreaterThan(28);
    // both saturate the cap -- ~14 more raw fragments adds far less than the uncapped
    // linear rate (+1 each, which would be +14) would produce; small residual drift
    // comes from the burstiness signal, not punchFragments itself.
    expect(thirty.aiScore - sixteen.aiScore).toBeLessThan(4);
  });
});

describe('salesSpeak', () => {
  it('catches "turbocharge" and its inflected forms', () => {
    const { salesSpeak } = scoreText('This feature will turbocharge your workflow immediately.');
    expect(salesSpeak).toBeGreaterThanOrEqual(1);
  });

  it('catches "unlock" used as a verb', () => {
    const { salesSpeak } = scoreText('This will unlock new capabilities for the whole team.');
    expect(salesSpeak).toBeGreaterThanOrEqual(1);
  });

  it('catches exact pitch-deck phrases: "the whole thesis", "that\'s the bet", "here\'s the kicker", "the best part?"', () => {
    const { salesSpeak } = scoreText("That's the whole thesis. Here's the kicker: the best part? And it works.");
    expect(salesSpeak).toBeGreaterThanOrEqual(3);
  });

  it('does NOT fire on "thesis"/"kicker"/"best part" without the exact pitch-deck phrasing (calibration: real corpus usage)', () => {
    const { salesSpeak } = scoreText(
      "That split is the entire thesis of this post. Then the kicker: it was too slow. The testimonials are the best part.",
    );
    expect(salesSpeak).toBe(0);
  });

  it('catches "chef\'s-kiss"-adjacent superlative stacking (2+ superlatives in one sentence)', () => {
    const { salesSpeak } = scoreText('This is the best, most amazing, absolutely incredible release we have ever shipped.');
    expect(salesSpeak).toBeGreaterThanOrEqual(1);
  });

  it('does NOT fire on a single superlative word alone (calibration: real corpus usage)', () => {
    const { salesSpeak } = scoreText("It's the perfect visual metaphor for the product.");
    expect(salesSpeak).toBe(0);
  });

  it('weights +5 per hit, capped at 15', () => {
    const three = scoreText('This will turbocharge, supercharge, and 10x your results.');
    expect(three.salesSpeak).toBe(3);
    expect(three.aiScore).toBeGreaterThanOrEqual(15);
  });
});

describe('performative-register acceptance: a draft in the rejected register trips the aiScore<15 gate', () => {
  it('combined dramatic-inversion + punch-fragment + sales-speak draft scores well above 15', () => {
    const rejected = [
      'By the time the agent finishes its first pass, a dozen reviewers have already weighed in before a single word ships.',
      'Twelve stages run before one of these posts goes live.',
      'Not even for me. Go look. One lane. Wrong lever.',
      "This will turbocharge your entire workflow and unlock capabilities you didn't know you needed.",
      "That's the whole thesis. Here's the kicker: the best part? And it works.",
    ].join(' ');
    const m = scoreText(rejected);
    expect(m.dramaticInversions).toBeGreaterThanOrEqual(2);
    expect(m.punchFragments).toBeGreaterThanOrEqual(3);
    expect(m.salesSpeak).toBeGreaterThanOrEqual(4);
    expect(m.aiScore).toBeGreaterThanOrEqual(15);
  });
});
