import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import importedConfig from '../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: importedConfig.apiKey || metaEnv.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: importedConfig.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: importedConfig.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: importedConfig.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: importedConfig.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: importedConfig.appId || metaEnv.VITE_FIREBASE_APP_ID || "placeholder-app-id",
  firestoreDatabaseId: importedConfig.firestoreDatabaseId || "(default)"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
