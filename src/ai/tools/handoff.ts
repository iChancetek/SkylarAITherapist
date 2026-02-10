import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const handoffToAgentTool = new DynamicStructuredTool({
    name: "handoff_to_agent",
    description: "Use this tool to transfer the conversation to another agent when the user explicitly requests them (e.g., 'Let me talk to Sydney').",
    schema: z.object({
        targetAgentId: z.enum(['skylar', 'chancellor', 'sydney', 'hailey', 'chris']).describe("The ID of the agent to transfer to."),
        reason: z.string().describe("The reason for the handoff."),
    }),
    func: async ({ targetAgentId, reason }) => {
        return JSON.stringify({
            status: "success",
            targetAgentId,
            message: `Handing off to ${targetAgentId} because: ${reason}`
        });
    }
});
