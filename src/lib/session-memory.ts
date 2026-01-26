import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

export interface SessionMemory {
    userId: string;
    sessionId: string;
    timestamp: Timestamp;
    conversationalThemes: string[];
    emotionalPatterns: string[];
    duration: number;
    keyInsights: string[];
    privacyLevel: 'standard';
}

/**
 * Save a session memory to Firestore
 */
export async function saveSessionMemory(
    userId: string,
    sessionData: {
        conversationalThemes: string[];
        emotionalPatterns: string[];
        duration: number;
        keyInsights: string[];
    }
): Promise<void> {
    try {
        const sessionMemory: Omit<SessionMemory, 'sessionId'> = {
            userId,
            timestamp: Timestamp.now(),
            conversationalThemes: sessionData.conversationalThemes,
            emotionalPatterns: sessionData.emotionalPatterns,
            duration: sessionData.duration,
            keyInsights: sessionData.keyInsights,
            privacyLevel: 'standard',
        };

        await addDoc(collection(db, 'session_memories'), sessionMemory);
    } catch (error) {
        console.error('Failed to save session memory:', error);
    }
}

/**
 * Retrieve recent session memories for context
 */
export async function getRecentMemories(
    userId: string,
    limitCount: number = 3
): Promise<SessionMemory[]> {
    try {
        const q = query(
            collection(db, 'session_memories'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const memories: SessionMemory[] = [];

        querySnapshot.forEach((doc) => {
            memories.push({
                sessionId: doc.id,
                ...doc.data(),
            } as SessionMemory);
        });

        return memories;
    } catch (error) {
        console.error('Failed to retrieve session memories:', error);
        return [];
    }
}

/**
 * Detect if a theme appears frequently across sessions (circular theme)
 */
export function detectCircularThemes(
    currentTheme: string,
    pastMemories: SessionMemory[]
): boolean {
    const themeCount = pastMemories.filter((memory) =>
        memory.conversationalThemes.some((theme) =>
            theme.toLowerCase().includes(currentTheme.toLowerCase()) ||
            currentTheme.toLowerCase().includes(theme.toLowerCase())
        )
    ).length;

    // If theme appears in 2+ of last 3 sessions, it's circular
    return themeCount >= 2;
}

/**
 * Extract session summary from session state JSON
 */
export function extractSessionSummary(sessionStateJSON: string | undefined): {
    conversationalThemes: string[];
    emotionalPatterns: string[];
    keyInsights: string[];
} {
    if (!sessionStateJSON) {
        return {
            conversationalThemes: [],
            emotionalPatterns: [],
            keyInsights: [],
        };
    }

    try {
        const sessionState = JSON.parse(sessionStateJSON);
        return {
            conversationalThemes: sessionState.conversationalThemes || [],
            emotionalPatterns: sessionState.emotionalPatterns || [],
            keyInsights: sessionState.keyInsights || [],
        };
    } catch {
        return {
            conversationalThemes: [],
            emotionalPatterns: [],
            keyInsights: [],
        };
    }
}
