'use server';
/**
 * @fileOverview Get text-only response using OpenAI
 */

import { askiSkylar } from './ai-therapy';
import { safetyNetActivation } from './safety-net';
import type { SpokenResponseInput, SpokenResponseOutput } from '@/ai/schema/spoken-response';

export async function getTextResponse(input: SpokenResponseInput): Promise<Omit<SpokenResponseOutput, 'audioDataUri'> & { audioDataUri: string }> {
  const lang = input.language || 'en';

  // If it's the start of the session, skip safety check
  if (input.userInput === "ISKYLAR_SESSION_START") {
    const aiResult = await askiSkylar({ ...input, language: lang });
    return {
      isSafetyResponse: false,
      responseText: aiResult.iSkylarResponse,
      audioDataUri: '', // No audio for text-only
      updatedSessionState: aiResult.updatedSessionState,
      sessionShouldEnd: aiResult.sessionShouldEnd || false,
    };
  }

  // For subsequent messages, run safety check and therapy response in parallel
  const [safetyResult, aiResult] = await Promise.all([
    safetyNetActivation({ userInput: input.userInput }),
    askiSkylar({ ...input, language: lang })
  ]);

  // Prioritize safety response if risk detected
  if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
    return {
      isSafetyResponse: true,
      responseText: safetyResult.safetyResponse,
      audioDataUri: '',
      updatedSessionState: input.sessionState,
      sessionShouldEnd: false,
    };
  }

  // Standard therapy response
  return {
    isSafetyResponse: false,
    responseText: aiResult.iSkylarResponse,
    audioDataUri: '',
    updatedSessionState: aiResult.updatedSessionState,
    sessionShouldEnd: aiResult.sessionShouldEnd || false,
  };
}
