"use client";

import { useAuthContext } from "@/lib/auth";
import VerifyEmailView from "@/components/auth/verify-email-view";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, isEmailVerified } = useAuthContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    // If user is logged in but not verified, block access
    if (user && !isEmailVerified) {
        return <VerifyEmailView />;
    }

    // Otherwise (logged out or verified), allowed to proceed 
    // (Protected routes like dashboard will handle their own redirect if user is null)
    return <>{children}</>;
}
