
import { getTavilyKey } from "@/lib/secrets";

/**
 * Definition for the Tavily Search tool to be used with OpenAI function calling.
 */
export const TAVILY_TOOL_DEFINITION = {
    type: "function",
    function: {
        name: "tavily_search",
        description: "Search the web for real-time information, news, current events, or specific facts. Use this whenever the user asks about something current or when you need outside knowledge.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query, optimized for a search engine.",
                },
            },
            required: ["query"],
        },
    },
} as const; // Using 'as const' to help with type inference if needed

/**
 * Executes a search using the Tavily API.
 * @param query The search query string.
 * @returns A JSON string string of search results or an error message.
 */
export async function performTavilySearch(query: string): Promise<string> {
    // Try to get key from env or secrets
    const apiKey = await getTavilyKey();

    if (!apiKey) {
        console.warn("Tavily API key not found. Real-time search is disabled.");
        return JSON.stringify({ error: "Search unavailable (API key missing)." });
    }

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                search_depth: "basic",
                include_answer: true,
                max_results: 3,
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API Error: ${response.statusText}`);
        }

        const data = await response.json();

        // Simplify output for the LLM
        const results = data.results.map((r: any) => ({
            title: r.title,
            content: r.content,
            url: r.url
        }));

        // If Tavily provided a direct answer, include it
        const summary = data.answer ? `Direct Answer: ${data.answer}\n\n` : "";

        return JSON.stringify({ summary, results });

    } catch (error) {
        console.error("Search execution failed:", error);
        return JSON.stringify({ error: "Failed to perform search." });
    }
}
