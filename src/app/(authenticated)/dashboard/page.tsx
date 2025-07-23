
"use client";

import VoiceInterface from '@/components/voice-interface';
import { useAuthContext } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useRef } from 'react';
import { UserMenu } from '@/components/user-menu';
import { textToSpeech } from '@/ai/flows/tts';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  const hasPlayedGreeting = useRef(false);

  const playGreeting = useCallback(async () => {
    if (!user || !user.metadata || !userProfile || hasPlayedGreeting.current) return;
    
    hasPlayedGreeting.current = true;

    const creationTime = new Date(user.metadata.creationTime!).getTime();
    const lastSignInTime = new Date(user.metadata.lastSignInTime!).getTime();
    
    // A small buffer to account for clock differences and processing time
    const isNewUser = Math.abs(lastSignInTime - creationTime) < 5000;
    
    const userName = userProfile.fullName || user.email?.split('@')[0] || 'there';
    const greetingText = isNewUser
      ? `Hello ${userName}, it’s a pleasure to meet you. Welcome to the platform.`
      : `Welcome back, ${userName}. Good to see you again.`;

    try {
      const { audioDataUri } = await textToSpeech(greetingText);
      const audio = new Audio(audioDataUri);
      audio.play().catch(e => {
        // This catch handles the browser's autoplay policy.
        // The user must interact with the page first.
        // We can show a toast or a silent notification.
        console.warn("Audio playback was blocked by the browser. A user interaction is required to play audio.");
        toast({
          title: "Welcome!",
          description: "Click anywhere to enable sound."
        });
      });
    } catch (error) {
      console.error("Failed to generate voice greeting:", error);
    }
  }, [user, userProfile, toast]);

  useEffect(() => {
    if (!loading && user === null) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user && userProfile && !hasPlayedGreeting.current) {
        // A small delay to ensure the page is responsive before playing audio
        const timer = setTimeout(() => {
             playGreeting();
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [user, userProfile, playGreeting]);

  if (loading || !user) {
    return null; // The layout handles the main loading spinner
  }
  
  return (
    <main className="relative min-h-screen w-full">
      <div className="absolute inset-0 static-gradient -z-10" />
      <div className="relative z-10 flex h-full min-h-screen w-full flex-col items-center justify-center">
        <UserMenu />
        <VoiceInterface />
      </div>
    </main>
  );
}
