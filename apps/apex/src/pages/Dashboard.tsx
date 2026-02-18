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
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/hosts"
          className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-amber-200 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">Total Hosts</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "…" : hostCount}
          </p>
        </Link>
        <Link
          to="/apartments"
          className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-amber-200 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">
            Total Apartments
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "…" : apartmentCount}
          </p>
        </Link>
        <Link
          to="/users"
          className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-amber-200 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">Total Users</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "…" : userCount}
          </p>
        </Link>
        <Link
          to="/hosts"
          className="rounded-2xl border border-green-200 bg-green-50 p-6 transition hover:border-green-300 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-green-700">
            Monthly Revenue
          </p>
          <p className="mt-2 text-3xl font-bold text-green-800">
            {loading ? "…" : formatMoney(monthlyRevenue, "CHF")}
          </p>
          {!loading && (
            <p className="mt-1 text-xs text-green-600">
              {payingHosts} paying · {unlockedHosts} unlocked
            </p>
          )}
        </Link>
      </div>

      {/* Recent Hosts */}
      {recentHosts.length > 0 && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Hosts
            </h2>
            <Button variant="secondary" size="sm" onClick={() => navigate("/hosts")}>View all</Button>
          </div>
          <div className="mt-4 divide-y divide-gray-100">
            {recentHosts.map((t) => {
              const count = aptCounts[t.id] ?? 0;
              const isUnlocked = !!t.billing?.unlocked;
              const total = getMonthlyTotal(t.billing, count);

              return (
                <Link
                  key={t.id}
                  to={`/hosts/${t.id}`}
                  className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 text-sm hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{t.name}</span>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {t.slug}
                    </code>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                      {count} apt{count !== 1 ? "s" : ""}
                    </span>
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
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
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => navigate("/hosts/new")}>+ Create Host</Button>
          <Button variant="secondary" onClick={() => navigate("/hosts")}>View Hosts</Button>
          <Button variant="secondary" onClick={() => navigate("/users")}>View Users</Button>
        </div>
      </div>
    </div>
  );
}
