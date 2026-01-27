import OpenAI from 'openai';
import { getOpenAIKey } from './secrets';

// Lazy initialization wrapper
export async function getOpenAIClient(): Promise<OpenAI> {
    const apiKey = await getOpenAIKey();

    console.log("Initializing OpenAI Client. Key exists:", !!apiKey, "Length:", apiKey?.length);
    if (!apiKey) {
        console.error("CRITICAL: No OpenAI API Key found even after Secret Fetch.");
    }

    return new OpenAI({
        apiKey: apiKey,
    });
}

