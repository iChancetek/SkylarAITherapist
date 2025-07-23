// @ts-nocheck
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebaseAuth } from "@/lib/auth";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { handleEmailPasswordSignUp } = useFirebaseAuth();

  const onSignUp = () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    handleEmailPasswordSignUp(fullName, username, email, password);
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center p-4 static-gradient">
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 items-center gap-8">
        <div className="text-white text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            iSkylar
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Your AI Voice Therapist. Powered by Generative AI.
          </p>
        </div>

        <div className="w-full max-w-md bg-white/20 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white text-center">Create Account</h2>
            <div className="grid gap-2">
              <Label className="text-white/80" htmlFor="fullName">Full Name</Label>
              <Input
                className="bg-white/10 text-white border-white/20 focus:ring-sky-400 focus:border-sky-400 placeholder:text-white/50"
                id="fullName"
                type="text"
                placeholder="Jane Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
             <div className="grid gap-2">
              <Label className="text-white/80" htmlFor="username">Username</Label>
              <Input
                className="bg-white/10 text-white border-white/20 focus:ring-sky-400 focus:border-sky-400 placeholder:text-white/50"
                id="username"
                type="text"
                placeholder="jane_doe"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80" htmlFor="email">Email</Label>
              <Input
                className="bg-white/10 text-white border-white/20 focus:ring-sky-400 focus:border-sky-400 placeholder:text-white/50"
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2 relative">
              <Label className="text-white/80" htmlFor="password">Password</Label>
              <Input
                className="bg-white/10 text-white border-white/20 focus:ring-sky-400 focus:border-sky-400 placeholder:text-white/50"
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-white/50 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="grid gap-2 relative">
              <Label className="text-white/80" htmlFor="confirm-password">Confirm Password</Label>
              <Input
                className="bg-white/10 text-white border-white/20 focus:ring-sky-400 focus:border-sky-400 placeholder:text-white/50"
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 text-white/50 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-white/60 px-1">
              Password must be at least 8 characters long, with one number and one special character.
            </p>
            <Button
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-base shadow-lg transition-all duration-300 transform hover:scale-105"
              onClick={onSignUp}
            >
              Create Account
            </Button>
          </div>
          <p className="mt-6 text-center text-sm text-white/70">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-sky-300 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
      <p className="absolute bottom-4 text-center text-xs text-white/50">Developed by ChanceTEK LLC | iSynera LLC</p>
    </main>
  );
}
