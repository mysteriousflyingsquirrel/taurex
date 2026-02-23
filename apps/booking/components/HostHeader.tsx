"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AVAILABLE_LANGUAGES, type Host } from "@taurex/firebase";
import { getLang } from "../lib/i18n";

interface HostHeaderProps {
  host: Host;
  basePath: string;
  transparent?: boolean;
}

export default function HostHeader({ host, basePath, transparent = false }: HostHeaderProps) {
  const searchParams = useSearchParams();
  const lang = getLang(searchParams.get("lang"), host.languages);
  const showSwitcher = host.languages.length > 1;

  const buildSearch = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) params.set(k, v);
    return params.toString();
  };

  const navClass = transparent
    ? "relative z-40"
    : "sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md";

  const textClass = transparent
    ? "text-white drop-shadow-md"
    : "text-foreground";

  const switcherBg = transparent
    ? "bg-white/20 backdrop-blur-sm"
    : "bg-surface-alt";

  const switcherActive = transparent
    ? "bg-white/30 text-white shadow-sm"
    : "bg-surface text-foreground shadow-sm";

  const switcherInactive = transparent
    ? "text-white/80 hover:text-white"
    : "text-muted hover:text-foreground";

  return (
    <nav className={navClass}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href={`${basePath}?${searchParams.toString()}`} className={`flex items-center gap-3 text-xl font-bold tracking-tight ${textClass}`}>
          {host.logoUrl && (
            <img
              src={host.logoUrl}
              alt={`${host.name} logo`}
              className="h-10 w-auto object-contain"
            />
          )}
          {host.name}
        </Link>
        {showSwitcher && (
          <div className={`flex items-center gap-1 rounded-lg p-1 ${switcherBg}`}>
            {host.languages.map((code) => {
              const label = AVAILABLE_LANGUAGES.find((l) => l.code === code)?.code.toUpperCase() ?? code.toUpperCase();
              const isActive = code === lang;
              return (
                <Link key={code} href={`?${buildSearch({ lang: code })}`} className={`rounded-md px-3 py-1 text-xs font-semibold transition ${isActive ? switcherActive : switcherInactive}`}>
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
