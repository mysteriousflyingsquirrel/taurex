"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AVAILABLE_LANGUAGES, type Host } from "@taurex/firebase";
import { getLang } from "../lib/i18n";

interface HostHeaderProps {
  host: Host;
  basePath: string;
}

export default function HostHeader({ host, basePath }: HostHeaderProps) {
  const searchParams = useSearchParams();
  const lang = getLang(searchParams.get("lang"), host.languages);
  const showSwitcher = host.languages.length > 1;

  const buildSearch = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) params.set(k, v);
    return params.toString();
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href={`${basePath}?${searchParams.toString()}`} className="text-xl font-bold tracking-tight text-gray-900">
          {host.name}
        </Link>
        {showSwitcher && (
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {host.languages.map((code) => {
              const label = AVAILABLE_LANGUAGES.find((l) => l.code === code)?.code.toUpperCase() ?? code.toUpperCase();
              const isActive = code === lang;
              return (
                <Link key={code} href={`?${buildSearch({ lang: code })}`} className={`rounded-md px-3 py-1 text-xs font-semibold transition ${isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
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
