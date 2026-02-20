import { useEffect, useState, useMemo, useCallback } from "react";
import {
  fetchSeasons,
  setSeason,
  deleteSeason as deleteSeasonApi,
  copySeasonsToYear,
  type Season,
  type DateString,
  type SeasonDateRange,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";
import Button from "../components/Button";
import StickyFormFooter from "../components/StickyFormFooter";
import DiscardChangesModal from "../components/DiscardChangesModal";
import { useToast } from "../components/Toast";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

const COLOUR_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#22C55E", "#14B8A6", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899", "#78716C", "#0EA5E9",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateString(year: number, month: number, day: number): DateString {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDate(ds: DateString): { year: number; month: number; day: number } {
  const [y, m, d] = ds.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function nextDate(year: number, month: number, day: number): { year: number; month: number; day: number } {
  const d = new Date(year, month - 1, day + 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function expandRanges(ranges: SeasonDateRange[]): Set<string> {
  const days = new Set<string>();
  for (const r of ranges) {
    let { year, month, day } = parseDate(r.start);
    const endStr = r.end;
    let safety = 3660;
    while (safety-- > 0) {
      const ds = toDateString(year, month, day);
      days.add(ds);
      if (ds === endStr) break;
      const n = nextDate(year, month, day);
      year = n.year; month = n.month; day = n.day;
    }
  }
  return days;
}

function collapseDaySetToRanges(daySet: Set<string>): SeasonDateRange[] {
  if (daySet.size === 0) return [];
  const sorted = [...daySet].sort();
  const ranges: SeasonDateRange[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const p = parseDate(prev);
    const n = nextDate(p.year, p.month, p.day);
    const expected = toDateString(n.year, n.month, n.day);
    if (cur !== expected) {
      ranges.push({ start: start as DateString, end: prev as DateString });
      start = cur;
    }
    prev = cur;
  }
  ranges.push({ start: start as DateString, end: prev as DateString });
  return ranges;
}

function addRangeToSeason(
  season: Season,
  startDay: DateString,
  endDay: DateString
): Season {
  const days = expandRanges(season.dateRanges);
  const newDays = expandRanges([{ start: startDay, end: endDay }]);
  for (const d of newDays) days.add(d);
  return { ...season, dateRanges: collapseDaySetToRanges(days) };
}

function removeOverlappingDays(
  seasons: Record<string, Season>,
  paintedSeasonId: string,
  paintedDays: Set<string>
): Record<string, Season> {
  const result = { ...seasons };
  for (const [id, season] of Object.entries(result)) {
    if (id === paintedSeasonId) continue;
    const days = expandRanges(season.dateRanges);
    let changed = false;
    for (const d of paintedDays) {
      if (days.has(d)) {
        days.delete(d);
        changed = true;
      }
    }
    if (changed) {
      result[id] = { ...season, dateRanges: collapseDaySetToRanges(days) };
    }
  }
  return result;
}

function removeDayFromSeason(season: Season, day: DateString): Season {
  const days = expandRanges(season.dateRanges);
  days.delete(day);
  return { ...season, dateRanges: collapseDaySetToRanges(days) };
}

const BASE_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => BASE_YEAR + i);

export default function Seasons() {
  const { hostId } = useHost();
  const [seasons, setSeasons] = useState<Record<string, Season>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<DateString | null>(null);
  const [hoverDay, setHoverDay] = useState<DateString | null>(null);
  const [year, setYear] = useState(BASE_YEAR);
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedSeasons, setLastSavedSeasons] = useState<Record<string, Season>>({});
  const toast = useToast();
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    id?: string;
    name: string;
    color: string;
  } | null>(null);

  // Fetch seasons for current year
  useEffect(() => {
    if (!hostId) return;
    setLoading(true);
    fetchSeasons(hostId, year).then((data) => {
      setSeasons(data);
      setLastSavedSeasons(data);
      setLoading(false);
      const keys = Object.keys(data);
      setSelectedId((prev) => (prev && data[prev] ? prev : keys[0] ?? null));
    });
  }, [hostId, year]);

  const isDirty =
    JSON.stringify(seasons) !== JSON.stringify(lastSavedSeasons);

  const { showModal, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isDirty);

  const handleSaveSeasons = useCallback(async () => {
    if (!hostId || !isDirty) return;
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(seasons).map(([id, s]) => {
          const { id: _, ...rest } = s;
          return setSeason(hostId, id, rest);
        })
      );
      setLastSavedSeasons(seasons);
      toast.success("Seasons saved.");
    } catch {
      toast.error("Saving failed.");
    } finally {
      setSaving(false);
    }
  }, [hostId, seasons, isDirty, toast]);

  // Build day → season lookup
  const dayMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [id, season] of Object.entries(seasons)) {
      for (const d of expandRanges(season.dateRanges)) {
        map[d] = id;
      }
    }
    return map;
  }, [seasons]);

  // Preview days during range selection
  const previewDays = useMemo(() => {
    if (!selectionStart || !hoverDay || !selectedId) return new Set<string>();
    const a = selectionStart < hoverDay ? selectionStart : hoverDay;
    const b = selectionStart < hoverDay ? hoverDay : selectionStart;
    return expandRanges([{ start: a as DateString, end: b as DateString }]);
  }, [selectionStart, hoverDay, selectedId]);

  // Count days per season
  const dayCounts = useMemo(() => {
    const totalDaysInYear = daysInMonth(year, 2) === 29 ? 366 : 365;
    const counts: Record<string, number> = {};
    let total = 0;
    for (const [id, season] of Object.entries(seasons)) {
      const c = expandRanges(season.dateRanges).size;
      counts[id] = c;
      total += c;
    }
    counts["__default"] = Math.max(0, totalDaysInYear - total);
    return counts;
  }, [seasons, year]);

  const handleDayClick = useCallback(
    (day: DateString) => {
      if (!selectedId || !seasons[selectedId]) return;

      if (!selectionStart) {
        if (dayMap[day] === selectedId) {
          setSeasons((prev) => ({
            ...prev,
            [selectedId]: removeDayFromSeason(prev[selectedId], day),
          }));
          return;
        }
        setSelectionStart(day);
      } else {
        const from = selectionStart < day ? selectionStart : day;
        const to = selectionStart < day ? day : selectionStart;
        const painted = expandRanges([{ start: from, end: to }]);

        setSeasons((prev) => {
          let next = {
            ...prev,
            [selectedId]: addRangeToSeason(prev[selectedId], from, to),
          };
          next = removeOverlappingDays(next, selectedId, painted);
          return next;
        });
        setSelectionStart(null);
        setHoverDay(null);
      }
    },
    [selectedId, selectionStart, dayMap, seasons]
  );

  // Escape to cancel selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectionStart(null);
        setHoverDay(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleDelete = async (seasonId: string) => {
    if (!hostId) return;
    const season = seasons[seasonId];
    if (
      !confirm(
        `Are you sure you want to delete "${season.name}"? All date range assignments for this season will be lost.`
      )
    )
      return;

    await deleteSeasonApi(hostId, seasonId);
    setSeasons((prev) => {
      const next = { ...prev };
      delete next[seasonId];
      return next;
    });
    if (selectedId === seasonId) {
      const remaining = Object.keys(seasons).filter((k) => k !== seasonId);
      setSelectedId(remaining[0] ?? null);
    }
  };

  const handleCreateSeason = () => {
    const usedColours = new Set(Object.values(seasons).map((s) => s.color));
    const firstUnused =
      COLOUR_PALETTE.find((c) => !usedColours.has(c)) ?? COLOUR_PALETTE[0];
    setModal({ mode: "create", name: "", color: firstUnused });
  };

  const handleEditSeason = (id: string) => {
    const s = seasons[id];
    setModal({
      mode: "edit",
      id,
      name: s.name,
      color: s.color,
    });
  };

  const handleModalSubmit = () => {
    if (!modal) return;
    if (modal.mode === "create") {
      const slugPart = slugify(modal.name);
      if (!slugPart) {
        toast.error("Name is required.");
        return;
      }
      const id = `${year}-${slugPart}`;
      if (seasons[id]) {
        toast.error("Season already exists.");
        return;
      }
      const newSeason: Season = {
        id,
        year,
        name: modal.name,
        color: modal.color,
        dateRanges: [],
      };
      setSeasons((prev) => ({ ...prev, [id]: newSeason }));
      setSelectedId(id);
    } else if (modal.mode === "edit" && modal.id) {
      setSeasons((prev) => ({
        ...prev,
        [modal.id!]: {
          ...prev[modal.id!],
          name: modal.name,
          color: modal.color,
        },
      }));
    }
    setModal(null);
  };

  const handleCopyFromPreviousYear = async () => {
    if (!hostId) return;
    const prevYear = year - 1;
    if (
      !confirm(
        `Copy all seasons from ${prevYear} to ${year}? Existing seasons for ${year} will not be affected — only new ones will be added.`
      )
    )
      return;
    setCopying(true);
    try {
      const copied = await copySeasonsToYear(hostId, prevYear, year);
      setSeasons((prev) => ({ ...prev, ...copied }));
      toast.success("Seasons copied.");
    } catch {
      toast.error("Failed to copy seasons.");
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Seasons</h1>
        <p className="mt-4 text-sm text-muted">Loading seasons…</p>
      </div>
    );
  }

  const seasonList = Object.values(seasons);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Seasons</h1>
      </div>

      {/* Year Selector */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {YEAR_OPTIONS.map((y) => (
          <button
            key={y}
            onClick={() => {
              setYear(y);
              setSelectionStart(null);
              setHoverDay(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              year === y
                ? "bg-primary text-primary-fg"
                : "bg-surface-alt text-foreground hover:bg-surface-alt"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Season List Panel */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Seasons for {year} ({seasonList.length})
          </h2>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyFromPreviousYear}
              disabled={copying}
              loading={copying}
            >
              {copying ? "Copying…" : `Copy from ${year - 1}`}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCreateSeason}
            >
              + Add season
            </Button>
          </div>
        </div>

        {seasonList.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {seasonList.map((season) => (
              <button
                key={season.id}
                onClick={() => {
                  setSelectedId(season.id);
                  setSelectionStart(null);
                  setHoverDay(null);
                }}
                className={`group relative flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                  selectedId === season.id
                    ? "border-foreground shadow-md"
                    : "border-transparent hover:border-border"
                }`}
                style={
                  selectedId === season.id
                    ? { backgroundColor: season.color + "1F" }
                    : {}
                }
              >
                <span
                  className="h-4 w-4 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: season.color }}
                />
                {season.name}
                <span className="ml-1 hidden gap-1 group-hover:inline-flex">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSeason(season.id);
                    }}
                    className="cursor-pointer text-muted hover:text-foreground"
                  >
                    ✏️
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(season.id);
                    }}
                    className="cursor-pointer text-muted hover:text-destructive"
                  >
                    🗑️
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Instructions */}
        <p className="mt-3 text-sm text-muted">
          {selectedId && !selectionStart && seasons[selectedId] && (
            <>
              <strong>{seasons[selectedId].name}</strong> selected — click a day
              to start selecting a range, or click an assigned day to remove it.
            </>
          )}
          {selectedId && selectionStart && seasons[selectedId] && (
            <>
              <strong>{seasons[selectedId].name}</strong> selected — click
              another day to complete the range (Esc to cancel).
            </>
          )}
          {!selectedId && seasonList.length > 0 && (
            <>
              Select a season above, then paint date ranges on the calendar
              below.
            </>
          )}
          {seasonList.length === 0 && <>Create a season to get started.</>}
        </p>
      </div>

      {/* Year Calendar */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <MiniMonth
            key={`${year}-${month}`}
            year={year}
            month={month}
            dayMap={dayMap}
            seasons={seasons}
            selectedId={selectedId}
            selectionStart={selectionStart}
            previewDays={previewDays}
            onDayClick={handleDayClick}
            onDayHover={setHoverDay}
            onMouseLeave={() => setHoverDay(null)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          {year} coverage
        </p>
        <div className="flex flex-wrap gap-4">
          {seasonList.map((season) => (
            <div key={season.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: season.color }}
              />
              {season.name}{" "}
              <span className="text-muted">
                ({dayCounts[season.id] ?? 0} days)
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full bg-surface-alt" />
            Default{" "}
            <span className="text-muted">
              ({dayCounts["__default"]} days)
            </span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground">
              {modal.mode === "create" ? "Create Season" : "Edit Season"}
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Name *
                </label>
                <input
                  type="text"
                  value={modal.name}
                  onChange={(e) =>
                    setModal({ ...modal, name: e.target.value })
                  }
                  placeholder="e.g. High Season"
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                />
                {modal.mode === "create" && modal.name && (
                  <p className="mt-1 text-xs text-muted">
                    ID: {year}-{slugify(modal.name) || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Colour
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLOUR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setModal({ ...modal, color: c })}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        modal.color === c
                          ? "scale-110 ring-2 ring-ring ring-offset-2"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleModalSubmit}>
                {modal.mode === "create" ? "Create" : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <StickyFormFooter
        dirty={isDirty}
        left={null}
        right={
          <Button
            variant="primary"
            loading={saving}
            disabled={!isDirty}
            onClick={handleSaveSeasons}
          >
            Save seasons
          </Button>
        }
      />
      <DiscardChangesModal
        open={showModal}
        onCancel={cancelDiscard}
        onDiscard={confirmDiscard}
      />
    </div>
  );
}

// Mini month component
function MiniMonth({
  year,
  month,
  dayMap,
  seasons,
  selectedId,
  selectionStart,
  previewDays,
  onDayClick,
  onDayHover,
  onMouseLeave,
}: {
  year: number;
  month: number;
  dayMap: Record<string, string>;
  seasons: Record<string, Season>;
  selectedId: string | null;
  selectionStart: DateString | null;
  previewDays: Set<string>;
  onDayClick: (day: DateString) => void;
  onDayHover: (day: DateString) => void;
  onMouseLeave: () => void;
}) {
  const days = daysInMonth(year, month);
  const offset = firstWeekday(year, month);

  return (
    <div
      className="rounded-xl border border-border bg-surface p-3 shadow-sm"
      onMouseLeave={onMouseLeave}
    >
      <p className="mb-2 text-center text-sm font-semibold text-foreground">
        {MONTH_NAMES[month - 1]}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAY_HEADERS.map((d) => (
          <span key={d} className="text-[10px] text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = toDateString(year, month, i + 1);
          const assignedTo = dayMap[day];
          const season = assignedTo ? seasons[assignedTo] : undefined;
          const isPreview = previewDays.has(day);
          const isStart = selectionStart === day;

          let bg = "bg-surface-alt";
          let text = "text-foreground";

          if (season) {
            bg = "";
            text = "text-primary-fg";
          } else if (isPreview && selectedId && seasons[selectedId]) {
            bg = "";
            text = "text-primary-fg";
          }

          return (
            <button
              key={day}
              onClick={() => onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              className={`h-7 w-7 rounded text-xs font-medium transition ${bg} ${text} hover:ring-2 hover:ring-ring hover:ring-offset-1 ${
                isStart ? "ring-2 ring-ring ring-offset-1" : ""
              }`}
              style={
                season
                  ? {
                      backgroundColor: season.color,
                      opacity: isPreview ? 0.7 : 1,
                    }
                  : isPreview && selectedId && seasons[selectedId]
                    ? {
                        backgroundColor: seasons[selectedId].color,
                        opacity: 0.5,
                      }
                    : undefined
              }
              title={`${MONTH_NAMES[month - 1]} ${i + 1}, ${year}${
                season ? ` — ${season.name}` : ""
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
