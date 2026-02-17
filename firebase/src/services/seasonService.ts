import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firestore";
import type { Season, SeasonDateRange } from "../types";

function seasonsCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "seasons");
}

function seasonDoc(tenantId: string, seasonId: string) {
  return doc(db, "tenants", tenantId, "seasons", seasonId);
}

export async function fetchSeasons(
  tenantId: string,
  year?: number
): Promise<Record<string, Season>> {
  let q;
  if (year !== undefined) {
    q = query(seasonsCol(tenantId), where("year", "==", year));
  } else {
    q = query(seasonsCol(tenantId));
  }
  const snap = await getDocs(q);
  const result: Record<string, Season> = {};
  snap.docs.forEach((d) => {
    result[d.id] = { id: d.id, ...(d.data() as Omit<Season, "id">) };
  });
  return result;
}

export async function setSeason(
  tenantId: string,
  seasonId: string,
  data: Omit<Season, "id">
): Promise<void> {
  await setDoc(seasonDoc(tenantId, seasonId), data);
}

export async function deleteSeason(
  tenantId: string,
  seasonId: string
): Promise<void> {
  await deleteDoc(seasonDoc(tenantId, seasonId));
}

/** Shift a YYYY-MM-DD date by N years */
function shiftDateByYears(dateStr: string, yearDelta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const newYear = y + yearDelta;
  // Handle Feb 29 → Feb 28 if target year is not a leap year
  const maxDay = new Date(newYear, m, 0).getDate();
  const newDay = Math.min(d, maxDay);
  return `${newYear}-${String(m).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
}

/** Copy all seasons from one year to another, shifting dates */
export async function copySeasonsToYear(
  tenantId: string,
  fromYear: number,
  toYear: number
): Promise<Record<string, Season>> {
  const source = await fetchSeasons(tenantId, fromYear);
  const yearDelta = toYear - fromYear;
  const result: Record<string, Season> = {};

  const promises = Object.values(source).map((season) => {
    // Build new ID: replace year prefix
    const slugPart = season.id.replace(`${fromYear}-`, "");
    const newId = `${toYear}-${slugPart}`;

    const newRanges: SeasonDateRange[] = season.dateRanges.map((r) => ({
      start: shiftDateByYears(r.start, yearDelta),
      end: shiftDateByYears(r.end, yearDelta),
    }));

    const newSeason: Season = {
      id: newId,
      year: toYear,
      name: season.name,
      color: season.color,
      dateRanges: newRanges,
    };

    result[newId] = newSeason;
    const { id: _, ...data } = newSeason;
    return setDoc(seasonDoc(tenantId, newId), data);
  });

  await Promise.all(promises);
  return result;
}
