import { z } from 'zod/v4';
import { SearchIntentSchema } from './brief-schema';

export const KeywordOpportunitySetSchema = z.strictObject({
  candidates: z.array(
    z.strictObject({
      seedTopic: z.string(),
      editorialCluster: z.string(),
      opportunities: z.array(
        z.strictObject({
          keyword: z.string(),
          intent: SearchIntentSchema,
          signals: z.array(z.string()),
          sources: z.array(z.url()).min(1),
          estimate: z.string(),
        }),
      ).min(1),
    }),
  ).min(1),
  cannibalization: z.array(
    z.strictObject({
      keyword: z.string(),
      conflictsWith: z.string(),
    }),
  ),
  caveat: z.string(),
});

export type KeywordOpportunitySet = z.infer<typeof KeywordOpportunitySetSchema>;
