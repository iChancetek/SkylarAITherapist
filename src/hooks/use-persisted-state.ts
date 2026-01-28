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
    // Track which key the current state belongs to, to prevent cross-contamination during key switches
    const loadedKey = useRef<string | null>(null);

    // Load from IndexedDB on mount or key change
    useEffect(() => {
        async function loadState() {
            // Reset hydration status for new key to prevent flashing/stale writes
            setIsHydrated(false);

            try {
                const persisted = await get(key);
                if (persisted !== undefined) {
                    setState(persisted);
                }
                // Mark this key as loaded so we are safe to write back to it
                loadedKey.current = key;
            } catch (error) {
                console.warn(`Failed to load persisted state for key "${key}"`, error);
                // Even on error, we accept the current (default) state as valid for this key
                loadedKey.current = key;
            } finally {
                setIsHydrated(true);
            }
        }
        loadState();
    }, [key]);

    // Save to IndexedDB on change
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // CRITICAL: Only write if the key matches the one we most recently loaded.
        // This prevents race conditions where 'state' is still from the previous user (Key A) 
        // but the component has re-rendered with the new user (Key B), causing us to overwrite 
        // User B's data with User A's state before the loader can run.
        if (isHydrated && loadedKey.current === key) {
            set(key, state).catch(err => console.error(`Failed to save state for key "${key}"`, err));
        }
    }, [key, state, isHydrated]);

    const clearState = async () => {
        await del(key);
        setState(initialValue);
    };

    return [state, setState, isHydrated, clearState] as const;
}
