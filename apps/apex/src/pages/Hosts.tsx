import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchHosts,
  fetchApartments,
  getEffectivePrice,
  getMonthlyTotal,
  formatMoney,
  deleteHost,
  type Host,
} from "@taurex/firebase";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { useToast } from "../components/Toast";

export default function Hosts() {
  const navigate = useNavigate();
  const toast = useToast();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [aptCounts, setAptCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHosts()
      .then(async (list) => {
        setHosts(list);
        const counts: Record<string, number> = {};
        await Promise.all(
          list.map(async (t) => {
            const apts = await fetchApartments(t.id);
            counts[t.id] = apts.length;
          })
        );
        setAptCounts(counts);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Hosts load error:", err);
        setError(
          "Failed to load hosts. Check Firestore rules and admin claim."
        );
        setLoading(false);
      });
  }, []);

  const platformTotal = hosts.reduce((sum, t) => {
    const count = aptCounts[t.id] ?? 0;
    return sum + getMonthlyTotal(t.billing, count);
  }, 0);

  const handleDelete = async (e: React.MouseEvent, host: Host) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete host "${host.name}"? This cannot be undone.`)) return;
    setDeletingId(host.id);
    try {
      await deleteHost(host.id);
      setHosts((prev) => prev.filter((h) => h.id !== host.id));
      setAptCounts((prev) => {
        const next = { ...prev };
        delete next[host.id];
        return next;
      });
      toast.success("Host deleted.");
    } catch {
      toast.error("Failed to delete host.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Hosts"
        action={
          <Button variant="primary" onClick={() => navigate("/hosts/new")}>
            + Create host
          </Button>
        }
      />

      {error && (
        <div className="mt-6 rounded-lg border border-border bg-destructive-bg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-muted">Loading hosts…</p>
      ) : hosts.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No hosts yet.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="px-6 py-3 font-medium text-muted">Name</th>
                  <th className="px-6 py-3 font-medium text-muted">Slug</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">
                    Apartments
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-muted">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-muted">
                    Monthly Total
                  </th>
                  <th className="px-6 py-3 font-medium text-muted">
                    Status
                  </th>
                  <th className="px-6 py-3 font-medium text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hosts.map((host) => {
                  const count = aptCounts[host.id] ?? 0;
                  const isUnlocked = !!host.billing?.unlocked;
                  const rate = getEffectivePrice(host.billing);
                  const total = getMonthlyTotal(host.billing, count);

                  return (
                    <tr
                      key={host.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/hosts/${host.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/hosts/${host.id}`);
                        }
                      }}
                      className="cursor-pointer hover:bg-surface-alt"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {host.name}
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-muted">
                          {host.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right text-muted">
                        {aptCounts[host.id] ?? "…"}
                      </td>
                      <td className="px-6 py-4 text-right text-muted">
                        {isUnlocked ? (
                          <span className="text-success">Free</span>
                        ) : (
                          formatMoney(rate, "CHF")
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-foreground">
                        {isUnlocked ? (
                          <span className="text-success">Free</span>
                        ) : (
                          formatMoney(total, "CHF")
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge host={host} />
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/hosts/${host.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/hosts/${host.id}/edit`)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => handleDelete(e, host)}
                            disabled={deletingId === host.id}
                            loading={deletingId === host.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {hosts.map((host) => {
              const count = aptCounts[host.id] ?? 0;
              const isUnlocked = !!host.billing?.unlocked;
              const rate = getEffectivePrice(host.billing);
              const total = getMonthlyTotal(host.billing, count);
              return (
                <div
                  key={host.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/hosts/${host.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/hosts/${host.id}`);
                    }
                  }}
                  className="cursor-pointer rounded-xl border border-border bg-surface p-4 shadow-sm hover:border-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{host.name}</p>
                      <p className="text-xs text-muted">{host.slug}</p>
                    </div>
                    <StatusBadge host={host} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span>{count} apts</span>
                    <span>
                      Rate: {isUnlocked ? "Free" : formatMoney(rate, "CHF")}
                    </span>
                    <span>
                      Total: {isUnlocked ? "Free" : formatMoney(total, "CHF")}/mo
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/hosts/${host.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/hosts/${host.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => handleDelete(e, host)}
                      disabled={deletingId === host.id}
                      loading={deletingId === host.id}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer total */}
          <div className="mt-3 flex items-center justify-end gap-4 px-6 text-sm">
            <span className="text-muted">
              {hosts.length} host{hosts.length !== 1 ? "s" : ""}
            </span>
            <span className="font-semibold text-foreground">
              Total: {formatMoney(platformTotal, "CHF")} / month
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ host }: { host: Host }) {
  const billing = host.billing;

  if (billing?.unlocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Unlocked
      </span>
    );
  }

  if (
    billing?.pricePerApartment !== null &&
    billing?.pricePerApartment !== undefined
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Discounted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-muted">
      Standard
    </span>
  );
}
