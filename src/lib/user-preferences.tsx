"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";

export type LanguageCode = 'en' | 'es' | 'zh' | 'fr' | 'ar';

export const languages: { code: string; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'zh', name: 'Mandarin' },
    { code: 'fr', name: 'Français' },
    { code: 'ar', name: 'Arabic' },
];

export type ThemeOption = 'light' | 'dark' | 'system';
export type SessionDuration = 10 | 15 | 20;

export interface UserPreferences {
    // Account
    userName: string;
    profileImage?: string; // New: allow storing avatar URL in prefs for faster local read

    // Appearance
    theme: ThemeOption;

    // Session
    defaultDuration: SessionDuration;
    dailyUsageMinutes: number;
    lastUsageDate: string; // ISO Date string

    // Voice & Text
    voiceEnabled: boolean;
    transcriptionEnabled: boolean;
    autoScroll: boolean;

    // Language
    voiceLanguage: LanguageCode;
    textLanguage: LanguageCode;

    // Translation
    translationEnabled: boolean;
    showTranslatedText: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
    userName: '',
    theme: 'system',
    defaultDuration: 10,
    dailyUsageMinutes: 0,
    lastUsageDate: new Date().toISOString().split('T')[0],
    voiceEnabled: true,
    transcriptionEnabled: true,
    autoScroll: true,
    voiceLanguage: 'en',
    textLanguage: 'en',
    translationEnabled: false,
    showTranslatedText: false,
};

interface UserPreferencesContextType {
    preferences: UserPreferences;
    updatePreferences: (updates: Partial<UserPreferences>) => void;
    savePreferences: () => Promise<void>;
    incrementUsage: (minutes: number) => void;
    resetDailyUsage: () => void;
    isDailyLimitReached: boolean;
    remainingMinutes: number;
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
    preferences: DEFAULT_PREFERENCES,
    updatePreferences: () => { },
    savePreferences: async () => { },
    incrementUsage: () => { },
    resetDailyUsage: () => { },
    isDailyLimitReached: false,
    remainingMinutes: 20
});

export const useUserPreferences = () => useContext(UserPreferencesContext);


import { useAuthContext } from "@/lib/auth";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export const UserPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuthContext();
    const storageKey = user ? `iskylar_prefs_${user.uid}` : 'iskylar_prefs_guest';

    // Local Persistence (IndexedDB)
    const [preferences, setPreferences, isHydrated] = usePersistedState<UserPreferences>(storageKey, DEFAULT_PREFERENCES);

    // Cloud Persistence (Firestore) - Sync on Mount / Auth Change
    useEffect(() => {
        if (!user) return;

        const userPrefsRef = doc(db, "users", user.uid, "settings", "preferences");

        // 1. Initial Fetch / Listener
        const unsubscribe = onSnapshot(userPrefsRef, (snapshot) => {
            if (snapshot.exists()) {
                const cloudPrefs = snapshot.data() as UserPreferences;
                // Merge cloud prefs with local, trusting cloud for critical settings but respecting local recent usage?
                // For simplicity: Cloud is source of truth if exists.
                setPreferences(prev => {
                    // Only update if different to avoid loops? 
                    // JSON.stringify comparison is heavy but safe for this size object.
                    if (JSON.stringify(prev) !== JSON.stringify(cloudPrefs)) {
                        // Preserve dailyUsageMinutes relative to today if cloud is stale? 
                        // Check date.
                        const today = new Date().toISOString().split('T')[0];
                        if (cloudPrefs.lastUsageDate !== today) {
                            return { ...cloudPrefs, dailyUsageMinutes: 0, lastUsageDate: today };
                        }
                        return cloudPrefs;
                    }
                    return prev;
                });
            } else {
                // If no cloud prefs, save current local (default) to cloud
                setDoc(userPrefsRef, preferences, { merge: true });
            }
        });

        return () => unsubscribe();
    }, [user, setPreferences]); // Intentionally not depending on 'preferences' here to avoid loop in listener

    // 2. Save to Cloud on Change (Debounced)
    useEffect(() => {
        if (!user || !isHydrated) return;

        const userPrefsRef = doc(db, "users", user.uid, "settings", "preferences");

        // Simple debounce using timeout
        const timer = setTimeout(() => {
            setDoc(userPrefsRef, preferences, { merge: true })
                .catch(err => console.error("Failed to sync prefs to cloud:", err));
        }, 1000); // 1-second debounce

        return () => clearTimeout(timer);
    }, [preferences, user, isHydrated]);


    // Check and reset daily limit if date changed (run locally as well)
    useEffect(() => {
        if (isHydrated) {
            const today = new Date().toISOString().split('T')[0];
            if (preferences.lastUsageDate !== today) {
                setPreferences(prev => ({
                    ...prev,
                    dailyUsageMinutes: 0,
                    lastUsageDate: today
                }));
            }
        }
    }, [isHydrated, preferences.lastUsageDate, setPreferences]);

    const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
        setPreferences(prev => ({ ...prev, ...updates }));
    }, [setPreferences]);

    const incrementUsage = useCallback((minutes: number) => {
        setPreferences(prev => ({
            ...prev,
            dailyUsageMinutes: (prev.dailyUsageMinutes || 0) + minutes
        }));
    }, [setPreferences]);

    const resetDailyUsage = useCallback(() => {
        setPreferences(prev => ({ ...prev, dailyUsageMinutes: 0 }));
    }, [setPreferences]);

    const savePreferences = useCallback(async () => {
        if (!user || !isHydrated) return;
        const userPrefsRef = doc(db, "users", user.uid, "settings", "preferences");
        try {
            await setDoc(userPrefsRef, preferences, { merge: true });
        } catch (err) {
            console.error("Failed to force save prefs:", err);
        }
    }, [user, isHydrated, preferences]);

    const remainingMinutes = Math.max(0, 20 - (preferences.dailyUsageMinutes || 0));
    const isDailyLimitReached = remainingMinutes <= 0;

    // Sync theme with system/DOM
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        if (preferences.theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            root.classList.add(systemTheme);
        } else {
            root.classList.add(preferences.theme);
        }
    }, [preferences.theme]);

    return (
        <UserPreferencesContext.Provider value={{
            preferences,
            updatePreferences,
            savePreferences,
            incrementUsage,
            resetDailyUsage,
            isDailyLimitReached,
            remainingMinutes
        }}>
            {children}
        </UserPreferencesContext.Provider>
    );
};
