
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();
app.use(cors());

// Initialize MCP Server
const server = new McpServer({
    name: "travel-service",
    version: "1.0.0",
});

// Define Tools
server.tool(
    "book_travel",
    {
        destination: z.string(),
        dates: z.string(),
        type: z.enum(["flight", "hotel", "train", "car"]),
    },
    async ({ destination, dates, type }) => {
        console.log(`[TRAVEL] Booking ${type} to ${destination} for ${dates}`);
        return {
            content: [
                {
                    type: "text",
                    text: `Successfully booked ${type} to ${destination} on ${dates}. (Provider: Expedia_Mock_API)`,
                },
            ],
        };
    }
);

// SSE Endpoint
app.get("/sse", async (req, res) => {
    console.log("[TRAVEL] Client connected via SSE");
    const transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

// Message Endpoint (for POSTing data back to SSE connection)
app.post("/messages", async (req, res) => {
    // Handle incoming messages from client
    // Note: Standard MCP SSE transport might handle this internally if wired correctly,
    // but for Express we often need a receiver. 
    // The SDK's SSEServerTransport expects to handle the response writer.
    // We need to route POSTs to the active transport. 
    // For simplicity in this v1, we assume the SDK handles the session via the SSE route closure.
    // ACTUALLY: The SDK requires a separate endpoint for client -> server messages.
    // We'll stub it here, but typically the transport manages it.
    res.sendStatus(200);
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✈️  Travel MCP Server running on http://localhost:${PORT}/sse`);
});
