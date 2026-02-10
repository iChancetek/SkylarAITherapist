import { sendEmailTool } from "./email";
import { tavilySearchTool } from "./tavily";
import { mcpManager } from "../mcp/mcp-client";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { handoffToAgentTool } from "./handoff";

// --- Production Helpers ---
const serviceUnavailable = (serviceName: string) => {
    return JSON.stringify({
        status: "error",
        error: "SERVICE_UNAVAILABLE",
        message: `${serviceName} is not configured or connected via MCP.`
    });
};

// --- Fallback/Static Tool Definitions ---
// These are used if NO MCP server provides the capability.

export const bookTravelTool = new DynamicStructuredTool({
    name: "book_travel_fallback", // Renamed to avoid collision if MCP provides "book_travel"
    description: "Fallback tool for booking travel if no MCP server is connected.",
    schema: z.object({
        destination: z.string(),
        dates: z.string(),
        type: z.enum(["flight", "hotel", "train", "car"]),
    }),
    func: async () => serviceUnavailable("Travel MCP Server"),
});

export const orderFoodTool = new DynamicStructuredTool({
    name: "order_food_fallback",
    description: "Fallback tool for ordering food if no MCP server is connected.",
    schema: z.object({
        item: z.string(),
        deliveryAddress: z.string().optional(),
    }),
    func: async () => serviceUnavailable("Food Delivery MCP Server"),
});

export const manageCalendarTool = new DynamicStructuredTool({
    name: "manage_calendar_fallback",
    description: "Fallback tool for calendar if no MCP server is connected.",
    schema: z.object({
        action: z.enum(["create", "list"]),
        title: z.string(),
        time: z.string(),
    }),
    func: async () => serviceUnavailable("Calendar MCP Server"),
});

/**
 * Aggregates Static Tools + Dynamic MCP Tools.
 * This must be awaited before initializing the graph.
 */
export const getAggregatedTools = async () => {
    // 1. Static Tools (Always available)
    const staticTools = [
        sendEmailTool,       // Real (Nodemailer)
        tavilySearchTool,    // Real (Tavily API)
        bookTravelTool,      // Fallback
        orderFoodTool,       // Fallback
        manageCalendarTool,   // Fallback
        handoffToAgentTool   // Native Handoff
    ];

    // 2. Dynamic Tools (From connected MCP servers)
    // In a real app, you would call connectToSSEServer() somewhere before this (e.g., app init).
    // mcpManager.connectToSSEServer("travel_server", "http://localhost:3001/sse");

    const mcpTools = await mcpManager.getLangChainTools();
    console.log(`[MCP] Discovered ${mcpTools.length} tools from connected servers.`);

    return [...staticTools, ...mcpTools];
};

// Legacy array for immediate import (contains static only until init)
export const ALL_TOOLS = [sendEmailTool, tavilySearchTool, bookTravelTool, orderFoodTool, manageCalendarTool, handoffToAgentTool];
