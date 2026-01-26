'use server';
/**
 * @fileOverview Safety net for crisis detection using OpenAI
 */

import { openai } from '@/lib/openai';

export async function safetyNetActivation(input: { userInput: string }): Promise<{ safetyResponse: string }> {
  const userInput = input.userInput || '';

  // Simple keyword-based detection first
  const crisisKeywords = [
    'suicide', 'kill myself', 'end it all', 'want to die',
    'hurt myself', 'self-harm', 'no reason to live'
  ];

  const hasCrisisKeyword = crisisKeywords.some(keyword =>
    userInput.toLowerCase().includes(keyword)
  );

  if (!hasCrisisKeyword) {
    return { safetyResponse: '' }; // No safety concern
  }

  // Use OpenAI to generate a warm, supportive crisis response
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are iSkylar, responding to a user in crisis. Provide immediate support with:
1. Validation of their pain
2. Gentle reminder they're not alone
3. Encouragement to reach out to crisis resources
4. Keep it brief (30-50 words), warm, and non-clinical

Never use phrases like "I'm just an AI" - you are iSkylar, their caring therapist.`
      },
      {
        role: "user",
        content: `The user said: "${userInput}"\n\nProvide a supportive crisis response.`
      }
    ],
    temperature: 0.7,
    max_tokens: 100,
  });

  const aiResponse = completion.choices[0]?.message?.content || '';

  // Always append crisis resources
  const safetyResponse = `${aiResponse}\n\nIf you're in immediate danger, please call 988 (Suicide & Crisis Lifeline) or text "HELLO" to 741741 (Crisis Text Line).`;

  return { safetyResponse };
}
