
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
      console.error("Google Sign-In Error:", error);
      let title = "Login Error";
      let description = "An unexpected error occurred. Please try again.";

      if (error.code === 'auth/unauthorized-domain') {
        title = "Domain Not Authorized";
        description = "This domain is not authorized for Google Sign-In. Please check your Firebase and Google Cloud Console settings.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        title = "Sign-In Cancelled";
        description = "You closed the sign-in window before completing the process.";
      }

      toast({
        title: title,
        description: description,
        variant: "destructive",
      });
    }
  };
  
  const handleEmailPasswordSignUp = async (fullName: string, username: string, email: string, pass: string) => {
    if (!fullName || !username || !email || !pass) {
        toast({ title: "Sign-up Error", description: "Please fill out all fields.", variant: "destructive" });
        return;
    }
     if (pass.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    try {
        // Step 1: Check if username already exists.
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            toast({ title: "Sign-up Error", description: "Username is already taken. Please choose another one.", variant: "destructive" });
            return;
        }

        // Step 2: Create the user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Step 3: Create the user document in Firestore.
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

    } catch (error: any) {
        console.error("Sign-up Error:", error.code, error.message);
        let title = "Sign-up Error";
        let description = "An unexpected error occurred. Please try again.";
        
        if (error.code === 'auth/email-already-in-use') {
            description = 'This email address is already associated with an account.';
        } else if (error.code === 'auth/invalid-email') {
            description = 'The email address you entered is not valid.';
        } else if (error.code === 'permission-denied') {
            title = "Permission Denied";
            description = "Could not create user profile. Please check your Firestore security rules to allow user creation.";
        }
        
        toast({
            title: title,
            description: description,
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
