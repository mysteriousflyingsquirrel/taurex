import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTenants,
  fetchApartments,
  type Tenant,
  type Apartment,
} from "@taurex/firebase";

interface ApartmentRow {
  apartment: Apartment;
  tenant: Tenant;
}

export default function Apartments() {
  const [rows, setRows] = useState<ApartmentRow[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");

  useEffect(() => {
    fetchTenants()
      .then(async (list) => {
        setTenants(list);
        const allRows: ApartmentRow[] = [];
        await Promise.all(
          list.map(async (t) => {
            const apts = await fetchApartments(t.id);
            for (const apt of apts) {
              allRows.push({ apartment: apt, tenant: t });
            }
          })
        );
        setRows(allRows);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Apartments load error:", err);
        setError("Failed to load apartments. Check Firestore rules and admin claim.");
        setLoading(false);
      });
  }, []);

  const filtered = rows.filter((r) => {
    if (tenantFilter && r.tenant.id !== tenantFilter) return false;
    if (
      search &&
      !r.apartment.name.toLowerCase().includes(search.toLowerCase()) &&
      !r.apartment.slug.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Apartments</h1>
        <p className="mt-1 text-sm text-gray-600">
          All apartments across all tenants (read-only)
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="mt-8 text-sm text-gray-500">Loading apartments…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          {search || tenantFilter
            ? "No apartments match your filter."
            : "No apartments on the platform yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Tenant
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">Slug</th>
                <th className="px-6 py-3 font-medium text-gray-500">Price</th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Location
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Images
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={`${r.tenant.id}-${r.apartment.id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {r.apartment.name}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/tenants/${r.tenant.id}`}
                      className="text-amber-600 hover:text-amber-700"
                    >
                      {r.tenant.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {r.apartment.slug}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {r.apartment.priceDefault > 0
                      ? `${r.tenant.baseCurrency} ${r.apartment.priceDefault}`
                      : "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-6 py-4 text-gray-600">
                    {r.apartment.location?.address || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {r.apartment.images?.length ?? 0}
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
