"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";

export type LanguageCode = 'en' | 'es' | 'zh' | 'fr' | 'ar';
export type ThemeOption = 'light' | 'dark' | 'system';
export type SessionDuration = 10 | 15 | 20;

export interface UserPreferences {
    // Account
    userName: string;

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
    incrementUsage: (minutes: number) => void;
    resetDailyUsage: () => void;
    isDailyLimitReached: boolean;
    remainingMinutes: number;
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
    preferences: DEFAULT_PREFERENCES,
    updatePreferences: () => { },
    incrementUsage: () => { },
    resetDailyUsage: () => { },
    isDailyLimitReached: false,
    remainingMinutes: 20
});

export const useUserPreferences = () => useContext(UserPreferencesContext);

import { useAuthContext } from "@/lib/auth";

// ... (imports)

// ... (types and DEFAULT_PREFERENCES)

export const UserPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuthContext();
    const storageKey = user ? `iskylar_prefs_${user.uid}` : 'iskylar_prefs_guest';

    const [preferences, setPreferences, isHydrated] = usePersistedState<UserPreferences>(storageKey, DEFAULT_PREFERENCES);

    // Check and reset daily limit if date changed
    useEffect(() => {
        if (isHydrated && user) {
            const today = new Date().toISOString().split('T')[0];
            if (preferences.lastUsageDate !== today) {
                setPreferences(prev => ({
                    ...prev,
                    dailyUsageMinutes: 0,
                    lastUsageDate: today
                }));
            }
        }
    }, [isHydrated, preferences.lastUsageDate, setPreferences, user]);

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

    // Don't render children until hydrated to avoid flash of wrong content/theme if possible, 
    // or just accept it. For preferences, it's usually better to wait or show a loader if critical.
    // But for simple flags, we can render.

    return (
        <UserPreferencesContext.Provider value={{
            preferences,
            updatePreferences,
            incrementUsage,
            resetDailyUsage,
            isDailyLimitReached,
            remainingMinutes
        }}>
            {children}
        </UserPreferencesContext.Provider>
    );
};
