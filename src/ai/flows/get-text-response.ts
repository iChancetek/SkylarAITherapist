'use server';
/**
 * @fileOverview A flow that generates a text response from iSkylar, including safety checks.
 *
 * - getTextResponse - A function that handles getting a text response from iSkylar.
 */

import {ai} from '@/ai/genkit';
import { askiSkylar } from './ai-therapy';
import { safetyNetActivation } from './safety-net';
import { TextResponseInputSchema, TextResponseOutputSchema, type TextResponseInput, type TextResponseOutput } from '@/ai/schema/text-response';

export async function getTextResponse(input: TextResponseInput): Promise<TextResponseOutput> {
  return getTextResponseFlow(input);
}

const getTextResponseFlow = ai.defineFlow(
  {
    name: 'getTextResponseFlow',
    inputSchema: TextResponseInputSchema,
    outputSchema: TextResponseOutputSchema,
  },
  async (input: TextResponseInput): Promise<TextResponseOutput> => {
    // If it's the start of the session, we skip the safety check and go straight to the greeting.
    if (input.userInput === "ISKYLAR_SESSION_START") {
      const aiResult = await askiSkylar(input);
      return {
        isSafetyResponse: false,
        responseText: aiResult.iSkylarResponse,
        updatedSessionState: aiResult.updatedSessionState,
        sessionShouldEnd: aiResult.sessionShouldEnd || false,
      };
    }

    // For subsequent messages, run safety check and therapy response in parallel.
    const [safetyResult, aiResult] = await Promise.all([
      safetyNetActivation({ userInput: input.userInput }),
      askiSkylar(input)
    ]);

    // Prioritize the safety response if a risk is detected.
    if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
      return {
        isSafetyResponse: true,
        responseText: safetyResult.safetyResponse,
        updatedSessionState: input.sessionState, // Session state is not modified by safety net.
        sessionShouldEnd: false,
      };
    }

    // If no safety issues, proceed with the standard therapy response.
    return {
      isSafetyResponse: false,
      responseText: aiResult.iSkylarResponse,
      updatedSessionState: aiResult.updatedSessionState,
      sessionShouldEnd: aiResult.sessionShouldEnd || false,
    };
  }
);
