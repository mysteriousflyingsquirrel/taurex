import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApartments, fetchSeasons, type Apartment } from "@taurex/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useHost } from "../contexts/HostContext";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
  link: string;
  linkLabel: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { host, hostId, languages } = useHost();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [seasonCount, setSeasonCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!hostId) return;
    Promise.all([
      fetchApartments(hostId),
      fetchSeasons(hostId, currentYear),
    ]).then(([apts, seasons]) => {
      setApartments(apts);
      setSeasonCount(Object.keys(seasons).length);
      setLoading(false);
    });
  }, [hostId, currentYear]);

  const checklist = useMemo<ChecklistItem[]>(() => {
    const hasLanguages = languages.length >= 1;
    const hasSeasons = seasonCount > 0;
    const hasApartments = apartments.length > 0;
    const hasApartmentWithPrice = apartments.some((a) => a.priceDefault > 0);

    return [
      {
        key: "languages",
        label: "Configure languages",
        description:
          "Select which languages your website content will support.",
        done: hasLanguages && languages.length > 1,
        link: "/settings",
        linkLabel: "Go to Settings",
      },
      {
        key: "seasons",
        label: `Create seasons for ${currentYear}`,
        description:
          "Define your pricing seasons (e.g. High, Mid, Low) and paint dates on the calendar.",
        done: hasSeasons,
        link: "/seasons",
        linkLabel: "Manage Seasons",
      },
      {
        key: "apartments",
        label: "Add your first apartment",
        description:
          "Create an apartment with all the details guests need to see.",
        done: hasApartments,
        link: "/apartments/new",
        linkLabel: "Add Apartment",
      },
      {
        key: "pricing",
        label: "Set pricing",
        description:
          "Add a default price and season-specific prices for your apartments.",
        done: hasApartmentWithPrice,
        link: hasApartments ? `/apartments/${apartments[0]?.slug}` : "/apartments/new",
        linkLabel: "Edit Apartment",
      },
    ];
  }, [languages, seasonCount, apartments, currentYear]);

  const doneCount = checklist.filter((c) => c.done).length;
  const allDone = doneCount === checklist.length;

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* Stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/apartments"
          className="rounded-2xl border border-border bg-surface p-6 transition hover:shadow-sm"
        >
          <p className="text-sm font-medium text-muted">Apartments</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {loading ? "…" : apartments.length}
          </p>
        </Link>
        <Link
          to="/seasons"
          className="rounded-2xl border border-border bg-surface p-6 transition hover:shadow-sm"
        >
          <p className="text-sm font-medium text-muted">
            Seasons ({currentYear})
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {loading ? "…" : seasonCount}
          </p>
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-muted">Public Page</p>
          <p className="mt-2 text-sm font-medium text-primary">
            taurex.one/{host?.slug}
          </p>
        </div>
      </div>

      {/* Setup Guide */}
      {!loading && (
        <div
          className={`mt-6 rounded-2xl border p-6 ${
            allDone
              ? "border-border bg-success-bg"
              : "border-border bg-primary/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-lg font-semibold ${
                  allDone ? "text-success" : "text-foreground"
                }`}
              >
                {allDone ? "🎉 All set!" : "Setup Guide"}
              </h2>
              <p
                className={`mt-1 text-sm ${
                  allDone ? "text-success" : "text-primary"
                }`}
              >
                {allDone
                  ? "Your website is ready to go. Keep managing your content from the sidebar."
                  : `Complete these steps to get your website up and running (${doneCount}/${checklist.length}).`}
              </p>
            </div>
            {!allDone && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-primary/20">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{
                      width: `${(doneCount / checklist.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-primary">
                  {doneCount}/{checklist.length}
                </span>
              </div>
            )}
          </div>

          {!allDone && (
            <div className="mt-4 space-y-3">
              {checklist.map((item, idx) => (
                <div
                  key={item.key}
                  className={`flex items-start gap-4 rounded-xl border bg-surface p-4 transition ${
                    item.done
                      ? "border-border opacity-60"
                      : "border-border"
                  }`}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    {item.done ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-bg text-success">
                        ✓
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt text-sm font-medium text-muted">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        item.done
                          ? "text-muted line-through"
                          : "text-foreground"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {item.description}
                    </p>
                  </div>
                  {!item.done && (
                    <Button variant="primary" size="sm" onClick={() => navigate(item.link)}>{item.linkLabel}</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => navigate("/apartments/new")}>+ Add Apartment</Button>
          <Button variant="secondary" onClick={() => navigate("/seasons")}>Manage Seasons</Button>
          <Button variant="secondary" onClick={() => navigate("/settings")}>Settings</Button>
        </div>
      </div>
    </div>
  );
}
