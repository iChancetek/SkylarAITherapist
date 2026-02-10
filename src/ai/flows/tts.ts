'use server';
/**
 * @fileOverview OpenAI Text-to-Speech conversion
 */

import { getOpenAIClient } from '@/lib/openai';

export async function textToSpeech(text: string, language: string = 'en', voiceId: string = 'nova'): Promise<{ audioDataUri: string }> {
  try {
    // Get client (fetches key if needed)
    const openai = await getOpenAIClient();

    // Use OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // or "tts-1-hd" for higher quality
      voice: voiceId as any, // Cast to any to avoid strict type issues with string vs enum
      input: text,
      speed: 0.95, // Slightly slower for therapeutic calmness
    });

    // Convert to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Convert to base64 data URI
    const base64Audio = buffer.toString('base64');
    const audioDataUri = `data:audio/mp3;base64,${base64Audio}`;

    return { audioDataUri };
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    throw new Error('Failed to generate speech');
  }
}
