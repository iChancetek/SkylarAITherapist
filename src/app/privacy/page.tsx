"use client";

import { useAuthContext } from "@/lib/auth";
import Link from "next/link";
import { Shield, Lock, Cloud, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold tracking-tighter hover:text-purple-300 transition-colors">
                        iSkylar
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-white/60 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </nav>

            <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
                <header className="mb-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-purple-500/10 mb-6 ring-1 ring-purple-500/20">
                        <Shield className="w-8 h-8 text-purple-400" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white/90 to-white/50 bg-clip-text text-transparent">
                        Privacy & Security
                    </h1>
                    <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                        Your trust is our foundation. iSkylar is built on enterprise-grade infrastructure to ensure your therapeutic journey remains private.
                    </p>
                </header>

                <div className="grid gap-8 md:grid-cols-2 mb-16">
                    <SecurityCard
                        icon={Cloud}
                        title="Google Cloud Secured"
                        description="iSkylar is built on top of Google's secure Cloud Platform (GCP). We leverage the same world-class security infrastructure that powers Google's own services."
                    />
                    <SecurityCard
                        icon={Lock}
                        title="Encrypted in Transit & Rest"
                        description="All data, including voice and text, is encrypted using industry-standard AES-256 encryption. Your conversations are unintelligible to unauthorized parties."
                    />
                    <SecurityCard
                        icon={Eye}
                        title="Private by Design"
                        description="We do not sell your data. Your therapeutic sessions are stored solely to provide you with memory and context. You have full control to delete them."
                    />
                    <SecurityCard
                        icon={Shield}
                        title="AI Safety Guardrails"
                        description="Our AI models are trained with strict safety protocols. Crisis detection is automated to prioritize your safety above all else."
                    />
                </div>

                <div className="space-y-12 text-white/80 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">1. Data Collection</h2>
                        <p className="mb-4">
                            We collect data necessary to provide the iSkylar experience, including:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-white/60">
                            <li>Account information (UID, email) for authentication.</li>
                            <li>Voice audio (temporarily processed for transcription).</li>
                            <li>Chat logs and session summaries (stored for long-term memory).</li>
                            <li>Usage metrics (to enforce daily limits).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Data</h2>
                        <p>
                            Your data is used exclusively to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-white/60 mt-2">
                            <li>Enable the AI to remember your context and past conversations.</li>
                            <li>Maintain your "Long-Term Memory" and "Key Insights".</li>
                            <li>Improve the empathetic accuracy of the AI models.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">3. User Rights</h2>
                        <p>
                            You have the right to request a full export of your data or complete deletion of your account and history at any time via the Settings menu.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function SecurityCard({ icon: Icon, title, description }: any) {
    return (
        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all group">
            <Icon className="w-8 h-8 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
            <p className="text-white/50 leading-relaxed">{description}</p>
        </div>
    );
}
