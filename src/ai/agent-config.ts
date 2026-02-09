/**
 * @fileOverview Lightweight agent definitions for Client Components.
 * SAFE FOR CLIENT-SIDE IMPORTS
 */

export type AgentId = 'skylar' | 'chancellor' | 'sydney' | 'hailey' | 'chris';

export interface AgentMetadata {
    id: AgentId;
    name: string;
    role: string;
    description: string;
    voiceId?: string; // Optional voice ID for TTS
}

export const AGENTS: Record<AgentId, AgentMetadata> = {
    skylar: {
        id: 'skylar',
        name: 'Skylar',
        role: 'Therapist',
        description: 'Warm, empathetic, professional therapist.',
        voiceId: 'alloy'
    },
    chancellor: {
        id: 'chancellor',
        name: 'Chancellor',
        role: 'CEO, Founder & Tech Expert',
        description: 'Brilliant tech founder, friend, and builder.',
        voiceId: 'onyx'
    },
    sydney: {
        id: 'sydney',
        name: 'Sydney',
        role: 'The Bright Optimist',
        description: 'Friendly, upbeat, sunshine energy.',
        voiceId: 'nova'
    },
    hailey: {
        id: 'hailey',
        name: 'Hailey',
        role: 'The Clever Best Friend',
        description: 'Witty, smart, playful sarcasm.',
        voiceId: 'shimmer'
    },
    chris: {
        id: 'chris',
        name: 'Chris',
        role: 'The Chill Real-One',
        description: 'Relaxed, grounded, street-smart.',
        voiceId: 'echo'
    },
};
