import {z} from 'genkit';

export const TextResponseInputSchema = z.object({
  userInput: z.string().describe('The user input from voice or text. Can be "ISKYLAR_SESSION_START" to initiate the session.'),
  sessionState: z.string().optional().describe('A JSON string representing the session state.'),
});
export type TextResponseInput = z.infer<typeof TextResponseInputSchema>;

export const TextResponseOutputSchema = z.object({
  isSafetyResponse: z.boolean().describe('Indicates if the response is a safety intervention.'),
  responseText: z.string().describe('iSkylar’s text response to the user.'),
  updatedSessionState: z.string().optional().describe('The updated JSON string for the session state.'),
  sessionShouldEnd: z.boolean().optional().describe('Indicates if the session should be gracefully concluded.'),
});
export type TextResponseOutput = z.infer<typeof TextResponseOutputSchema>;
