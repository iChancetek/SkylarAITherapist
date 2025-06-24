import {z} from 'genkit';

export const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The base64 encoded data URI of the audio.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;
