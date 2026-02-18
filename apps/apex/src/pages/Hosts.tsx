import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchHosts,
  fetchApartments,
  getEffectivePrice,
  getMonthlyTotal,
  type Host,
} from "@taurex/firebase";

export default function Hosts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [aptCounts, setAptCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const filtered = hosts.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const platformTotal = filtered.reduce((sum, t) => {
    const count = aptCounts[t.id] ?? 0;
    return sum + getMonthlyTotal(t.billing, count);
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hosts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage all hosts on the platform
          </p>
        </div>
        <Link
          to="/hosts/new"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400"
        >
          + Create Host
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
        <p className="mt-8 text-sm text-gray-500">Loading hosts…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          {search ? "No hosts match your search." : "No hosts yet."}
        </p>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Slug</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    Apartments
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    Monthly Total
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((host) => {
                  const count = aptCounts[host.id] ?? 0;
                  const isUnlocked = !!host.billing?.unlocked;
                  const rate = getEffectivePrice(host.billing);
                  const total = getMonthlyTotal(host.billing, count);

                  return (
                    <tr key={host.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {host.name}
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {host.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {aptCounts[host.id] ?? "…"}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {isUnlocked ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          `CHF ${rate}`
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {isUnlocked ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          `CHF ${total}`
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge host={host} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/hosts/${host.id}`}
                            className="text-sm font-medium text-amber-600 hover:text-amber-700"
                          >
                            View
                          </Link>
                          <Link
                            to={`/hosts/${host.id}/edit`}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer total */}
          <div className="mt-3 flex items-center justify-end gap-4 px-6 text-sm">
            <span className="text-gray-500">
              {filtered.length} host{filtered.length !== 1 ? "s" : ""}
            </span>
            <span className="font-semibold text-gray-900">
              Total: CHF {platformTotal} / month
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
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Unlocked
      </span>
    );
  }

  if (
    billing?.pricePerApartment !== null &&
    billing?.pricePerApartment !== undefined
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Discounted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      Standard
    </span>
  );
}
