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
import { db } from "../firestore";
import type { Apartment } from "../types";

function apartmentsCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "apartments");
}

function apartmentDoc(tenantId: string, slug: string) {
  return doc(db, "tenants", tenantId, "apartments", slug);
}

export async function fetchApartments(
  tenantId: string
): Promise<Apartment[]> {
  const q = query(apartmentsCol(tenantId), orderBy("slug"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Apartment, "id">),
  }));
}

export async function fetchApartmentBySlug(
  tenantId: string,
  slug: string
): Promise<Apartment | undefined> {
  const snap = await getDoc(apartmentDoc(tenantId, slug));
  if (!snap.exists()) return undefined;
  return { id: snap.id, ...(snap.data() as Omit<Apartment, "id">) };
}

export async function createApartment(
  tenantId: string,
  apartment: Omit<Apartment, "id">
): Promise<void> {
  const { slug, ...rest } = apartment;
  await setDoc(apartmentDoc(tenantId, slug), { slug, ...rest });
}

export async function updateApartment(
  tenantId: string,
  slug: string,
  data: Partial<Omit<Apartment, "id" | "slug">>
): Promise<void> {
  await updateDoc(apartmentDoc(tenantId, slug), data);
}

export async function deleteApartment(
  tenantId: string,
  slug: string
): Promise<void> {
  await deleteDoc(apartmentDoc(tenantId, slug));
}
