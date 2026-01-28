
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

// Initialize Storage safely
import { getStorage, FirebaseStorage } from "firebase/storage";

let storage: FirebaseStorage;

try {
  storage = getStorage(app);
} catch (err) {
  console.error("Firebase Storage initialization failed:", err);
  // @ts-ignore - Providing a dummy object or null might be safer, 
  // but for now we let it be undefined and rely on consumers to check or fail later 
  // rather than crashing at module load.
}

export { app, auth, db, storage };
