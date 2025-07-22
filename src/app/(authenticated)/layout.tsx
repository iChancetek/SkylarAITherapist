"use client";

import { useAuthContext } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // If the user is not logged in, redirect to the login page.
    // The AuthProvider will handle the initial loading state.
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  // While the user is being authenticated, you can show a loading state.
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If the user is authenticated, render the children (the protected page).
  return <>{children}</>;
}
