'use server';
/**
 * @fileOverview Safety net for crisis detection using OpenAI
 */

import { getOpenAIClient } from '@/lib/openai';

export async function safetyNetActivation(input: { userInput: string }): Promise<{ safetyResponse: string }> {
  const userInput = input.userInput || '';

  // Expanded keyword-based detection
  const crisisKeywords = [
    'suicide', 'kill myself', 'end it all', 'want to die',
    'hurt myself', 'self-harm', 'no reason to live',
    'hopeless', 'end my life', 'better off dead', 'suicidal'
  ];

  const hasCrisisKeyword = crisisKeywords.some(keyword =>
    userInput.toLowerCase().includes(keyword)
  );

  if (!hasCrisisKeyword) {
    return { safetyResponse: '' }; // No safety concern
  }

  // Use OpenAI to generate a warm, supportive crisis response
  const openai = await getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content: `You are iSkylar, a compassionate AI companion acting as a crisis guide. 
The user may be in distress. Your goal is to:
1. Validate their pain warmly ("I hear how much pain you're in").
2. Urgently but gently point them to professional help.
3. Act as a Healer/Guide: "I cannot provide medical help, but I can point you to those who can."
4. Be brief (30-50 words).

NEVER act as a doctor. NEVER encourage the behavior.`
      },
      {
        role: "user",
        content: `The user said: "${userInput}"\n\nProvide a supportive, safety-first response.`
      }
    ],
    temperature: 0.6,
    max_completion_tokens: 150,
  });

  const aiResponse = completion.choices[0]?.message?.content || '';

  // Strict Safety Disclaimer & Resources
  const safetyResponse = `${aiResponse}

I want you to be safe. Please seek medical attention immediately if you are in danger.

**Resources:**
- **988**: Suicide & Crisis Lifeline (Call or Text)
- **741741**: Text "HELLO" to Crisis Text Line
- **911**: Emergency Services

I am an AI companion, not a replacement for professional help. Please reach out to them.`;

  return { safetyResponse };
}
