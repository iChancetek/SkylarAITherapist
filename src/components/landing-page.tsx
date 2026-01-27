
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Heart, Shield, Sparkles, Mic, Clock } from "lucide-react";
import { Footer } from "@/components/footer";

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Navigation */}
            <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
                <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Brain className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                            iSkylar
                        </span>
                    </div>
                    <nav className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" className="text-sm font-medium">
                                Log In
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 shadow-lg shadow-primary/25">
                                Get Started
                            </Button>
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1 pt-16">
                {/* Hero Section */}
                <section className="relative overflow-hidden py-20 md:py-32 lg:py-40">
                    {/* Background Elements */}
                    <div className="absolute inset-0 z-0 opacity-30">
                        <div className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[100px]" />
                        <div className="absolute top-[40%] -right-[10%] h-[400px] w-[400px] rounded-full bg-blue-500/20 blur-[100px]" />
                    </div>

                    <div className="container relative z-10 mx-auto px-4 text-center md:px-6">
                        <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
                            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary backdrop-blur-sm">
                                <Sparkles className="mr-2 h-3.5 w-3.5" />
                                <span>AI-Powered Mental Wellness</span>
                            </div>

                            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                                Your Personal AI <br />
                                <span className="text-primary">Voice Therapist</span>
                            </h1>

                            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl leading-relaxed">
                                Experience empathetic, real-time voice conversations with an intelligent companion who is always here to listen, support, and guide you.
                            </p>

                            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Link href="/signup">
                                    <Button size="lg" className="h-12 min-w-[200px] rounded-full px-8 text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                                        Start Your Session
                                    </Button>
                                </Link>
                                <Link href="/login">
                                    <Button variant="outline" size="lg" className="h-12 min-w-[200px] rounded-full px-8 text-lg border-primary/20 hover:bg-primary/5">
                                        Welcome Back
                                    </Button>
                                </Link>
                            </div>

                            <div className="pt-4">
                                <Link href="/learn-more">
                                    <Button variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5">
                                        Meet the Agents →
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="container mx-auto px-4 py-16 md:py-24 md:px-6">
                    <div className="grid gap-8 md:grid-cols-3">
                        <Card className="group relative overflow-hidden border-primary/10 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                            <CardContent className="p-8">
                                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
                                    <Mic className="h-6 w-6 text-blue-500" />
                                </div>
                                <h3 className="mb-3 text-xl font-bold">Natural Voice Interaction</h3>
                                <p className="text-muted-foreground">
                                    Talk naturally as you would with a human. Our advanced voice engine captures nuances, tone, and emotion.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group relative overflow-hidden border-primary/10 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                            <CardContent className="p-8">
                                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 transition-colors group-hover:bg-purple-500/20">
                                    <Brain className="h-6 w-6 text-purple-500" />
                                </div>
                                <h3 className="mb-3 text-xl font-bold">Deep Empathy</h3>
                                <p className="text-muted-foreground">
                                    Skylar is trained to understand complex emotions and provide meaningful, therapeutic support when you need it most.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group relative overflow-hidden border-primary/10 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                            <CardContent className="p-8">
                                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                                    <Shield className="h-6 w-6 text-emerald-500" />
                                </div>
                                <h3 className="mb-3 text-xl font-bold">Private & Secure</h3>
                                <p className="text-muted-foreground">
                                    Your privacy is our top priority. All conversations are encrypted and you have full control over your data.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Testimonial / Impact Section */}
                <section className="border-t border-white/5 bg-white/5 py-16 md:py-24">
                    <div className="container mx-auto px-4 text-center md:px-6">
                        <h2 className="mb-12 text-3xl font-bold md:text-4xl">Why Choose iSkylar?</h2>
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                            <div className="flex flex-col items-center space-y-2 rounded-2xl bg-background/50 p-6 shadow-sm">
                                <Clock className="mb-2 h-8 w-8 text-primary/80" />
                                <h4 className="text-xl font-bold">24/7 Availability</h4>
                                <p className="text-sm text-muted-foreground">Support whenever you need it</p>
                            </div>
                            <div className="flex flex-col items-center space-y-2 rounded-2xl bg-background/50 p-6 shadow-sm">
                                <Heart className="mb-2 h-8 w-8 text-red-500/80" />
                                <h4 className="text-xl font-bold">Judgment Free</h4>
                                <p className="text-sm text-muted-foreground">A safe space to be yourself</p>
                            </div>
                            <div className="flex flex-col items-center space-y-2 rounded-2xl bg-background/50 p-6 shadow-sm">
                                <Sparkles className="mb-2 h-8 w-8 text-amber-500/80" />
                                <h4 className="text-xl font-bold">Instant Relief</h4>
                                <p className="text-sm text-muted-foreground">Talk through anxiety in moments</p>
                            </div>
                            <div className="flex flex-col items-center space-y-2 rounded-2xl bg-background/50 p-6 shadow-sm">
                                <Shield className="mb-2 h-8 w-8 text-emerald-500/80" />
                                <h4 className="text-xl font-bold">100% Confidential</h4>
                                <p className="text-sm text-muted-foreground">Your secrets are safe with us</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Multi-Agent Ecosystem Section */}
            <section className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-3xl font-bold mb-6">A Team of Experts</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                    You're not limited to just one personality. Choose from 5 distinct AI companions, including Skylar (Therapist), Chancellor (Executive), and more.
                </p>

            </section>

            <Footer />
        </div>
    );
}


