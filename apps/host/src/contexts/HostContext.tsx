import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetchUserProfile,
  fetchHostBySlug,
  signOut,
  type Host,
  type LanguageCode,
  type CurrencyCode,
} from "@taurex/firebase";
import { useAuth } from "./AuthContext";

interface HostContextType {
  host: Host | null;
  hostId: string | null;
  languages: LanguageCode[];
  baseCurrency: CurrencyCode;
  loading: boolean;
  error: string | null;
  refreshHost: () => Promise<void>;
}

const HostContext = createContext<HostContextType>({
  host: null,
  hostId: null,
  languages: ["en"],
  baseCurrency: "CHF",
  loading: true,
  error: null,
  refreshHost: async () => {},
});

export function HostProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    if (!user) {
      setHost(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await fetchUserProfile(user.uid);
      if (!profile) {
        setError("No host linked to this account.");
        await signOut();
        return;
      }

      const hostDoc = await fetchHostBySlug(profile.hostId);
      if (!hostDoc) {
        setError("Host not found.");
        await signOut();
        return;
      }

      // Ensure defaults
      if (!hostDoc.languages || hostDoc.languages.length === 0) {
        hostDoc.languages = ["en"];
      }
      if (!hostDoc.baseCurrency) {
        hostDoc.baseCurrency = "CHF";
      }

      setHost(hostDoc);
    } catch {
      setError("Failed to resolve host.");
      await signOut();
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  const refreshHost = useCallback(async () => {
    if (!host?.id) return;
    try {
      const updated = await fetchHostBySlug(host.id);
      if (updated) {
        if (!updated.languages || updated.languages.length === 0) {
          updated.languages = ["en"];
        }
        if (!updated.baseCurrency) {
          updated.baseCurrency = "CHF";
        }
        setHost(updated);
      }
    } catch {
      // Silently fail — not critical
    }
  }, [host?.id]);

  return (
    <HostContext.Provider
      value={{
        host,
        hostId: host?.id ?? null,
        languages: host?.languages ?? ["en"],
        baseCurrency: host?.baseCurrency ?? "CHF",
        loading,
        error,
        refreshHost,
      }}
    >
      {children}
    </HostContext.Provider>
  );
}

export function useHost() {
  return useContext(HostContext);
}
