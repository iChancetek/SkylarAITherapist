'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstall, setShowInstall] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstall(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstall(false);
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowInstall(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    // Don't show if dismissed before
    useEffect(() => {
        if (localStorage.getItem('pwa-install-dismissed')) {
            setShowInstall(false);
        }
    }, []);

    if (!showInstall) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
            <div className="glass-dark p-4 rounded-2xl shadow-2xl border border-white/20 animate-in slide-in-from-bottom duration-500">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Download className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm mb-1">
                            Install iSkylar
                        </h3>
                        <p className="text-white/70 text-xs mb-3">
                            Access iSkylar instantly from your home screen, even offline.
                        </p>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleInstall}
                                size="sm"
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs h-8"
                            >
                                Install
                            </Button>
                            <Button
                                onClick={handleDismiss}
                                variant="ghost"
                                size="sm"
                                className="text-white/60 hover:text-white hover:bg-white/10 text-xs h-8"
                            >
                                Not now
                            </Button>
                        </div>
                    </div>

                    <Button
                        onClick={handleDismiss}
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 w-6 h-6 text-white/40 hover:text-white hover:bg-white/10"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
