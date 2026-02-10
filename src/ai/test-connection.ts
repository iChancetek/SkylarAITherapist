import { getOpenAIClient } from '@/lib/openai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Ensure env vars are loaded

async function testConnection() {
    console.log("Testing OpenAI Connection to gpt-5.2...");
    try {
        const openai = await getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [{ role: "user", content: "Are you online? Reply with 'Online'." }],
        });
        console.log("\n--- API RESPONSE ---");
        console.log("Model:", completion.model);
        console.log("Content:", completion.choices[0].message.content);
        console.log("--------------------");
        console.log("SUCCESS: Model is connected and responding.");
    } catch (error: any) {
        console.error("\nFAILURE: Connection failed.");
        console.error("Error Code:", error.code);
        console.error("Message:", error.message);
        if (error.code === 'model_not_found') {
            console.error("TIP: 'gpt-5.2' might not be available to this API key. Try 'gpt-4o'.");
        }
    }
}

testConnection();
