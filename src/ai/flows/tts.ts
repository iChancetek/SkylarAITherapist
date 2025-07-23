
'use server';
/**
 * @fileOverview A text-to-speech (TTS) flow for iSkylar.
 *
 * - textToSpeech - A function that converts text into speech audio.
 */
import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import wav from 'wav';
import { TextToSpeechOutputSchema, type TextToSpeechOutput } from '@/ai/schema/tts';

// Map language codes to specific voices. This can be expanded.
const languageToVoice: Record<string, string> = {
    'en': 'vindemiatrix', // English
    'es': 'calisto',      // Spanish
    'zh': 'gemini-pro',   // Mandarin (Using a general voice, can be refined)
    'sw': 'gemini-pro',   // Swahili
    'hi': 'gemini-pro',   // Hindi
    'he': 'gemini-pro',   // Hebrew
};

export async function textToSpeech(text: string, language: string = 'en'): Promise<TextToSpeechOutput> {
  const voiceName = languageToVoice[language] || 'vindemiatrix'; // Fallback to English voice

  const {media} = await ai.generate({
    model: googleAI.model('gemini-2.5-flash-preview-tts'),
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
    prompt: text,
  });

  if (!media) {
    throw new Error('No audio media was returned from the TTS service.');
  }

  const audioBuffer = Buffer.from(
    media.url.substring(media.url.indexOf(',') + 1),
    'base64'
  );

  const wavData = await toWav(audioBuffer);

  return {
    audioDataUri: 'data:audio/wav;base64,' + wavData,
  };
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (chunk: Buffer) => {
      bufs.push(chunk);
    });
    writer.on('end', () => {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
