import { useEffect, useState } from "react";
import {
  fetchAllUsers,
  fetchTenants,
  deleteUserProfile,
  type UserProfile,
  type Tenant,
} from "@taurex/firebase";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tenants, setTenants] = useState<Record<string, Tenant>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([fetchAllUsers(), fetchTenants()])
      .then(([userList, tenantList]) => {
        setUsers(userList);
        const tenantMap: Record<string, Tenant> = {};
        for (const t of tenantList) {
          tenantMap[t.id] = t;
        }
        setTenants(tenantMap);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Users load error:", err);
        setError("Failed to load users. Check Firestore rules and admin claim.");
        setLoading(false);
      });
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserProfile(deleteTarget.uid);
      setUsers((prev) => prev.filter((u) => u.uid !== deleteTarget.uid));
      setDeleteTarget(null);
    } catch {
      alert("Failed to delete user profile.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.uid.toLowerCase().includes(search.toLowerCase()) ||
      u.tenantId.toLowerCase().includes(search.toLowerCase()) ||
      (tenants[u.tenantId]?.name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-600">
          All user profiles on the platform
        </p>
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
          placeholder="Search by UID or tenant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {/* Info */}
      <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Note:</strong> Creating new users and managing admin roles
        requires Firebase Console or a Cloud Function. This page shows user
        profiles stored in Firestore.
      </div>

      {/* Table */}
      {loading ? (
        <p className="mt-8 text-sm text-gray-500">Loading users…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          {search ? "No users match your search." : "No user profiles yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium text-gray-500">UID</th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Tenant
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <code className="text-xs text-gray-600">{user.uid}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">
                      {tenants[user.tenantId]?.name ?? user.tenantId}
                    </span>
                    <code className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {user.tenantId}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          open={!!deleteTarget}
          title="Delete User Profile"
          description={`This will remove the user profile for "${deleteTarget.uid}". The Firebase Auth account will not be affected — only the Firestore profile document will be deleted.`}
          confirmPhrase={`delete ${deleteTarget.uid}`}
          buttonLabel="Delete User Profile"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
