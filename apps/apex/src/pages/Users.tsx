import { useEffect, useState, type FormEvent } from "react";
import {
  fetchAllUsers,
  fetchHosts,
  createAuthUser,
  createUserProfile,
  deleteUserProfile,
  type UserProfile,
  type Host,
} from "@taurex/firebase";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [hosts, setHosts] = useState<Record<string, Host>>({});
  const [hostList, setHostList] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    Promise.all([fetchAllUsers(), fetchHosts()])
      .then(([userList, hl]) => {
        setUsers(userList);
        setHostList(hl);
        const hostMap: Record<string, Host> = {};
        for (const h of hl) {
          hostMap[h.id] = h;
        }
        setHosts(hostMap);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Users load error:", err);
        setError("Failed to load users. Check Firestore rules and apex claim.");
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

  const handleUserCreated = (profile: UserProfile) => {
    setUsers((prev) => [...prev, profile]);
    setShowCreate(false);
  };

  const filtered = users.filter(
    (u) =>
      u.uid.toLowerCase().includes(search.toLowerCase()) ||
      u.hostId.toLowerCase().includes(search.toLowerCase()) ||
      (hosts[u.hostId]?.name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-600">
            All user profiles on the platform
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400"
        >
          + Create User
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        <input
          type="text"
          placeholder="Search by UID or host…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
      </div>

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
                <th className="px-6 py-3 font-medium text-gray-500">Host</th>
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
                      {hosts[user.hostId]?.name ?? user.hostId}
                    </span>
                    <code className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {user.hostId}
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

      {showCreate && (
        <CreateUserModal
          hosts={hostList}
          onCreated={handleUserCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  hosts,
  onCreated,
  onCancel,
}: {
  hosts: Host[];
  onCreated: (profile: UserProfile) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hostId, setHostId] = useState(hosts[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!hostId) {
      setError("Please select a host.");
      return;
    }

    setSaving(true);
    try {
      const uid = await createAuthUser(email.trim(), password);
      await createUserProfile(uid, hostId);
      onCreated({ uid, hostId });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create user.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-gray-900">Create User</h3>
        <p className="mt-1 text-sm text-gray-600">
          Creates a Firebase Auth account and links it to a host.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Host *
            </label>
            {hosts.length === 0 ? (
              <p className="mt-1 text-sm text-red-600">
                No hosts available. Create a host first.
              </p>
            ) : (
              <select
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.slug})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || hosts.length === 0}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
