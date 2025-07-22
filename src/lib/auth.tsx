
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

// Initialize Firebase Auth
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

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          username: user.email?.split('@')[0] || `user${Date.now()}`,
          email: user.email,
          fullName: user.displayName,
          profileImage: user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          role: "user",
        });
      } else {
         await updateDoc(userRef, {
            lastLogin: serverTimestamp(),
         });
      }
      router.push("/dashboard");
    } catch (error: any) {
        console.error("Full Google Sign-In Error:", error); // Log the full error
        let errorMessage = "An unknown error occurred during login.";
        if (error.code) {
            switch (error.code) {
                case 'auth/operation-not-allowed':
                    errorMessage = 'Google Sign-In is not enabled. Please enable it in the Firebase console.';
                    break;
                case 'auth/popup-closed-by-user':
                    errorMessage = 'The sign-in window was closed before completing. Please try again.';
                    break;
                case 'auth/unauthorized-domain':
                    errorMessage = 'This domain is not authorized for authentication. Please check your Firebase settings.';
                    break;
                default:
                    errorMessage = `Login Error: ${error.message}`;
            }
        }
      toast({
        title: "Login Error",
        description: errorMessage,
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
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({ title: "Sign-up Error", description: "Username is already taken.", variant: "destructive" });
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

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
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      });
      router.push("/dashboard");
    } catch (e: any)
      {
      let errorMessage = "Invalid credentials. Please try again.";
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
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
