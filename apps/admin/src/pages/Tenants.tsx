import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTenants,
  fetchApartments,
  type Tenant,
} from "@taurex/firebase";

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [aptCounts, setAptCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTenants()
      .then(async (list) => {
        setTenants(list);
        // Fetch apartment counts per tenant
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
        console.error("Tenants load error:", err);
        setError("Failed to load tenants. Check Firestore rules and admin claim.");
        setLoading(false);
      });
  }, []);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage all tenants on the platform
          </p>
        </div>
        <Link
          to="/tenants/new"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400"
        >
          + Create Tenant
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mt-6">
        <input
          type="text"
          placeholder="Search by name or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p className="mt-8 text-sm text-gray-500">Loading tenants…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          {search ? "No tenants match your search." : "No tenants yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Slug</th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Languages
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Currency
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Apartments
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {tenant.name}
                  </td>
                  <td className="px-6 py-4">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {tenant.slug}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tenant.languages.map((lang) => (
                        <span
                          key={lang}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                        >
                          {lang.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {tenant.baseCurrency}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {aptCounts[tenant.id] ?? "…"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/tenants/${tenant.id}`}
                        className="text-sm font-medium text-amber-600 hover:text-amber-700"
                      >
                        View
                      </Link>
                      <Link
                        to={`/tenants/${tenant.id}/edit`}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
