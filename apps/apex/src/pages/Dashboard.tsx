import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchHosts,
  fetchApartments,
  fetchAllUsers,
  getMonthlyTotal,
  getEffectivePrice,
  formatMoney,
  type Host,
} from "@taurex/firebase";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";

export default function Dashboard() {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [aptCounts, setAptCounts] = useState<Record<string, number>>({});
  const [hostCount, setHostCount] = useState<number | null>(null);
  const [apartmentCount, setApartmentCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchHosts(), fetchAllUsers()])
      .then(async ([hostList, users]) => {
        setHosts(hostList);
        setHostCount(hostList.length);
        setUserCount(users.length);

        const counts: Record<string, number> = {};
        let totalApts = 0;
        await Promise.all(
          hostList.map(async (t) => {
            const apts = await fetchApartments(t.id);
            counts[t.id] = apts.length;
            totalApts += apts.length;
          })
        );
        setAptCounts(counts);
        setApartmentCount(totalApts);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        setError(
          "Failed to load dashboard data. Check Firestore rules and admin claim."
        );
        setLoading(false);
      });
  }, []);

  const monthlyRevenue = hosts.reduce((sum, t) => {
    const count = aptCounts[t.id] ?? 0;
    return sum + getMonthlyTotal(t.billing, count);
  }, 0);

  const payingHosts = hosts.filter(
    (t) => !t.billing?.unlocked && (aptCounts[t.id] ?? 0) > 0
  ).length;
  const unlockedHosts = hosts.filter(
    (t) => !!t.billing?.unlocked
  ).length;

  const recentHosts = hosts.slice(0, 5);

  return (
    <div>
      <PageHeader title="Dashboard" />

      {error && (
        <div className="mt-6 rounded-lg border border-border bg-destructive-bg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/hosts"
          className="rounded-2xl border border-border bg-surface p-6 transition hover:border-primary/30 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-muted">Total Hosts</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {loading ? "…" : hostCount}
          </p>
        </Link>
        <Link
          to="/apartments"
          className="rounded-2xl border border-border bg-surface p-6 transition hover:border-primary/30 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-muted">
            Total Apartments
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {loading ? "…" : apartmentCount}
          </p>
        </Link>
        <Link
          to="/users"
          className="rounded-2xl border border-border bg-surface p-6 transition hover:border-primary/30 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-muted">Total Users</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {loading ? "…" : userCount}
          </p>
        </Link>
        <Link
          to="/hosts"
          className="rounded-2xl border border-border bg-success-bg p-6 transition hover:border-success/50 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-success">
            Monthly Revenue
          </p>
          <p className="mt-2 text-3xl font-bold text-success">
            {loading ? "…" : formatMoney(monthlyRevenue, "CHF")}
          </p>
          {!loading && (
            <p className="mt-1 text-xs text-success">
              {payingHosts} paying · {unlockedHosts} unlocked
            </p>
          )}
        </Link>
      </div>

      {/* Recent Hosts */}
      {recentHosts.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Hosts
            </h2>
            <Button variant="secondary" size="sm" onClick={() => navigate("/hosts")}>View all</Button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {recentHosts.map((t) => {
              const count = aptCounts[t.id] ?? 0;
              const isUnlocked = !!t.billing?.unlocked;
              const total = getMonthlyTotal(t.billing, count);

              return (
                <Link
                  key={t.id}
                  to={`/hosts/${t.id}`}
                  className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 text-sm hover:bg-surface-alt"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{t.name}</span>
                    <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-muted">
                      {t.slug}
                    </code>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted">
                      {count} apt{count !== 1 ? "s" : ""}
                    </span>
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {formatMoney(total, "CHF")}/mo
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => navigate("/hosts/new")}>+ Create Host</Button>
          <Button variant="secondary" onClick={() => navigate("/hosts")}>View Hosts</Button>
          <Button variant="secondary" onClick={() => navigate("/users")}>View Users</Button>
        </div>
      </div>
    </div>
  );
}
