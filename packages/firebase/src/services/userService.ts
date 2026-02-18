import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { getDb } from "../firestore";
import type { UserProfile } from "../types";

export async function fetchUserProfile(
  uid: string
): Promise<UserProfile | undefined> {
  const snap = await getDoc(doc(getDb(), "users", uid));
  if (!snap.exists()) return undefined;
  const data = snap.data();
  return { uid: snap.id, hostId: data.hostId };
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(getDb(), "users"));
  return snap.docs.map((d) => ({
    uid: d.id,
    hostId: d.data().hostId,
  }));
}

export async function createUserProfile(
  uid: string,
  hostId: string
): Promise<void> {
  await setDoc(doc(getDb(), "users", uid), { hostId });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(getDb(), "users", uid));
}
