import { useCallback, useState, useEffect } from "react";
import {
  updateTenant,
  fetchApartments,
  AVAILABLE_LANGUAGES,
  AVAILABLE_CURRENCIES,
  getEffectivePrice,
  getMonthlyTotal,
  type LanguageCode,
  type CurrencyCode,
} from "@taurex/firebase";
import { useTenant } from "../contexts/TenantContext";
import { useAutosave } from "../hooks/useAutosave";
import AutosaveIndicator from "../components/AutosaveIndicator";

interface SettingsData {
  languages: LanguageCode[];
  baseCurrency: CurrencyCode;
}

export default function Settings() {
  const { tenant, tenantId, languages, baseCurrency, refreshTenant } =
    useTenant();

  const [settings, setSettings] = useState<SettingsData>({
    languages,
    baseCurrency,
  });
  const [apartmentCount, setApartmentCount] = useState(0);

  // Sync when tenant data loads
  useEffect(() => {
    setSettings({ languages, baseCurrency });
  }, [languages, baseCurrency]);

  // Fetch apartment count for billing display
  useEffect(() => {
    if (!tenantId) return;
    fetchApartments(tenantId).then((apts) => setApartmentCount(apts.length));
  }, [tenantId]);

  const handleSave = useCallback(
    async (data: SettingsData) => {
      if (!tenantId) return;
      await updateTenant(tenantId, {
        languages: data.languages,
        baseCurrency: data.baseCurrency,
      });
      await refreshTenant();
    },
    [tenantId, refreshTenant]
  );

  const { saving, saved, error } = useAutosave({
    data: settings,
    onSave: handleSave,
    enabled: !!tenantId,
    delay: 1000,
  });

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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your tenant configuration.
          </p>
        </div>
        <AutosaveIndicator saving={saving} saved={saved} error={error} />
      </div>

      {/* Tenant Info */}
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Tenant Info</h2>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Tenant ID</p>
            <p className="text-sm text-gray-900">{tenant?.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Name</p>
            <p className="text-sm text-gray-900">{tenant?.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Slug</p>
            <p className="text-sm text-gray-900">{tenant?.slug}</p>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
        {tenant?.billing?.unlocked ? (
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
                CHF {getEffectivePrice(tenant?.billing)}
              </span>
              <span className="text-sm text-gray-500">
                / apartment / month
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {apartmentCount} apartment{apartmentCount !== 1 ? "s" : ""} · CHF{" "}
              {getMonthlyTotal(tenant?.billing, apartmentCount)} / month total
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
    </div>
  );
}
