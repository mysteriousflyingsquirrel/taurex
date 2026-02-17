import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchApartments, fetchSeasons, type Apartment } from "@taurex/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTenant } from "../contexts/TenantContext";

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
  link: string;
  linkLabel: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { tenant, tenantId, languages } = useTenant();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [seasonCount, setSeasonCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      fetchApartments(tenantId),
      fetchSeasons(tenantId, currentYear),
    ]).then(([apts, seasons]) => {
      setApartments(apts);
      setSeasonCount(Object.keys(seasons).length);
      setLoading(false);
    });
  }, [tenantId, currentYear]);

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
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">
        Welcome back, {tenant?.name}
      </p>

      {/* Stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/apartments"
          className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">Apartments</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "…" : apartments.length}
          </p>
        </Link>
        <Link
          to="/seasons"
          className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">
            Seasons ({currentYear})
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "…" : seasonCount}
          </p>
        </Link>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Public Page</p>
          <p className="mt-2 text-sm font-medium text-indigo-600">
            taurex.one/{tenant?.slug}
          </p>
        </div>
      </div>

      {/* Setup Guide */}
      {!loading && (
        <div
          className={`mt-6 rounded-2xl border p-6 ${
            allDone
              ? "border-green-200 bg-green-50"
              : "border-indigo-200 bg-indigo-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-lg font-semibold ${
                  allDone ? "text-green-900" : "text-indigo-900"
                }`}
              >
                {allDone ? "🎉 All set!" : "Setup Guide"}
              </h2>
              <p
                className={`mt-1 text-sm ${
                  allDone ? "text-green-700" : "text-indigo-700"
                }`}
              >
                {allDone
                  ? "Your website is ready to go. Keep managing your content from the sidebar."
                  : `Complete these steps to get your website up and running (${doneCount}/${checklist.length}).`}
              </p>
            </div>
            {!allDone && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-indigo-200">
                  <div
                    className="h-2 rounded-full bg-indigo-600 transition-all"
                    style={{
                      width: `${(doneCount / checklist.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-indigo-700">
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
                  className={`flex items-start gap-4 rounded-xl border bg-white p-4 transition ${
                    item.done
                      ? "border-green-200 opacity-60"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    {item.done ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                        ✓
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-500">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        item.done
                          ? "text-gray-400 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {item.description}
                    </p>
                  </div>
                  {!item.done && (
                    <Link
                      to={item.link}
                      className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      {item.linkLabel}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/apartments/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Add Apartment
          </Link>
          <Link
            to="/seasons"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Manage Seasons
          </Link>
          <Link
            to="/settings"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
