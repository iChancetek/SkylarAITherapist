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

export async function textToSpeech(text: string): Promise<TextToSpeechOutput> {
  const {media} = await ai.generate({
    model: googleAI.model('gemini-2.5-flash-preview-tts'),
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          // A friendly, natural female voice.
          prebuiltVoiceConfig: {voiceName: 'algenib'},
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
