"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Application Error:", error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white p-6 text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong</h2>
            <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-lg mb-6 max-w-lg overflow-auto no-scrollbar">
                <p className="font-mono text-sm text-red-200 break-words">
                    {error.message || "Unknown client-side exception"}
                </p>
                {error.digest && (
                    <p className="mt-2 text-xs text-white/40">Digest: {error.digest}</p>
                )}
            </div>
            <div className="flex gap-4">
                <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    className="border-white/20 hover:bg-white/10"
                >
                    Go Home
                </Button>
                <Button
                    onClick={() => reset()}
                    className="bg-white text-black hover:bg-gray-200"
                >
                    Try again
                </Button>
            </div>
        </div>
    );
}
