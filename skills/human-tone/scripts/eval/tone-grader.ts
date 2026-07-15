// Deterministic AI-tell scorer; baselines calibrated on a private
// human-writing corpus — recalibrate constants against your own corpus if
// desired (config.toneCorpusDir). Higher aiScore = reads more like AI. No
// single signal is conclusive; the score is a weighted cluster. Pair with
// the human-tone skill for the fix pass.

export interface ToneMetrics {
  words: number;
  sentences: number;
  emDashPer1k: number;
  tricolons: number;
  hedges: number;
  signposts: number;
  aiVocab: number;
  copulaAvoid: number;
  quips: number;
  inflation: number;
  negParallel: number;
  fromXtoY: number;
  transitionsPer1k: number;
  dramaticInversions: number; // "By the time X, Y had already Z" / "N things run before X" hook shapes
  punchFragments: number; // prose (non-heading/list) ≤3-word sentences ending in . or !
  salesSpeak: number; // turbocharge/supercharge/unlock-as-verb/pitch-deck cadence
  burstiness: number; // stdev of sentence word-counts; LOW is AI-like
  contractionsPer100: number; // corpus baseline ~1.2-4.9; AI-formal prose goes low
  startDiversity: number; // unique sentence-openers / sentences; corpus ~0.56-0.75
  banned: number; // permabanned-phrase hits — any >0 is a hard fail
  aiScore: number; // 0-100, higher = more AI
  hits: Record<string, string[]>;
}

const HEDGES = [
  "it's worth noting", 'it is worth noting', 'arguably', 'potentially',
  'it could be said', 'it is important to note', "it's important to note",
  'that said', 'to be fair', 'in many ways', 'one might argue',
];
const SIGNPOSTS = [
  "let's dive in", "let's dive into", 'in this section', 'in this post',
  'in conclusion', 'to sum up', 'in summary', 'first and foremost',
  'without further ado', 'at the end of the day', 'when it comes to',
];
const AI_VOCAB = [
  'delve', 'delved', 'delving', 'tapestry', 'underscore', 'underscores',
  'leverage', 'leverages', 'leveraging', 'showcase', 'showcases',
  'meticulous', 'meticulously', 'intricate', 'seamless', 'seamlessly',
  'robust', 'realm', 'testament', 'landscape', 'navigate', 'navigating',
  'foster', 'crucial', 'vital', 'pivotal', 'harness', 'elevate', 'unlock',
  'empower', 'ever-evolving', 'deep dive', 'game-changer', 'cutting-edge',
  'utilize', 'utilizing', 'commence', 'plethora', 'myriad', 'boasts',
];
const COPULA_AVOID = ['serves as', 'stands as', 'acts as a', 'boasts a', 'boasts an'];
// Permabanned phrases: hollow AI tics that should never ship. A single
// hit forces a hard fail (score >> the aiScore<15 gate), unlike the weighted tells.
const BANNED = [
  "that's the whole point", 'that is the whole point', 'which is the whole point',
];
// The OTHER AI failure mode: try-hard internet-quip flavor. Formal-AI tells
// above; these are punchy-AI tells (2024-26 vintage). Caught by human review
// ("we're still saying stupid stuff like 'no mocks no mercy'"), now scored.
const QUIPS = [
  'the receipts', 'with receipts', 'no notes', "chef's kiss", 'hits different',
  'no mercy', 'let that sink in', 'rent free', "it's giving", 'understood the assignment',
  'we love to see it', 'living my best', 'built different', '*mic drop*', 'mic drop',
  'and honestly?', 'chaotic energy', 'main character', 'plot twist:', 'spoiler:',
  'spoiler alert', 'the math is mathing', 'stay tuned', 'buckle up', 'wild ride',
  'the money shot', 'and yeah,', 'not gonna lie',
];
// Short slang tokens need word boundaries (plain indexOf matched "single").
const QUIP_TOKENS = /\b(ngl|lowkey|low-key|iykyk|fr fr|deadass)\b/gi;
const TRANSITIONS = ['furthermore', 'moreover', 'additionally', 'consequently', 'nevertheless', 'notably', 'importantly'];
// Adverb inflation + fake hedges (RAID-era tell rubric): weight low — humans
// use these too, it's the density that reads AI.
const INFLATION = [
  'fundamentally', 'essentially', 'inherently', 'ultimately', 'profoundly',
  'undeniably', 'undoubtedly', 'seamlessly', 'effortlessly', 'remarkably',
  'critically important', 'deeply personal', 'truly unique',
];
// Performative/bad-movie-dialogue register — three families below. A real
// rewrite-queue draft read "too many quips, too much sales speak, trying too
// hard, sounds like a bad actor, a bad movie dialogue." Weights below were
// calibrated against a shipped blog corpus + private human-writing corpus —
// recalibrate against your own corpus (config.toneCorpusDir + config.contentDir)
// if the free allowance on punchFragments doesn't fit your project's normal voice.

// Sentence-initial dramatic-sequencing hook shapes. Sentence-INITIAL only —
// mid-sentence "before"/"by the time"/"already" is normal causal prose.
const DRAMATIC_INVERSION_STARTS = [/^by the time\b/i, /^before a single\b/i];
const DRAMATIC_INVERSION_COUNT_SHAPE =
  /^(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozens?|a dozen|several|many|countless)\s+[a-z]+(?:\s+[a-z]+){0,2}\s+(?:run|runs|happen|happens)\s+before\b/i;
// "X have/has already Z" paired with before/by-the-time IN THE SAME SENTENCE —
// deliberately narrow ("have/has already <verb>", not bare "already") so
// ordinary uses like "is already a little stale by the time it renders" don't
// trip it.
const ALREADY_VERB = /\b(?:have|has)\s+already\s+\w+/i;
const BEFORE_OR_BYTHETIME = /\b(?:before|by the time)\b/i;

// Punch-fragment prose lines to exclude from fragment-counting: headings,
// list items, blockquotes, code fences — the tell is about PROSE rhythm.
const NON_PROSE_LINE = /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```)/;

const SALES_SPEAK_PHRASES = [
  'the whole thesis', "that's the bet", 'that is the bet',
  "here's the kicker", 'here is the kicker', 'the best part?', 'and it works',
];
const SALES_SPEAK_REGEXES = [
  /\bturbocharg(?:e|ed|es|ing)\b/gi,
  /\bsupercharg(?:e|ed|es|ing)\b/gi,
  /\bgame[- ]chang\w*/gi,
  /\bunlock(?:s|ed|ing)?\b/gi, // "unlock" as a verb — pitch-deck cadence
  /\blevel(?:s)?\s+up\b/gi,
  /\b10x\b/gi,
  /\bchef'?s[- ]kiss\b/gi,
];
// "chef's-kiss"-adjacent superlative stacking: 2+ of these in ONE sentence
// reads like ad copy even though each word alone is fine.
const SUPERLATIVE_WORDS = [
  'best', 'amazing', 'incredible', 'perfect', 'flawless', 'mind-blowing',
  'insane', 'unbelievable', 'epic',
];

function dramaticInversionHits(sentenceParts: string[]): string[] {
  const hits: string[] = [];
  for (const s of sentenceParts) {
    const startShape = DRAMATIC_INVERSION_STARTS.some((re) => re.test(s)) || DRAMATIC_INVERSION_COUNT_SHAPE.test(s);
    const alreadyBefore = ALREADY_VERB.test(s) && BEFORE_OR_BYTHETIME.test(s);
    if (startShape || alreadyBefore) hits.push(s);
  }
  return hits;
}

function punchFragmentHits(text: string): string[] {
  const proseText = text.split('\n').filter((line) => line.trim() && !NON_PROSE_LINE.test(line.trim())).join(' ');
  const parts = proseText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.filter((s) => {
    if (!/[.!]$/.test(s)) return false;
    const wc = (s.match(/\b[\w'-]+\b/g) ?? []).length;
    return wc > 0 && wc <= 3;
  });
}

function salesSpeakHits(text: string, sentenceParts: string[]): string[] {
  const hits = [
    ...countMatches(text, SALES_SPEAK_PHRASES),
    ...SALES_SPEAK_REGEXES.flatMap((re) => regexHits(text, re)),
  ];
  for (const s of sentenceParts) {
    const lower = s.toLowerCase();
    if (SUPERLATIVE_WORDS.filter((w) => lower.includes(w)).length >= 2) hits.push(s);
  }
  return hits;
}

function countMatches(text: string, phrases: string[]): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const p of phrases) {
    let i = 0;
    while ((i = lower.indexOf(p, i)) !== -1) { hits.push(p); i += p.length; }
  }
  return hits;
}

function regexHits(text: string, re: RegExp): string[] {
  return (text.match(re) ?? []).map((m) => m.trim());
}

export function scoreText(raw: string): ToneMetrics {
  const text = raw.trim();
  const words = (text.match(/\b[\w'-]+\b/g) ?? []).length || 1;
  const sentenceParts = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const sentLens = sentenceParts.map((s) => (s.match(/\b[\w'-]+\b/g) ?? []).length).filter((n) => n > 0);
  const sentences = sentLens.length || 1;

  const emDashes = regexHits(text, /—/g).length + regexHits(text, / -- /g).length * 0; // count true em-dashes only
  const tricolonHits = regexHits(text, /\b[\w'-]+, [\w'-][^,.]*, and [^,.]+/gi);
  const hedgeHits = countMatches(text, HEDGES);
  const signpostHits = countMatches(text, SIGNPOSTS);
  const aiVocabHits = countMatches(text, AI_VOCAB.map((w) => ' ' + w)).map((s) => s.trim());
  const copulaHits = countMatches(text, COPULA_AVOID);
  const bannedHits = countMatches(text, BANNED);
  const quipHits = [...countMatches(text, QUIPS), ...regexHits(text, QUIP_TOKENS)];
  const inflationHits = countMatches(text, INFLATION.map((w) => ' ' + w)).map((w) => w.trim());
  const negParallelHits = [
    ...regexHits(text, /it'?s not (just |only )?[^,.]+,? (but|it'?s) /gi),
    ...regexHits(text, /\bnot (just|only) [^,.]+,? but\b/gi),
    // the "X isn't Y, it's Z" family — the same negate-then-reframe crutch
    ...regexHits(text, /\b\w+ (isn'?t|aren'?t|wasn'?t|weren'?t|doesn'?t|didn'?t|won'?t) [^,.]{2,40},? (it'?s|they'?re|that'?s|it|they) /gi),
  ];
  const fromToHits = regexHits(text, /\bfrom [^,.]{3,40} to [^,.]{3,40}/gi);
  const transitionHits = countMatches(text, TRANSITIONS.map((w) => w + ',')).concat(
    countMatches(text, TRANSITIONS.map((w) => w + ' ')),
  );
  const dramaticInversionMatches = dramaticInversionHits(sentenceParts);
  const punchFragmentMatches = punchFragmentHits(text);
  const salesSpeakMatches = salesSpeakHits(text, sentenceParts);

  const mean = sentLens.reduce((a, b) => a + b, 0) / sentences;
  const variance = sentLens.reduce((a, b) => a + (b - mean) ** 2, 0) / sentences;
  const burstiness = Math.sqrt(variance);

  // Corpus-relative texture (baselines measured 2026-07-04 on eval/corpus/:
  // contractions/100w 1.19-4.93, sentence-start diversity 0.56-0.75).
  const contractions = (text.match(/\b[\w]+'(s|t|re|ve|ll|d|m)\b/gi) ?? []).length;
  const contractionsPer100 = (contractions / words) * 100;
  const starts = sentenceParts
    .filter((snt) => (snt.match(/\b[\w'-]+\b/g) ?? []).length > 2)
    .map((snt) => (snt.match(/[A-Za-z']+/)?.[0] ?? '').toLowerCase())
    .filter(Boolean);
  const startDiversity = starts.length ? new Set(starts).size / starts.length : 1;

  const per1k = (n: number) => (n / words) * 1000;
  const emDashPer1k = per1k(emDashes);
  const transitionsPer1k = per1k(transitionHits.length);

  // Weighted AI score. Density signals scaled per-1k; structural signals capped.
  let score = 0;
  score += Math.min(emDashPer1k * 6, 22);            // em-dash overuse
  score += Math.min(tricolonHits.length * 4, 16);     // rule-of-three
  score += Math.min(hedgeHits.length * 5, 15);
  score += Math.min(signpostHits.length * 6, 12);
  score += Math.min(aiVocabHits.length * 5, 20);
  score += Math.min(copulaHits.length * 4, 8);
  score += Math.min(quipHits.length * 6, 18);         // quip-tic flavor
  score += Math.min(Math.max(0, inflationHits.length - 1) * 3, 9); // adverb inflation (first one free)
  score += Math.min(negParallelHits.length * 6, 24);
  score += Math.min(fromToHits.length * 4, 8);
  score += Math.min(transitionsPer1k * 3, 10);
  score += Math.min(Math.max(0, dramaticInversionMatches.length - 1) * 6, 18); // first hook free (sequencing can be legitimate)
  // free=10/weight=1/cap=6 (not the naive free=2/weight=4/cap=16 a first pass
  // suggests): normal bursty prose ("jam a fragment against a run") routinely
  // runs 5-25 short sentences per post — that's texture, not register drift.
  // Calibrated against a real shipped-post corpus; recalibrate against your
  // own corpus if the free allowance doesn't fit your project's normal voice.
  score += Math.min(Math.max(0, punchFragmentMatches.length - 10) * 1, 6); // established-style ceiling free; density beyond it accumulates
  score += Math.min(salesSpeakMatches.length * 5, 15);
  if (sentences >= 4 && burstiness < 6) score += (6 - burstiness) * 2.5; // low burstiness penalty
  // Texture deltas vs the human corpus (only on texts big enough to trust).
  if (words >= 120 && contractionsPer100 < 0.8) score += (0.8 - contractionsPer100) * 8; // stiff, uncontracted prose
  if (starts.length >= 8 && startDiversity < 0.45) score += (0.45 - startDiversity) * 30; // The... The... It... It...
  score += bannedHits.length * 100; // permabanned phrases: any hit is a hard fail

  return {
    words, sentences,
    emDashPer1k: +emDashPer1k.toFixed(2),
    tricolons: tricolonHits.length,
    hedges: hedgeHits.length,
    signposts: signpostHits.length,
    aiVocab: aiVocabHits.length,
    copulaAvoid: copulaHits.length,
    quips: quipHits.length,
    inflation: inflationHits.length,
    negParallel: negParallelHits.length,
    fromXtoY: fromToHits.length,
    transitionsPer1k: +transitionsPer1k.toFixed(2),
    dramaticInversions: dramaticInversionMatches.length,
    punchFragments: punchFragmentMatches.length,
    salesSpeak: salesSpeakMatches.length,
    burstiness: +burstiness.toFixed(2),
    contractionsPer100: +contractionsPer100.toFixed(2),
    startDiversity: +startDiversity.toFixed(2),
    banned: bannedHits.length,
    aiScore: Math.round(Math.min(score, 100)),
    hits: {
      emDash: emDashes ? [`${emDashes}×`] : [],
      tricolon: tricolonHits, hedges: hedgeHits, signposts: signpostHits,
      aiVocab: aiVocabHits, copulaAvoid: copulaHits, quips: quipHits, inflation: inflationHits, negParallel: negParallelHits,
      fromXtoY: fromToHits, banned: bannedHits,
      dramaticInversions: dramaticInversionMatches, punchFragments: punchFragmentMatches, salesSpeak: salesSpeakMatches,
    },
  };
}
