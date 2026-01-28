"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Critical Global Error:", error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white p-6 text-center">
                    <h1 className="text-4xl font-bold mb-4 text-red-500">Critical System Error</h1>
                    <p className="mb-6 text-lg text-white/80">The application encountered a critical error and cannot load.</p>

                    <div className="bg-red-900/20 border border-red-500/20 p-6 rounded-xl mb-8 max-w-2xl w-full overflow-auto text-left">
                        <p className="font-mono text-sm text-red-200">
                            <span className="font-bold text-red-400">Error:</span> {error.message || "Unknown Application Crash"}
                        </p>
                        {error.digest && (
                            <p className="mt-2 text-xs text-white/40 font-mono">Digest: {error.digest}</p>
                        )}
                    </div>

                    <Button
                        onClick={() => window.location.reload()}
                        className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg rounded-full"
                    >
                        Reload Application
                    </Button>
                </div>
            </body>
        </html>
    );
}
