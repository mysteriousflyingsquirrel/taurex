import { useState, useEffect } from "react";
import { useParams, Link, Outlet } from "react-router-dom";
import {
  fetchHostBySlug,
  fetchApartments,
  type Host,
  type Apartment,
} from "@taurex/firebase";
import { ManagedHostProvider } from "../contexts/ManagedHostContext";

export default function HostManageLayout() {
  const { hostId } = useParams<{ hostId: string }>();
  const [tenant, setTenant] = useState<Host | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [typed, setTyped] = useState("");

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

  const confirmPhrase = `edit host ${tenant.slug}`;

  if (!confirmed) {
    return (
      <div>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/hosts" className="hover:text-amber-600">
            Hosts
          </Link>
          <span>›</span>
          <Link
            to={`/hosts/${tenant.id}`}
            className="hover:text-amber-600"
          >
            {tenant.name}
          </Link>
          <span>›</span>
          <span className="text-gray-900">Edit</span>
        </nav>

        <div className="mx-auto mt-8 max-w-lg">
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-7 w-7 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Edit {tenant.name}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You are about to edit this host's configuration. To confirm,
              type:
            </p>
            <code className="mt-2 inline-block rounded border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-700">
              {confirmPhrase}
            </code>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && typed === confirmPhrase)
                  setConfirmed(true);
              }}
              placeholder={confirmPhrase}
              autoFocus
              className="mt-4 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <button
              onClick={() => setConfirmed(true)}
              disabled={typed !== confirmPhrase}
              className="mt-4 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm & Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ManagedHostProvider tenant={tenant} apartments={apartments} readonly={false}>
      {/* Amber safety banner */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
        <svg
          className="h-5 w-5 flex-shrink-0 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p className="text-sm font-medium text-amber-800">
          You are editing <strong>{tenant.name}</strong>'s configuration.
          Changes are saved automatically.
        </p>
        <Link
          to={`/hosts/${tenant.id}`}
          className="ml-auto rounded-lg bg-amber-200 px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-300"
        >
          Exit Edit Mode
        </Link>
      </div>
      <Outlet />
    </ManagedHostProvider>
  );
}
