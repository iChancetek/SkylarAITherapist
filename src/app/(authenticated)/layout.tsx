
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
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // If the loading is finished and there's no user, redirect.
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // While the user is being authenticated, show a loading state.
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If the user is authenticated, render the children (the protected page).
  return <>{children}</>;
}
