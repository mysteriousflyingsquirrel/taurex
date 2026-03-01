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
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "../firestore";
import type {
  Apartment,
  ApartmentCalendar,
  ApartmentCalendarBusyRange,
  ApartmentCalendarImport,
  ApartmentCalendarManualBlock,
} from "../types";

const FUNCTIONS_REGION = "us-central1";
const EXPORT_FUNCTION_NAME = "exportApartmentIcs";
const REFRESH_FUNCTION_NAME = "refreshApartmentCalendarImport";

function apartmentsCol(hostId: string) {
  return collection(getDb(), "hosts", hostId, "apartments");
}

function apartmentDoc(hostId: string, slug: string) {
  return doc(getDb(), "hosts", hostId, "apartments", slug);
}

function randomToken(length = 48): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let token = "";
  for (const b of bytes) token += chars[b % chars.length];
  return token;
}

function defaultCalendar(): ApartmentCalendar {
  return {
    exportToken: randomToken(),
    imports: [],
    manualBlocks: [],
    importedBusyRanges: [],
    lastInternalUpdateAt: new Date().toISOString(),
  };
}

function getCalendar(apartment: Partial<Apartment>): ApartmentCalendar {
  return apartment.calendar ?? defaultCalendar();
}

function getFns() {
  return getFunctions(getApp(), FUNCTIONS_REGION);
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
  const calendar = rest.calendar ?? defaultCalendar();
  await setDoc(apartmentDoc(hostId, slug), { slug, ...rest, calendar });
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

export function buildApartmentCalendarExportUrl(
  hostId: string,
  apartmentSlug: string,
  exportToken: string
): string {
  const encodedHost = encodeURIComponent(hostId);
  const encodedSlug = encodeURIComponent(apartmentSlug);
  const encodedToken = encodeURIComponent(exportToken);
  return `https://${FUNCTIONS_REGION}-${getApp().options.projectId}.cloudfunctions.net/${EXPORT_FUNCTION_NAME}?hostId=${encodedHost}&apartmentSlug=${encodedSlug}&token=${encodedToken}`;
}

export async function rotateApartmentCalendarExportToken(
  hostId: string,
  apartmentSlug: string
): Promise<string> {
  const snap = await getDoc(apartmentDoc(hostId, apartmentSlug));
  if (!snap.exists()) throw new Error("Apartment not found.");
  const apartment = snap.data() as Omit<Apartment, "id">;
  const calendar = getCalendar(apartment);
  const exportToken = randomToken();
  await updateDoc(apartmentDoc(hostId, apartmentSlug), {
    calendar: {
      ...calendar,
      exportToken,
      lastInternalUpdateAt: new Date().toISOString(),
    },
  });
  return exportToken;
}

export async function addApartmentCalendarImport(
  hostId: string,
  apartmentSlug: string,
  payload: { name: string; url: string }
): Promise<ApartmentCalendarImport> {
  const snap = await getDoc(apartmentDoc(hostId, apartmentSlug));
  if (!snap.exists()) throw new Error("Apartment not found.");
  const apartment = snap.data() as Omit<Apartment, "id">;
  const calendar = getCalendar(apartment);
  const item: ApartmentCalendarImport = {
    id: randomToken(16),
    name: payload.name.trim(),
    url: payload.url.trim(),
    isActive: true,
    lastStatus: "pending",
  };
  await updateDoc(apartmentDoc(hostId, apartmentSlug), {
    calendar: {
      ...calendar,
      imports: [...calendar.imports, item],
      lastInternalUpdateAt: new Date().toISOString(),
    },
  });
  return item;
}

export async function removeApartmentCalendarImport(
  hostId: string,
  apartmentSlug: string,
  importId: string
): Promise<void> {
  const snap = await getDoc(apartmentDoc(hostId, apartmentSlug));
  if (!snap.exists()) throw new Error("Apartment not found.");
  const apartment = snap.data() as Omit<Apartment, "id">;
  const calendar = getCalendar(apartment);
  await updateDoc(apartmentDoc(hostId, apartmentSlug), {
    calendar: {
      ...calendar,
      imports: calendar.imports.filter((item) => item.id !== importId),
      importedBusyRanges: calendar.importedBusyRanges.filter(
        (item) => item.sourceId !== importId
      ),
      lastInternalUpdateAt: new Date().toISOString(),
    },
  });
}

export async function setApartmentCalendarImportActive(
  hostId: string,
  apartmentSlug: string,
  importId: string,
  isActive: boolean
): Promise<void> {
  const snap = await getDoc(apartmentDoc(hostId, apartmentSlug));
  if (!snap.exists()) throw new Error("Apartment not found.");
  const apartment = snap.data() as Omit<Apartment, "id">;
  const calendar = getCalendar(apartment);
  await updateDoc(apartmentDoc(hostId, apartmentSlug), {
    calendar: {
      ...calendar,
      imports: calendar.imports.map((item) =>
        item.id === importId ? { ...item, isActive } : item
      ),
      lastInternalUpdateAt: new Date().toISOString(),
    },
  });
}

export async function setApartmentManualBlock(
  hostId: string,
  apartmentSlug: string,
  block: ApartmentCalendarManualBlock
): Promise<void> {
  const snap = await getDoc(apartmentDoc(hostId, apartmentSlug));
  if (!snap.exists()) throw new Error("Apartment not found.");
  const apartment = snap.data() as Omit<Apartment, "id">;
  const calendar = getCalendar(apartment);

  const filtered = calendar.manualBlocks.filter((item) => item.id !== block.id);
  await updateDoc(apartmentDoc(hostId, apartmentSlug), {
    calendar: {
      ...calendar,
      manualBlocks: [...filtered, block],
      lastInternalUpdateAt: new Date().toISOString(),
    },
  });
}

export async function removeApartmentManualBlock(
  hostId: string,
  apartmentSlug: string,
  blockId: string
): Promise<void> {
  const snap = await getDoc(apartmentDoc(hostId, apartmentSlug));
  if (!snap.exists()) throw new Error("Apartment not found.");
  const apartment = snap.data() as Omit<Apartment, "id">;
  const calendar = getCalendar(apartment);

  await updateDoc(apartmentDoc(hostId, apartmentSlug), {
    calendar: {
      ...calendar,
      manualBlocks: calendar.manualBlocks.filter((item) => item.id !== blockId),
      lastInternalUpdateAt: new Date().toISOString(),
    },
  });
}

export async function refreshApartmentCalendarImports(
  hostId: string,
  apartmentSlug: string
): Promise<{ importedBusyRanges: ApartmentCalendarBusyRange[]; syncedAt: string }> {
  const callable = httpsCallable<
    { hostId: string; apartmentSlug: string },
    { importedBusyRanges: ApartmentCalendarBusyRange[]; syncedAt: string }
  >(getFns(), REFRESH_FUNCTION_NAME);
  const result = await callable({ hostId, apartmentSlug });
  return result.data;
}
