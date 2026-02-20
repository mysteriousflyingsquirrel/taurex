"use client";

import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import "../lib/firebase";
import { fetchHosts, type Host } from "@taurex/firebase";

const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export default function Home() {
  if (!isDev) {
    redirect("https://taurex.one");
  }

  return <DevHostList />;
}

function DevHostList() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHosts()
      .then(setHosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-16">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-foreground">Booking — Dev</h1>
        <p className="mt-1 text-sm text-muted">
          Select a host to preview their booking page.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-muted">Loading hosts…</p>
        ) : hosts.length === 0 ? (
          <p className="mt-8 text-sm text-muted">
            No hosts found. Create one in the Apex dashboard first.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
            {hosts.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/${h.slug}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-surface-alt"
                >
                  <div>
                    <span className="font-medium text-foreground">{h.name}</span>
                    <code className="ml-2 rounded bg-surface-alt px-1.5 py-0.5 text-xs text-muted">
                      /{h.slug}
                    </code>
                  </div>
                  <span className="text-sm text-muted">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
