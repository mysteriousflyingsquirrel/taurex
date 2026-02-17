import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  fetchTenantBySlug,
  fetchApartments,
  fetchSeasons,
  fetchAllUsers,
  deleteTenant,
  type Tenant,
  type Apartment,
  type Season,
  type UserProfile,
} from "@taurex/firebase";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

type Tab = "apartments" | "seasons" | "users";

export default function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("apartments");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);

    fetchTenantBySlug(tenantId)
      .then(async (t) => {
        if (!t) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setTenant(t);

        const [apts, seasonsMap, allUsers] = await Promise.all([
          fetchApartments(t.id),
          fetchSeasons(t.id, currentYear),
          fetchAllUsers(),
        ]);

        setApartments(apts);
        setSeasons(Object.values(seasonsMap));
        setUsers(allUsers.filter((u) => u.tenantId === t.id));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Tenant detail load error:", err);
        setNotFound(true);
        setLoading(false);
      });
  }, [tenantId, currentYear]);

  const handleDelete = async () => {
    if (!tenantId) return;
    setDeleting(true);
    try {
      await deleteTenant(tenantId);
      navigate("/tenants");
    } catch {
      alert("Failed to delete tenant.");
    } finally {
      setDeleting(false);
    }
  };

  if (notFound) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenant Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The tenant "{tenantId}" does not exist.
        </p>
        <Link
          to="/tenants"
          className="mt-4 inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          ← Back to Tenants
        </Link>
      </div>
    );
  }

  if (loading || !tenant) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenant Detail</h1>
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "apartments", label: "Apartments", count: apartments.length },
    { key: "seasons", label: `Seasons (${currentYear})`, count: seasons.length },
    { key: "users", label: "Users", count: users.length },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/tenants" className="hover:text-amber-600">
          Tenants
        </Link>
        <span>›</span>
        <span className="text-gray-900">{tenant.name}</span>
      </nav>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">
              {tenant.slug}
            </code>
            <div className="flex gap-1">
              {tenant.languages.map((lang) => (
                <span
                  key={lang}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                >
                  {lang.toUpperCase()}
                </span>
              ))}
            </div>
            <span className="text-sm text-gray-500">{tenant.baseCurrency}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Public Page ↗
          </a>
          <Link
            to={`/tenants/${tenant.id}/edit`}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400"
          >
            Edit
          </Link>
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key
                ? "border-b-2 border-amber-500 text-amber-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}{" "}
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {tab === "apartments" && <ApartmentsTab apartments={apartments} currency={tenant.baseCurrency} />}
        {tab === "seasons" && <SeasonsTab seasons={seasons} />}
        {tab === "users" && <UsersTab users={users} />}
      </div>

      {/* Delete modal */}
      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Tenant"
        description={`This will permanently delete tenant "${tenant.name}" and all associated data. This action cannot be undone.`}
        confirmPhrase={`delete ${tenant.slug}`}
        buttonLabel="Delete Tenant"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
      />
    </div>
  );
}

/* ─── Tab Components ─── */

function ApartmentsTab({
  apartments,
  currency,
}: {
  apartments: Apartment[];
  currency: string;
}) {
  if (apartments.length === 0) {
    return <p className="text-sm text-gray-500">No apartments yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-6 py-3 font-medium text-gray-500">Name</th>
            <th className="px-6 py-3 font-medium text-gray-500">Slug</th>
            <th className="px-6 py-3 font-medium text-gray-500">Price</th>
            <th className="px-6 py-3 font-medium text-gray-500">Location</th>
            <th className="px-6 py-3 font-medium text-gray-500">Images</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {apartments.map((apt) => (
            <tr key={apt.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">
                {apt.name}
              </td>
              <td className="px-6 py-4">
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {apt.slug}
                </code>
              </td>
              <td className="px-6 py-4 text-gray-600">
                {apt.priceDefault > 0
                  ? `${currency} ${apt.priceDefault}`
                  : "—"}
              </td>
              <td className="max-w-[200px] truncate px-6 py-4 text-gray-600">
                {apt.location?.address || "—"}
              </td>
              <td className="px-6 py-4 text-gray-600">
                {apt.images?.length ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeasonsTab({ seasons }: { seasons: Season[] }) {
  if (seasons.length === 0) {
    return (
      <p className="text-sm text-gray-500">No seasons for this year.</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {seasons.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
        >
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">{s.name}</p>
            <p className="text-xs text-gray-500">
              {s.dateRanges.length} range{s.dateRanges.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab({ users }: { users: UserProfile[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-gray-500">No users assigned.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-6 py-3 font-medium text-gray-500">UID</th>
            <th className="px-6 py-3 font-medium text-gray-500">Tenant ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u) => (
            <tr key={u.uid} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <code className="text-xs text-gray-600">{u.uid}</code>
              </td>
              <td className="px-6 py-4 text-gray-600">{u.tenantId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
