import { z } from 'zod/v4';
import { SearchIntentSchema } from './brief-schema';

export const ParagraphGoalSchema = z.enum(['hook', 'proof', 'turn', 'payoff', 'context', 'CTA']);

export const ParagraphNodeSchema = z.object({
  order: z.number().int().min(1),
  topic: z.string(),
  goal: ParagraphGoalSchema,
  paragraphFormula: z.string(),
  audienceNote: z.string(),
  intendedBeat: z.string(),
  ourTake: z.string(),
  facts: z.array(z.string()),
  sources: z.array(z.url()),
  keyword: z.string(),
  links: z.array(z.string()),
  gateGuidance: z.string(),
  rendersAsProse: z.boolean(),
});

// Meta fields are the required baseline; posts may add or drop others, so the
// top-level object stays loose (unknown keys pass through instead of erroring).
export const OutlineSchema = z.looseObject({
  point: z.string(),
  hook: z.string(),
  emotionalCore: z.string(),
  flare: z.string(),
  targetAudience: z.string(),
  targetKeyword: z.string(),
  searchIntent: SearchIntentSchema,
  postFormula: z.string(),
  paragraphs: z.array(ParagraphNodeSchema).min(1),
});

export type Outline = z.infer<typeof OutlineSchema>;
