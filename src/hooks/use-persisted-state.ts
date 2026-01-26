import { useState, useEffect, useRef } from 'react';
import { get, set, del } from 'idb-keyval';

/**
 * A hook that syncs state to IndexedDB for persistence across reloads/closes.
 * It uses a "stale-while-revalidate" approach: correct initial state (default), then hydrate from IDB.
 */
export function usePersistedState<T>(key: string, initialValue: T) {
    const [state, setState] = useState<T>(initialValue);
    const [isHydrated, setIsHydrated] = useState(false);
    const isFirstRender = useRef(true);

    // Load from IndexedDB on mount
    useEffect(() => {
        async function loadState() {
            try {
                const persisted = await get(key);
                if (persisted !== undefined) {
                    setState(persisted);
                }
            } catch (error) {
                console.warn(`Failed to load persisted state for key "${key}"`, error);
            } finally {
                setIsHydrated(true);
            }
        }
        loadState();
    }, [key]);

    // Save to IndexedDB on change (debounced could be better for high frequency, but IDB is fast enough for chat)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Don't overwrite IDB with default state before hydration check!
            // Actually, preventing this write until hydration is safer.
            return;
        }

        // Only write if we are hydrated to avoid overwriting existing data with initial blank state
        if (isHydrated) {
            set(key, state).catch(err => console.error(`Failed to save state for key "${key}"`, err));
        }
    }, [key, state, isHydrated]);

    const clearState = async () => {
        await del(key);
        setState(initialValue);
    };

    return [state, setState, isHydrated, clearState] as const;
}
