import {z} from 'genkit';

export const iSkylarInputSchema = z.object({
  userInput: z.string().describe('The user input from voice or text. Can be "ISKYLAR_SESSION_START" to initiate the session.'),
  sessionState: z.string().optional().describe('A JSON string representing the session state, including mood patterns, progress, previously mentioned goals, and user name if known. The AI must update this state and return it.'),
});
export type iSkylarInput = z.infer<typeof iSkylarInputSchema>;

export const iSkylarOutputSchema = z.object({
  iSkylarResponse: z.string().describe('iSkylar’s response to the user.'),
  updatedSessionState: z.string().optional().describe('The updated JSON string for the session state after iSkylar’s response. This must always be returned.'),
});
export type iSkylarOutput = z.infer<typeof iSkylarOutputSchema>;
