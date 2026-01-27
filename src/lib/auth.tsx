
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
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { app, db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Initialize Firebase Auth
const auth = getAuth(app);

interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  profileImage: string | null;
  createdAt: any;
  lastLogin: any;
  role: string;
  language?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isEmailVerified: boolean;
  sendVerification: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  updateUserProfile: async () => { },
  isEmailVerified: false,
  sendVerification: async () => { },
  reloadUser: async () => { },
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const { toast } = useToast();

  const fetchUserProfile = async (firebaseUser: User) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      setUserProfile(userDoc.data() as UserProfile);
    } else {
      setUserProfile(null);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userRef, data);
        setUserProfile(prevProfile => prevProfile ? { ...prevProfile, ...data } : null);
      } catch (error) {
        console.error("Error updating user profile:", error);
        toast({ title: "Update Error", description: "Could not save your preferences.", variant: "destructive" });
      }
    }
  };

  const sendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        toast({ title: "Verification Sent", description: "Please check your inbox." });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  };

  const reloadUser = async () => {
    if (user) {
      await user.reload();
      setIsEmailVerified(user.emailVerified);
      // Force UI update by setting user to a shallow copy if needed, 
      // but usually the isEmailVerified state is enough.
      const freshUser = auth.currentUser;
      if (freshUser) setUser(freshUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setIsEmailVerified(user.emailVerified);
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
        setIsEmailVerified(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, updateUserProfile, isEmailVerified, sendVerification, reloadUser }}>
      {loading ? <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : children}
    </AuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const { toast } = useToast();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await setPersistence(auth, browserLocalPersistence);
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
          language: "en", // Default language
        });
      } else {
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
        });
      }
      router.push("/dashboard");
    } catch (error: any) {
      let title = "Login Error";
      let description = "An unexpected error occurred. Please try again.";

      if (error.code === 'auth/unauthorized-domain') {
        title = "Domain Not Authorized";
        description = "This domain is not authorized for Google Sign-In. Please check your Firebase and Google Cloud Console settings.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        title = "Sign-In Cancelled";
        description = "You closed the sign-in window before completing the process.";
      } else if (error.code === 'permission-denied' || error.code === 'auth/permission-denied') {
        title = "Permission Denied";
        description = "Could not create or update user profile. Please check your Firestore security rules.";
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials' || error.code === 'auth/operation-not-allowed') {
        title = "Invalid Action";
        description = "The requested action is invalid. This may be due to a configuration issue in your Google Cloud Console OAuth settings.";
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
      await setPersistence(auth, browserLocalPersistence);
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
        language: "en", // Default language
      });

      router.push("/dashboard");

    } catch (error: any) {
      let title = "Sign-up Error";
      let description = "An unexpected error occurred. Please try again.";

      if (error.code === 'auth/email-already-in-use') {
        description = 'This email address is already associated with an account.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'The email address you entered is not valid.';
      } else if (error.code === 'permission-denied' || error.code === 'auth/permission-denied') {
        title = "Permission Denied";
        description = "Could not create user profile. Please check your Firestore security rules.";
      }

      toast({
        title: title,
        description: description,
        variant: "destructive",
      });
    }
  };

  const handleEmailPasswordLogin = async (email: string, pass: string) => {
    if (!email || !pass) {
      toast({ title: "Login Error", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }
    try {
      await setPersistence(auth, browserLocalPersistence);
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      });
      router.push("/dashboard");
    } catch (error: any) {
      let title = "Login Error";
      let description = "An unexpected error occurred. Please try again.";

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please try again.';
      } else if (error.code === 'permission-denied' || error.code === 'auth/permission-denied') {
        title = "Permission Denied";
        description = "Could not update user session. Please check your Firestore security rules.";
      }

      toast({
        title: title,
        description: description,
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!email) {
      toast({
        title: "Password Reset Error",
        description: "Could not determine your email address.",
        variant: "destructive",
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: `An email has been sent to ${email} with instructions to reset your password.`,
      });
    } catch (error: any) {
      toast({
        title: "Password Reset Error",
        description: error.message,
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
    handlePasswordReset,
  };
};
