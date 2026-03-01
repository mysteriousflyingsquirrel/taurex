import { useEffect, useMemo, useState } from "react";
import {
  fetchApartments,
  refreshApartmentCalendarImports,
  removeApartmentManualBlock,
  setApartmentManualBlock,
  type Apartment,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { ENABLE_APARTMENT_CALENDAR_INTEGRATION } from "../config/features";
import { useToast } from "../components/Toast";

export default function Calendar() {
  const { hostId } = useHost();
  const toast = useToast();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [note, setNote] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    if (!hostId || !ENABLE_APARTMENT_CALENDAR_INTEGRATION) return;
    void fetchApartments(hostId).then((items) => {
      setApartments(items);
      if (!selectedSlug && items[0]) setSelectedSlug(items[0].slug);
    });
  }, [hostId, selectedSlug]);

  const selectedApartment = useMemo(
    () => apartments.find((apt) => apt.slug === selectedSlug),
    [apartments, selectedSlug]
  );

  const combinedRanges = useMemo(() => {
    if (!selectedApartment?.calendar) return [];
    return [
      ...(selectedApartment.calendar.manualBlocks || []).map((item) => ({
        ...item,
        source: "manual" as const,
      })),
      ...(selectedApartment.calendar.importedBusyRanges || []),
    ];
  }, [selectedApartment]);

  async function handleAddBlock() {
    if (!hostId || !selectedApartment || !checkIn || !checkOut) return;
    if (checkIn > checkOut) {
      toast.error("Start date must be before end date.");
      return;
    }
    setBusyAction(true);
    try {
      const blockId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await setApartmentManualBlock(hostId, selectedApartment.slug, {
        id: blockId,
        startDate: checkIn,
        endDate: checkOut,
        note: note.trim() || undefined,
      });
      const next = await fetchApartments(hostId);
      setApartments(next);
      setCheckIn("");
      setCheckOut("");
      setNote("");
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
      const next = await fetchApartments(hostId);
      setApartments(next);
      toast.success("Manual block removed.");
    } catch {
      toast.error("Saving failed");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleRefresh() {
    if (!hostId || !selectedApartment) return;
    setBusyAction(true);
    try {
      await refreshApartmentCalendarImports(hostId, selectedApartment.slug);
      const next = await fetchApartments(hostId);
      setApartments(next);
      toast.success("Imports refreshed.");
    } catch {
      toast.error("Refresh failed.");
    } finally {
      setBusyAction(false);
    }
  }

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
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="rounded-lg border border-input px-3 py-2 text-sm"
              >
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.slug}>
                    {apt.name || apt.slug}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="rounded-lg border border-input px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="rounded-lg border border-input px-3 py-2 text-sm"
              />
              <Button variant="secondary" onClick={handleRefresh} loading={busyAction}>
                Refresh now
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
                className="flex-1 rounded-lg border border-input px-3 py-2 text-sm"
              />
              <Button variant="primary" onClick={handleAddBlock} loading={busyAction}>
                Block dates
              </Button>
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
                    key={`${item.source}-${item.sourceId}-${item.startDate}-${item.endDate}`}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-muted">
                      {item.source === "manual" ? "Manual" : "Import"}
                    </span>
                    <span className="text-sm text-foreground">
                      {item.startDate} - {item.endDate}
                    </span>
                    <span className="text-sm text-muted">{item.note || ""}</span>
                    {item.source === "manual" && (
                      <div className="ml-auto">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveBlock(item.id || item.sourceId)}
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
        </>
      )}
    </div>
  );
}
