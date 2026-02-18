import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetchHostBySlug,
  fetchApartments,
  type Host,
  type Apartment,
  type LanguageCode,
  type CurrencyCode,
} from "@taurex/firebase";

interface ManagedHostContextType {
  host: Host;
  hostId: string;
  languages: LanguageCode[];
  baseCurrency: CurrencyCode;
  apartments: Apartment[];
  readonly: boolean;
  refreshHost: () => Promise<void>;
  refreshApartments: () => Promise<void>;
}

const ManagedHostContext = createContext<ManagedHostContextType | null>(
  null
);

export function ManagedHostProvider({
  tenant: initialTenant,
  apartments: initialApartments,
  readonly = false,
  children,
}: {
  tenant: Host;
  apartments: Apartment[];
  readonly?: boolean;
  children: ReactNode;
}) {
  const [tenant, setTenant] = useState(initialTenant);
  const [apartments, setApartments] = useState(initialApartments);

  const refreshHost = useCallback(async () => {
    const updated = await fetchHostBySlug(tenant.id);
    if (updated) setTenant(updated);
  }, [tenant.id]);

  const refreshApartments = useCallback(async () => {
    const apts = await fetchApartments(tenant.id);
    setApartments(apts);
  }, [tenant.id]);

  return (
    <ManagedHostContext.Provider
      value={{
        host: tenant,
        hostId: tenant.id,
        languages: tenant.languages ?? ["en"],
        baseCurrency: tenant.baseCurrency ?? "CHF",
        apartments,
        readonly,
        refreshHost,
        refreshApartments,
      }}
    >
      {children}
    </ManagedHostContext.Provider>
  );
}

export function useManagedHost() {
  const ctx = useContext(ManagedHostContext);
  if (!ctx)
    throw new Error(
      "useManagedHost must be used inside ManagedHostProvider"
    );
  return ctx;
}
