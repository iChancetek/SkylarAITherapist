
"use client";

import { useAuthContext } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ServiceWorkerRegister from '@/components/sw-register';
import InstallPWA from '@/components/install-pwa';
import LandingPage from '@/components/landing-page';

export default function HomePage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is authenticated, the useEffect above will trigger the redirect.
  // We return a loader here to prevent flashing the landing page before redirect.
  if (user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not loading and no user, show the Landing Page
  return (
    <>
      <ServiceWorkerRegister />
      <InstallPWA />
      <LandingPage />
    </>
  );
}
