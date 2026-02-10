import { NextApiRequest, NextApiResponse } from "next";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        console.log("[CALENDAR] Client connected via SSE");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const transport = new SSEServerTransport("/api/mcp/calendar/message", res);
        await server.connect(transport);

        req.on("close", () => {
            console.log("[CALENDAR] Client disconnected");
        });
    } else {
        res.status(200).send("OK");
    }
}
