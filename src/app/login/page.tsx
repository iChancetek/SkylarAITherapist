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
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.73 1.9-3.47 0-6.74-2.47-6.74-7.23s3.27-7.23 6.74-7.23c1.93 0 3.37.79 4.37 1.73l2.42-2.42C18.63.88 15.98 0 12.48 0 5.88 0 .04 5.88.04 12.54s5.84 12.54 12.44 12.54c3.27 0 5.64-1.12 7.55-3.05 1.95-1.95 2.58-4.8 2.58-8.15 0-.66-.05-1.32-.15-1.98H12.48z" />
    </svg>
  );

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { handleEmailPasswordLogin, handleGoogleSignIn } = useFirebaseAuth();

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#1E1B4B] via-[#101020] to-[#0A0A10] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            iSkylar
          </h1>
          <p className="mt-4 text-lg text-blue-200/80">
            Hello again. Skylar is ready to listen.
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password"className="text-blue-100/90">Password</Label>
                 <Link href="#" className="text-sm text-blue-300 hover:text-blue-200">
                    Forgot Password?
                </Link>
              </div>
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
            <div className="relative">
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <Button
                    className="w-full relative"
                    onClick={() => handleEmailPasswordLogin(email, password)}
                >
                    Sign in
                </Button>
            </div>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-xs uppercase text-white/30">
                Or continue with
              </span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <Button
              variant="outline"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              onClick={handleGoogleSignIn}
            >
              <GoogleIcon className="mr-2 fill-white"/>
              Sign in with Google
            </Button>
          </div>
        </div>
        
        <p className="text-center text-sm text-blue-200/60">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-blue-300 hover:text-blue-200">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
