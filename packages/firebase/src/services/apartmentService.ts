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
  ApartmentCalendarConflict,
  ApartmentCalendarImport,
  ApartmentCalendarManualBlock,
  ApartmentCalendarPrivate,
} from "../types";

const FUNCTIONS_REGION = "us-central1";
const EXPORT_FUNCTION_NAME = "exportApartmentIcs";
const REFRESH_FUNCTION_NAME = "refreshApartmentCalendarImport";
const DEFAULT_IMPORT_COLOR = "#3B82F6";

function apartmentsCol(hostId: string) {
  return collection(getDb(), "hosts", hostId, "apartments");
}

function apartmentDoc(hostId: string, slug: string) {
  return doc(getDb(), "hosts", hostId, "apartments", slug);
}

function privateCalendarDoc(hostId: string, slug: string) {
  return doc(getDb(), "hosts", hostId, "apartmentCalendarsPrivate", slug);
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
    manualBlocks: [],
    importedBusyRanges: [],
    conflicts: [],
    lastInternalUpdateAt: new Date().toISOString(),
  };
}

function defaultPrivateCalendar(): ApartmentCalendarPrivate {
  return {
    exportToken: randomToken(),
    imports: [],
    conflictPolicy: "strict-no-overwrite",
    updatedAt: new Date().toISOString(),
  };
}

function getCalendar(apartment: Partial<Apartment>): ApartmentCalendar {
  return apartment.calendar ?? defaultCalendar();
}

function getFns() {
  return getFunctions(getApp(), FUNCTIONS_REGION);
}

function normalizeImportFromUrl(url: string, index: number): ApartmentCalendarImport {
  return {
    id: `legacy-${Date.now()}-${index}`,
    name: `Legacy import ${index + 1}`,
    url: url.trim(),
    color: DEFAULT_IMPORT_COLOR,
    isActive: true,
    lastStatus: "pending",
  };
}

function normalizeImport(item: ApartmentCalendarImport): ApartmentCalendarImport {
  return {
    ...item,
    color: item.color || DEFAULT_IMPORT_COLOR,
  };
}

async function migrateLegacyCalendar(
  hostId: string,
  slug: string,
  raw: Record<string, unknown>
): Promise<void> {
  const rawCalendar = (raw.calendar ?? {}) as Record<string, unknown>;
  const legacyImports = Array.isArray(rawCalendar.imports)
    ? (rawCalendar.imports as ApartmentCalendarImport[])
    : [];
  const legacyUrls = Array.isArray(raw.icalUrls)
    ? (raw.icalUrls as string[])
    : [];
  const legacyToken =
    typeof rawCalendar.exportToken === "string" && rawCalendar.exportToken.length > 0
      ? (rawCalendar.exportToken as string)
      : "";

  if (!legacyImports.length && !legacyUrls.length && !legacyToken) return;

  const privateCalendar = await fetchApartmentCalendarPrivate(hostId, slug);
  const mergedImports = [
    ...privateCalendar.imports.map(normalizeImport),
    ...legacyImports.map(normalizeImport),
    ...legacyUrls.filter(Boolean).map(normalizeImportFromUrl),
  ];

  const dedupedImports = mergedImports.filter(
    (item, idx) => mergedImports.findIndex((other) => other.url === item.url) === idx
  );

  await setDoc(
    privateCalendarDoc(hostId, slug),
    {
      ...privateCalendar,
      imports: dedupedImports,
      exportToken: legacyToken || privateCalendar.exportToken,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const currentPublic = getCalendar(raw as Partial<Apartment>);
  await updateDoc(apartmentDoc(hostId, slug), {
    icalUrls: [],
    calendar: {
      manualBlocks: currentPublic.manualBlocks || [],
      importedBusyRanges: currentPublic.importedBusyRanges || [],
      conflicts: currentPublic.conflicts || [],
      lastAutoSyncAt: currentPublic.lastAutoSyncAt || undefined,
      lastInternalUpdateAt: new Date().toISOString(),
    },
  });
}

export async function fetchApartments(
  hostId: string
): Promise<Apartment[]> {
  const q = query(apartmentsCol(hostId), orderBy("slug"));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Apartment, "id">),
  }));
  await Promise.all(
    snap.docs.map((d) => migrateLegacyCalendar(hostId, d.id, d.data() as Record<string, unknown>))
  );
  return items;
}

export async function fetchApartmentBySlug(
  hostId: string,
  slug: string
): Promise<Apartment | undefined> {
  const snap = await getDoc(apartmentDoc(hostId, slug));
  if (!snap.exists()) return undefined;
  await migrateLegacyCalendar(hostId, slug, snap.data() as Record<string, unknown>);
  const refreshed = await getDoc(apartmentDoc(hostId, slug));
  if (!refreshed.exists()) return undefined;
  return { id: refreshed.id, ...(refreshed.data() as Omit<Apartment, "id">) };
}

export async function createApartment(
  hostId: string,
  apartment: Omit<Apartment, "id">
): Promise<void> {
  const { slug, ...rest } = apartment;
  const calendar = rest.calendar ?? defaultCalendar();
  await setDoc(apartmentDoc(hostId, slug), { slug, ...rest, calendar });
  await setDoc(privateCalendarDoc(hostId, slug), defaultPrivateCalendar(), { merge: true });
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

export async function fetchApartmentCalendarPrivate(
  hostId: string,
  apartmentSlug: string
): Promise<ApartmentCalendarPrivate> {
  const snap = await getDoc(privateCalendarDoc(hostId, apartmentSlug));
  if (!snap.exists()) {
    const created = defaultPrivateCalendar();
    await setDoc(privateCalendarDoc(hostId, apartmentSlug), created, { merge: true });
    return created;
  }
  const raw = snap.data() as Partial<ApartmentCalendarPrivate>;
  return {
    exportToken: raw.exportToken || randomToken(),
    imports: Array.isArray(raw.imports)
      ? (raw.imports as ApartmentCalendarImport[]).map(normalizeImport)
      : [],
    conflictPolicy: "strict-no-overwrite",
    updatedAt: raw.updatedAt,
  };
}

export async function rotateApartmentCalendarExportToken(
  hostId: string,
  apartmentSlug: string
): Promise<string> {
  const calendarPrivate = await fetchApartmentCalendarPrivate(hostId, apartmentSlug);
  const exportToken = randomToken();
  await setDoc(privateCalendarDoc(hostId, apartmentSlug), {
    ...calendarPrivate,
    exportToken,
    updatedAt: new Date().toISOString(),
  });
  return exportToken;
}

export async function addApartmentCalendarImport(
  hostId: string,
  apartmentSlug: string,
  payload: { name: string; url: string; color?: string }
): Promise<ApartmentCalendarImport> {
  const calendarPrivate = await fetchApartmentCalendarPrivate(hostId, apartmentSlug);
  const item: ApartmentCalendarImport = {
    id: randomToken(16),
    name: payload.name.trim(),
    url: payload.url.trim(),
    color: payload.color || DEFAULT_IMPORT_COLOR,
    isActive: true,
    lastStatus: "pending",
  };
  await setDoc(privateCalendarDoc(hostId, apartmentSlug), {
    ...calendarPrivate,
    imports: [...calendarPrivate.imports, item],
    updatedAt: new Date().toISOString(),
  });
  return item;
}

export async function removeApartmentCalendarImport(
  hostId: string,
  apartmentSlug: string,
  importId: string
): Promise<void> {
  const calendarPrivate = await fetchApartmentCalendarPrivate(hostId, apartmentSlug);
  const aptSnap = await getDoc(apartmentDoc(hostId, apartmentSlug));
  if (!aptSnap.exists()) throw new Error("Apartment not found.");
  const apartment = aptSnap.data() as Omit<Apartment, "id">;
  const calendar = getCalendar(apartment);
  await setDoc(privateCalendarDoc(hostId, apartmentSlug), {
    ...calendarPrivate,
    imports: calendarPrivate.imports.filter((item) => item.id !== importId),
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(apartmentDoc(hostId, apartmentSlug), {
    calendar: {
      ...calendar,
      importedBusyRanges: calendar.importedBusyRanges.filter((item) => item.sourceId !== importId),
      lastInternalUpdateAt: new Date().toISOString(),
    }
  });
}

export async function setApartmentCalendarImportActive(
  hostId: string,
  apartmentSlug: string,
  importId: string,
  isActive: boolean
): Promise<void> {
  const calendarPrivate = await fetchApartmentCalendarPrivate(hostId, apartmentSlug);
  await setDoc(privateCalendarDoc(hostId, apartmentSlug), {
    ...calendarPrivate,
    imports: calendarPrivate.imports.map((item) =>
      item.id === importId ? { ...item, isActive } : item
    ),
    updatedAt: new Date().toISOString(),
  });
}

export async function setApartmentCalendarImportColor(
  hostId: string,
  apartmentSlug: string,
  importId: string,
  color: string
): Promise<void> {
  const calendarPrivate = await fetchApartmentCalendarPrivate(hostId, apartmentSlug);
  await setDoc(privateCalendarDoc(hostId, apartmentSlug), {
    ...calendarPrivate,
    imports: calendarPrivate.imports.map((item) =>
      item.id === importId ? { ...item, color: color || DEFAULT_IMPORT_COLOR } : item
    ),
    updatedAt: new Date().toISOString(),
  });
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return !(aEnd < bStart || bEnd < aStart);
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

  const conflict = calendar.importedBusyRanges.find((item) =>
    rangesOverlap(block.startDate, block.endDate, item.startDate, item.endDate)
  );
  if (conflict) {
    throw new Error("Conflict detected with imported calendar range. Resolve conflict before blocking.");
  }

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
): Promise<{
  importedBusyRanges: ApartmentCalendarBusyRange[];
  conflicts: ApartmentCalendarConflict[];
  syncedAt: string;
}> {
  const callable = httpsCallable<
    { hostId: string; apartmentSlug: string },
    {
      importedBusyRanges: ApartmentCalendarBusyRange[];
      conflicts: ApartmentCalendarConflict[];
      syncedAt: string;
    }
  >(getFns(), REFRESH_FUNCTION_NAME);
  const result = await callable({ hostId, apartmentSlug });
  return result.data;
}
