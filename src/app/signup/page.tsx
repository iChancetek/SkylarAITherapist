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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { handleEmailPasswordSignUp } = useFirebaseAuth();

  const onSignUp = () => {
    if (password !== confirmPassword) {
      // This should be a toast notification ideally
      alert("Passwords do not match.");
      return;
    }
    handleEmailPasswordSignUp(email, password);
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#1E1B4B] via-[#101020] to-[#0A0A10] p-4">
       <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Create your Account
          </h1>
          <p className="mt-4 text-lg text-blue-200/80">
            Your AI Voice Therapist. Powered by Generative AI.
          </p>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-lg">
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-blue-100/90">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-blue-200/50"
              />
            </div>
            <div className="grid gap-2 relative">
                <Label htmlFor="password" className="text-blue-100/90">Password</Label>
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-blue-200/50 pr-10"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-blue-200/70 hover:text-blue-100"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
             <div className="grid gap-2 relative">
                <Label htmlFor="confirm-password"className="text-blue-100/90">Confirm Password</Label>
                <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-blue-200/50 pr-10"
                />
                 <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-blue-200/70 hover:text-blue-100"
                >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
             <p className="text-xs text-blue-200/50 px-1">
              Password must be at least 8 characters long and contain one number and one special character.
            </p>
            <div className="relative pt-2">
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                 <Button
                    className="w-full relative"
                    onClick={onSignUp}
                >
                    Create Account
                </Button>
            </div>
          </div>
        </div>
        
        <p className="text-center text-sm text-blue-200/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-300 hover:text-blue-200">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
