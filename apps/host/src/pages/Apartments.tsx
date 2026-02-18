import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchApartments,
  deleteApartment,
  type Apartment,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";

const currencySymbol = (code: string) => {
  const map: Record<string, string> = { CHF: "CHF", EUR: "€", USD: "$", GBP: "£" };
  return map[code] ?? code;
};

export default function Apartments() {
  const { hostId, baseCurrency } = useHost();
  const navigate = useNavigate();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!hostId) return;
    fetchApartments(hostId).then((data) => {
      setApartments(data);
      setLoading(false);
    });
  }, [hostId]);

  const handleDelete = async (slug: string, name: string) => {
    if (!hostId) return;
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    )
      return;
    setDeleting(slug);
    await deleteApartment(hostId, slug);
    setApartments((prev) => prev.filter((a) => a.slug !== slug));
    setDeleting(null);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Apartments</h1>
        <p className="mt-4 text-sm text-gray-500">Loading apartments…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Apartments</h1>
        <Link
          to="/apartments/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Add Apartment
        </Link>
      </div>

      {apartments.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No apartments yet.</p>
          <Link
            to="/apartments/new"
            className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Create your first apartment →
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Apartment
                </th>
                <th className="hidden px-6 py-3 font-medium text-gray-500 md:table-cell">
                  Guests
                </th>
                <th className="hidden px-6 py-3 font-medium text-gray-500 md:table-cell">
                  Bedrooms
                </th>
                <th className="hidden px-6 py-3 font-medium text-gray-500 lg:table-cell">
                  m²
                </th>
                <th className="hidden px-6 py-3 font-medium text-gray-500 md:table-cell">
                  Price/night
                </th>
                <th className="hidden px-6 py-3 font-medium text-gray-500 md:table-cell">
                  Min Stay
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apartments.map((apt) => (
                <tr
                  key={apt.slug}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/apartments/${apt.slug}`)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {apt.name || apt.slug}
                      </p>
                      <p className="text-xs text-gray-400">{apt.slug}</p>
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 text-gray-600 md:table-cell">
                    {apt.facts.guests}
                  </td>
                  <td className="hidden px-6 py-4 text-gray-600 md:table-cell">
                    {apt.facts.bedrooms}
                  </td>
                  <td className="hidden px-6 py-4 text-gray-600 lg:table-cell">
                    {apt.facts.sqm || "—"}
                  </td>
                  <td className="hidden px-6 py-4 text-gray-600 md:table-cell">
                    {apt.priceDefault
                      ? `${currencySymbol(baseCurrency)} ${apt.priceDefault}`
                      : "—"}
                  </td>
                  <td className="hidden px-6 py-4 text-gray-600 md:table-cell">
                    {apt.minStayDefault
                      ? `${apt.minStayDefault} nights`
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/apartments/${apt.slug}`}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() =>
                          handleDelete(apt.slug, apt.name || apt.slug)
                        }
                        disabled={deleting === apt.slug}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deleting === apt.slug ? "…" : "Delete"}
                      </button>
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
