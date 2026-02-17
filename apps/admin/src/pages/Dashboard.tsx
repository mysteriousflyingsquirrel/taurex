import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTenants,
  fetchApartments,
  fetchAllUsers,
  type Tenant,
} from "@taurex/firebase";

export default function Dashboard() {
  const [tenantCount, setTenantCount] = useState<number | null>(null);
  const [apartmentCount, setApartmentCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchTenants(), fetchAllUsers()])
      .then(async ([tenants, users]) => {
        setTenantCount(tenants.length);
        setUserCount(users.length);
        setRecentTenants(tenants.slice(0, 5));

        // Count all apartments across tenants
        let totalApts = 0;
        await Promise.all(
          tenants.map(async (t) => {
            const apts = await fetchApartments(t.id);
            totalApts += apts.length;
          })
        );
        setApartmentCount(totalApts);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        setError("Failed to load dashboard data. Check Firestore rules and admin claim.");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">
        Platform overview and management
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/tenants"
          className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-amber-200 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">Total Tenants</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "…" : tenantCount}
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
      </div>

      {/* Recent Tenants */}
      {recentTenants.length > 0 && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Tenants
            </h2>
            <Link
              to="/tenants"
              className="text-sm font-medium text-amber-600 hover:text-amber-700"
            >
              View all →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-gray-100">
            {recentTenants.map((t) => (
              <Link
                key={t.id}
                to={`/tenants/${t.id}`}
                className="flex items-center justify-between py-3 text-sm hover:bg-gray-50 -mx-2 px-2 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{t.name}</span>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    {t.slug}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  {t.languages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    >
                      {lang.toUpperCase()}
                    </span>
                  ))}
                  <span className="text-gray-400">{t.baseCurrency}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/tenants/new"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400"
          >
            + Create Tenant
          </Link>
          <Link
            to="/tenants"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            View Tenants
          </Link>
          <Link
            to="/users"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            View Users
          </Link>
        </div>
      </div>
    </div>
  );
}
