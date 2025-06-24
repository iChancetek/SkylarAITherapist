import {z} from 'genkit';

export const SpokenResponseInputSchema = z.object({
  userInput: z.string().describe('The user input from voice or text. Can be "ISKYLAR_SESSION_START" to initiate the session.'),
  sessionState: z.string().optional().describe('A JSON string representing the session state.'),
});
export type SpokenResponseInput = z.infer<typeof SpokenResponseInputSchema>;

export const SpokenResponseOutputSchema = z.object({
  isSafetyResponse: z.boolean().describe('Indicates if the response is a safety intervention.'),
  responseText: z.string().describe('iSkylar’s text response to the user.'),
  audioDataUri: z.string().describe('The base64 encoded data URI of the audio response.'),
  updatedSessionState: z.string().optional().describe('The updated JSON string for the session state.'),
});
export type SpokenResponseOutput = z.infer<typeof SpokenResponseOutputSchema>;
