// SafetyNet.ts
'use server';
/**
 * @fileOverview Activates safety protocols and offers resources if high-risk emotions or thoughts are detected.
 *
 * - safetyNetActivation - A function that handles the activation of safety protocols.
 * - SafetyNetActivationInput - The input type for the safetyNetActivation function.
 * - SafetyNetActivationOutput - The return type for the safetyNetActivation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SafetyNetActivationInputSchema = z.object({
  userInput: z
    .string()
    .describe('The user input which may contain high-risk emotions or thoughts.'),
});
export type SafetyNetActivationInput = z.infer<typeof SafetyNetActivationInputSchema>;

const SafetyNetActivationOutputSchema = z.object({
  safetyResponse: z
    .string()
    .describe(
      'A response containing safety protocols, crisis hotline information, or grounding exercises.'
    ),
});
export type SafetyNetActivationOutput = z.infer<typeof SafetyNetActivationOutputSchema>;

export async function safetyNetActivation(input: SafetyNetActivationInput): Promise<SafetyNetActivationOutput> {
  return safetyNetActivationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'safetyNetActivationPrompt',
  input: {schema: SafetyNetActivationInputSchema},
  output: {schema: SafetyNetActivationOutputSchema},
  prompt: `You are Skylar, an AI therapist. The user has provided the following input: {{{userInput}}}. Your task is to determine if the user's input indicates any high-risk emotions or thoughts such as suicide, abuse, or trauma. If so, offer appropriate resources like crisis hotline information and grounding exercises. If the input does not indicate high-risk emotions, respond with an empty string.

Here are some example safety responses:

"It sounds like you're in a lot of pain right now. You're not alone. Can I guide you through a grounding exercise or would you prefer I connect you with a crisis line? You can reach the Suicide Prevention Lifeline at 988."

"If you're feeling overwhelmed, I care deeply—but this may be a time to speak with a trained professional. You can reach the Suicide Prevention Lifeline at 988."

If no safety net activation is needed, respond with an empty string.

Output your response in the format:
{
  "safetyResponse": "[your response here]"
}
`,
});

const safetyNetActivationFlow = ai.defineFlow(
  {
    name: 'safetyNetActivationFlow',
    inputSchema: SafetyNetActivationInputSchema,
    outputSchema: SafetyNetActivationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
