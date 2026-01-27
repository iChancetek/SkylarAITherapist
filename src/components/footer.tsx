"use client";

import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-white/5 py-12 text-center text-white/40 text-sm bg-black/40 backdrop-blur-sm">
            <div className="container mx-auto px-4 space-y-6">
                <div className="flex flex-wrap justify-center gap-6 font-medium">
                    <Link href="/learn-more" className="hover:text-purple-400 transition-colors">Features</Link>
                    <Link href="/privacy" className="hover:text-purple-400 transition-colors">Privacy & Security</Link>
                    <a href="mailto:support@chancetek.com" className="hover:text-purple-400 transition-colors">Support</a>
                </div>

                <div className="space-y-2">
                    <p className="opacity-60">
                        &copy; {new Date().getFullYear()} Developed by Chancellor Minus @ ChanceTEK.
                    </p>
                    <p className="text-purple-300/60 font-medium">
                        Please visit, <a href="https://famio.us" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-4">Famio.us</a> - We Are One.
                    </p>
                </div>
            </div>
        </footer>
    );
}
