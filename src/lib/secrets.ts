
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

// Cache the client and the secret to avoid repeated API calls
let client: SecretManagerServiceClient | null = null;
let cachedOpenAiKey: string | null = null;

const PROJECT_ID = "skylar-ai-voice-therapy";
const SECRET_NAME = "OPENAI_API_KEY";

/**
 * Fetches the OpenAI API Key from Google Secret Manager.
 * Uses a cached local value if available.
 */
export async function getOpenAIKey(): Promise<string> {
    // 1. Check if we already have it in standard env vars (local dev or successfully injected)
    if (process.env.OPENAI_API_KEY) {
        console.log("[Secrets] Found OPENAI_API_KEY in process.env");
        return process.env.OPENAI_API_KEY;
    }

    // 2. Return cached value if we fetched it previously
    if (cachedOpenAiKey) {
        return cachedOpenAiKey;
    }

    try {
        console.log("[Secrets] Fetching OPENAI_API_KEY from Google Secret Manager...");

        // Initialize client lazily
        if (!client) {
            client = new SecretManagerServiceClient();
        }

        const name = `projects/${PROJECT_ID}/secrets/${SECRET_NAME}/versions/latest`;

        const [version] = await client.accessSecretVersion({
            name: name,
        });

        const payload = version.payload?.data?.toString();

        if (!payload) {
            throw new Error("Secret payload was empty");
        }

        // Cache it
        cachedOpenAiKey = payload;
        console.log("[Secrets] Successfully fetched and cached OPENAI_API_KEY");
        return payload;

    } catch (error) {
        console.error("[Secrets] Failed to fetch OPENAI_API_KEY:", error);
        // In production, this likely means we need to fail, but we'll return empty string 
        // to let the caller handle the specific error (e.g. 401 from OpenAI).
        throw new Error(`Failed to load OpenAI Key: ${error instanceof Error ? error.message : String(error)}`);
    }
}
