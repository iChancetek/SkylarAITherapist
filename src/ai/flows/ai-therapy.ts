'use server';
/**
 * @fileOverview OpenAI-based therapy conversation flow
 */

import { getOpenAIClient } from '@/lib/openai';
import type { iSkylarInput, iSkylarOutput } from '@/ai/schema/ai-therapy';
import type { AgentId } from '@/ai/agent-config';
import { SYSTEM_PROMPTS } from '@/ai/agent-prompts';
import { AGENTS } from '@/ai/agent-config';
import { TAVILY_TOOL_DEFINITION, performTavilySearch } from '@/ai/tools/tavily';

import { getAllUserMemories } from '@/lib/session-memory';

export async function askiSkylar(input: iSkylarInput): Promise<iSkylarOutput> {
  const userInput = input.userInput || '';
  const sessionState = input.sessionState || '{}';
  const language = input.language || 'en';
  const wasInterrupted = input.wasInterrupted || false;
  const interruptedDuring = input.interruptedDuring || '';
  const agentId = input.agentId || 'skylar';
  const userId = input.userId;

  // 1. Get the correct system prompt for the selected agent
  let systemPrompt = SYSTEM_PROMPTS[agentId as AgentId] || SYSTEM_PROMPTS.skylar;

  // Append language instruction
  systemPrompt += `\n\n## Conversation Language
The conversation language is: ${language}. All your responses MUST be in this language.`;

  // Append Long-Term Memory Context
  if (userId) {
    try {
      const pastMemories = await getAllUserMemories(userId);
      if (pastMemories.length > 0) {
        const memoryContext = pastMemories.slice(0, 30).map(m => {
          const date = m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().toLocaleDateString() : 'Unknown Date';
          const insights = m.keyInsights.length > 0 ? m.keyInsights.join(' ') : 'No key insights recorded.';
          return `- [${date}]: ${insights}`;
        }).join('\n');

        systemPrompt += `\n\n## LONG-TERM MEMORY (Past Sessions)
You have access to the user's past session insights. Use this to recall details, names, and themes. NEVER mention "according to my database" or "long term memory". Just "Know" it naturally.
${memoryContext}`;
      }
    } catch (e) {
      console.error("Failed to load long-term memory:", e);
    }
  }

  // 2. Build User context
  let userMessage = userInput;

  if (input.userInput === "ISKYLAR_SESSION_START") {
    // AGENT INTRODUCTION RULE (MANDATORY)
    userMessage = `[SYSTEM]: The user has just started a session/switched to you. 
    State who you are naturally (e.g., "Hey, I'm ${AGENTS[agentId as AgentId].name}...").
    Set the tone immediately based on your persona.
    Keep it brief (10-20 words).`;
  } else if (wasInterrupted && interruptedDuring) {
    userMessage = `[INTERRUPTION]: The user interrupted you. You were saying: "${interruptedDuring}"
  Recover seamlessly ("As I was saying..." or "Anyway...").
  User's new input: ${userInput}`;
  }

  // 3. Execution via LangGraph
  try {
    const { appGraph } = await import('@/ai/langgraph/graph');
    const { SystemMessage, HumanMessage } = await import('@langchain/core/messages');

    const inputs = {
      messages: [
        new SystemMessage(systemPrompt),
        new HumanMessage(`Session State: ${sessionState}\n\nUser Input: ${userMessage}`)
      ],
      sender: "user"
    };

    const config = {
      configurable: {
        thread_id: userId || "anonymous",
      }
    };

    const result = await appGraph.invoke(inputs, config);
    const lastMessage = result.messages[result.messages.length - 1];

    // Explicitly handle string vs complex content
    let finalResponse = "";
    if (typeof lastMessage.content === 'string') {
      finalResponse = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      // Handle complex content (e.g. text + image_url blocks) if needed, usually just text for this app
      finalResponse = lastMessage.content.map((c: any) => c.text || '').join('');
    }

    // Determine if session should end
    const sessionShouldEnd = userInput.toLowerCase().includes('goodbye') ||
      userInput.toLowerCase().includes('end session') ||
      userInput.toLowerCase().includes("i'm done");

    const updatedSessionState = sessionState;

    return {
      iSkylarResponse: finalResponse || "I'm listening.",
      updatedSessionState,
      sessionShouldEnd,
    };

  } catch (error) {
    console.error("LangGraph Execution Error:", error);
    return {
      iSkylarResponse: "I'm having a bit of trouble thinking right now. Can you say that again?",
      updatedSessionState: sessionState,
      sessionShouldEnd: false,
    };
  }
}
