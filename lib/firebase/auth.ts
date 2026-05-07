'use client';

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './client';

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function isAllowedEmail(email: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'config', 'access'));
    if (!snap.exists()) return false;
    const allowed: string[] = snap.data().allowedEmails ?? [];
    return allowed.includes(email.toLowerCase());
  } catch {
    return false;
  }
}
