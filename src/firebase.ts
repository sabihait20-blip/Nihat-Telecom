import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB2GhCQj0asrCbbTXTtlKTUpm-CGNodI9M",
  authDomain: "nihat-telecom-fc851.firebaseapp.com",
  projectId: "nihat-telecom-fc851",
  storageBucket: "nihat-telecom-fc851.firebasestorage.app",
  messagingSenderId: "181000040181",
  appId: "1:181000040181:web:bf4ab666ef51adb007dfbc",
  measurementId: "G-F7EC4Z31G2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

