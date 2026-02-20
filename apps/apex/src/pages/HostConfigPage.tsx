import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  updateHost,
  deleteApartment,
  fetchSeasons,
  setSeason,
  deleteSeason as deleteSeasonApi,
  copySeasonsToYear,
  AVAILABLE_LANGUAGES,
  AVAILABLE_CURRENCIES,
  STANDARD_PRICE_PER_APARTMENT,
  DEFAULT_BILLING,
  getEffectivePrice,
  getMonthlyTotal,
  formatDate,
  currencySymbol,
  formatMoney,
  type LanguageCode,
  type CurrencyCode,
  type HostBilling,
  type Season,
  type SeasonDateRange,
} from "@taurex/firebase";
import { useManagedHost } from "../contexts/ManagedHostContext";
import { useToast } from "../components/Toast";
import Button from "../components/Button";
import StickyFormFooter from "../components/StickyFormFooter";
import DiscardChangesModal from "../components/DiscardChangesModal";
import { useDirtyForm } from "../hooks/useDirtyForm";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

interface SettingsData {
  languages: LanguageCode[];
  baseCurrency: CurrencyCode;
}

const COLOUR_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#22C55E", "#14B8A6", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899", "#78716C", "#0EA5E9",
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const BASE_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => BASE_YEAR + i);

export default function HostConfigPage() {
  const {
    host,
    hostId,
    languages,
    baseCurrency,
    apartments,
    readonly,
    refreshHost,
    refreshApartments,
  } = useManagedHost();

  const toast = useToast();
  const navigate = useNavigate();
  const editBase = `/hosts/${hostId}/edit`;
  const viewBase = `/hosts/${hostId}`;

  const [settings, setSettings] = useState<SettingsData>({
    languages,
    baseCurrency,
  });
  const savedSettings: SettingsData = { languages, baseCurrency };
  const settingsDirty = useDirtyForm(settings, savedSettings);
  const { showModal, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(settingsDirty && !readonly);

  const [deleting, setDeleting] = useState<string | null>(null);
  const [billingSaving, setBillingSaving] = useState(false);

  const [settingsSaving, setSettingsSaving] = useState(false);

  const saveSettings = async () => {
    if (readonly) return;
    setSettingsSaving(true);
    try {
      await updateHost(hostId, {
        languages: settings.languages,
        baseCurrency: settings.baseCurrency,
      });
      await refreshHost();
      toast.success("Settings saved.");
    } catch {
      toast.error("Saving failed.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const toggleLanguage = (code: LanguageCode) => {
    if (readonly) return;
    setSettings((prev) => {
      const langs = prev.languages;
      if (langs.includes(code) && langs.length <= 1) return prev;
      if (code === "en" && langs.includes("en")) return prev;
      const newLangs = langs.includes(code)
        ? langs.filter((l) => l !== code)
        : [...langs, code];
      return { ...prev, languages: newLangs };
    });
  };

  const setCurrency = (code: CurrencyCode) => {
    if (readonly) return;
    setSettings((prev) => ({ ...prev, baseCurrency: code }));
  };

  const handleDeleteApartment = async (slug: string, name: string) => {
    if (readonly) return;
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(slug);
    await deleteApartment(hostId, slug);
    await refreshApartments();
    setDeleting(null);
  };

  // --- Billing ---
  const billing = host.billing ?? DEFAULT_BILLING;
  const effectivePrice = getEffectivePrice(billing);
  const monthlyTotal = getMonthlyTotal(billing, apartments.length);

  const saveBilling = async (updates: Partial<HostBilling>) => {
    if (readonly) return;
    const updated = { ...billing, ...updates };
    setBillingSaving(true);
    try {
      await updateHost(hostId, { billing: updated });
      await refreshHost();
    } catch {
      toast.error("Failed to update billing.");
    } finally {
      setBillingSaving(false);
    }
  };

  return (
    <div className={!readonly ? "pb-24" : ""}>
      {/* Header (only in edit mode — view layout has its own header) */}
      {!readonly && (
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-2 text-sm text-muted">
              <Link to="/hosts" className="hover:text-primary">
                Hosts
              </Link>
              <span>›</span>
              <Link to={viewBase} className="hover:text-primary">
                {host.name}
              </Link>
              <span>›</span>
              <span className="text-foreground">Edit</span>
            </nav>
            <h1 className="mt-2 text-2xl font-bold text-foreground">
              Edit: {host.name}
            </h1>
          </div>
        </div>
      )}

      <DiscardChangesModal
        open={showModal}
        onCancel={cancelDiscard}
        onDiscard={confirmDiscard}
      />

      {!readonly && (
        <StickyFormFooter
          dirty={settingsDirty}
          left={null}
          right={
            <Button
              variant="primary"
              onClick={saveSettings}
              loading={settingsSaving}
              disabled={readonly}
            >
              {settingsSaving ? "Saving…" : "Save"}
            </Button>
          }
        />
      )}

      {/* Host Info */}
      <div className={`${readonly ? "" : "mt-8"} rounded-2xl border border-border bg-surface p-6`}>
        <h2 className="text-lg font-semibold text-foreground">Host Info</h2>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-muted">Host ID</p>
            <p className="text-sm text-foreground">{host.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Name</p>
            <p className="text-sm text-foreground">{host.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Slug</p>
            <p className="text-sm text-foreground">{host.slug}</p>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Billing</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">Rate / apartment</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {billing.unlocked ? "Free" : formatMoney(effectivePrice, "CHF")}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Apartments</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {apartments.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Monthly total</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {billing.unlocked ? "Free" : formatMoney(monthlyTotal, "CHF")}
            </p>
          </div>
        </div>

        {/* Unlock Toggle */}
        <div className="mt-6 border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Unlock Account
              </h3>
              <p className="mt-1 text-sm text-muted">
                Unlocked accounts have full access with no charges.
              </p>
            </div>
            <button
              onClick={() => saveBilling({ unlocked: !billing.unlocked })}
              disabled={billingSaving || readonly}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                billing.unlocked ? "bg-success" : "bg-surface-alt"
              } ${billingSaving || readonly ? "cursor-default opacity-50" : "cursor-pointer"}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-surface shadow ring-0 transition-transform duration-200 ${
                  billing.unlocked ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {billing.unlocked && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-bg px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm font-medium text-success">
                This account is unlocked — no charges apply
              </span>
            </div>
          )}
        </div>

        {/* Custom Price */}
        {!billing.unlocked && (
          <div className="mt-6 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground">
              Price per Apartment
            </h3>
            <p className="mt-1 text-sm text-muted">
              Leave empty to use the standard rate (CHF{" "}
              {STANDARD_PRICE_PER_APARTMENT}/month).
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-muted">CHF</span>
              <input
                type="number"
                min="0"
                step="0.5"
                disabled={readonly}
                placeholder={String(STANDARD_PRICE_PER_APARTMENT)}
                value={billing.pricePerApartment ?? ""}
                onChange={(e) => {
                  const num =
                    e.target.value === "" ? null : parseFloat(e.target.value);
                  saveBilling({ pricePerApartment: num });
                }}
                className="w-32 rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none disabled:bg-surface-alt disabled:text-muted"
              />
              <span className="text-sm text-muted">
                / apartment / month
              </span>
              {!readonly && billing.pricePerApartment !== null && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => saveBilling({ pricePerApartment: null })}
                >
                  Reset to standard
                </Button>
              )}
            </div>
            {billing.pricePerApartment !== null &&
              billing.pricePerApartment < STANDARD_PRICE_PER_APARTMENT && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-primary">
                    Discounted rate (standard: CHF{" "}
                    {STANDARD_PRICE_PER_APARTMENT})
                  </span>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Base Currency */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Base Currency</h2>
        <p className="mt-1 text-sm text-muted">
          All prices are stored and displayed in this currency.
        </p>
        <div className="mt-4 space-y-3">
          {AVAILABLE_CURRENCIES.map((cur) => {
            const isActive = settings.baseCurrency === cur.code;
            return (
              <div
                key={cur.code}
                onClick={() => setCurrency(cur.code)}
                className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : readonly
                      ? "border-border bg-surface-alt opacity-50"
                      : "border-border cursor-pointer hover:bg-surface-alt"
                } ${readonly ? "" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 text-sm font-semibold text-foreground">
                    {cur.symbol}
                  </span>
                  <span className="text-sm text-foreground">
                    {cur.label} ({cur.code})
                  </span>
                </div>
                <input
                  type="radio"
                  name="baseCurrency"
                  checked={isActive}
                  disabled={readonly}
                  onChange={() => setCurrency(cur.code)}
                  className="h-4 w-4 border-input text-primary focus:ring-ring"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Languages */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Languages</h2>
        <p className="mt-1 text-sm text-muted">
          Choose which languages are available. English is always enabled.
        </p>
        <div className="mt-4 space-y-3">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isActive = settings.languages.includes(lang.code);
            const isDefault = lang.code === "en";
            return (
              <div
                key={lang.code}
                onClick={() => !isDefault && toggleLanguage(lang.code)}
                className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : readonly
                      ? "border-border bg-surface-alt opacity-50"
                      : "border-border cursor-pointer hover:bg-surface-alt"
                } ${isDefault || readonly ? "" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold uppercase text-foreground">
                    {lang.code}
                  </span>
                  <span className="text-sm text-foreground">{lang.label}</span>
                  {isDefault && (
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted">
                      Default
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={isDefault || readonly}
                  onChange={() => toggleLanguage(lang.code)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Seasons */}
      <SeasonsSection hostId={hostId} readonly={readonly} />

      {/* Apartments */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Apartments ({apartments.length})
          </h2>
          {!readonly && (
            <Button
              variant="primary"
              onClick={() => navigate(`${editBase}/apartments/new`)}
            >
              + Add Apartment
            </Button>
          )}
        </div>

        {apartments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border p-8 text-center">
            <p className="text-muted">No apartments yet.</p>
            {!readonly && (
              <div className="mt-3">
                <Button variant="primary" size="sm" onClick={() => navigate(`${editBase}/apartments/new`)}>Create the first apartment</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-alt">
                <tr>
                  <th className="px-6 py-3 font-medium text-muted">
                    Apartment
                  </th>
                  <th className="hidden px-6 py-3 font-medium text-muted md:table-cell">
                    Guests
                  </th>
                  <th className="hidden px-6 py-3 font-medium text-muted md:table-cell">
                    Bedrooms
                  </th>
                  <th className="hidden px-6 py-3 font-medium text-muted lg:table-cell">
                    m²
                  </th>
                  <th className="hidden px-6 py-3 font-medium text-muted md:table-cell">
                    Price/night
                  </th>
                  <th className="hidden px-6 py-3 font-medium text-muted md:table-cell">
                    Min Stay
                  </th>
                  {!readonly && (
                    <th className="px-6 py-3 font-medium text-muted">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apartments.map((apt) => {
                  const aptUrl = readonly
                    ? `${viewBase}/apartments/${apt.slug}`
                    : `${editBase}/apartments/${apt.slug}`;
                  return (
                    <tr
                      key={apt.slug}
                      className="cursor-pointer hover:bg-surface-alt"
                      onClick={() => navigate(aptUrl)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {apt.name || apt.slug}
                          </p>
                          <p className="text-xs text-muted">{apt.slug}</p>
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 text-muted md:table-cell">
                        {apt.facts.guests}
                      </td>
                      <td className="hidden px-6 py-4 text-muted md:table-cell">
                        {apt.facts.bedrooms}
                      </td>
                      <td className="hidden px-6 py-4 text-muted lg:table-cell">
                        {apt.facts.sqm || "—"}
                      </td>
                      <td className="hidden px-6 py-4 text-muted md:table-cell">
                        {apt.priceDefault
                          ? `${currencySymbol(baseCurrency)} ${apt.priceDefault}`
                          : "—"}
                      </td>
                      <td className="hidden px-6 py-4 text-muted md:table-cell">
                        {apt.minStayDefault
                          ? `${apt.minStayDefault} nights`
                          : "—"}
                      </td>
                      {!readonly && (
                        <td className="px-6 py-4">
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(aptUrl)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteApartment(
                                  apt.slug,
                                  apt.name || apt.slug
                                )
                              }
                              disabled={deleting === apt.slug}
                              loading={deleting === apt.slug}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Seasons Section ─── */

function SeasonsSection({
  hostId,
  readonly,
}: {
  hostId: string;
  readonly: boolean;
}) {
  const toast = useToast();
  const [year, setYear] = useState(BASE_YEAR);
  const [seasons, setSeasons] = useState<Record<string, Season>>({});
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    id?: string;
    name: string;
    color: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSeasons(hostId, year).then((data) => {
      setSeasons(data);
      setLoading(false);
    });
  }, [hostId, year]);

  const [seasonsSaving, setSeasonsSaving] = useState(false);

  const saveSeasons = useCallback(async () => {
    setSeasonsSaving(true);
    try {
      await Promise.all(
        Object.entries(seasons).map(([id, s]) => {
          const { id: _, ...rest } = s;
          return setSeason(hostId, id, rest);
        })
      );
      toast.success("Seasons saved.");
    } catch {
      toast.error("Saving failed.");
    } finally {
      setSeasonsSaving(false);
    }
  }, [hostId, seasons, toast]);

  const handleDeleteSeason = async (seasonId: string) => {
    const season = seasons[seasonId];
    if (
      !confirm(
        `Delete "${season.name}"? All date range assignments will be lost.`
      )
    )
      return;
    await deleteSeasonApi(hostId, seasonId);
    setSeasons((prev) => {
      const next = { ...prev };
      delete next[seasonId];
      return next;
    });
  };

  const handleCreateSeason = () => {
    const usedColours = new Set(Object.values(seasons).map((s) => s.color));
    const firstUnused =
      COLOUR_PALETTE.find((c) => !usedColours.has(c)) ?? COLOUR_PALETTE[0];
    setModal({ mode: "create", name: "", color: firstUnused });
  };

  const handleEditSeason = (id: string) => {
    const s = seasons[id];
    setModal({ mode: "edit", id, name: s.name, color: s.color });
  };

  const handleModalSubmit = () => {
    if (!modal) return;
    if (modal.mode === "create") {
      const slugPart = slugify(modal.name);
      if (!slugPart) {
        toast.error("Name is required.");
        return;
      }
      const id = `${year}-${slugPart}`;
      if (seasons[id]) {
        toast.error("A season with this ID already exists for this year.");
        return;
      }
      const newSeason: Season = {
        id,
        year,
        name: modal.name,
        color: modal.color,
        dateRanges: [],
      };
      setSeasons((prev) => ({ ...prev, [id]: newSeason }));
    } else if (modal.mode === "edit" && modal.id) {
      setSeasons((prev) => ({
        ...prev,
        [modal.id!]: {
          ...prev[modal.id!],
          name: modal.name,
          color: modal.color,
        },
      }));
    }
    setModal(null);
  };

  const handleCopyFromPreviousYear = async () => {
    const prevYear = year - 1;
    if (
      !confirm(
        `Copy all seasons from ${prevYear} to ${year}? Existing seasons will not be affected.`
      )
    )
      return;
    setCopying(true);
    try {
      const copied = await copySeasonsToYear(hostId, prevYear, year);
      setSeasons((prev) => ({ ...prev, ...copied }));
    } catch {
      toast.error("Failed to copy seasons.");
    } finally {
      setCopying(false);
    }
  };

  const updateDateRange = (
    seasonId: string,
    rangeIdx: number,
    field: "start" | "end",
    value: string
  ) => {
    setSeasons((prev) => {
      const season = prev[seasonId];
      const newRanges = [...season.dateRanges];
      newRanges[rangeIdx] = { ...newRanges[rangeIdx], [field]: value };
      return { ...prev, [seasonId]: { ...season, dateRanges: newRanges } };
    });
  };

  const addDateRange = (seasonId: string) => {
    setSeasons((prev) => {
      const season = prev[seasonId];
      const defaultStart = `${year}-01-01`;
      const defaultEnd = `${year}-01-07`;
      return {
        ...prev,
        [seasonId]: {
          ...season,
          dateRanges: [
            ...season.dateRanges,
            { start: defaultStart, end: defaultEnd },
          ],
        },
      };
    });
  };

  const removeDateRange = (seasonId: string, rangeIdx: number) => {
    setSeasons((prev) => {
      const season = prev[seasonId];
      return {
        ...prev,
        [seasonId]: {
          ...season,
          dateRanges: season.dateRanges.filter((_, i) => i !== rangeIdx),
        },
      };
    });
  };

  const seasonList = Object.values(seasons);

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Seasons</h2>
          {!readonly && (
            <Button
              variant="primary"
              onClick={saveSeasons}
              loading={seasonsSaving}
              disabled={seasonsSaving}
            >
              {seasonsSaving ? "Saving…" : "Save seasons"}
            </Button>
          )}
        </div>
        {!readonly && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyFromPreviousYear}
              disabled={copying}
              loading={copying}
            >
              {copying ? "Copying…" : `Copy from ${year - 1}`}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateSeason}
            >
              + Add Season
            </Button>
          </div>
        )}
      </div>

      {/* Year selector */}
      <div className="mt-4">
        <label className="text-sm font-medium text-muted">Year</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="ml-3 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading seasons…</p>
      ) : seasonList.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No seasons for {year}.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {seasonList.map((season) => (
            <div
              key={season.id}
              className="rounded-xl border border-border p-4"
            >
              {/* Season header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: season.color }}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {season.name}
                  </span>
                  <span className="text-xs text-muted">{season.id}</span>
                </div>
                {!readonly && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditSeason(season.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSeason(season.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Date ranges */}
              <div className="mt-3 space-y-2">
                {season.dateRanges.length === 0 ? (
                  <p className="text-sm text-muted">No date ranges.</p>
                ) : (
                  season.dateRanges.map((range, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {readonly ? (
                        <span className="text-sm text-foreground">
                          {formatDate(range.start)} — {formatDate(range.end)}
                        </span>
                      ) : (
                        <>
                          <input
                            type="date"
                            value={range.start}
                            onChange={(e) =>
                              updateDateRange(
                                season.id,
                                idx,
                                "start",
                                e.target.value
                              )
                            }
                            className="rounded-lg border border-input px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                          />
                          <span className="text-muted">—</span>
                          <input
                            type="date"
                            value={range.end}
                            onChange={(e) =>
                              updateDateRange(
                                season.id,
                                idx,
                                "end",
                                e.target.value
                              )
                            }
                            className="rounded-lg border border-input px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeDateRange(season.id, idx)}
                          >
                            ×
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                )}
                {!readonly && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => addDateRange(season.id)}
                  >
                    + Add Range
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Season Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground">
              {modal.mode === "create" ? "Create Season" : "Edit Season"}
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Name *
                </label>
                <input
                  type="text"
                  value={modal.name}
                  onChange={(e) =>
                    setModal({ ...modal, name: e.target.value })
                  }
                  placeholder="e.g. High Season"
                  autoFocus
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                />
                {modal.mode === "create" && modal.name && (
                  <p className="mt-1 text-xs text-muted">
                    ID: {year}-{slugify(modal.name) || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Colour
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLOUR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setModal({ ...modal, color: c })}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        modal.color === c
                          ? "scale-110 ring-2 ring-ring ring-offset-2"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleModalSubmit}
              >
                {modal.mode === "create" ? "Create" : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
