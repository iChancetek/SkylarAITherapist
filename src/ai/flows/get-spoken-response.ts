'use server';
/**
 * @fileOverview A flow that generates a spoken response from iSkylar, including safety checks.
 *
 * - getSpokenResponse - A function that handles getting a spoken response from iSkylar.
 */

import {ai} from '@/ai/genkit';
import { askiSkylar } from './ai-therapy';
import { textToSpeech } from './tts';
import { safetyNetActivation } from './safety-net';
import { SpokenResponseInputSchema, SpokenResponseOutputSchema, type SpokenResponseInput, type SpokenResponseOutput } from '@/ai/schema/spoken-response';


export async function getSpokenResponse(input: SpokenResponseInput): Promise<SpokenResponseOutput> {
  return getSpokenResponseFlow(input);
}


const getSpokenResponseFlow = ai.defineFlow(
  {
    name: 'getSpokenResponseFlow',
    inputSchema: SpokenResponseInputSchema,
    outputSchema: SpokenResponseOutputSchema,
  },
  async (input: SpokenResponseInput): Promise<SpokenResponseOutput> => {
    // 1. Check for safety issues first.
    // Do not check for safety on the initial greeting.
    if (input.userInput !== "ISKYLAR_SESSION_START") {
      const safetyResult = await safetyNetActivation({ userInput: input.userInput });
      if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
        // If a safety risk is detected, generate audio for the safety message and return immediately.
        const ttsResult = await textToSpeech(safetyResult.safetyResponse);
        return {
          isSafetyResponse: true,
          responseText: safetyResult.safetyResponse,
          audioDataUri: ttsResult.audioDataUri,
          updatedSessionState: input.sessionState, // Session state is not modified by safety net.
        };
      }
    }

    // 2. If no safety issues, get the standard text response from iSkylar.
    const aiResult = await askiSkylar(input);

    // 3. Convert the text response to speech.
    const ttsResult = await textToSpeech(aiResult.iSkylarResponse);

    // 4. Return the combined result.
    return {
      isSafetyResponse: false,
      responseText: aiResult.iSkylarResponse,
      audioDataUri: ttsResult.audioDataUri,
      updatedSessionState: aiResult.updatedSessionState,
    };
  }
);
