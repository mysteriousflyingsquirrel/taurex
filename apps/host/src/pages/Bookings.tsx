import { useEffect, useMemo, useState } from "react";
import {
  decideBookingRequest,
  fetchBookingRequests,
  formatDate,
  formatMoney,
  type BookingRequest,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { useToast } from "../components/Toast";

export default function Bookings() {
  const { hostId, baseCurrency } = useHost();
  const toast = useToast();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!hostId) return;
    setLoading(true);
    fetchBookingRequests(hostId)
      .then((items) => setRequests(items))
      .catch(() => toast.error("Failed to load booking requests."))
      .finally(() => setLoading(false));
  }, [hostId, toast]);

  const pending = useMemo(
    () => requests.filter((item) => item.status === "pending"),
    [requests]
  );
  const processed = useMemo(
    () => requests.filter((item) => item.status !== "pending"),
    [requests]
  );

  async function handleDecision(
    requestId: string,
    decision: "accepted" | "declined"
  ) {
    if (!hostId) return;
    setBusyId(requestId);
    try {
      const updated = await decideBookingRequest({ hostId, requestId, decision });
      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success(
        decision === "accepted"
          ? "Booking request accepted."
          : "Booking request declined."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Decision failed.");
    } finally {
      setBusyId(null);
    }
  }

  const renderRows = (items: BookingRequest[], showActions: boolean) => (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-alt">
          <tr>
            <th className="px-4 py-3 font-medium text-muted">Apartment</th>
            <th className="px-4 py-3 font-medium text-muted">Dates</th>
            <th className="px-4 py-3 font-medium text-muted">Guest</th>
            <th className="px-4 py-3 font-medium text-muted">Guests</th>
            <th className="px-4 py-3 font-medium text-muted">Approx. total</th>
            <th className="px-4 py-3 font-medium text-muted">Status</th>
            <th className="px-4 py-3 font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{item.apartmentName}</p>
                <p className="text-xs text-muted">{item.apartmentSlug}</p>
              </td>
              <td className="px-4 py-3 text-muted">
                <p>
                  {formatDate(item.checkIn)} - {formatDate(item.checkOut)}
                </p>
                <p className="text-xs">{item.nights} nights</p>
              </td>
              <td className="px-4 py-3 text-muted">
                <p>{item.guestName}</p>
                <p className="text-xs">{item.guestEmail}</p>
              </td>
              <td className="px-4 py-3 text-muted">{item.guestCount}</td>
              <td className="px-4 py-3 text-muted">
                {formatMoney(item.approxTotal || 0, baseCurrency)}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-surface-alt px-2 py-1 text-xs text-foreground">
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {showActions ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleDecision(item.id, "accepted")}
                      disabled={busyId === item.id}
                      loading={busyId === item.id}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDecision(item.id, "declined")}
                      disabled={busyId === item.id}
                    >
                      Decline
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted">Processed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Bookings" />
        <p className="mt-4 text-sm text-muted">Loading booking requests...</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Bookings" />

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">Pending</h2>
        {pending.length === 0 ? (
          <div className="mt-3 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
            No pending booking requests.
          </div>
        ) : (
          renderRows(pending, true)
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Processed</h2>
        {processed.length === 0 ? (
          <div className="mt-3 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
            No processed booking requests yet.
          </div>
        ) : (
          renderRows(processed, false)
        )}
      </section>
    </div>
  );
}
