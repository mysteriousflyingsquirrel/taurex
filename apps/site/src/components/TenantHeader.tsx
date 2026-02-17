import { Link, useSearchParams } from "react-router-dom";
import type { Tenant } from "@taurex/firebase";
import { AVAILABLE_LANGUAGES } from "@taurex/firebase";
import { useLang, buildSearch } from "../i18n";

interface TenantHeaderProps {
  tenant: Tenant;
  basePath: string;
}

export default function TenantHeader({ tenant, basePath }: TenantHeaderProps) {
  const [searchParams] = useSearchParams();
  const lang = useLang(searchParams, tenant.languages);
  const showSwitcher = tenant.languages.length > 1;

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          to={`${basePath}?${searchParams.toString()}`}
          className="text-xl font-bold tracking-tight text-gray-900"
        >
          {tenant.name}
        </Link>

        {showSwitcher && (
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {tenant.languages.map((code) => {
              const label =
                AVAILABLE_LANGUAGES.find((l) => l.code === code)?.code.toUpperCase() ?? code.toUpperCase();
              const isActive = code === lang;
              return (
                <Link
                  key={code}
                  to={`?${buildSearch(searchParams, { lang: code })}`}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
