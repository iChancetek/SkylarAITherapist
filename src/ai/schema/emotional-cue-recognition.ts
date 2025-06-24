import {z} from 'genkit';

export const EmotionalCueRecognitionInputSchema = z.object({
  speech: z.string().describe('The user speech to analyze.'),
});

export type EmotionalCueRecognitionInput = z.infer<
  typeof EmotionalCueRecognitionInputSchema
>;

export const EmotionalCueRecognitionOutputSchema = z.object({
  emotionalCues: z
    .array(z.string())
    .describe('The emotional cues detected in the speech.'),
});

export type EmotionalCueRecognitionOutput = z.infer<
  typeof EmotionalCueRecognitionOutputSchema
>;
