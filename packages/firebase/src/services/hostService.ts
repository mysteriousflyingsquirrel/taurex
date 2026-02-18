import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { getDb } from "../firestore";
import type { Host } from "../types";

export async function fetchHosts(): Promise<Host[]> {
  const q = query(collection(getDb(), "hosts"), orderBy("slug"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Host, "id">),
  }));
}

export async function fetchHostBySlug(
  slug: string
): Promise<Host | undefined> {
  const snap = await getDoc(doc(getDb(), "hosts", slug));
  if (!snap.exists()) return undefined;
  return { id: snap.id, ...(snap.data() as Omit<Host, "id">) };
}

export async function createHost(host: Omit<Host, "id">): Promise<void> {
  await setDoc(doc(getDb(), "hosts", host.slug), host);
}

export async function updateHost(
  hostId: string,
  data: Partial<Omit<Host, "id">>
): Promise<void> {
  await updateDoc(doc(getDb(), "hosts", hostId), data);
}

export async function deleteHost(hostId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "hosts", hostId));
}
