import { config } from 'dotenv';
config();

import '@/ai/flows/ai-therapy.ts';
import '@/ai/flows/safety-net.ts';
import '@/ai/flows/tts.ts';
import '@/ai/flows/get-text-response.ts';
import '@/ai/flows/get-spoken-response.ts';
