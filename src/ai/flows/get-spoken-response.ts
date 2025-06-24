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
    // If it's the start of the session, we skip the safety check and go straight to the greeting.
    if (input.userInput === "ISKYLAR_SESSION_START") {
      const aiResult = await askiSkylar(input);
      const ttsResult = await textToSpeech(aiResult.iSkylarResponse);
      return {
        isSafetyResponse: false,
        responseText: aiResult.iSkylarResponse,
        audioDataUri: ttsResult.audioDataUri,
        updatedSessionState: aiResult.updatedSessionState,
      };
    }

    // For subsequent messages, run safety check and therapy response in parallel.
    const [safetyResult, aiResult] = await Promise.all([
      safetyNetActivation({ userInput: input.userInput }),
      askiSkylar(input)
    ]);

    // Prioritize the safety response if a risk is detected.
    if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
      const ttsResult = await textToSpeech(safetyResult.safetyResponse);
      return {
        isSafetyResponse: true,
        responseText: safetyResult.safetyResponse,
        audioDataUri: ttsResult.audioDataUri,
        updatedSessionState: input.sessionState, // Session state is not modified by safety net.
      };
    }

    // If no safety issues, proceed with the standard therapy response.
    const ttsResult = await textToSpeech(aiResult.iSkylarResponse);

    return {
      isSafetyResponse: false,
      responseText: aiResult.iSkylarResponse,
      audioDataUri: ttsResult.audioDataUri,
      updatedSessionState: aiResult.updatedSessionState,
    };
  }
);
