"use client";

import VoiceInterface from '@/components/voice-interface';
import { useAuthContext } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return null; // or a loading spinner
  }
  
  return (
    <main className="min-h-screen bg-background text-foreground">
      <VoiceInterface />
    </main>
  );
}
