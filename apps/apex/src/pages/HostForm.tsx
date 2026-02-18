import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchHostBySlug,
  createHost,
  updateHost,
  AVAILABLE_LANGUAGES,
  AVAILABLE_CURRENCIES,
  type LanguageCode,
  type CurrencyCode,
} from "@taurex/firebase";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function HostForm() {
  const { hostId } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const isEdit = !!hostId;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [languages, setLanguages] = useState<LanguageCode[]>(["en"]);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("CHF");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load existing host when editing
  useEffect(() => {
    if (!hostId) return;
    fetchHostBySlug(hostId).then((t) => {
      if (!t) {
        setError("Host not found.");
        setLoading(false);
        return;
      }
      setName(t.name);
      setSlug(t.slug);
      setLanguages(t.languages);
      setBaseCurrency(t.baseCurrency);
      setLoading(false);
    });
  }, [hostId]);

  const toggleLanguage = (code: LanguageCode) => {
    setLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((l) => l !== code)
        : [...prev, code]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const finalSlug = isEdit ? slug : slugify(slug || name);
    if (!finalSlug) {
      setError("Slug is required.");
      return;
    }
    if (languages.length === 0) {
      setError("At least one language is required.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateHost(hostId, {
          name: name.trim(),
          languages,
          baseCurrency,
        });
      } else {
        // Check if slug already exists
        const existing = await fetchHostBySlug(finalSlug);
        if (existing) {
          setError(`A host with slug "${finalSlug}" already exists.`);
          setSaving(false);
          return;
        }
        await createHost({
          name: name.trim(),
          slug: finalSlug,
          languages,
          baseCurrency,
        });
      }
      navigate("/hosts");
    } catch {
      setError("Failed to save host. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "Edit Host" : "Create Host"}
        </h1>
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? "Edit Host" : "Create Host"}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        {isEdit
          ? `Editing host: ${slug}`
          : "Set up a new host on the platform"}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 max-w-2xl space-y-6 rounded-xl border border-gray-200 bg-white p-6"
      >
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!isEdit && !slug) {
                // Auto-generate slug from name while user hasn't manually edited it
              }
            }}
            placeholder="e.g. Mountain Retreats"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Slug *
          </label>
          {isEdit ? (
            <div className="mt-1">
              <code className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-600">
                {slug}
              </code>
              <p className="mt-1 text-xs text-gray-400">
                Slug cannot be changed after creation.
              </p>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder={slugify(name) || "e.g. mountain-retreats"}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">
                Public URL: taurex.one/{slug || slugify(name) || "…"}
              </p>
            </>
          )}
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Languages *
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVAILABLE_LANGUAGES.map((lang) => {
              const active = languages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Base Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Base Currency *
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVAILABLE_CURRENCIES.map((cur) => (
              <button
                key={cur.code}
                type="button"
                onClick={() => setBaseCurrency(cur.code)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                  baseCurrency === cur.code
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {cur.symbol} {cur.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-gray-100 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : isEdit
                ? "Update Host"
                : "Create Host"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/hosts")}
            className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
