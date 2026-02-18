import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchHosts,
  fetchApartments,
  formatMoney,
  type Host,
  type Apartment,
  type CurrencyCode,
} from "@taurex/firebase";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";

interface ApartmentRow {
  apartment: Apartment;
  host: Host;
}

export default function Apartments() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ApartmentRow[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostFilter, setHostFilter] = useState("");

  useEffect(() => {
    fetchHosts()
      .then(async (list) => {
        setHosts(list);
        const allRows: ApartmentRow[] = [];
        await Promise.all(
          list.map(async (h) => {
            const apts = await fetchApartments(h.id);
            for (const apt of apts) {
              allRows.push({ apartment: apt, host: h });
            }
          })
        );
        setRows(allRows);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Apartments load error:", err);
        setError("Failed to load apartments. Check Firestore rules and apex claim.");
        setLoading(false);
      });
  }, []);

  const filtered = hostFilter
    ? rows.filter((r) => r.host.id === hostFilter)
    : rows;

  const clearFilters = () => {
    setHostFilter("");
  };

  return (
    <div>
      <PageHeader title="Apartments" />

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-500" colSpan={6}>
                    <select
                      value={hostFilter}
                      onChange={(e) => setHostFilter(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-normal text-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">All Hosts</option>
                      {hosts.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </th>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Host</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Slug</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Price</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Location</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      {hostFilter ? (
                        <div>
                          <p>No results.</p>
                          <div className="mt-2">
                            <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>
                          </div>
                        </div>
                      ) : (
                        "No apartments on the platform yet."
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={`${r.host.id}-${r.apartment.id}`} className="cursor-pointer hover:bg-gray-50" onClick={() => {}}>
                      <td className="px-6 py-4 font-medium text-gray-900">{r.apartment.name}</td>
                      <td className="px-6 py-4">
                        <Link to={`/hosts/${r.host.id}`} className="text-amber-600 hover:text-amber-700" onClick={(e) => e.stopPropagation()}>
                          {r.host.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{r.apartment.slug}</code>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {r.apartment.priceDefault > 0
                          ? formatMoney(r.apartment.priceDefault, r.host.baseCurrency as CurrencyCode)
                          : "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-gray-600">
                        {r.apartment.location?.address || "—"}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/hosts/${r.host.id}`)}>View</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-3 md:hidden">
            <select
              value={hostFilter}
              onChange={(e) => setHostFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">All Hosts</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
                {hostFilter ? (
                  <div>
                    <p>No results.</p>
                    <div className="mt-2">
                      <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>
                    </div>
                  </div>
                ) : (
                  "No apartments on the platform yet."
                )}
              </div>
            ) : (
              filtered.map((r) => (
                <div key={`${r.host.id}-${r.apartment.id}`} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{r.apartment.name}</p>
                      <p className="text-sm text-gray-500">{r.apartment.slug}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/hosts/${r.host.id}`)}>View</Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span>Host: <Link to={`/hosts/${r.host.id}`} className="text-amber-600 hover:text-amber-700">{r.host.name}</Link></span>
                    {r.apartment.priceDefault > 0 && (
                      <span>{formatMoney(r.apartment.priceDefault, r.host.baseCurrency as CurrencyCode)}/night</span>
                    )}
                    {r.apartment.location?.address && (
                      <span className="truncate">{r.apartment.location.address}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
