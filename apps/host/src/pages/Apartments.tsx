import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchApartments,
  deleteApartment,
  formatMoney,
  type Apartment,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { useToast } from "../components/Toast";

export default function Apartments() {
  const { hostId, baseCurrency } = useHost();
  const navigate = useNavigate();
  const toast = useToast();
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

  const handleDelete = async (slug: string) => {
    if (!hostId) return;
    setDeleting(slug);
    try {
      await deleteApartment(hostId, slug);
      setApartments((prev) => prev.filter((a) => a.slug !== slug));
      toast.success("Apartment deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Apartments" />
        <p className="mt-4 text-sm text-gray-500">Loading apartments…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Apartments"
        action={
          <Button variant="primary" onClick={() => navigate("/apartments/new")}>
            + Add apartment
          </Button>
        }
      />

      {apartments.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No apartments yet.</p>
          <div className="mt-3">
            <Button variant="primary" size="sm" onClick={() => navigate("/apartments/new")}>Create your first apartment</Button>
          </div>
        </div>
      ) : (
        <>
          {/* Table — hidden on mobile */}
          <div className="mt-6 hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
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
                        ? formatMoney(apt.priceDefault, baseCurrency)
                        : "—"}
                    </td>
                    <td className="hidden px-6 py-4 text-gray-600 md:table-cell">
                      {apt.minStayDefault
                        ? `${apt.minStayDefault} nights`
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="flex items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/apartments/${apt.slug}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(apt.slug)}
                          disabled={deleting === apt.slug}
                          loading={deleting === apt.slug}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile only */}
          <div className="mt-6 space-y-3 md:hidden">
            {apartments.map((apt) => (
              <div
                key={apt.slug}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/apartments/${apt.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/apartments/${apt.slug}`);
                  }
                }}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {apt.name || apt.slug}
                    </p>
                    <p className="text-xs text-gray-400">{apt.slug}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {apt.facts.guests} guests · {apt.facts.bedrooms} bedrooms
                      {apt.priceDefault
                        ? ` · ${formatMoney(apt.priceDefault, baseCurrency)}/night`
                        : ""}
                    </p>
                  </div>
                  <div
                    className="flex flex-col gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/apartments/${apt.slug}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(apt.slug)}
                      disabled={deleting === apt.slug}
                      loading={deleting === apt.slug}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
