import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';

export interface SessionMemory {
    userId: string;
    sessionId: string;
    timestamp: Timestamp;
    conversationalThemes: string[];
    emotionalPatterns: string[];
    duration: number;
    keyInsights: string[];
    transcript: { speaker: string; text: string; timestamp: number }[];
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
        transcript: { speaker: string; text: string; timestamp: number }[];
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
            transcript: sessionData.transcript,
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
    limitCount: number = 5
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
 * Get full details of a specific session (including transcript)
 */
export async function getSessionDetails(sessionId: string): Promise<SessionMemory | null> {
    try {
        const docRef = doc(db, 'session_memories', sessionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                sessionId: docSnap.id,
                ...docSnap.data()
            } as SessionMemory;
        }
        return null;
    } catch (error) {
        console.error("Failed to fetch session details:", error);
        return null;
    }
}

/**
 * Retrieve ALL past session summaries (lightweight) for Long-Term Context
 */
export async function getAllUserMemories(userId: string): Promise<SessionMemory[]> {
    try {
        // In a real production app with thousands of sessions, we'd use a separate summary collection 
        // or a cursor-based pagination. For now, fetching all summaries (metadata) is fine.
        // We will exclude the 'transcript' field if possible to save bandwidth, 
        // but Firestore client SDK doesn't support 'select' fields easily without Admin SDK.
        // So we just fetch and map.

        const q = query(
            collection(db, 'session_memories'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const memories: SessionMemory[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            memories.push({
                sessionId: doc.id,
                userId: data.userId,
                timestamp: data.timestamp,
                conversationalThemes: data.conversationalThemes,
                emotionalPatterns: data.emotionalPatterns,
                duration: data.duration,
                keyInsights: data.keyInsights,
                privacyLevel: data.privacyLevel,
                transcript: [], // Don't load full transcript into memory to keep it light
            } as SessionMemory);
        });

        return memories;
    } catch (error) {
        console.error('Failed to retrieve all user memories:', error);
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
