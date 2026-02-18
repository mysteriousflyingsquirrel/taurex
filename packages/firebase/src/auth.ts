import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { initializeApp, getApp, deleteApp } from "firebase/app";

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(getAuth(), email, password);
}

export function signOut() {
  return firebaseSignOut(getAuth());
}

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuth(), callback);
}

/**
 * Creates a new Firebase Auth user without disrupting the current session.
 * Uses a temporary secondary Firebase app instance so the caller stays signed in.
 * Returns the new user's UID.
 */
export async function createAuthUser(
  email: string,
  password: string
): Promise<string> {
  const config = getApp().options;
  const secondary = initializeApp(config, "__userCreation");
  const secondaryAuth = getAuth(secondary);
  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );
    return credential.user.uid;
  } finally {
    await firebaseSignOut(secondaryAuth);
    await deleteApp(secondary);
  }
}

export type { User };
