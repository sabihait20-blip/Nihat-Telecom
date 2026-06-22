import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import appletConfig from '../firebase-applet-config.json';

const defaultFirebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyB2GhCQj0asrCbbTXTtlKTUpm-CGNodI9M",
  authDomain: appletConfig.authDomain || "nihat-telecom-fc851.firebaseapp.com",
  projectId: appletConfig.projectId || "nihat-telecom-fc851",
  storageBucket: appletConfig.storageBucket || "nihat-telecom-fc851.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "181000040181",
  appId: appletConfig.appId || "1:181000040181:web:bf4ab666ef51adb007dfbc",
  measurementId: appletConfig.measurementId || "G-F7EC4Z31G2",
  firestoreDatabaseId: (appletConfig as any).firestoreDatabaseId || ""
};

let activeConfig = defaultFirebaseConfig;

try {
  const savedConfigStr = localStorage.getItem('custom_firebase_config');
  if (savedConfigStr) {
    const parsed = JSON.parse(savedConfigStr);
    if (parsed && parsed.apiKey && parsed.projectId) {
      activeConfig = {
        ...parsed,
        firestoreDatabaseId: parsed.firestoreDatabaseId || (appletConfig as any).firestoreDatabaseId || ""
      };
    }
  }
} catch (e) {
  console.error("Failed to load custom firebase config, using default", e);
}

const app = !getApps().length ? initializeApp(activeConfig) : getApp();
export const db = activeConfig.firestoreDatabaseId 
  ? getFirestore(app, activeConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const currentFirebaseConfig = activeConfig;

