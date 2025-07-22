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
import { app, db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const auth = getAuth(app);

export const AuthContext = createContext<{ user: User | null }>({
  user: null,
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Update last login timestamp
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {loading ? <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : children}
    </AuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const { toast } = useToast();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      // If user doesn't exist in Firestore, create a new document
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          username: user.email?.split('@')[0] || `user${Date.now()}`, // fallback username
          email: user.email,
          fullName: user.displayName,
          profileImage: user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          role: "user",
        });
      }
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleEmailPasswordSignUp = async (fullName: string, username: string, email: string, pass: string) => {
    if (!fullName || !username) {
        toast({ title: "Sign-up Error", description: "Please fill out all fields.", variant: "destructive" });
        return;
    }
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
      // Check if username is unique
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({ title: "Sign-up Error", description: "Username is already taken.", variant: "destructive" });
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        email: user.email,
        fullName: fullName,
        profileImage: null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role: "user",
      });

      router.push("/dashboard");
    } catch (e: any) {
       let errorMessage = e.message;
        if (e.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email address already exists.';
        }
      toast({
        title: "Sign-up Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEmailPasswordLogin = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push("/dashboard");
    } catch (e: any) {
      let errorMessage = e.message;
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password. Please try again.';
      }
      toast({
        title: "Login Error",
        description: errorMessage,
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
