"use client";

import Link from "next/link";
import { ArrowLeft, Brain, Sparkles, Heart, Zap, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";

export default function LearnMorePage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans">
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

            {/* Hero */}
            <section className="pt-40 pb-20 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-r from-purple-200 via-white to-blue-200 bg-clip-text text-transparent">
                    Therapy, Evolved.
                </h1>
                <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-12">
                    iSkylar isn't just a voice bot. It's a multi-agent ecosystem designed to understand, remember, and guide you through life's complexities.
                </p>
            </section>

            {/* Agent Roster */}
            <section className="py-24 bg-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Your Companions</h2>
                        <p className="text-white/50">Five distinct personalities. One mission: your well-being.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AgentCard
                            name="Skylar"
                            role="The Therapist"
                            description="Warm, empathetic, and clinically grounded. Skylar is your safe harbor for deep emotional processing and healing."
                            color="bg-purple-600"
                        />
                        <AgentCard
                            name="Chancellor"
                            role="Executive Assistant"
                            description="Loyal, efficient, and sharply witty. Chancellor keeps you organized and focused on your goals."
                            color="bg-slate-700"
                        />
                        <AgentCard
                            name="Sydney"
                            role="The Optimist"
                            description="Sunshine energy. Sydney is here to lift your mood, celebrate your wins, and remind you of the bright side."
                            color="bg-yellow-500"
                        />
                        <AgentCard
                            name="Hailey"
                            role="Best Friend"
                            description="Smart, playful, and relentlessly honest. Hailey gives you the reality check you need with a laugh."
                            color="bg-pink-600"
                        />
                        <AgentCard
                            name="Chris"
                            role="The Chill One"
                            description="Grounded and calm. Chris is the late-night conversation partner who helps you slow down and breathe."
                            color="bg-emerald-600"
                        />
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Deep Intelligence</h2>
                    <p className="text-white/50">Powered by advanced AI and secure infrastructure.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-12">
                    <Feature
                        icon={Brain}
                        title="Total Recall (Memory)"
                        description="iSkylar remembers every conversation. She recalls your history, themes, and emotional patterns, so you never have to repeat yourself."
                    />
                    <Feature
                        icon={Sparkles}
                        title="Real-Time Awareness"
                        description="Connected to the world. Skylar and friends can discuss current events, news, and live information naturally."
                    />
                    <Feature
                        icon={Shield}
                        title="Private & Secure"
                        description="Built on Google Cloud Platform. Your data is encrypted, private, and fully under your control."
                    />
                    <Feature
                        icon={Heart}
                        title="Emotional Sensing"
                        description="The system actively detects if you are happy, sad, or unsure, and adapts its response style to match your energy."
                    />
                    <Feature
                        icon={Zap}
                        title="Instant Voice"
                        description="Fluid, low-latency voice interaction that feels like talking to a real person on the phone."
                    />
                    <Feature
                        icon={Globe}
                        title="Multilingual"
                        description="Speak freely in English, Spanish, French, Mandarin, or Arabic. iSkylar runs fluently in your native tongue."
                    />
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 text-center bg-gradient-to-b from-transparent to-purple-900/20">
                <h2 className="text-4xl font-bold mb-6">Ready to talk?</h2>
                <Link href="/">
                    <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-white text-black hover:bg-white/90">
                        Start Your Session
                    </Button>
                </Link>
            </section>


            <Footer />
        </div>
    );
}

function AgentCard({ name, role, description, color }: any) {
    return (
        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${color} opacity-50`}></div>
            <h3 className="text-2xl font-bold mb-1">{name}</h3>
            <p className={`text-xs uppercase tracking-wider font-bold mb-4 opacity-70`}>{role}</p>
            <p className="text-white/60 leading-relaxed">{description}</p>
        </div>
    );
}

function Feature({ icon: Icon, title, description }: any) {
    return (
        <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                <Icon className="w-8 h-8 text-white/80" />
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-white/50 leading-relaxed">{description}</p>
        </div>
    );
}
