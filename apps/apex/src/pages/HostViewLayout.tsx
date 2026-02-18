import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, Outlet } from "react-router-dom";
import {
  fetchHostBySlug,
  fetchApartments,
  deleteHost,
  type Host,
  type Apartment,
} from "@taurex/firebase";
import { ManagedHostProvider } from "../contexts/ManagedHostContext";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function HostViewLayout() {
  const { hostId } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [host, setHost] = useState<Host | null>(null);
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
        setHost(t);
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
      toast.error("Failed to delete host.");
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

  if (notFound || !host) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Host Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The host "{hostId}" does not exist.
        </p>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => navigate("/hosts")}>← Back to Hosts</Button>
        </div>
      </div>
    );
  }

  return (
    <ManagedHostProvider tenant={host} apartments={apartments} readonly>
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/hosts" className="hover:text-amber-600">
            Hosts
          </Link>
          <span>›</span>
          <span className="text-gray-900">{host.name}</span>
        </nav>
        <div className="mt-4 flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{host.name}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => navigate(`/hosts/${host.id}/edit`)}
            >
              Edit Host
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
      <Outlet />

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Host"
        description={`This will permanently delete host "${host.name}" and all associated data. This action cannot be undone.`}
        confirmPhrase={`delete ${host.slug}`}
        buttonLabel="Delete Host"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
      />
    </ManagedHostProvider>
  );
}
