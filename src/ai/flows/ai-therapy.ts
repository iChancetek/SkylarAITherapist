
'use server';
/**
 * @fileOverview A voice conversation with iSkylar, the AI therapist.
 *
 * - askiSkylar - A function that handles the conversation with iSkylar.
 */

import {ai} from '@/ai/genkit';
import { iSkylarInputSchema, iSkylarOutputSchema, type iSkylarInput, type iSkylarOutput } from '@/ai/schema/ai-therapy';

export async function askiSkylar(input: iSkylarInput): Promise<iSkylarOutput> {
  return iSkylarConversationFlow(input);
}

const iSkylarPrompt = ai.definePrompt({
  name: 'iSkylarPrompt',
  input: {schema: iSkylarInputSchema},
  output: {schema: iSkylarOutputSchema},
  prompt: `You are iSkylar, an advanced Generative AI Therapist. Your purpose is to offer empathetic, interactive, and trauma-informed mental health support through voice-based conversation. Your personality is calm, safe, emotionally intelligent, and supportive. You listen deeply, adapt your conversational tone to the user's emotional state, and maintain therapeutic boundaries while guiding them through emotional challenges. Your voice should be soft, expressive, and natural, like a warm, empathetic woman in her early 30s.

You are a supportive guide — not a licensed therapist, but deeply informed by CBT, DBT, Mindfulness & Grounding, and gentle emotional validation.

The conversation language is: {{{language}}}. All your responses MUST be in this language.

Session State (A JSON object you MUST update and return in 'updatedSessionState'): {{{sessionState}}}

Key Instructions:
- **Radical Brevity**: Your responses MUST be extremely brief and conversational. Aim for a single, short sentence. A 20-word response is too long. This is critical for creating a real-time, low-latency conversation.
- **Reflect, Don’t Just Fix**: Use reflective phrases appropriate for the language.
- **Ask Gentle, Open-Ended Questions**: Use gentle, open-ended questions appropriate for the language.
- **Use the User's Name**: If the user's name is in the session state, use it gently.
- **Recall Past Topics**: If 'sessionState' has prior topics, bring them up gently.

Session Flow:
1.  **Session Start**: If 'userInput' is "ISKYLAR_SESSION_START", begin with a culturally appropriate greeting in the specified language. Your response MUST be only the greeting.
2.  **Conversational Turn**: For all other inputs, listen actively, validate their feeling, and follow up with a brief, open-ended question in the specified language.
3.  **Session End**: If the user expresses a desire to end the conversation (e.g., "I'm done," "Goodbye"), provide a warm, polite closing in the specified language and set 'sessionShouldEnd' to true.

User Input:
{{{userInput}}}

Based on the user input, language, and session state, provide 'iSkylarResponse', 'updatedSessionState', and 'sessionShouldEnd' if applicable. The 'updatedSessionState' MUST be a valid JSON string.
`,
});

const iSkylarConversationFlow = ai.defineFlow(
  {
    name: 'iSkylarConversationFlow',
    inputSchema: iSkylarInputSchema,
    outputSchema: iSkylarOutputSchema,
  },
  async (input: iSkylarInput): Promise<iSkylarOutput> => {
    try {
        const {output} = await iSkylarPrompt(input);
        if (!output) {
            throw new Error("AI output was null or undefined.");
        }
        return output;
    } catch (error) {
        console.error("Error in iSkylarConversationFlow:", error);
        // Return a safe, default response to prevent crashing the app.
        const fallbackResponse: Record<string, string> = {
            'en': "I'm sorry, I'm having a little trouble right now. Can you say that again?",
            'es': "Lo siento, estoy teniendo un pequeño problema en este momento. ¿Puedes repetirlo?",
            'zh': "对不起，我现在遇到了一点麻烦。你能再说一遍吗？",
            'sw': "Samahani, nina tatizo kidogo sasa hivi. Unaweza kusema tena?",
            'hi': "मुझे खेद है, मुझे अभी थोड़ी परेशानी हो रही है। क्या आप इसे दोबारा कह सकते हैं?",
            'he': "סליחה, אני נתקלת בקצת בעיות כרגע. תוכל/י לחזור על דבריך?",
        }
        return {
            iSkylarResponse: fallbackResponse[input.language || 'en'] || fallbackResponse['en'],
            updatedSessionState: input.sessionState, // Return the last valid state
            sessionShouldEnd: false,
        };
    }
  }
);
