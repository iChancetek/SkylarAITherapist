import {z} from 'genkit';

export const PersonalizedTherapyInputSchema = z.object({
  currentEmotion: z.string().describe('The user\'s current emotional state.'),
  lastSessionSummary: z
    .string()
    .describe('A summary of the user\'s previous therapy session.'),
  userMessage: z.string().describe('The user\'s current message or concern.'),
});
export type PersonalizedTherapyInput = z.infer<typeof PersonalizedTherapyInputSchema>;

export const PersonalizedTherapyOutputSchema = z.object({
  response: z.string().describe('The AI therapist\'s personalized response.'),
});
export type PersonalizedTherapyOutput = z.infer<typeof PersonalizedTherapyOutputSchema>;
