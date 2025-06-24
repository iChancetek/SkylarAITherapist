// Emotional cue recognition flow to tailor responses and provide personalized support.

'use server';

import {ai} from '@/ai/genkit';
import { EmotionalCueRecognitionInputSchema, EmotionalCueRecognitionOutputSchema, type EmotionalCueRecognitionInput, type EmotionalCueRecognitionOutput } from '@/ai/schema/emotional-cue-recognition';

export async function recognizeEmotionalCues(
  input: EmotionalCueRecognitionInput
): Promise<EmotionalCueRecognitionOutput> {
  return emotionalCueRecognitionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'emotionalCueRecognitionPrompt',
  input: {schema: EmotionalCueRecognitionInputSchema},
  output: {schema: EmotionalCueRecognitionOutputSchema},
  prompt: `You are an AI trained to recognize emotional cues in user speech.
  Analyze the following speech and identify the emotional cues present.
  Return the emotional cues as a list of strings.

  Speech: {{{speech}}}
  `,
});

const emotionalCueRecognitionFlow = ai.defineFlow(
  {
    name: 'emotionalCueRecognitionFlow',
    inputSchema: EmotionalCueRecognitionInputSchema,
    outputSchema: EmotionalCueRecognitionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
