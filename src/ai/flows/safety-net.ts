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
      'A response containing safety protocols, crisis hotline information, or grounding exercises. Empty if no safety net activation is needed.'
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
  prompt: `You are an AI safety monitor for iSkylar, an AI therapist. Your task is to analyze the user's input for any indications of high-risk emotions or thoughts such as suicide, self-harm, abuse, or severe trauma.

User Input: {{{userInput}}}

If the input contains language suggesting immediate danger, suicidal intent (e.g., "I want to give up", "I can't do this anymore", "I want to die"), self-harm, or mentions of ongoing abuse:
Respond with a specific safety message. Choose ONE of the following, or a close variation, ensuring it includes the crisis line:

1.  "It sounds like you're in a lot of pain right now. You're not alone. I'm here with you. If it feels right, I can also share a crisis number where someone live can help. You can reach the Suicide Prevention Lifeline at 988."
2.  "Hearing that makes me concerned for your safety. It's really brave of you to share this. Please know you're not alone. You can reach the National Crisis and Suicide Lifeline by calling or texting 988 in the US and Canada, or by calling 111 in the UK. Would you like me to guide you through a grounding exercise right now?"
3.  "If you're feeling overwhelmed or having thoughts of harming yourself, I care deeply, but this may be a time to speak with a trained professional immediately. You can reach the Suicide Prevention Lifeline at 988. Please know I'm here for you."

If no such high-risk indications are present in the \`userInput\`, your \`safetyResponse\` MUST be an empty string. Do not provide any other commentary or response if no safety risk is detected.

Output your response in the specified JSON format.
`,
});

const safetyNetActivationFlow = ai.defineFlow(
  {
    name: 'safetyNetActivationFlow',
    inputSchema: SafetyNetActivationInputSchema,
    outputSchema: SafetyNetActivationOutputSchema,
  },
  async (input: SafetyNetActivationInput) => {
    const {output} = await prompt(input);
    // Ensure output is not null, providing a default if it is.
    if (!output) {
        return { safetyResponse: "" }; // Default to no safety response if AI fails
    }
    return output;
  }
);
