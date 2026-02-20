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
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [hosts, setHosts] = useState<Record<string, Host>>({});
  const [hostList, setHostList] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      toast.error("Failed to delete user profile.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUserCreated = (profile: UserProfile) => {
    setUsers((prev) => [...prev, profile]);
    setShowCreate(false);
  };

  return (
    <div>
      <PageHeader
        title="Users"
        action={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            + Create user
          </Button>
        }
      />

      {error && (
        <div className="mt-6 rounded-lg border border-border bg-destructive-bg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-muted">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No user profiles yet.</p>
      ) : (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="px-6 py-3 font-medium text-muted">UID</th>
                  <th className="px-6 py-3 font-medium text-muted">Host</th>
                  <th className="px-6 py-3 font-medium text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.uid} className="hover:bg-surface-alt">
                    <td className="px-6 py-4">
                      <code className="text-xs text-muted">{user.uid}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-foreground">
                        {hosts[user.hostId]?.name ?? user.hostId}
                      </span>
                      <code className="ml-2 rounded bg-surface-alt px-1.5 py-0.5 text-xs text-muted">
                        {user.hostId}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(user)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3 md:hidden">
            {users.map((user) => (
              <div
                key={user.uid}
                className="rounded-xl border border-border bg-surface p-4 shadow-sm"
              >
                <p className="font-medium text-foreground">
                  <code className="text-xs text-muted">{user.uid}</code>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {hosts[user.hostId]?.name ?? user.hostId}
                  <code className="ml-2 rounded bg-surface-alt px-1.5 py-0.5 text-xs text-muted">
                    {user.hostId}
                  </code>
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(user)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </>
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
        <h3 className="text-lg font-semibold text-foreground">Create User</h3>
        <p className="mt-1 text-sm text-muted">
          Creates a Firebase Auth account and links it to a host.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive-bg px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Password *
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Host *
            </label>
            {hosts.length === 0 ? (
              <p className="mt-1 text-sm text-destructive">
                No hosts available. Create a host first.
              </p>
            ) : (
              <select
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
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
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={saving || hosts.length === 0}
            loading={saving}
          >
            {saving ? "Creating…" : "Create User"}
          </Button>
        </div>
      </form>
    </div>
  );
}
