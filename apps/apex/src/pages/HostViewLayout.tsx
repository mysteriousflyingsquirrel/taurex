import { useState, useEffect } from "react";
import { useParams, Link, Outlet } from "react-router-dom";
import {
  fetchHostBySlug,
  fetchApartments,
  deleteHost,
  type Host,
  type Apartment,
} from "@taurex/firebase";
import { ManagedHostProvider } from "../contexts/ManagedHostContext";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function HostViewLayout() {
  const { hostId } = useParams<{ hostId: string }>();
  const [tenant, setTenant] = useState<Host | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!hostId) return;
    fetchHostBySlug(hostId)
      .then(async (t) => {
        if (!t) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setTenant(t);
        const apts = await fetchApartments(t.id);
        setApartments(apts);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [hostId]);

  const handleDelete = async () => {
    if (!hostId) return;
    setDeleting(true);
    try {
      await deleteHost(hostId);
      window.location.href = "/hosts";
    } catch {
      alert("Failed to delete host.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loading…</h1>
        <p className="mt-4 text-sm text-gray-500">Loading host data…</p>
      </div>
    );
  }

  if (notFound || !tenant) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Host Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The host "{hostId}" does not exist.
        </p>
        <Link
          to="/hosts"
          className="mt-4 inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          ← Back to Hosts
        </Link>
      </div>
    );
  }

  return (
    <ManagedHostProvider tenant={tenant} apartments={apartments} readonly>
      {/* Header */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/hosts" className="hover:text-amber-600">
            Hosts
          </Link>
          <span>›</span>
          <span className="text-gray-900">{tenant.name}</span>
        </nav>
        <div className="mt-4 flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <div className="flex items-center gap-2">
            <Link
              to={`/hosts/${tenant.id}/edit`}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400"
            >
              Edit Host
            </Link>
            <button
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      <Outlet />

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Host"
        description={`This will permanently delete host "${tenant.name}" and all associated data. This action cannot be undone.`}
        confirmPhrase={`delete ${tenant.slug}`}
        buttonLabel="Delete Host"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
      />
    </ManagedHostProvider>
  );
}
