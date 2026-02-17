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
  fetchTenantBySlug,
  signOut,
  type Tenant,
  type LanguageCode,
  type CurrencyCode,
} from "@taurex/firebase";
import { useAuth } from "./AuthContext";

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  languages: LanguageCode[];
  baseCurrency: CurrencyCode;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  languages: ["en"],
  baseCurrency: "CHF",
  loading: true,
  error: null,
  refreshTenant: async () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    if (!user) {
      setTenant(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await fetchUserProfile(user.uid);
      if (!profile) {
        setError("No tenant linked to this account.");
        await signOut();
        return;
      }

      const tenantDoc = await fetchTenantBySlug(profile.tenantId);
      if (!tenantDoc) {
        setError("Tenant not found.");
        await signOut();
        return;
      }

      // Ensure defaults
      if (!tenantDoc.languages || tenantDoc.languages.length === 0) {
        tenantDoc.languages = ["en"];
      }
      if (!tenantDoc.baseCurrency) {
        tenantDoc.baseCurrency = "CHF";
      }

      setTenant(tenantDoc);
    } catch {
      setError("Failed to resolve tenant.");
      await signOut();
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  const refreshTenant = useCallback(async () => {
    if (!tenant?.id) return;
    try {
      const updated = await fetchTenantBySlug(tenant.id);
      if (updated) {
        if (!updated.languages || updated.languages.length === 0) {
          updated.languages = ["en"];
        }
        if (!updated.baseCurrency) {
          updated.baseCurrency = "CHF";
        }
        setTenant(updated);
      }
    } catch {
      // Silently fail — not critical
    }
  }, [tenant?.id]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id ?? null,
        languages: tenant?.languages ?? ["en"],
        baseCurrency: tenant?.baseCurrency ?? "CHF",
        loading,
        error,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
