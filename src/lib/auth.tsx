"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  getAuth,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { app } from "./firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const auth = getAuth(app);

export const AuthContext = createContext<{ user: User | null }>({
  user: null,
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {loading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const { toast } = useToast();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error: any) {
      toast({
        title: "Login Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleEmailPasswordSignUp = async (email: string, pass: string) => {
     if (pass.length < 8) {
      toast({
        title: "Password Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    if (!/\d/.test(pass) || !/[!@#$%^&*]/.test(pass)) {
      toast({
        title: "Password Error",
        description: "Password must include at least one number and one special character.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      router.push("/");
    } catch (e: any) {
      toast({
        title: "Sign-up Error",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleEmailPasswordLogin = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push("/");
    } catch (e: any) {
      toast({
        title: "Login Error",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return {
    handleGoogleSignIn,
    handleEmailPasswordSignUp,
    handleEmailPasswordLogin,
    handleLogout,
  };
};
