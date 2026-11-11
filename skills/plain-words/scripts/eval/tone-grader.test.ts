import { describe, expect, it } from 'vitest';
import { scoreText, WEIGHTS } from './tone-grader.ts';

const HUMAN = { mode: 'human' } as const;

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

    const lowResult = scoreText(low, HUMAN);
    const highResult = scoreText(high, HUMAN);

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
    const one = scoreText('By the time this ships, the draft is done. The rest of this sentence is unrelated filler text that pads word count.', HUMAN);
    const two = scoreText(
      'By the time this ships, the draft is done. Before a single reviewer signs off, three edits already landed. The rest of this sentence is unrelated filler text that pads word count.',
      HUMAN,
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
  // Empirically retuned free-allowance to 10.
  const FRAGMENTS = ['Go look.', 'One lane.', 'Wrong lever.', 'Not today.', 'Say less.', 'Ship it.', 'Try again.', 'Stand down.', 'Hold on.', 'Not yet.', 'Fair enough.', 'Worth it.', 'Case closed.', 'Point taken.'];
  // 4-word structural twins of the first 10 FRAGMENTS -- same sentence count and
  // similar length, but each crosses the ≤3-word threshold so none count. Used to
  // isolate the punchFragments delta from the (unrelated) low-burstiness penalty,
  // which is sensitive to sentence-length variance regardless of fragment content.
  const NON_FRAGMENTS = ['Go look at this.', 'One clean simple lane.', 'Wrong lever got pulled.', 'Not today at all.', 'Say less about it.', 'Ship it out now.', 'Try again next time.', 'Stand down right now.', 'Hold on a second.', 'Not yet quite ready.'];
  const opener = 'This is a long filler sentence for prose context that opens this paragraph overall.';

  it('up to 10 fragments are free (0 score contribution) -- matches the established-style ceiling', () => {
    const tenFrag = scoreText([opener, ...FRAGMENTS.slice(0, 10)].join(' '), HUMAN);
    const tenNonFrag = scoreText([opener, ...NON_FRAGMENTS].join(' '), HUMAN);
    expect(tenFrag.punchFragments).toBe(10);
    expect(tenNonFrag.punchFragments).toBe(0);
    expect(tenFrag.aiScore - tenNonFrag.aiScore).toBeLessThan(4);
  });

  it('the 11th fragment adds +1 past the free ceiling', () => {
    const ten = scoreText([opener, ...FRAGMENTS.slice(0, 10)].join(' '), HUMAN);
    const eleven = scoreText([opener, ...FRAGMENTS.slice(0, 11)].join(' '), HUMAN);
    expect(eleven.punchFragments - ten.punchFragments).toBe(1);
    expect(eleven.aiScore - ten.aiScore).toBeGreaterThanOrEqual(1);
  });

  it('human mode charges more for fragments past the free 10 than plain mode', () => {
    const many = scoreText([opener, ...FRAGMENTS, ...FRAGMENTS.slice(0, 4)].join(' '), HUMAN);
    const plain = scoreText([opener, ...FRAGMENTS, ...FRAGMENTS.slice(0, 4)].join(' '));
    expect(many.punchFragments).toBe(18);
    expect(WEIGHTS.human.punchFragments.cap).toBe(6);
    expect(WEIGHTS.plain.punchFragments.cap).toBe(2);
    expect(many.aiScore).toBeGreaterThan(plain.aiScore);
  });

  it('caps the contribution at 6 once density is 16+ raw fragments', () => {
    const sixteen = scoreText([opener, ...FRAGMENTS, ...FRAGMENTS.slice(0, 2)].join(' '), HUMAN);
    const thirty = scoreText([opener, ...FRAGMENTS, ...FRAGMENTS, ...FRAGMENTS.slice(0, 2)].join(' '), HUMAN);
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
    const three = scoreText('This will turbocharge, supercharge, and 10x your results.', HUMAN);
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
    const m = scoreText(rejected, HUMAN);
    expect(m.dramaticInversions).toBeGreaterThanOrEqual(2);
    expect(m.punchFragments).toBeGreaterThanOrEqual(3);
    expect(m.salesSpeak).toBeGreaterThanOrEqual(4);
    expect(m.aiScore).toBeGreaterThanOrEqual(15);
  });
});

const READING_ONLY = [
  'That work then met a real customer after the launch on Tuesday.',
  'As noted above, the cache sat on one small node for the whole week.',
  "Here's the kicker: we never measured the load before the release went out.",
  'The fix moved the cache to its own host with twice the memory.',
  'That is the right standard to hold.',
].join(' ');
const FORMATTING_ONLY = [
  'We moved the cache to its own host — the old node kept falling over at noon.',
  'We tuned reads, writes, and evictions over two days.',
  'Then we checked logs, alerts, and dashboards again.',
  'It held. Good. Done.',
  'The p99 dropped — it sits near 140ms now — and it stayed there all week.',
].join(' ');

describe('modes', () => {
  it('mode defaults to plain', () => {
    expect(scoreText('The cache holds two gigabytes.').mode).toBe('plain');
    expect(scoreText('The cache holds two gigabytes.', HUMAN).mode).toBe('human');
  });

  it('plain mode weighs reading tells over formatting tells', () => {
    expect(scoreText(READING_ONLY).aiScore).toBeGreaterThan(scoreText(FORMATTING_ONLY).aiScore);
  });

  it('human mode scores formatting tells higher than plain mode', () => {
    // em-dash 22 - 6 plus rule-of-three 8 - 2: at least 20 points apart.
    expect(scoreText(FORMATTING_ONLY, HUMAN).aiScore - scoreText(FORMATTING_ONLY).aiScore).toBeGreaterThanOrEqual(20);
  });

  it('human mode keeps today\'s em-dash and rule-of-three weights', () => {
    const dashes = 'We moved the cache to its own host — the old node kept falling over — and it held after that week.';
    const lists = 'We tuned reads, writes, and evictions. We checked logs, alerts, and dashboards. We paged ops, infra, and support.';
    expect(scoreText(dashes, HUMAN).aiScore).toBeGreaterThanOrEqual(22);
    expect(scoreText(dashes).aiScore).toBe(6);
    expect(scoreText(lists, HUMAN).aiScore - scoreText(lists).aiScore).toBeGreaterThanOrEqual(9);
  });

  it('no human weight is below its plain weight', () => {
    for (const [k, plain] of Object.entries(WEIGHTS.plain)) {
      const human = (WEIGHTS.human as Record<string, typeof plain>)[k];
      for (const field of Object.keys(plain) as (keyof typeof plain)[]) {
        if (field === 'free' || field === 'below' || field === 'minSize') continue;
        expect(human[field], `${k}.${String(field)}`).toBeGreaterThanOrEqual(plain[field] as number);
      }
    }
  });

  it('human mode extends plain mode', () => {
    const samples = [
      READING_ONLY,
      FORMATTING_ONLY,
      'I wrote this by hand. It has short sentences. Some are longer than others, which is normal for a person typing quickly.',
      "that isn't magic, it's math. the tests passed without issue. this isn't luck, it's grit. we merged the branch today.",
    ];
    for (const x of samples) {
      expect(scoreText(x, HUMAN).aiScore).toBeGreaterThanOrEqual(scoreText(x).aiScore);
    }
  });

  it('plain mode turns off the burstiness, contraction and start-diversity penalties', () => {
    const uniform = Array.from({ length: 14 }, (_, i) => `The tool reads file number ${i + 1} and writes one line.`).join(' ');
    expect(scoreText(uniform).aiScore).toBe(0);
    expect(scoreText(uniform, HUMAN).aiScore).toBeGreaterThan(0);
  });

  it('banned phrase fails in both modes', () => {
    expect(scoreText("And that's the whole point.").aiScore).toBe(100);
    expect(scoreText("And that's the whole point.", HUMAN).aiScore).toBe(100);
  });
});

describe('narratorVoice', () => {
  it('fires on document talk and empty transitions', () => {
    expect(scoreText('That work then met a real customer.').narratorVoice).toBe(1);
    expect(scoreText('As noted above, the cache is small.').narratorVoice).toBe(1);
  });

  it('does not fire on a plain factual sentence', () => {
    expect(scoreText('The cache holds two gigabytes.').narratorVoice).toBe(0);
  });

  it('"it\'s worth noting" scores once, as a hedge', () => {
    const m = scoreText("It's worth noting that the cache is cold on the first run.");
    expect(m.hedges).toBe(1);
    expect(m.narratorVoice).toBe(0);
  });
});

describe('abstractOpeners', () => {
  it('fires on a habitual-present opener about a person', () => {
    const m = scoreText('Marcus checks his own numbers before anyone else has to.\n\nTobias argues for conditions the whole team needs.', HUMAN);
    expect(m.abstractOpeners).toBe(2);
  });

  it('skips copula, quantifier and time-noun openers', () => {
    const m = scoreText('Marcus is the only IC on the team.\n\nTwo products now depend on the cache.\n\nTwenty minutes later, the cache filled.', HUMAN);
    expect(m.abstractOpeners).toBe(0);
  });

  it('skips headings and list items', () => {
    expect(scoreText('## Marcus checks numbers\n\n- Tobias argues for conditions.', HUMAN).abstractOpeners).toBe(0);
  });

  it('plain mode counts only a pronoun subject; human mode keeps named subjects', () => {
    const named = 'Marcus checks his own numbers before anyone else has to.';
    expect(scoreText(named).abstractOpeners).toBe(0);
    expect(scoreText(named, HUMAN).abstractOpeners).toBe(1);
    expect(scoreText('He checks his own numbers before anyone else has to.').abstractOpeners).toBe(1);
    expect(scoreText('They pass on main.').abstractOpeners).toBe(0);
  });

  it('does not fire on real technical docs in plain mode', () => {
    const docs = [
      'Use this when the user asks about a topic.',
      'Session IDs can be the full UUID or just the first 8 characters.',
      'Claude owns the state in consuming repositories.',
      'Composition runs one way.',
      'Available modules:\n- `shell` - Zsh config and theme',
    ].join('\n\n');
    expect(scoreText(docs).abstractOpeners).toBe(0);
  });

  it('human mode counts every opener plain mode counts', () => {
    const openers = ['He checks his own numbers first.', 'She argues for the team.', 'He also runs the standup.'];
    for (const x of openers) {
      expect(scoreText(x).abstractOpeners).toBe(1);
      expect(scoreText(x, HUMAN).abstractOpeners).toBeGreaterThanOrEqual(scoreText(x).abstractOpeners);
    }
  });

  it('skips a function word ending in s after the subject, in both modes', () => {
    expect(scoreText('Use this when the user asks.', HUMAN).abstractOpeners).toBe(0);
  });

  it('does not fire on present-tense system descriptions', () => {
    const text = 'It returns null when the file is missing.\n\nThe tests pass on main.\n\nThis skill reads the glossary.';
    expect(scoreText(text, HUMAN).abstractOpeners).toBe(0);
    expect(scoreText(text).abstractOpeners).toBe(0);
  });
});

describe('verdictClosers', () => {
  it('fires on a flavored That-is closer', () => {
    expect(scoreText('The migration moved forty tables in one night. That is the right standard to hold.').verdictClosers).toBe(1);
  });

  it('skips one-sentence paragraphs', () => {
    expect(scoreText('That is the right standard to hold.').verdictClosers).toBe(0);
  });

  it('skips headings and list items', () => {
    expect(scoreText('- The migration moved forty tables. That is the right standard to hold.').verdictClosers).toBe(0);
  });
});

describe('longSentences', () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ') + '.';

  it('counts a 26-word prose sentence', () => {
    expect(scoreText(words(26)).longSentences).toBe(1);
  });

  it('does not count 25 words', () => {
    expect(scoreText(words(25)).longSentences).toBe(0);
  });

  it('skips code blocks, tables, headings and list items', () => {
    const line = words(26);
    const text = ['```', line, '```', '', `| ${line} | x |`, '', `## ${line}`, '', `- ${line}`].join('\n');
    expect(scoreText(text).longSentences).toBe(0);
  });

  it('counts a prose line that follows a list item in the same paragraph', () => {
    expect(scoreText(`- a list item\n${words(26)}`).longSentences).toBe(1);
  });

  it('scores 2 per hit, cap 10, in both modes', () => {
    expect(WEIGHTS.human.longSentences).toEqual(WEIGHTS.plain.longSentences);
    expect(scoreText(words(26), HUMAN).longSentences).toBe(1);
    expect(scoreText(words(26)).aiScore).toBe(2);
    expect(scoreText(Array.from({ length: 7 }, () => words(26)).join(' ')).aiScore).toBe(10);
  });
});

describe('prose detection', () => {
  const long = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ') + '.';
  const fenced = ['Run the job like this:', '', '```', 'echo start', '', 'She runs the job daily before standup.', '', 'The job moved forty tables. That is the right standard to hold.', '', long, '```'].join('\n');

  it('skips a fenced code block with a blank line inside it', () => {
    const m = scoreText(fenced);
    expect(m.abstractOpeners).toBe(0);
    expect(m.verdictClosers).toBe(0);
    expect(m.longSentences).toBe(0);
  });

  it('does not join a line with no closing period to the next paragraph', () => {
    const next = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ') + '.';
    expect(scoreText(`Run this from the repo root\n\n${next}`).longSentences).toBe(0);
  });
});
