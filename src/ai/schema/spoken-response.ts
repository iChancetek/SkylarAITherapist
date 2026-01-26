
import { z } from 'genkit';
import { iSkylarInputSchema } from './ai-therapy';

export const SpokenResponseInputSchema = iSkylarInputSchema;
export type SpokenResponseInput = z.infer<typeof SpokenResponseInputSchema>;

export const SpokenResponseOutputSchema = z.object({
  isSafetyResponse: z.boolean().describe('Indicates if the response is a safety intervention.'),
  responseText: z.string().describe('iSkylar’s text response to the user.'),
  audioDataUri: z.string().describe('The base64 encoded data URI of the audio response.'),
  updatedSessionState: z.string().optional().describe('The updated JSON string for the session state.'),
  sessionShouldEnd: z.boolean().optional().describe('Indicates if the session should be gracefully concluded.'),
});
export type SpokenResponseOutput = z.infer<typeof SpokenResponseOutputSchema>;
