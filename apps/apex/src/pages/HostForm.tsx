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
import Button from "../components/Button";
import StickyFormFooter from "../components/StickyFormFooter";
import DiscardChangesModal from "../components/DiscardChangesModal";
import { useDirtyForm } from "../hooks/useDirtyForm";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

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
  const [savedForm, setSavedForm] = useState<{
    name: string;
    slug: string;
    languages: LanguageCode[];
    baseCurrency: CurrencyCode;
  } | null>(null);

  const currentForm = { name, slug, languages, baseCurrency };
  const initialForm = { name: "", slug: "", languages: ["en"] as LanguageCode[], baseCurrency: "CHF" as CurrencyCode };
  const isDirty = useDirtyForm(currentForm, savedForm ?? initialForm);
  const { showModal, confirmDiscard, cancelDiscard, guardedNavigate } =
    useUnsavedChangesGuard(isDirty);

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
      setSavedForm({ name: t.name, slug: t.slug, languages: t.languages, baseCurrency: t.baseCurrency });
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
        setSavedForm({ name: name.trim(), slug, languages, baseCurrency });
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
      setSavedForm({ name: name.trim(), slug: finalSlug, languages, baseCurrency });
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
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Edit Host" : "Create Host"}
        </h1>
        <p className="mt-4 text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <DiscardChangesModal
        open={showModal}
        onCancel={cancelDiscard}
        onDiscard={confirmDiscard}
      />

      <h1 className="text-2xl font-bold text-foreground">
        {isEdit ? "Edit Host" : "Create Host"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isEdit
          ? `Editing host: ${slug}`
          : "Set up a new host on the platform"}
      </p>

      <form
        id="host-form"
        onSubmit={handleSubmit}
        className="mt-8 max-w-2xl space-y-6 rounded-xl border border-border bg-surface p-6"
      >
        {error && (
          <div className="rounded-lg bg-destructive-bg px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-foreground">
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
            className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-foreground">
            Slug *
          </label>
          {isEdit ? (
            <div className="mt-1">
              <code className="rounded bg-surface-alt px-3 py-2 text-sm text-muted">
                {slug}
              </code>
              <p className="mt-1 text-xs text-muted">
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
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted">
                Public URL: taurex.one/{slug || slugify(name) || "…"}
              </p>
            </>
          )}
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-foreground">
            Languages *
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVAILABLE_LANGUAGES.map((lang) => {
              const active = languages.includes(lang.code);
              return (
                <Button
                  key={lang.code}
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                >
                  {lang.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Base Currency */}
        <div>
          <label className="block text-sm font-medium text-foreground">
            Base Currency *
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVAILABLE_CURRENCIES.map((cur) => (
              <Button
                key={cur.code}
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setBaseCurrency(cur.code)}
              >
                {cur.symbol} {cur.label}
              </Button>
            ))}
          </div>
        </div>

      </form>

      <StickyFormFooter
        dirty={isDirty}
        left={null}
        right={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => (isDirty ? guardedNavigate("/hosts") : navigate("/hosts"))}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="host-form"
              disabled={saving}
              loading={saving}
            >
              {saving ? "Saving…" : isEdit ? "Update Host" : "Create Host"}
            </Button>
          </>
        }
      />
    </div>
  );
}
