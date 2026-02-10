import { NextApiRequest, NextApiResponse } from "next";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const server = new McpServer({
    name: "food-service",
    version: "1.0.0",
});

server.tool(
    "order_food",
    {
        item: z.string(),
        deliveryAddress: z.string().optional(),
    },
    async ({ item, deliveryAddress }) => {
        console.log(`[FOOD] Ordering ${item} to ${deliveryAddress || "Home"}`);
        return {
            content: [
                {
                    type: "text",
                    text: `Order confirmed: ${item} is being prepared. ETA: 30 mins. (Provider: UberEats_Mock_API)`,
                },
            ],
        };
    }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        console.log("[FOOD] Client connected via SSE");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const transport = new SSEServerTransport("/api/mcp/food/message", res);
        await server.connect(transport);

        req.on("close", () => {
            console.log("[FOOD] Client disconnected");
        });
    } else {
        res.status(200).send("OK");
    }
}
