"use client";

import VoiceInterface from '@/components/voice-interface';
import { useAuthContext, useFirebaseAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { handleLogout } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return null; // or a loading spinner, though the layout handles it
  }
  
  return (
    <main className="min-h-screen animated-gradient">
      <div className="absolute top-4 right-4">
        <Button onClick={handleLogout} variant="outline" className="bg-white/30 backdrop-blur-sm">Logout</Button>
      </div>
      <VoiceInterface />
    </main>
  );
}
