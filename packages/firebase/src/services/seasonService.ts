import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "../firestore";
import type { Season, SeasonDateRange } from "../types";

function seasonsCol(hostId: string) {
  return collection(getDb(), "hosts", hostId, "seasons");
}

function seasonDoc(hostId: string, seasonId: string) {
  return doc(getDb(), "hosts", hostId, "seasons", seasonId);
}

export async function fetchSeasons(
  hostId: string,
  year?: number
): Promise<Record<string, Season>> {
  let q;
  if (year !== undefined) {
    q = query(seasonsCol(hostId), where("year", "==", year));
  } else {
    q = query(seasonsCol(hostId));
  }
  const snap = await getDocs(q);
  const result: Record<string, Season> = {};
  snap.docs.forEach((d) => {
    result[d.id] = { id: d.id, ...(d.data() as Omit<Season, "id">) };
  });
  return result;
}

export async function setSeason(
  hostId: string,
  seasonId: string,
  data: Omit<Season, "id">
): Promise<void> {
  await setDoc(seasonDoc(hostId, seasonId), data);
}

export async function deleteSeason(
  hostId: string,
  seasonId: string
): Promise<void> {
  await deleteDoc(seasonDoc(hostId, seasonId));
}

/** Shift a YYYY-MM-DD date by N years */
function shiftDateByYears(dateStr: string, yearDelta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const newYear = y + yearDelta;
  const maxDay = new Date(newYear, m, 0).getDate();
  const newDay = Math.min(d, maxDay);
  return `${newYear}-${String(m).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
}

/** Copy all seasons from one year to another, shifting dates */
export async function copySeasonsToYear(
  hostId: string,
  fromYear: number,
  toYear: number
): Promise<Record<string, Season>> {
  const source = await fetchSeasons(hostId, fromYear);
  const yearDelta = toYear - fromYear;
  const result: Record<string, Season> = {};

  const promises = Object.values(source).map((season) => {
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
    return setDoc(seasonDoc(hostId, newId), data);
  });

  await Promise.all(promises);
  return result;
}
