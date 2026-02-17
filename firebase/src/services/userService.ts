import { doc, getDoc, setDoc } from "firebase/firestore";
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

export async function createUserProfile(
  uid: string,
  tenantId: string
): Promise<void> {
  await setDoc(doc(db, "users", uid), { tenantId });
}
