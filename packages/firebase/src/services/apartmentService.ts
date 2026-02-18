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
import type { Apartment } from "../types";

function apartmentsCol(hostId: string) {
  return collection(getDb(), "hosts", hostId, "apartments");
}

function apartmentDoc(hostId: string, slug: string) {
  return doc(getDb(), "hosts", hostId, "apartments", slug);
}

export async function fetchApartments(
  hostId: string
): Promise<Apartment[]> {
  const q = query(apartmentsCol(hostId), orderBy("slug"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Apartment, "id">),
  }));
}

export async function fetchApartmentBySlug(
  hostId: string,
  slug: string
): Promise<Apartment | undefined> {
  const snap = await getDoc(apartmentDoc(hostId, slug));
  if (!snap.exists()) return undefined;
  return { id: snap.id, ...(snap.data() as Omit<Apartment, "id">) };
}

export async function createApartment(
  hostId: string,
  apartment: Omit<Apartment, "id">
): Promise<void> {
  const { slug, ...rest } = apartment;
  await setDoc(apartmentDoc(hostId, slug), { slug, ...rest });
}

export async function updateApartment(
  hostId: string,
  slug: string,
  data: Partial<Omit<Apartment, "id" | "slug">>
): Promise<void> {
  await updateDoc(apartmentDoc(hostId, slug), data);
}

export async function deleteApartment(
  hostId: string,
  slug: string
): Promise<void> {
  await deleteDoc(apartmentDoc(hostId, slug));
}
