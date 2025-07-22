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
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            iSkylar
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Hello again. Skylar is ready to listen.
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                 <Link href="#" className="text-sm text-primary hover:underline">
                    Forgot Password?
                </Link>
              </div>
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
            <Button
                className="w-full"
                onClick={() => handleEmailPasswordLogin(email, password)}
            >
                Sign in
            </Button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t"></div>
              <span className="flex-shrink mx-4 text-xs uppercase text-muted-foreground">
                Or continue with
              </span>
              <div className="flex-grow border-t"></div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              <GoogleIcon className="mr-2 fill-foreground"/>
              Sign in with Google
            </Button>
          </div>
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
