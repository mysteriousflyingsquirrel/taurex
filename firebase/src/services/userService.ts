import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firestore";
import type { UserProfile } from "../types";

export async function fetchUserProfile(
  uid: string
): Promise<UserProfile | undefined> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return undefined;
  const data = snap.data();
  return { uid: snap.id, tenantId: data.tenantId };
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({
    uid: d.id,
    tenantId: d.data().tenantId,
  }));
}

export async function createUserProfile(
  uid: string,
  tenantId: string
): Promise<void> {
  await setDoc(doc(db, "users", uid), { tenantId });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}
