
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';

// Try loading from .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function verifyOpenAI() {
    console.log("----------------------------------------");
    console.log("🔍 OpenAI Connectivity Test");
    console.log("----------------------------------------");

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error("❌ ERROR: OPENAI_API_KEY is missing from environment variables.");
        console.log("Checked locations:");
        console.log(" - " + path.resolve(process.cwd(), '.env.local'));
        console.log(" - " + path.resolve(process.cwd(), '.env'));
        process.exit(1);
    }

    console.log(`✅ API Key found (Length: ${apiKey.length} chars)`);
    console.log(`🔑 Key prefix: ${apiKey.substring(0, 7)}...`);

    const openai = new OpenAI({ apiKey });

    // Test 1: Chat Completion (GPT-4)
    try {
        console.log("\n📡 Testing Chat Completion (gpt-4-turbo-preview)...");
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [{ role: "user", content: "Reply with the word 'Success'." }],
            max_tokens: 10,
        });
        console.log("✅ Chat Response:", completion.choices[0].message.content);
    } catch (error: any) {
        console.error("❌ Chat Completion Failed:");
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`   Message: ${error.message}`);
        }
    }

    // Test 2: TTS (tts-1)
    try {
        console.log("\n🔊 Testing Text-to-Speech (tts-1)...");
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "nova",
            input: "System check complete.",
        });
        const buffer = await mp3.arrayBuffer();
        console.log(`✅ TTS Success: Received audio buffer (${buffer.byteLength} bytes)`);
    } catch (error: any) {
        console.error("❌ TTS Failed:");
        console.error(`   Message: ${error.message}`);
    }

    console.log("\n----------------------------------------");
}

verifyOpenAI();
