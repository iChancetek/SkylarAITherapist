
"use client";

import VoiceInterface from '@/components/voice-interface';
import { useAuthContext } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useRef } from 'react';
import { UserMenu } from '@/components/user-menu';
import { textToSpeech } from '@/ai/flows/tts';
import { useToast } from '@/hooks/use-toast';

const greetings: Record<string, { newUser: string, returningUser: string }> = {
    'en': { newUser: "Hello {name}, it’s a pleasure to meet you. I’m here whenever you need someone to talk to.", returningUser: "Welcome back, {name}. I’m glad to see you again." },
    'es': { newUser: "Hola {name}, es un placer conocerte. Estoy aquí cuando necesites a alguien con quien hablar.", returningUser: "Bienvenido de nuevo, {name}. Me alegro de verte otra vez." },
    'zh': { newUser: "你好 {name}，很高兴认识你。如果你需要找人倾诉，我随时都在。", returningUser: "欢迎回来，{name}。很高兴再次见到你。" },
    'sw': { newUser: "Habari {name}, ni furaha kukutana nawe. Niko hapa wakati wowote unapohitaji mtu wa kuzungumza naye.", returningUser: "Karibu tena, {name}. Nimefurahi kukuona tena." },
    'hi': { newUser: "नमस्ते {name}, आपसे मिलकर खुशी हुई। जब भी आपको किसी से बात करने की ज़रूरत हो, मैं यहाँ हूँ।", returningUser: "वापस स्वागत है, {name}। आपको फिर से देखकर खुशी हुई।" },
    'he': { newUser: "שלום {name}, נעים להכיר. אני כאן מתי שתצטרך מישהו לדבר איתו.", returningUser: "ברוך שובך, {name}. אני שמחה לראות אותך שוב." },
};

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
    const lang = userProfile.language || 'en';

    const greetingTemplate = isNewUser ? greetings[lang]?.newUser : greetings[lang]?.returningUser;
    const greetingText = greetingTemplate ? greetingTemplate.replace('{name}', userName) : greetings['en'].returningUser.replace('{name}', userName);
    
    try {
      const { audioDataUri } = await textToSpeech(greetingText, lang);
      const audio = new Audio(audioDataUri);
      audio.play().catch(e => {
        console.warn("Audio playback was blocked by the browser. A user interaction is required to play audio.", e);
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
    <main className="relative min-h-screen w-full static-gradient">
      <div className="relative z-10 flex h-full min-h-screen w-full flex-col items-center justify-center">
        <UserMenu />
        <VoiceInterface />
      </div>
    </main>
  );
}
