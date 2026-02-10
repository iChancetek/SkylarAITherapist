
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();
app.use(cors());

const server = new McpServer({
    name: "calendar-service",
    version: "1.0.0",
});

server.tool(
    "manage_calendar",
    {
        action: z.enum(["create", "list"]),
        title: z.string(),
        time: z.string(),
    },
    async ({ action, title, time }) => {
        console.log(`[CALENDAR] ${action}: ${title} at ${time}`);
        return {
            content: [
                {
                    type: "text",
                    text: `Calendar updated: ${title} set for ${time}. (Provider: GoogleCalendar_Mock_API)`,
                },
            ],
        };
    }
);

app.get("/sse", async (req, res) => {
    console.log("[CALENDAR] Client connected via SSE");
    const transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

app.post("/messages", async (req, res) => {
    res.sendStatus(200);
});

const PORT = 3003;
app.listen(PORT, () => {
    console.log(`📅 Calendar MCP Server running on http://localhost:${PORT}/sse`);
});
