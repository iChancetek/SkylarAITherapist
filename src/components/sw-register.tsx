
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

export default function ServiceWorkerRegister() {
    const { toast } = useToast();
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("Service Worker registered:", registration);

                    // Check if there's an update waiting
                    if (registration.waiting) {
                        setWaitingWorker(registration.waiting);
                    }

                    // Listen for new updates found
                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New update installed and ready to take over
                                    setWaitingWorker(newWorker);
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error("Service Worker registration failed:", error);
                });

            // Listen for controller change (page reload triggered by skipWaiting)
            let refreshing = false;
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!refreshing) {
                    window.location.reload();
                    refreshing = true;
                }
            });
        }
    }, []);

    useEffect(() => {
        if (waitingWorker) {
            toast({
                title: "Update Available",
                description: "A new version of iSkylar is available.",
                action: (
                    <ToastAction
                        altText="Update"
                        onClick={() => {
                            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                        }}
                    >
                        Update
                    </ToastAction>
                ),
                duration: Infinity, // Keep open until user interacts
            });
        }
    }, [waitingWorker, toast]);

    return null;
}
