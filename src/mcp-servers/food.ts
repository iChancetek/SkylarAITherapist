
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();
app.use(cors());

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

app.get("/sse", async (req, res) => {
    console.log("[FOOD] Client connected via SSE");
    const transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

app.post("/messages", async (req, res) => {
    res.sendStatus(200);
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`🍔 Food MCP Server running on http://localhost:${PORT}/sse`);
});
