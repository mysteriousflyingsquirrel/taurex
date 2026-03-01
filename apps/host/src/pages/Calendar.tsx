import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchApartments,
  fetchApartmentCalendarPrivate,
  formatDate,
  refreshApartmentCalendarImports,
  removeApartmentManualBlock,
  setApartmentManualBlock,
  type Apartment,
  type ApartmentCalendarPrivate,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { ENABLE_APARTMENT_CALENDAR_INTEGRATION } from "../config/features";
import { useToast } from "../components/Toast";

const DEFAULT_IMPORT_COLOR = "#3B82F6";
const CELL_SIZE = 24;
const CELL_GAP = 2;
const ALL_APARTMENTS_VALUE = "__all__";
const MONTH_GAP = 14;

type CombinedRange = {
  id: string;
  source: "manual" | "imported";
  sourceName: string;
  sourceColor: string;
  apartmentName: string;
  startDate: string;
  endDate: string;
  note?: string;
};

export default function Calendar() {
  const { hostId } = useHost();
  const toast = useToast();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [calendarPrivateBySlug, setCalendarPrivateBySlug] = useState<
    Record<string, ApartmentCalendarPrivate>
  >({});
  const [selectedSlug, setSelectedSlug] = useState(ALL_APARTMENTS_VALUE);
  const [blockMode, setBlockMode] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockNote, setBlockNote] = useState("");
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const loadCalendarData = useCallback(async () => {
    if (!hostId || !ENABLE_APARTMENT_CALENDAR_INTEGRATION) return;
    const items = await fetchApartments(hostId);
    const privateEntries = await Promise.all(
      items.map(async (apt) => [apt.slug, await fetchApartmentCalendarPrivate(hostId, apt.slug)] as const)
    );
    setCalendarPrivateBySlug(Object.fromEntries(privateEntries));
    setApartments(items);
    setSelectedSlug((prev) => {
      if (!items.length) return "";
      if (prev === ALL_APARTMENTS_VALUE) return ALL_APARTMENTS_VALUE;
      if (!prev || !items.some((apt) => apt.slug === prev)) return ALL_APARTMENTS_VALUE;
      return prev;
    });
  }, [hostId]);

  useEffect(() => {
    void loadCalendarData();
  }, [loadCalendarData]);

  const isAllApartments = selectedSlug === ALL_APARTMENTS_VALUE;

  useEffect(() => {
    if (isAllApartments) {
      setBlockMode(false);
      setBlockStart("");
      setBlockEnd("");
      setBlockNote("");
      setConfirmBlockOpen(false);
    }
  }, [isAllApartments]);

  const selectedApartment = useMemo(
    () => apartments.find((apt) => apt.slug === selectedSlug),
    [apartments, selectedSlug]
  );

  const shownApartments = useMemo(() => {
    if (isAllApartments) return apartments;
    return selectedApartment ? [selectedApartment] : [];
  }, [apartments, selectedApartment, isAllApartments]);

  const timelineDays = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 48);
    const days: string[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      days.push(cursor.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const timelineMonths = useMemo(() => {
    const labels: Array<{ key: string; label: string; span: number }> = [];
    let current = "";
    let count = 0;
    for (const day of timelineDays) {
      const key = day.slice(0, 7);
      if (!current) current = key;
      if (key !== current) {
        const d = new Date(`${current}-01T00:00:00`);
        labels.push({
          key: current,
          label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
          span: count,
        });
        current = key;
        count = 1;
      } else {
        count += 1;
      }
    }
    if (current) {
      const d = new Date(`${current}-01T00:00:00`);
      labels.push({
        key: current,
        label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        span: count,
      });
    }
    return labels;
  }, [timelineDays]);

  function dateInRange(date: string, startDate: string, endDate: string) {
    return date >= startDate && date <= endDate;
  }

  function importColorFor(apartmentSlug: string, sourceId: string): string {
    const source = calendarPrivateBySlug[apartmentSlug]?.imports.find((item) => item.id === sourceId);
    return source?.color || DEFAULT_IMPORT_COLOR;
  }

  function importMatches(apt: Apartment, date: string) {
    return (apt.calendar?.importedBusyRanges || []).filter((r) =>
      dateInRange(date, r.startDate, r.endDate)
    );
  }

  function hasImportOverlap(apt: Apartment) {
    const items = (apt.calendar?.importedBusyRanges || []).slice().sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (items[j].startDate > items[i].endDate) break;
        if (items[i].sourceId !== items[j].sourceId && items[j].startDate <= items[i].endDate) {
          return true;
        }
      }
    }
    return false;
  }

  function cellVisual(apt: Apartment, date: string): {
    status: "available" | "imported" | "manual" | "conflict";
    color: string;
    sourceName: string;
    notes: string;
  } {
    const matchedImports = importMatches(apt, date);
    const sourceIds = Array.from(new Set(matchedImports.map((r) => r.sourceId)));
    const openConflict = (apt.calendar?.conflicts || []).find(
      (c) => c.status !== "resolved" && dateInRange(date, c.startDate, c.endDate)
    );
    if (openConflict || sourceIds.length > 1) {
      return {
        status: "conflict",
        color: "#DC2626",
        sourceName: "Conflict",
        notes: openConflict?.reason || "Resolve conflict",
      };
    }

    const manualBlock = (apt.calendar?.manualBlocks || []).find((b) =>
      dateInRange(date, b.startDate, b.endDate)
    );
    if (manualBlock) {
      return {
        status: "manual",
        color: "#F97316",
        sourceName: "Manual block",
        notes: manualBlock.note || "-",
      };
    }

    if (matchedImports[0]) {
      const sourceId = matchedImports[0].sourceId;
      const source = calendarPrivateBySlug[apt.slug]?.imports.find((i) => i.id === sourceId);
      return {
        status: "imported",
        color: importColorFor(apt.slug, sourceId),
        sourceName: source?.name || "Imported event",
        notes: matchedImports[0].note || "-",
      };
    }

    return {
      status: "available",
      color: "#16A34A",
      sourceName: "Available",
      notes: "-",
    };
  }

  function selected(date: string) {
    if (!blockMode || !blockStart || !blockEnd) return false;
    const start = blockStart < blockEnd ? blockStart : blockEnd;
    const end = blockStart < blockEnd ? blockEnd : blockStart;
    return date >= start && date <= end;
  }

  function onTimelineDateClick(apartmentSlug: string, date: string) {
    if (!blockMode || isAllApartments) return;
    if (apartmentSlug !== selectedSlug) return;
    if (!blockStart || (blockStart && blockEnd)) {
      setBlockStart(date);
      setBlockEnd("");
      return;
    }
    if (date < blockStart) {
      setBlockEnd(blockStart);
      setBlockStart(date);
    } else {
      setBlockEnd(date);
    }
    setConfirmBlockOpen(true);
  }

  async function handleAddBlock() {
    if (!hostId || !selectedApartment || !blockStart || !blockEnd) return;
    const start = blockStart < blockEnd ? blockStart : blockEnd;
    const end = blockStart < blockEnd ? blockEnd : blockStart;
    setBusyAction(true);
    try {
      // Required pre-sync before blocking to avoid stale overlap decisions.
      await refreshApartmentCalendarImports(hostId, selectedApartment.slug);
      const refreshed = await fetchApartments(hostId);
      setApartments(refreshed);
      const refreshedApt = refreshed.find((a) => a.slug === selectedApartment.slug);
      if (!refreshedApt) throw new Error("Apartment missing after sync.");

      const overlapsImport = (refreshedApt.calendar?.importedBusyRanges || []).some(
        (r) => !(end < r.startDate || r.endDate < start)
      );
      const hasOpenConflict = (refreshedApt.calendar?.conflicts || []).some(
        (c) => c.status !== "resolved" && !(end < c.startDate || c.endDate < start)
      );
      const hasOverlapConflict = timelineDays.some((day) => {
        if (!dateInRange(day, start, end)) return false;
        const sourceIds = Array.from(new Set(importMatches(refreshedApt, day).map((r) => r.sourceId)));
        return sourceIds.length > 1;
      });
      if (overlapsImport || hasOpenConflict || hasOverlapConflict) {
        toast.error("Conflict detected after sync. Resolve conflicts before blocking.");
        return;
      }

      const blockId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await setApartmentManualBlock(hostId, selectedApartment.slug, {
        id: blockId,
        startDate: start,
        endDate: end,
        note: blockNote.trim() || undefined,
      });

      await loadCalendarData();
      setBlockStart("");
      setBlockEnd("");
      setBlockNote("");
      setBlockMode(false);
      setConfirmBlockOpen(false);
      toast.success("Manual block added.");
    } catch {
      toast.error("Saving failed");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleRemoveBlock(blockId: string) {
    if (!hostId || !selectedApartment) return;
    setBusyAction(true);
    try {
      await removeApartmentManualBlock(hostId, selectedApartment.slug, blockId);
      await loadCalendarData();
      toast.success("Manual block removed.");
    } catch {
      toast.error("Saving failed");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleRefresh() {
    if (!hostId) return;
    setBusyAction(true);
    try {
      if (isAllApartments) {
        await Promise.all(apartments.map((apt) => refreshApartmentCalendarImports(hostId, apt.slug)));
      } else if (selectedApartment) {
        await refreshApartmentCalendarImports(hostId, selectedApartment.slug);
      } else {
        return;
      }
      await loadCalendarData();
      toast.success("Imports refreshed.");
    } catch {
      toast.error("Refresh failed.");
    } finally {
      setBusyAction(false);
    }
  }

  const openConflictCount = useMemo(
    () =>
      apartments.reduce(
        (sum, apt) => sum + (apt.calendar?.conflicts || []).filter((c) => c.status !== "resolved").length,
        0
      ),
    [apartments]
  );

  const apartmentsWithImportOverlap = useMemo(
    () => apartments.filter((apt) => hasImportOverlap(apt)).length,
    [apartments]
  );

  const conflictApartmentCount = useMemo(
    () =>
      apartments.filter((apt) => {
        const hasOpenConflict = (apt.calendar?.conflicts || []).some((c) => c.status !== "resolved");
        return hasOpenConflict || hasImportOverlap(apt);
      }).length,
    [apartments]
  );

  const visibleImportLegend = useMemo(() => {
    return shownApartments.flatMap((apt) =>
      (calendarPrivateBySlug[apt.slug]?.imports || []).map((item) => ({
        key: `${apt.slug}-${item.id}`,
        apartment: apt.name || apt.slug,
        name: item.name,
        color: item.color || DEFAULT_IMPORT_COLOR,
        isActive: item.isActive,
      }))
    );
  }, [shownApartments, calendarPrivateBySlug]);

  const combinedRanges: CombinedRange[] = useMemo(() => {
    const sourceApartments = isAllApartments ? apartments : selectedApartment ? [selectedApartment] : [];
    return sourceApartments.flatMap((apt) => {
      const importsById = new Map(
        (calendarPrivateBySlug[apt.slug]?.imports || []).map((item) => [item.id, item] as const)
      );
      const manualItems = (apt.calendar?.manualBlocks || []).map((item) => ({
        ...item,
        apartmentName: apt.name || apt.slug,
        source: "manual" as const,
        sourceName: "Manual block",
        sourceColor: "#F97316",
      }));
      const importedItems = (apt.calendar?.importedBusyRanges || []).map((item) => {
        const source = importsById.get(item.sourceId);
        return {
          ...item,
          id: `${apt.slug}-${item.sourceId}-${item.startDate}-${item.endDate}`,
          apartmentName: apt.name || apt.slug,
          source: "imported" as const,
          sourceName: source?.name || "Imported event",
          sourceColor: source?.color || DEFAULT_IMPORT_COLOR,
        };
      });
      return [...manualItems, ...importedItems];
    });
  }, [apartments, selectedApartment, isAllApartments, calendarPrivateBySlug]);

  const selectedRangeLabel = useMemo(() => {
    if (!blockStart || !blockEnd) return "";
    const start = blockStart < blockEnd ? blockStart : blockEnd;
    const end = blockStart < blockEnd ? blockEnd : blockStart;
    return `${formatDate(start)} - ${formatDate(end)}`;
  }, [blockStart, blockEnd]);

  const rowLabelWidth = 220;
  const timelineTrackWidth =
    timelineDays.length * (CELL_SIZE + CELL_GAP) + Math.max(0, timelineMonths.length - 1) * MONTH_GAP;
  const timelineWidth = timelineTrackWidth + rowLabelWidth;
  const dayLabel = (date: string) => String(Number(date.slice(8, 10)));

  return (
    <div>
      <PageHeader title="Calendar" />

      {!ENABLE_APARTMENT_CALENDAR_INTEGRATION ? (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-muted">
            Calendar integration is currently disabled.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">Conflict dashboard</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface-alt p-3">
                <p className="text-xs text-muted">Open conflicts</p>
                <p className="text-2xl font-semibold text-destructive">{openConflictCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-alt p-3">
                <p className="text-xs text-muted">Apartments affected</p>
                <p className="text-2xl font-semibold text-foreground">{conflictApartmentCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-alt p-3">
                <p className="text-xs text-muted">Import overlaps</p>
                <p className="text-2xl font-semibold text-destructive">{apartmentsWithImportOverlap}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Red days indicate conflicts. Resolve them before adding manual blocks.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="rounded-lg border border-input px-3 py-2 text-sm"
              >
                <option value={ALL_APARTMENTS_VALUE}>All apartments</option>
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.slug}>
                    {apt.name || apt.slug}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={handleRefresh} loading={busyAction} disabled={!apartments.length}>
                Refresh now
              </Button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Calendar timeline (48 months)</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-600" /> Available</span>
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-orange-500" /> Manual block</span>
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red-600" /> Conflict</span>
                  {visibleImportLegend.map((item) => (
                    <span key={item.key} className="inline-flex items-center gap-1">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      {item.name} {isAllApartments ? `(${item.apartment})` : ""}{item.isActive ? "" : " (inactive)"}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                variant={blockMode ? "primary" : "secondary"}
                onClick={() => {
                  setBlockMode((prev) => !prev);
                  setBlockStart("");
                  setBlockEnd("");
                  setBlockNote("");
                }}
                disabled={isAllApartments || !selectedApartment}
              >
                {blockMode ? "Block mode on" : "Block mode"}
              </Button>
            </div>
            {blockMode && (
              <p className="mt-2 text-xs text-muted">
                Select start and end dates directly on the calendar to block a range.
              </p>
            )}
            <div className="mt-3 overflow-x-auto">
              <div className="relative" style={{ minWidth: `${timelineWidth}px` }}>
                <div className="mb-1 flex items-center">
                  <div
                    className="shrink-0 pr-3 text-right text-[10px] font-medium uppercase tracking-wide text-muted"
                    style={{ width: `${rowLabelWidth}px` }}
                  >
                    Month
                  </div>
                  {timelineMonths.map((month, idx) => (
                    <div
                      key={month.key}
                      className="shrink-0 text-center text-xs font-medium text-muted"
                      style={{
                        width: `${month.span * (CELL_SIZE + CELL_GAP)}px`,
                        marginLeft: idx > 0 ? `${MONTH_GAP}px` : "0px",
                      }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
                <div className="mb-2" />
                {shownApartments.map((apt) => (
                  <div key={apt.id} className="mb-2 flex items-center">
                    <div
                      className="shrink-0 truncate pr-3 text-sm text-foreground"
                      style={{ width: `${rowLabelWidth}px` }}
                    >
                      {apt.name || apt.slug}
                    </div>
                    <div className="flex">
                      {timelineDays.map((day, index) => {
                        const visual = cellVisual(apt, day);
                        const selectable = blockMode && !isAllApartments && apt.slug === selectedSlug;
                        const isSelected = selected(day) && apt.slug === selectedSlug;
                        const monthStarts = index > 0 && day.slice(0, 7) !== timelineDays[index - 1].slice(0, 7);
                        const monthEnds =
                          index < timelineDays.length - 1 &&
                          day.slice(0, 7) !== timelineDays[index + 1].slice(0, 7);
                        const tooltip = visual.notes && visual.notes !== "-"
                          ? `${formatDate(day)} | ${visual.sourceName} | ${visual.notes}`
                          : `${formatDate(day)} | ${visual.sourceName}`;
                        return (
                          <button
                            key={`${apt.slug}-${day}`}
                            type="button"
                            title={tooltip}
                            onClick={() => onTimelineDateClick(apt.slug, day)}
                            disabled={!selectable}
                            className={`flex items-center justify-center rounded-sm text-[10px] leading-none text-white transition ${selectable ? "cursor-pointer hover:ring-1 hover:ring-foreground/70" : "cursor-default"} ${isSelected ? "ring-2 ring-foreground" : ""}`}
                            style={{
                              width: `${CELL_SIZE}px`,
                              height: `${CELL_SIZE}px`,
                              backgroundColor: visual.color,
                              marginLeft: monthStarts ? `${MONTH_GAP / 2}px` : "0px",
                              marginRight: `${CELL_GAP + (monthEnds ? MONTH_GAP / 2 : 0)}px`,
                            }}
                          >
                            {dayLabel(day)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">Unavailable ranges</h2>
            {combinedRanges.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No blocked/imported dates yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {combinedRanges.map((item) => (
                  <div
                    key={`${item.source}-${item.id}-${item.startDate}-${item.endDate}`}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-muted">
                      {item.sourceName}
                    </span>
                    {isAllApartments && (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-muted">
                        {item.apartmentName}
                      </span>
                    )}
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.sourceColor }} />
                    <span className="text-sm text-foreground">
                      {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </span>
                    <span className="text-sm text-muted">{item.note || ""}</span>
                    {item.source === "manual" && !isAllApartments && (
                      <div className="ml-auto">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveBlock(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {confirmBlockOpen && blockStart && blockEnd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-xl">
                <h3 className="text-base font-semibold text-foreground">Confirm block range</h3>
                <p className="mt-2 text-sm text-muted">
                  Block dates {selectedRangeLabel} for {selectedApartment?.name || selectedApartment?.slug}?
                </p>
                <label className="mt-3 block text-sm font-medium text-foreground">
                  Notes
                </label>
                <input
                  type="text"
                  value={blockNote}
                  onChange={(e) => setBlockNote(e.target.value)}
                  placeholder="Guest name or notes"
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                />
                <p className="mt-2 text-xs text-muted">
                  A sync runs first. If conflicts are found, the block will be rejected.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setConfirmBlockOpen(false);
                      setBlockStart("");
                      setBlockEnd("");
                      setBlockNote("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddBlock} loading={busyAction}>
                    Confirm block
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
