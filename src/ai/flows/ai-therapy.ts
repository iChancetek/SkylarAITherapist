'use server';
/**
 * @fileOverview OpenAI-based therapy conversation flow
 */

import { getOpenAIClient } from '@/lib/openai';
import type { iSkylarInput, iSkylarOutput } from '@/ai/schema/ai-therapy';
import { SYSTEM_PROMPTS, AgentId } from '@/ai/personas';
import { TAVILY_TOOL_DEFINITION, performTavilySearch } from '@/ai/tools/tavily';

export async function askiSkylar(input: iSkylarInput): Promise<iSkylarOutput> {
  const userInput = input.userInput || '';
  const sessionState = input.sessionState || '{}';
  const language = input.language || 'en';
  const wasInterrupted = input.wasInterrupted || false;
  const interruptedDuring = input.interruptedDuring || '';
  const agentId = input.agentId || 'skylar';

  // 1. Get the correct system prompt for the selected agent
  let systemPrompt = SYSTEM_PROMPTS[agentId as AgentId] || SYSTEM_PROMPTS.skylar;

  // Append language instruction
  systemPrompt += `\n\n## Conversation Language
The conversation language is: ${language}. All your responses MUST be in this language.`;

  // 2. Build User context
  let userMessage = userInput;

  if (input.userInput === "ISKYLAR_SESSION_START") {
    userMessage = "This is the start of the session. Give a warm, brief greeting (10-20 words) in the specified language.";
  } else if (wasInterrupted && interruptedDuring) {
    userMessage = `[INTERRUPTION CONTEXT]: The user just interrupted you mid-response. You were saying: "${interruptedDuring}"
  Acknowledge naturally: "Okay—" or "Yeah, go ahead" then respond to their new input.
  
  User's new input: ${userInput}`;
  }

  // 3. Prepare Messages
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Session State: ${sessionState}\n\nUser Input: ${userMessage}` }
  ];

  const tools = [TAVILY_TOOL_DEFINITION];

  // 4. Call OpenAI (Handling Tool Execution Loop)
  const openai = await getOpenAIClient();

  let finalResponse = "I'm here.";
  const MAX_TURNS = 5; // Prevent infinite loops
  let turnCount = 0;

  while (turnCount < MAX_TURNS) {
    turnCount++;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
      temperature: agentId !== 'skylar' ? 0.9 : 0.8, // Slightly more creative for companions
      max_tokens: 250, // Slightly increased for tool/richer content
    });

    const choice = completion.choices[0];
    const message = choice.message;

    // Add the model's response to history
    messages.push(message);

    // If there are tool calls, execute them
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if ((toolCall as any).function?.name === 'tavily_search') {
          const args = JSON.parse((toolCall as any).function.arguments);
          // Execute silent search
          const searchResult = await performTavilySearch(args.query);

          // Add tool result to conversation
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: searchResult
          });
        }
      }
      // Loop back to get the model's response to the tool output
      continue;
    }

    // Valid text response
    if (message.content) {
      finalResponse = message.content;
      break;
    }

    break; // Should not happen if no content and no tool calls
  }


  // Determine if session should end
  const sessionShouldEnd = userInput.toLowerCase().includes('goodbye') ||
    userInput.toLowerCase().includes('end session') ||
    userInput.toLowerCase().includes("i'm done");

  // Update session state (simplified)
  const updatedSessionState = sessionState;

  return {
    iSkylarResponse: finalResponse,
    updatedSessionState,
    sessionShouldEnd,
  };
}
