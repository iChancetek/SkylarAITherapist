
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "apiKey": "AIzaSyAoIOCJlx30-KHjb5MKU51GibpUBpazrWo",
  "authDomain": "skylar-ai-voice-therapy.firebaseapp.com",
  "projectId": "skylar-ai-voice-therapy",
  "storageBucket": "skylar-ai-voice-therapy.firebasestorage.app",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
