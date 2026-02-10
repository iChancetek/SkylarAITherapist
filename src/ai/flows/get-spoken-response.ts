'use server';
/**
 * @fileOverview Get spoken response using OpenAI
 */

import { askiSkylar } from './ai-therapy';
import { textToSpeech } from './tts';
import { safetyNetActivation } from './safety-net';
import type { SpokenResponseInput, SpokenResponseOutput } from '@/ai/schema/spoken-response';
import { AGENTS, AgentId } from '@/ai/agent-config';

export async function getSpokenResponse(input: SpokenResponseInput): Promise<SpokenResponseOutput> {
  console.log("OPENAI KEY LOADED:", !!process.env.OPENAI_API_KEY);
  const lang = input.language || 'en';
  const agentId = (input.agentId || 'skylar') as AgentId;
  const agentVoice = AGENTS[agentId]?.voiceId || 'nova';

  try {
    // If it's the start of the session, skip safety check
    if (input.userInput === "ISKYLAR_SESSION_START") {
      const aiResult = await askiSkylar({ ...input, language: lang });
      const ttsResult = await textToSpeech(aiResult.iSkylarResponse, lang, agentVoice);
      return {
        isSafetyResponse: false,
        responseText: aiResult.iSkylarResponse,
        audioDataUri: ttsResult.audioDataUri,
        updatedSessionState: aiResult.updatedSessionState,
        sessionShouldEnd: aiResult.sessionShouldEnd || false,
        targetAgentId: aiResult.targetAgentId,
      };
    }

    // For subsequent messages, run safety check and therapy response in parallel
    const [safetyResult, aiResult] = await Promise.all([
      safetyNetActivation({ userInput: input.userInput }),
      askiSkylar({ ...input, language: lang })
    ]);

    // Prioritize safety response if risk detected
    if (safetyResult.safetyResponse && safetyResult.safetyResponse.trim() !== "") {
      const ttsResult = await textToSpeech(safetyResult.safetyResponse, lang, agentVoice);
      return {
        isSafetyResponse: true,
        responseText: safetyResult.safetyResponse,
        audioDataUri: ttsResult.audioDataUri,
        updatedSessionState: input.sessionState,
        sessionShouldEnd: false,
      };
    }

    // Standard therapy response
    const ttsResult = await textToSpeech(aiResult.iSkylarResponse, lang, agentVoice);

    return {
      isSafetyResponse: false,
      responseText: aiResult.iSkylarResponse,
      audioDataUri: ttsResult.audioDataUri,
      updatedSessionState: aiResult.updatedSessionState,
      sessionShouldEnd: aiResult.sessionShouldEnd || false,
      targetAgentId: aiResult.targetAgentId,
    };
  } catch (error: any) {
    console.error("SERVER ERROR in getSpokenResponse:", error);
    // Return the specific error message to the client to bypass Next.js production masking
    return {
      isSafetyResponse: false,
      responseText: "",
      audioDataUri: "",
      error: error.message || "Unknown server error",
    };
  }
}
