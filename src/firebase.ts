import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import appletConfig from '../firebase-applet-config.json';

const defaultFirebaseConfig = {
  apiKey: "AIzaSyB2GhCQj0asrCbbTXTtlKTUpm-CGNodI9M",
  authDomain: "nihat-telecom-fc851.firebaseapp.com",
  projectId: "nihat-telecom-fc851",
  storageBucket: "nihat-telecom-fc851.firebasestorage.app",
  messagingSenderId: "181000040181",
  appId: "1:181000040181:web:bf4ab666ef51adb007dfbc",
  measurementId: "G-F7EC4Z31G2",
  firestoreDatabaseId: ""
};

let activeConfig = defaultFirebaseConfig;

const app = !getApps().length ? initializeApp(activeConfig) : getApp();
export const db = activeConfig.firestoreDatabaseId 
  ? getFirestore(app, activeConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const currentFirebaseConfig = activeConfig;

