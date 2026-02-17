import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetchTenantBySlug,
  fetchApartments,
  type Tenant,
  type Apartment,
  type LanguageCode,
  type CurrencyCode,
} from "@taurex/firebase";

interface ManagedTenantContextType {
  tenant: Tenant;
  tenantId: string;
  languages: LanguageCode[];
  baseCurrency: CurrencyCode;
  apartments: Apartment[];
  readonly: boolean;
  refreshTenant: () => Promise<void>;
  refreshApartments: () => Promise<void>;
}

const ManagedTenantContext = createContext<ManagedTenantContextType | null>(
  null
);

export function ManagedTenantProvider({
  tenant: initialTenant,
  apartments: initialApartments,
  readonly = false,
  children,
}: {
  tenant: Tenant;
  apartments: Apartment[];
  readonly?: boolean;
  children: ReactNode;
}) {
  const [tenant, setTenant] = useState(initialTenant);
  const [apartments, setApartments] = useState(initialApartments);

  const refreshTenant = useCallback(async () => {
    const updated = await fetchTenantBySlug(tenant.id);
    if (updated) setTenant(updated);
  }, [tenant.id]);

  const refreshApartments = useCallback(async () => {
    const apts = await fetchApartments(tenant.id);
    setApartments(apts);
  }, [tenant.id]);

  return (
    <ManagedTenantContext.Provider
      value={{
        tenant,
        tenantId: tenant.id,
        languages: tenant.languages ?? ["en"],
        baseCurrency: tenant.baseCurrency ?? "CHF",
        apartments,
        readonly,
        refreshTenant,
        refreshApartments,
      }}
    >
      {children}
    </ManagedTenantContext.Provider>
  );
}

export function useManagedTenant() {
  const ctx = useContext(ManagedTenantContext);
  if (!ctx)
    throw new Error(
      "useManagedTenant must be used inside ManagedTenantProvider"
    );
  return ctx;
}
