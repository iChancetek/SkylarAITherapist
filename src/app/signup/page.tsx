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
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
       <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Create your Account
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your AI Voice Therapist. Powered by Generative AI.
          </p>
        </div>
        
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2 relative">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
             <div className="grid gap-2 relative">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                />
                 <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
             <p className="text-xs text-muted-foreground px-1">
              Password must be at least 8 characters long and contain one number and one special character.
            </p>
            <Button
                className="w-full"
                onClick={onSignUp}
            >
                Create Account
            </Button>
          </div>
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
