// @ts-nocheck
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebaseAuth } from "@/lib/auth";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const GoogleIcon = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    className="h-5 w-5"
  >
    <title>Google</title>
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.73 1.9-3.47 0-6.74-2.47-6.74-7.23s3.27-7.23 6.74-7.23c1.93 0 3.37.79 4.37 1.73l2.42-2.42C18.63.88 15.98 0 12.48 0 5.88 0 .04 5.88.04 12.54s5.84 12.54 12.44 12.54c3.27 0 5.64-1.12 7.55-3.05 1.95-1.95 2.58-4.8 2.58-8.15 0-.66-.05-1.32-.15-1.98H12.48z"
    />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { handleEmailPasswordLogin, handleGoogleSignIn } = useFirebaseAuth();

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center p-4 static-gradient">
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 items-center gap-8">
        <div className="text-foreground text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Welcome to iSkylar
          </h1>
          <p className="mt-4 text-lg text-foreground/80">
            Your AI Voice Therapist. Powered by Generative AI. iSkylar is ready to listen.
          </p>
        </div>

        <div className="w-full max-w-md bg-white/20 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground text-center">Sign In</h2>
            <div className="grid gap-2">
              <Label className="text-foreground/80" htmlFor="email">Email</Label>
              <Input
                className="bg-black/10 text-foreground border-black/20 focus:ring-sky-400 focus:border-sky-400 placeholder:text-foreground/50"
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2 relative">
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80" htmlFor="password">Password</Label>
                <Link href="#" className="text-sm text-sky-500 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <Input
                className="bg-black/10 text-foreground border-black/20 focus:ring-sky-400 focus:border-sky-400 placeholder:text-foreground/50"
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-foreground/50 hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Button
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-base shadow-lg transition-all duration-300 transform hover:scale-105"
              onClick={() => handleEmailPasswordLogin(email, password)}
            >
              Sign In
            </Button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-black/20"></div>
              <span className="flex-shrink mx-4 text-xs uppercase text-foreground/50">
                Or continue with
              </span>
              <div className="flex-grow border-t border-black/20"></div>
            </div>

            <Button
              variant="outline"
              className="w-full bg-white/90 text-slate-800 hover:bg-white font-semibold transition-all duration-300"
              onClick={handleGoogleSignIn}
            >
              <GoogleIcon className="mr-2" />
              Sign in with Google
            </Button>
          </div>
          <p className="mt-8 text-center text-sm text-foreground/70">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-sky-500 hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
       <p className="absolute bottom-4 text-center text-xs text-foreground/50">Developed by ChanceTEK LLC | iSynera LLC</p>
    </main>
  );
}
