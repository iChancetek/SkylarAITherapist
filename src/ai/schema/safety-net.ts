import {z} from 'genkit';

export const SafetyNetActivationInputSchema = z.object({
  userInput: z
    .string()
    .describe('The user input which may contain high-risk emotions or thoughts.'),
});
export type SafetyNetActivationInput = z.infer<typeof SafetyNetActivationInputSchema>;

export const SafetyNetActivationOutputSchema = z.object({
  safetyResponse: z
    .string()
    .describe(
      'A response containing safety protocols, crisis hotline information, or grounding exercises. Empty if no safety net activation is needed.'
    ),
});
export type SafetyNetActivationOutput = z.infer<typeof SafetyNetActivationOutputSchema>;
