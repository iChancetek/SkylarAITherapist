"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebaseAuth } from "@/lib/auth";
import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { handleEmailPasswordSignUp } = useFirebaseAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create an account to start your journey with iSkylar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
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
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
             <p className="text-xs text-muted-foreground px-1">
              Password must be at least 8 characters long and contain one number and one special character.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => handleEmailPasswordSignUp(email, password)}
          >
            Create account
          </Button>
        </CardContent>
        <CardFooter className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline ml-1">
            Login
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
