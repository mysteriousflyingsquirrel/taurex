import { useCallback, useState, useEffect } from "react";
import {
  updateHost,
  fetchApartments,
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
import Button from "../components/Button";
import StickyFormFooter from "../components/StickyFormFooter";
import DiscardChangesModal from "../components/DiscardChangesModal";
import { useToast } from "../components/Toast";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

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
  const [saving, setSaving] = useState(false);
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

  const handleSave = useCallback(
    async () => {
      if (!hostId || !isDirty) return;
      setSaving(true);
      try {
        await updateHost(hostId, {
          languages: settings.languages,
          baseCurrency: settings.baseCurrency,
        });
        await refreshHost();
        setSavedSettings(settings);
        toast.success("Settings saved.");
      } catch {
        toast.error("Saving failed.");
      } finally {
        setSaving(false);
      }
    },
    [hostId, isDirty, settings, refreshHost, toast]
  );

  const handleCancel = useCallback(() => {
    setSettings(savedSettings);
  }, [savedSettings]);

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
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Host Info</h2>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Host ID</p>
            <p className="text-sm text-gray-900">{host?.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Name</p>
            <p className="text-sm text-gray-900">{host?.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Slug</p>
            <p className="text-sm text-gray-900">{host?.slug}</p>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
        {host?.billing?.unlocked ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">
              Your account has full access — no charges apply.
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">
                {formatMoney(getEffectivePrice(host?.billing), baseCurrency)}
              </span>
              <span className="text-sm text-gray-500">
                / apartment / month
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {apartmentCount} apartment{apartmentCount !== 1 ? "s" : ""} ·{" "}
              {formatMoney(getMonthlyTotal(host?.billing, apartmentCount), baseCurrency)} / month total
            </p>
          </div>
        )}
      </div>

      {/* Base Currency */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Base Currency</h2>
        <p className="mt-1 text-sm text-gray-500">
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
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setCurrency(cur.code)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 text-sm font-semibold text-gray-900">
                    {cur.symbol}
                  </span>
                  <span className="text-sm text-gray-700">
                    {cur.label} ({cur.code})
                  </span>
                </div>
                <input
                  type="radio"
                  name="baseCurrency"
                  checked={isActive}
                  onChange={() => setCurrency(cur.code)}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Languages */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Languages</h2>
        <p className="mt-1 text-sm text-gray-500">
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
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                } ${isDefault ? "cursor-default" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold uppercase text-gray-900">
                    {lang.code}
                  </span>
                  <span className="text-sm text-gray-700">{lang.label}</span>
                  {isDefault && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      Default
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={isDefault}
                  onChange={() => toggleLanguage(lang.code)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                />
              </label>
            );
          })}
        </div>
      </div>

      <StickyFormFooter
        dirty={isDirty}
        left={
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        }
        right={
          <Button
            variant="primary"
            loading={saving}
            disabled={!isDirty}
            onClick={handleSave}
          >
            Save settings
          </Button>
        }
      />
      <DiscardChangesModal
        open={showModal}
        onCancel={cancelDiscard}
        onDiscard={confirmDiscard}
      />
    </div>
  );
}
