import { useState, useEffect } from "react";
import {
  updateHost,
  fetchApartments,
  uploadHostLogo,
  uploadHostBanner,
  removeHostLogo,
  removeHostBanner,
  AVAILABLE_LANGUAGES,
  AVAILABLE_CURRENCIES,
  getEffectivePrice,
  getMonthlyTotal,
  formatMoney,
  type LanguageCode,
  type CurrencyCode,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";
import PageHeader from "../components/PageHeader";
import ImageUpload from "../components/ImageUpload";
import DiscardChangesModal from "../components/DiscardChangesModal";
import { useToast } from "../components/Toast";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useAutosave } from "../hooks/useAutosave";
import { HOST_AUTOSAVE_DELAY_MS } from "../config/autosave";

interface SettingsData {
  languages: LanguageCode[];
  baseCurrency: CurrencyCode;
}

export default function Settings() {
  const { host, hostId, languages, baseCurrency, refreshHost } =
    useHost();

  const [settings, setSettings] = useState<SettingsData>({
    languages,
    baseCurrency,
  });
  const [savedSettings, setSavedSettings] = useState<SettingsData>({
    languages,
    baseCurrency,
  });
  const [apartmentCount, setApartmentCount] = useState(0);
  const toast = useToast();

  // Sync when host data loads
  useEffect(() => {
    const next = { languages, baseCurrency };
    setSettings(next);
    setSavedSettings(next);
  }, [languages, baseCurrency]);

  // Fetch apartment count for billing display
  useEffect(() => {
    if (!hostId) return;
    fetchApartments(hostId).then((apts) => setApartmentCount(apts.length));
  }, [hostId]);

  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const { showModal, confirmDiscard, cancelDiscard } =
    useUnsavedChangesGuard(isDirty);

  const { lastSavedAt: settingsLastSavedAt, lastError: settingsAutosaveError } =
    useAutosave({
      enabled: !!hostId,
      isDirty,
      watch: settings,
      delayMs: HOST_AUTOSAVE_DELAY_MS,
      saveFn: async (next) => {
        if (!hostId) return;
        await updateHost(hostId, {
          languages: next.languages,
          baseCurrency: next.baseCurrency,
        });
        await refreshHost();
        setSavedSettings(next);
      },
    });

  useEffect(() => {
    if (settingsLastSavedAt) {
      toast.success("Saving successfull");
    }
  }, [settingsLastSavedAt, toast]);

  useEffect(() => {
    if (settingsAutosaveError) {
      toast.error("Saving failed");
    }
  }, [settingsAutosaveError, toast]);

  const toggleLanguage = (code: LanguageCode) => {
    setSettings((prev) => {
      const langs = prev.languages;
      // Cannot remove the last language
      if (langs.includes(code) && langs.length <= 1) return prev;
      // Cannot remove EN (default)
      if (code === "en" && langs.includes("en")) return prev;

      const newLangs = langs.includes(code)
        ? langs.filter((l) => l !== code)
        : [...langs, code];

      return { ...prev, languages: newLangs };
    });
  };

  const setCurrency = (code: CurrencyCode) => {
    setSettings((prev) => ({ ...prev, baseCurrency: code }));
  };

  return (
    <div className="pb-24">
      <PageHeader title="Settings" />

      {/* Host Info */}
      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Host Info</h2>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-muted">Host ID</p>
            <p className="text-sm text-foreground">{host?.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Name</p>
            <p className="text-sm text-foreground">{host?.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Slug</p>
            <p className="text-sm text-foreground">{host?.slug}</p>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Branding</h2>
        <p className="mt-1 text-sm text-muted">
          Upload a logo and banner image for your public booking page.
        </p>
        <div className="mt-4 space-y-6">
          <ImageUpload
            currentUrl={host?.logoUrl}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            maxWidth={512}
            maxHeight={512}
            maxSizeBytes={500 * 1024}
            label="Logo"
            previewClass="h-16 w-16 rounded-lg object-contain"
            onUpload={async (file) => {
              if (!hostId) {
                toast.error("Host is not loaded yet.");
                return;
              }
              await uploadHostLogo(hostId, file);
              await refreshHost();
              toast.success("Logo uploaded.");
            }}
            onRemove={async () => {
              if (!hostId) {
                toast.error("Host is not loaded yet.");
                return;
              }
              await removeHostLogo(hostId);
              await refreshHost();
              toast.success("Logo removed.");
            }}
          />
          <ImageUpload
            currentUrl={host?.bannerUrl}
            accept="image/png,image/jpeg,image/webp"
            maxWidth={1920}
            maxHeight={600}
            maxSizeBytes={2 * 1024 * 1024}
            label="Banner"
            previewClass="h-24 w-full max-w-md rounded-lg object-cover"
            onUpload={async (file) => {
              if (!hostId) {
                toast.error("Host is not loaded yet.");
                return;
              }
              await uploadHostBanner(hostId, file);
              await refreshHost();
              toast.success("Banner uploaded.");
            }}
            onRemove={async () => {
              if (!hostId) {
                toast.error("Host is not loaded yet.");
                return;
              }
              await removeHostBanner(hostId);
              await refreshHost();
              toast.success("Banner removed.");
            }}
          />
        </div>
      </div>

      {/* Billing */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Billing</h2>
        {host?.billing?.unlocked ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-bg px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-sm font-medium text-success">
              Your account has full access — no charges apply.
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {formatMoney(getEffectivePrice(host?.billing), baseCurrency)}
              </span>
              <span className="text-sm text-muted">
                / apartment / month
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {apartmentCount} apartment{apartmentCount !== 1 ? "s" : ""} ·{" "}
              {formatMoney(getMonthlyTotal(host?.billing, apartmentCount), baseCurrency)} / month total
            </p>
          </div>
        )}
      </div>

      {/* Base Currency */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Base Currency</h2>
        <p className="mt-1 text-sm text-muted">
          All prices are stored and displayed in this currency. Guests on your
          website will be able to convert prices to their preferred currency.
        </p>
        <div className="mt-4 space-y-3">
          {AVAILABLE_CURRENCIES.map((cur) => {
            const isActive = settings.baseCurrency === cur.code;
            return (
              <label
                key={cur.code}
                className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-input"
                }`}
                onClick={() => setCurrency(cur.code)}
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
                  onChange={() => setCurrency(cur.code)}
                  className="h-4 w-4 border-input text-primary focus:ring-ring"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Languages */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Languages</h2>
        <p className="mt-1 text-sm text-muted">
          Choose which languages are available for apartment descriptions and
          amenities on your website. English is always enabled as the default.
        </p>
        <div className="mt-4 space-y-3">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isActive = settings.languages.includes(lang.code);
            const isDefault = lang.code === "en";
            return (
              <label
                key={lang.code}
                className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-input"
                } ${isDefault ? "cursor-default" : ""}`}
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
                  disabled={isDefault}
                  onChange={() => toggleLanguage(lang.code)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50"
                />
              </label>
            );
          })}
        </div>
      </div>

      <DiscardChangesModal
        open={showModal}
        onCancel={cancelDiscard}
        onDiscard={confirmDiscard}
      />
    </div>
  );
}
