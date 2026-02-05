
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';

const envPath = path.resolve(process.cwd(), '.env');

async function verify() {
    let apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey && fs.existsSync(envPath)) {
        console.log("Reading .env manually...");
        try {
            // Try reading as UTF-16LE (ucs2)
            const content = fs.readFileSync(envPath, 'ucs2');
            if (content.includes('OPENAI_API_KEY')) {
                console.log("✅ Found OPENAI_API_KEY in UTF-16LE content");

                // Simple manual parsing for LINE based env file
                const lines = content.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('OPENAI_API_KEY=')) {
                        apiKey = trimmed.substring('OPENAI_API_KEY='.length).trim();
                        // Remove quotes if present
                        if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
                            apiKey = apiKey.slice(1, -1);
                        }
                        break;
                    }
                }
            } else {
                // Fallback to utf8 just in case
                const contentUtf8 = fs.readFileSync(envPath, 'utf8');
                if (contentUtf8.includes('OPENAI_API_KEY')) {
                    console.log("✅ Found OPENAI_API_KEY in UTF-8 content");
                    // Parse...
                    // (Simplified for this script)
                }
            }
        } catch (e) {
            console.error("Error reading .env:", e);
        }
    }

    if (!apiKey) {
        console.error("❌ Could not load OPENAI_API_KEY from .env (checked UTF-8 and UTF-16LE)");
        process.exit(1);
    }

    console.log(`✅ key loaded (length: ${apiKey.length})`);

    const openai = new OpenAI({ apiKey });

    console.log("Attempting completion with model: gpt-5.2");

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [{ role: "user", content: "Hello, are you GPT-5.2?" }],
            max_completion_tokens: 50
        });

        console.log("✅ Success! Response:");
        console.log(completion.choices[0].message.content);
    } catch (error: any) {
        console.error("❌ Error verifying OpenAI:", error.message);
    }
}

verify();
