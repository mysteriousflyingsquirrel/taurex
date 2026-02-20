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
        <div className="mt-6 rounded-lg border border-border bg-destructive-bg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="px-6 py-3 font-medium text-muted" colSpan={6}>
                    <select
                      value={hostFilter}
                      onChange={(e) => setHostFilter(e.target.value)}
                      className="rounded-lg border border-input px-3 py-1.5 text-sm font-normal text-foreground focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                    >
                      <option value="">All Hosts</option>
                      {hosts.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </th>
                </tr>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="px-6 py-3 font-medium text-muted">Name</th>
                  <th className="px-6 py-3 font-medium text-muted">Host</th>
                  <th className="px-6 py-3 font-medium text-muted">Slug</th>
                  <th className="px-6 py-3 font-medium text-muted">Price</th>
                  <th className="px-6 py-3 font-medium text-muted">Location</th>
                  <th className="px-6 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted">
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
                    <tr key={`${r.host.id}-${r.apartment.id}`} className="cursor-pointer hover:bg-surface-alt" onClick={() => {}}>
                      <td className="px-6 py-4 font-medium text-foreground">{r.apartment.name}</td>
                      <td className="px-6 py-4">
                        <Link to={`/hosts/${r.host.id}`} className="text-primary hover:text-primary-fg" onClick={(e) => e.stopPropagation()}>
                          {r.host.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-muted">{r.apartment.slug}</code>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {r.apartment.priceDefault > 0
                          ? formatMoney(r.apartment.priceDefault, r.host.baseCurrency as CurrencyCode)
                          : "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-muted">
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
              className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
            >
              <option value="">All Hosts</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center text-sm text-muted">
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
                <div key={`${r.host.id}-${r.apartment.id}`} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{r.apartment.name}</p>
                      <p className="text-sm text-muted">{r.apartment.slug}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/hosts/${r.host.id}`)}>View</Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span>Host: <Link to={`/hosts/${r.host.id}`} className="text-primary hover:text-primary-fg">{r.host.name}</Link></span>
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
