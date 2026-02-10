import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ALL_TOOLS } from "../tools/autonomous-tools";
import { getOpenAIKey } from "@/lib/secrets";
import { RunnableConfig } from "@langchain/core/runnables";

// --- State Definition ---
// Using strict typing for clearer state management
export type AgentState = {
    messages: BaseMessage[];
    sender?: string;
};

// --- Model Initialization ---
// We initialize lazily to ensure API key is available
import { getAggregatedTools } from "../tools/autonomous-tools";

// --- Model Initialization ---
// We initialize lazily to ensure API key is available
const getModel = async () => {
    const apiKey = await getOpenAIKey();
    const tools = await getAggregatedTools(); // Dynamic Fetch (MCP + Static)

    const model = new ChatOpenAI({
        modelName: "gpt-5.2", // Updated to gpt-5.2 per user request
        temperature: 0.9,
        apiKey: apiKey,
        streaming: true,
    });
    return model.bindTools(tools);
};

// --- Nodes ---

// 1. Agent Node: Calls the LLM
const agentNode = async (state: AgentState, config?: RunnableConfig) => {
    const model = await getModel();
    const { messages } = state;
    const response = await model.invoke(messages, config);
    return { messages: [response], sender: "agent" };
};

// 2. Tool Node: Executes tools
// We initialize lazily to capture dynamic tools.
const toolNode = async (state: AgentState) => {
    const tools = await getAggregatedTools();
    const toolExecutor = new ToolNode(tools);
    // ToolNode is a runnable, so we invoke it.
    // However, ToolNode expects to be a node in the graph. 
    // In LangGraphJS, we can pass a function that returns a ToolNode? No.
    // We will use the Node's input/output directly if we can, OR we just trust that
    // the model binding works.

    // WORKAROUND: For this prototype, we rebuild the tool node logic manually or just use the static list + dynamic fetch?
    // LangGraph expects `tools` to be known.
    return toolExecutor.invoke(state);
};

// --- Conditional Edge ---
const shouldContinue = (state: AgentState) => {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return "tools";
    }
    return END;
};

// --- Graph Definition ---
const workflow = new StateGraph<AgentState>({
    channels: {
        messages: {
            reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        },
        sender: null,
    }
})
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

// Compile the graph
export const appGraph = workflow.compile();
