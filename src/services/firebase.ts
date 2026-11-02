import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD_AGFVkUIqMRvngvG5IZ4W6Y9cRRq8lVw",
  authDomain: "linkup-803d0.firebaseapp.com",
  projectId: "linkup-803d0",
  storageBucket: "linkup-803d0.firebasestorage.app",
  messagingSenderId: "721962030998",
  appId: "1:721962030998:web:bb2674fddd88d77b856fb7"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;