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
import type { Tenant } from "../types";

export async function fetchTenants(): Promise<Tenant[]> {
  const q = query(collection(db, "tenants"), orderBy("slug"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Tenant, "id">),
  }));
}

export async function fetchTenantBySlug(
  slug: string
): Promise<Tenant | undefined> {
  const snap = await getDoc(doc(db, "tenants", slug));
  if (!snap.exists()) return undefined;
  return { id: snap.id, ...(snap.data() as Omit<Tenant, "id">) };
}

export async function createTenant(tenant: Omit<Tenant, "id">): Promise<void> {
  await setDoc(doc(db, "tenants", tenant.slug), tenant);
}

export async function updateTenant(
  tenantId: string,
  data: Partial<Omit<Tenant, "id">>
): Promise<void> {
  await updateDoc(doc(db, "tenants", tenantId), data);
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await deleteDoc(doc(db, "tenants", tenantId));
}
