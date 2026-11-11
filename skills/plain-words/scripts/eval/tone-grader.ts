// Deterministic AI-tell scorer; baselines calibrated on a private
// human-writing corpus — recalibrate constants against your own corpus if
// desired (config.toneCorpusDir). Higher aiScore = reads more like AI. No
// single signal is conclusive; the score is a weighted cluster. Pair with
// the plain-words skill for the fix pass.

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
  narratorVoice: number; // writer narrating their own document, or a content-free transition
  abstractOpeners: number; // paragraph opens by characterizing the subject in habitual present
  verdictClosers: number; // paragraph ends on a summarizing "That is the..." flourish
  longSentences: number; // prose sentences over 25 words (STE100 guidance)
  burstiness: number; // stdev of sentence word-counts; LOW is AI-like
  contractionsPer100: number; // corpus baseline ~1.2-4.9; AI-formal prose goes low
  startDiversity: number; // unique sentence-openers / sentences; corpus ~0.56-0.75
  banned: number; // permabanned-phrase hits — any >0 is a hard fail
  aiScore: number; // 0-100, higher = more AI
  mode: ToneMode;
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

// narratorVoice: two shapes of essay scaffolding. (a) DOCUMENT TALK — the writer
// referring to their own artifact instead of to the subject ("the part worth
// repeating", "belongs here because", "does not appear above", "the item below").
// (b) EMPTY TRANSITION — a sentence whose only job is to announce the next one
// ("That work then met a real customer", "the contrast with Q1 is direct"). Both
// read as an essayist arranging sections rather than a person saying something.
// Fix: delete the sentence and let the fact that follows stand on its own.
const NARRATOR_SHAPES: RegExp[] = [
  /\bthe (?:part|bit|thing|half) (?:worth|that matters|i liked)\b/i,
  /\bworth (?:recording|repeating|pointing|restating|saying|keeping in mind)\b/i,
  /\b(?:the|this|that) (?:section|paragraph|item|point) (?:above|below)\b/i,
  /\b(?:does not|doesn't|do not|don't) appear (?:above|below)\b/i,
  /\bas (?:noted|mentioned|described|discussed) (?:above|below|earlier)\b/i,
  /\bbelongs? (?:here|below|above)\b/i,
  /\bthe contrast with [^,.]{1,30} is (?:direct|clear|stark|striking|instructive)\b/i,
  /\bis the one that (?:changed|matters|moved) most\b/i,
  /\bwhich is the part\b/i,
  /^(?:That|This) \w+ then \w+/,
  /\bthe (?:first|second|third) (?:point|thing|one) (?:is|was) the\b/i,
];
function narratorVoiceHits(text: string, sentenceParts: string[]): string[] {
  const hits: string[] = [];
  for (const re of NARRATOR_SHAPES) {
    for (const snt of sentenceParts) {
      if (re.test(snt.trim())) hits.push(snt.trim().slice(0, 80));
    }
  }
  return [...new Set(hits)];
}

// Paragraph-level register tells. Both were found by a human reader rejecting
// drafts that cleared every other gate, so they are weighted to actually bite.
//
// abstractOpeners: a paragraph that opens by characterizing its subject in
// habitual present tense ("Marcus checks his own numbers before anyone else
// has to", "Tobias argues for conditions the whole team needs") is stating a
// general property instead of reporting a specific thing that happened. Reads
// as throat-clearing before the evidence. The fix is to open in past tense on a
// specific occasion. Deliberately narrow: a person as subject, then a
// third-person-singular present verb that is not a copula/auxiliary. The
// subject depends on the mode: human mode takes a pronoun or a capitalized word
// that is not a sentence-start function word (so "It returns null" and "The
// tests pass" stay fine); plain mode takes only He or She. Human mode's subject
// must match everything plain mode's does, so human never scores lower.
const NOT_A_PERSON = 'It|Its|The|This|These|That|Those|There|Here|A|An|Our|Your|My|We|You|What|When|Where|Why|How|If|In|On|At|For|With|After|Before|Then|So|But|And|Or|No|Any';
const NAMED_SUBJECT = String.raw`(?:He|She|They|His|Her|Their|(?!(?:${NOT_A_PERSON})\b)[A-Z][a-z]+(?:'s)?)`;
// Plain mode is the default for docs, where a capitalized subject is usually a
// tool or an imperative verb ("Claude owns", "Use this").
const PRONOUN_SUBJECT = String.raw`(?:He|She)`;
const OPENER_ADVERB = String.raw`(?:also\s+|already\s+|consistently\s+|often\s+|always\s+|still\s+|now\s+)?`;
const COPULA_OR_AUX = /^(is|was|were|has|had|does|did|says|goes|seems|remains|gets|keeps)$/i;
const FUNCTION_S_WORD = /^(this|its|his|hers|us|as|thus|yes|plus|unless|less)$/i;
const TIME_NOUN_FOLLOWERS = /^(ago|later|after|before|since|into|from|earlier|of|in|on)$/i;
// "Two products now depend on X" / "Several tickets closed" — a cardinal or
// quantifier in subject position means the next -s word is a plural noun, not a
// characterizing verb.
const QUANTIFIER_START = /^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Several|Many|Most|Some|Both|Each|Every|Half|All|Eleven|Twelve)\b/;
// The verb ends in a single s ("checks", not "pass").
const opener = (subject: string) => new RegExp(`^\\s*${subject}\\s+${OPENER_ADVERB}(\\w*[^\\Ws]s)\\b\\s*(\\w+)?`);
const ABSTRACT_OPENER = { human: opener(NAMED_SUBJECT), plain: opener(PRONOUN_SUBJECT) };

// Prose paragraphs: fenced code blocks become blank lines first, so a blank line
// inside a fence never starts a paragraph; a paragraph that opens with a
// heading, list item, quote or table row is not prose.
function stripFences(text: string): string {
  let inFence = false;
  return text.split('\n').map((line) => {
    if (line.trim().startsWith('```')) { inFence = !inFence; return ''; }
    return inFence ? '' : line;
  }).join('\n');
}
function isProseLine(t: string): boolean {
  return Boolean(t) && !NON_PROSE_LINE.test(t) && !t.startsWith('|');
}
function allParagraphs(text: string): string[] {
  return stripFences(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
function proseParagraphs(text: string): string[] {
  return allParagraphs(text).filter((p) => isProseLine(p.split('\n')[0].trim()));
}
function sentencesOf(p: string): string[] {
  return p.split(/(?<=[.!?])\s/).map((x) => x.trim()).filter(Boolean);
}
function abstractOpenerHits(text: string, re: RegExp): string[] {
  const hits: string[] = [];
  for (const p of proseParagraphs(text)) {
    const s = sentencesOf(p)[0];
    if (QUANTIFIER_START.test(s.trim())) continue;
    const m = re.exec(s);
    if (!m) continue;
    const verb = m[1];
    const next = m[2] ?? '';
    if (COPULA_OR_AUX.test(verb) || FUNCTION_S_WORD.test(verb)) continue; // "Marcus is the only IC", "Use this" = fine
    if (TIME_NOUN_FOLLOWERS.test(next)) continue;    // "Twenty minutes later..." = fine
    hits.push(s.slice(0, 90));
  }
  return hits;
}

// verdictClosers: a paragraph that ends on "That is the right standard to
// hold", "That is the gap I would like to see closed, and I think it is the
// last one". The evidence already made the point; the flourish restates it.
const VERDICT_CLOSER = /^(That|This|Which|It)(?:'s| is| was)\b/i;
const VERDICT_FLAVOR = /\b(the (right|whole|accurate|real|last|point|reason|thing|version|honest|kind)|worth|precisely|exactly|genuine|which is why|rather than)\b/i;
function verdictCloserHits(text: string): string[] {
  const hits: string[] = [];
  for (const p of proseParagraphs(text)) {
    const parts = sentencesOf(p);
    if (parts.length < 2) continue;                  // one-sentence paragraph isn't a flourish
    const s = parts[parts.length - 1];
    if (VERDICT_CLOSER.test(s) && VERDICT_FLAVOR.test(s)) hits.push(s.slice(0, 90));
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

// Long sentences: STE100 guidance is about 20 words for an instruction and 25
// for a description. Counted per paragraph, prose lines only.
const LONG_SENTENCE_WORDS = 25;
function longSentenceHits(text: string): string[] {
  const parts = allParagraphs(text).flatMap((p) =>
    sentencesOf(p.split('\n').map((l) => l.trim()).filter(isProseLine).join(' ')));
  return parts.filter((s) => (s.match(/\b[\w'-]+\b/g) ?? []).length > LONG_SENTENCE_WORDS).map((s) => s.slice(0, 90));
}

export type ToneMode = 'plain' | 'human';
export interface ScoreOptions { mode?: ToneMode }

interface Term { per: number; cap: number; free?: number }
interface TexturePenalty { below: number; per: number; minSize: number }

const TERM_KEYS = [
  'emDashPer1k', 'tricolons', 'hedges', 'signposts', 'aiVocab', 'copulaAvoid', 'quips', 'inflation',
  'negParallel', 'fromXtoY', 'transitionsPer1k', 'dramaticInversions', 'punchFragments', 'salesSpeak',
  'narratorVoice', 'abstractOpeners', 'verdictClosers', 'longSentences', 'banned',
] as const;
type TermKey = (typeof TERM_KEYS)[number];
const TEXTURE_KEYS = ['burstiness', 'contractionsPer100', 'startDiversity'] as const;
type TextureKey = (typeof TEXTURE_KEYS)[number];
export type ToneWeights = Record<TermKey, Term> & Record<TextureKey, TexturePenalty>;

const OFF: TexturePenalty = { below: 0, per: 0, minSize: 0 };
// Plain mode is the base: reading tells weigh most, formatting tells about a
// quarter of their human weight, and no texture penalties (STE wants plain,
// even sentences). Human mode is plain mode plus the voice-texture checks.
const PLAIN: ToneWeights = {
  emDashPer1k: { per: 1.5, cap: 6 },
  tricolons: { per: 1, cap: 4 },
  punchFragments: { per: 1, cap: 2, free: 10 },
  hedges: { per: 5, cap: 15 },
  signposts: { per: 6, cap: 12 },
  aiVocab: { per: 5, cap: 20 },
  copulaAvoid: { per: 4, cap: 8 },
  quips: { per: 6, cap: 18 },
  inflation: { per: 3, cap: 9, free: 1 },
  negParallel: { per: 6, cap: 24 },
  fromXtoY: { per: 4, cap: 8 },
  transitionsPer1k: { per: 3, cap: 10 },
  dramaticInversions: { per: 6, cap: 18, free: 1 },
  salesSpeak: { per: 5, cap: 15 },
  narratorVoice: { per: 6, cap: 24 },
  abstractOpeners: { per: 7, cap: 28 },
  verdictClosers: { per: 4, cap: 16 },
  longSentences: { per: 2, cap: 10 },
  banned: { per: 100, cap: Infinity },
  burstiness: OFF,
  contractionsPer100: OFF,
  startDiversity: OFF,
};
// punchFragments: calibrated against a shipped-post corpus where bursty prose
// runs 5-25 short sentences per post.
const HUMAN: ToneWeights = {
  ...PLAIN,
  emDashPer1k: { per: 6, cap: 22 },
  tricolons: { per: 4, cap: 16 },
  punchFragments: { per: 1, cap: 6, free: 10 },
  burstiness: { below: 6, per: 2.5, minSize: 4 },
  contractionsPer100: { below: 0.8, per: 8, minSize: 120 },
  startDiversity: { below: 0.45, per: 30, minSize: 8 },
};
export const WEIGHTS: Record<ToneMode, ToneWeights> = { plain: PLAIN, human: HUMAN };

function term(count: number, t: Term): number {
  return Math.min(Math.max(0, count - (t.free ?? 0)) * t.per, t.cap);
}
function texture(value: number, size: number, p: TexturePenalty): number {
  return size >= p.minSize && value < p.below ? (p.below - value) * p.per : 0;
}

type Counts = Record<TermKey, number>;
interface Texture { burstiness: number; contractionsPer100: number; startDiversity: number; sentences: number; words: number; starts: number }

function weightedScore(counts: Counts, tx: Texture, w: ToneWeights): number {
  let score = 0;
  for (const k of TERM_KEYS) score += term(counts[k], w[k]);
  score += texture(tx.burstiness, tx.sentences, w.burstiness);
  score += texture(tx.contractionsPer100, tx.words, w.contractionsPer100);
  score += texture(tx.startDiversity, tx.starts, w.startDiversity);
  return score;
}

function collectHits(text: string, sentenceParts: string[], mode: ToneMode): Record<string, string[]> {
  return {
    tricolon: regexHits(text, /\b[\w'-]+, [\w'-][^,.]*, and [^,.]+/gi),
    hedges: countMatches(text, HEDGES),
    signposts: countMatches(text, SIGNPOSTS),
    aiVocab: countMatches(text, AI_VOCAB.map((w) => ' ' + w)).map((s) => s.trim()),
    copulaAvoid: countMatches(text, COPULA_AVOID),
    banned: countMatches(text, BANNED),
    quips: [...countMatches(text, QUIPS), ...regexHits(text, QUIP_TOKENS)],
    inflation: countMatches(text, INFLATION.map((w) => ' ' + w)).map((w) => w.trim()),
    negParallel: [
      ...regexHits(text, /it'?s not (just |only )?[^,.]+,? (but|it'?s) /gi),
      ...regexHits(text, /\bnot (just|only) [^,.]+,? but\b/gi),
      // the "X isn't Y, it's Z" family — the same negate-then-reframe crutch
      ...regexHits(text, /\b\w+ (isn'?t|aren'?t|wasn'?t|weren'?t|doesn'?t|didn'?t|won'?t) [^,.]{2,40},? (it'?s|they'?re|that'?s|it|they) /gi),
    ],
    fromXtoY: regexHits(text, /\bfrom [^,.]{3,40} to [^,.]{3,40}/gi),
    dramaticInversions: dramaticInversionHits(sentenceParts),
    punchFragments: punchFragmentHits(text),
    salesSpeak: salesSpeakHits(text, sentenceParts),
    narratorVoice: narratorVoiceHits(text, sentenceParts),
    abstractOpeners: abstractOpenerHits(text, ABSTRACT_OPENER[mode]),
    verdictClosers: verdictCloserHits(text),
    longSentences: longSentenceHits(text),
  };
}

function textureOf(text: string, sentenceParts: string[], words: number): Texture {
  const sentLens = sentenceParts.map((s) => (s.match(/\b[\w'-]+\b/g) ?? []).length).filter((n) => n > 0);
  const sentences = sentLens.length || 1;
  const mean = sentLens.reduce((a, b) => a + b, 0) / sentences;
  const variance = sentLens.reduce((a, b) => a + (b - mean) ** 2, 0) / sentences;
  // Corpus-relative texture (baselines measured 2026-07-04 on eval/corpus/:
  // contractions/100w 1.19-4.93, sentence-start diversity 0.56-0.75).
  const contractions = (text.match(/\b[\w]+'(s|t|re|ve|ll|d|m)\b/gi) ?? []).length;
  const starts = sentenceParts
    .filter((snt) => (snt.match(/\b[\w'-]+\b/g) ?? []).length > 2)
    .map((snt) => (snt.match(/[A-Za-z']+/)?.[0] ?? '').toLowerCase())
    .filter(Boolean);
  return {
    burstiness: Math.sqrt(variance),
    contractionsPer100: (contractions / words) * 100,
    startDiversity: starts.length ? new Set(starts).size / starts.length : 1,
    sentences, words, starts: starts.length,
  };
}

export function scoreText(raw: string, opts: ScoreOptions = {}): ToneMetrics {
  const mode = opts.mode ?? 'plain';
  const text = raw.trim();
  const words = (text.match(/\b[\w'-]+\b/g) ?? []).length || 1;
  const sentenceParts = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const emDashes = regexHits(text, /—/g).length;
  const h = collectHits(text, sentenceParts, mode);
  const transitions = countMatches(text, TRANSITIONS.map((w) => w + ',')).concat(countMatches(text, TRANSITIONS.map((w) => w + ' ')));
  const tx = textureOf(text, sentenceParts, words);
  const per1k = (n: number) => (n / words) * 1000;
  const counts: Counts = {
    emDashPer1k: per1k(emDashes), tricolons: h.tricolon.length, hedges: h.hedges.length,
    signposts: h.signposts.length, aiVocab: h.aiVocab.length, copulaAvoid: h.copulaAvoid.length,
    quips: h.quips.length, inflation: h.inflation.length, negParallel: h.negParallel.length,
    fromXtoY: h.fromXtoY.length, transitionsPer1k: per1k(transitions.length),
    dramaticInversions: h.dramaticInversions.length, punchFragments: h.punchFragments.length,
    salesSpeak: h.salesSpeak.length, narratorVoice: h.narratorVoice.length,
    abstractOpeners: h.abstractOpeners.length, verdictClosers: h.verdictClosers.length,
    longSentences: h.longSentences.length, banned: h.banned.length,
  };
  return {
    ...counts,
    words, sentences: tx.sentences, mode,
    emDashPer1k: +counts.emDashPer1k.toFixed(2),
    transitionsPer1k: +counts.transitionsPer1k.toFixed(2),
    burstiness: +tx.burstiness.toFixed(2),
    contractionsPer100: +tx.contractionsPer100.toFixed(2),
    startDiversity: +tx.startDiversity.toFixed(2),
    aiScore: Math.round(Math.min(weightedScore(counts, tx, WEIGHTS[mode]), 100)),
    hits: { emDash: emDashes ? [`${emDashes}×`] : [], ...h },
  };
}
