import { config } from 'dotenv';
config();

import '@/ai/flows/personalized-therapy.ts';
import '@/ai/flows/safety-net.ts';
import '@/ai/flows/ai-therapy.ts';
import '@/ai/flows/emotional-cue-recognition.ts';