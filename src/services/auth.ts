import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';

import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from './firebase';

// Register
export const registerUser = async (
  name: string,
  email: string,
  password: string,
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  const user = userCredential.user;

  await updateProfile(user, {
    displayName: name.trim(),
  });

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    bio: '',
    photoURL: '',
    createdAt: serverTimestamp(),
  });

  return user;
};

// Login
export const loginUser = async (
  email: string,
  password: string,
) => {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  return credential.user;
};

// Logout
export const logoutUser = async () => {
  await signOut(auth);
};

// Password reset
export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email.trim());
};