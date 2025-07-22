import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAoIOCJlx30-KHjb5MKU51GibpUBpazrWo",
  authDomain: "skylar-ai-voice-therapy.firebaseapp.com",
  projectId: "skylar-ai-voice-therapy",
  storageBucket: "skylar-ai-voice-therapy.firebasestorage.app",
  messagingSenderId: "584729201545",
  appId: "1:584729201545:web:cf415a8466017b55f56f58",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
