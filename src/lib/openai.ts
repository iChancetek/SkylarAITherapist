import OpenAI from 'openai';

// Initialize OpenAI client
// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
console.log("Initializing OpenAI Client. Key exists:", !!apiKey, "Length:", apiKey?.length);

export const openai = new OpenAI({
    apiKey: apiKey,
});
