import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Manager for MCP Server Connections.
 * This class handles connecting to multiple MCP servers and aggregating their tools
 * into LangChain-compatible tools for the Agent.
 */
export class MCPConnectionManager {
    private clients: Map<string, Client>;

    constructor() {
        this.clients = new Map();
    }

    /**
     * Connects to an MCP Server via Server-Sent Events (SSE).
     * Ideal for remote servers or dockerized containers.
     */
    async connectToSSEServer(serverId: string, url: string) {
        if (this.clients.has(serverId)) return;

        const transport = new SSEClientTransport(new URL(url));
        const client = new Client({
            name: "iSkylar-Client",
            version: "1.0.0",
        }, {
            capabilities: {}
        });

        await client.connect(transport);
        this.clients.set(serverId, client);
        console.log(`[MCP] Connected to ${serverId} via SSE`);
    }

    /**
     * Connects to a list of default MCP servers.
     * This allows the Agent to have tools ready immediately on startup.
     */
    async connectToDefaultServers() {
        // Determine Base URL (Production vs Local)
        // In Server Components/Next.js, process.env.NEXT_PUBLIC_APP_URL is standard, 
        // or we fallback to localhost:3000 for dev.
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

        const defaults = [
            { id: "travel-service", url: `${baseUrl}/api/mcp/travel` },
            { id: "food-service", url: `${baseUrl}/api/mcp/food` },
            { id: "calendar-service", url: `${baseUrl}/api/mcp/calendar` }
        ];

        for (const s of defaults) {
            try {
                // Ensure we don't crash the whole app if one service is down
                console.log(`[MCP] Connecting to ${s.id} at ${s.url}`);
                await this.connectToSSEServer(s.id, s.url);
            } catch (e) {
                console.log(`[MCP] Could not connect to default server ${s.id}:`, e);
            }
        }
    }

    /**
     * Retrieves all tools from all connected MCP servers
     * and converts them to LangChain DynamicStructuredTools.
     */
    async getLangChainTools(): Promise<DynamicStructuredTool[]> {
        // Validation: Ensure defaults are attempted at least once
        if (this.clients.size === 0) {
            await this.connectToDefaultServers();
        }

        const aggregatedTools: DynamicStructuredTool[] = [];

        for (const [serverId, client] of this.clients.entries()) {
            try {
                // MCP SDK v1.0.0 usage
                const resources = await client.listTools();

                if (!resources || !resources.tools) continue;

                for (const tool of resources.tools) {
                    aggregatedTools.push(new DynamicStructuredTool({
                        name: `${serverId}_${tool.name}`, // Namespaced to avoid collisions
                        description: tool.description || `Tool from ${serverId}`,
                        schema: z.object({
                            // For simplicity in this bridge, we treat args as a generic JSON string
                            // In a full implementation, we would map the JSON Schema to Zod dynamically.
                            // Here we use a catch-all for flexibility in the prototype.
                            params: z.string().describe("JSON string of arguments matching the tool's schema")
                        }),
                        func: async ({ params }) => {
                            const args = JSON.parse(params);
                            const result = await client.callTool({
                                name: tool.name,
                                arguments: args
                            });
                            return JSON.stringify(result);
                        }
                    }));
                }
            } catch (error) {
                console.error(`[MCP] Failed to fetch tools from ${serverId}:`, error);
            }
        }

        return aggregatedTools;
    }
}

// Singleton instance
export const mcpManager = new MCPConnectionManager();
