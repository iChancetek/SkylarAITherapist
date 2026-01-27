"use client";

import { useAuthContext, useFirebaseAuth } from "@/lib/auth"; // Added useFirebaseAuth
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import { useState } from "react";

export default function VerifyEmailView() {
    const { user, sendVerification, reloadUser } = useAuthContext();
    const { handleLogout } = useFirebaseAuth(); // Use the actual hook
    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const handleResend = async () => {
        setIsResending(true);
        await sendVerification();
        setIsResending(false);
    };

    const handleCheck = async () => {
        setIsChecking(true);
        await reloadUser();
        setIsChecking(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black/90 p-4">
            <Card className="w-full max-w-md border-white/10 bg-black/50 backdrop-blur-xl text-white">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                        <Mail className="h-8 w-8 text-blue-400" />
                    </div>
                    <CardTitle className="text-2xl">Verify your email</CardTitle>
                    <CardDescription className="text-white/60">
                        We sent a verification link to <span className="font-medium text-white">{user?.email}</span>.
                        Please check your inbox to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center text-sm text-white/40">
                        Can't find it? Check your spam folder.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-3">
                    <Button
                        onClick={handleCheck}
                        className="w-full bg-white text-black hover:bg-white/90"
                        disabled={isChecking}
                    >
                        {isChecking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                        I've Verified It
                    </Button>

                    <Button
                        onClick={handleResend}
                        variant="outline"
                        className="w-full border-white/10 text-white hover:bg-white/5"
                        disabled={isResending}
                    >
                        {isResending ? "Sending..." : "Resend Email"}
                    </Button>

                    <Button
                        onClick={handleLogout}
                        variant="ghost"
                        className="w-full text-white/40 hover:text-white"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
