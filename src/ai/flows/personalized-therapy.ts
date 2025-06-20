'use server';

/**
 * @fileOverview An AI agent that personalizes therapy sessions based on past session history.
 *
 * - personalizedTherapy - A function that handles the personalized therapy process.
 * - PersonalizedTherapyInput - The input type for the personalizedTherapy function.
 * - PersonalizedTherapyOutput - The return type for the personalizedTherapy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedTherapyInputSchema = z.object({
  currentEmotion: z.string().describe('The user\'s current emotional state.'),
  lastSessionSummary: z
    .string()
    .describe('A summary of the user\'s previous therapy session.'),
  userMessage: z.string().describe('The user\'s current message or concern.'),
});
export type PersonalizedTherapyInput = z.infer<typeof PersonalizedTherapyInputSchema>;

const PersonalizedTherapyOutputSchema = z.object({
  response: z.string().describe('The AI therapist\'s personalized response.'),
});
export type PersonalizedTherapyOutput = z.infer<typeof PersonalizedTherapyOutputSchema>;

export async function personalizedTherapy(input: PersonalizedTherapyInput): Promise<PersonalizedTherapyOutput> {
  return personalizedTherapyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedTherapyPrompt',
  input: {schema: PersonalizedTherapyInputSchema},
  output: {schema: PersonalizedTherapyOutputSchema},
  prompt: `You are iSkylar, a compassionate AI therapist personalizing the session based on past history.

  Last Session Summary: {{{lastSessionSummary}}}
  Current Emotion: {{{currentEmotion}}}
  User Message: {{{userMessage}}}

  Based on the user's current emotion, their last session summary, and their current message,
  provide a supportive and helpful response, showing that you remember their previous session.
  Be sure to validate the user's emotions and offer relevant therapeutic guidance.
  Focus on providing continuity and personalized support. If they are mentioning suicide, abuse, or trauma, offer appropriate hotline:
   "If you're feeling overwhelmed, I care deeply—but this may be a time to speak with a trained professional. You can reach the Suicide Prevention Lifeline at 988."
  `,
});

const personalizedTherapyFlow = ai.defineFlow(
  {
    name: 'personalizedTherapyFlow',
    inputSchema: PersonalizedTherapyInputSchema,
    outputSchema: PersonalizedTherapyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
