import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchApartmentBySlug,
  createApartment,
  updateApartment,
  fetchSeasons,
  AVAILABLE_LANGUAGES,
  type Apartment,
  type Season,
  type LanguageCode,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";
import { useAutosave } from "../hooks/useAutosave";
import AddressAutocomplete from "../components/AddressAutocomplete";
import AutosaveIndicator from "../components/AutosaveIndicator";

const currencySymbol = (code: string) => {
  const map: Record<string, string> = { CHF: "CHF", EUR: "€", USD: "$", GBP: "£" };
  return map[code] ?? code;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const langLabel = (code: string) =>
  AVAILABLE_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();

function emptyForm(languages: LanguageCode[]): Omit<Apartment, "id"> {
  const descs: Record<string, string> = {};
  const amens: Record<string, string[]> = {};
  for (const l of languages) {
    descs[l] = "";
    amens[l] = [];
  }
  return {
    slug: "",
    name: "",
    descriptions: descs,
    images: [],
    facts: { guests: 1, bedrooms: 1, doubleBeds: 0, singleBeds: 0, bathrooms: 1, sqm: 0 },
    amenities: amens,
    location: { address: "", lat: 0, lng: 0 },
    bookingLinks: [],
    icalUrls: [],
    priceDefault: 0,
    minStayDefault: 1,
  };
}

export default function ApartmentEdit() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { hostId, languages, baseCurrency } = useHost();
  const isNew = slug === "new";

  const [form, setForm] = useState<Omit<Apartment, "id">>(() => emptyForm(languages));
  const [seasons, setSeasons] = useState<Record<string, Season>>({});
  const [loading, setLoading] = useState(!isNew);
  const [created, setCreated] = useState(!isNew); // Only allow autosave after creation
  const [creating, setCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState({
    basic: true,
    facts: true,
    images: true,
    amenities: true,
    location: false,
    booking: false,
    pricing: false,
    minStay: false,
  });

  // Amenity input state (per language)
  const [amenityInputs, setAmenityInputs] = useState<Record<string, string>>({});

  // Booking link / ical input
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newIcalUrl, setNewIcalUrl] = useState("");

  // Load data
  useEffect(() => {
    if (!hostId) return;
    // Fetch all seasons (across years) so we can show them in pricing/minStay
    fetchSeasons(hostId).then(setSeasons);
    if (!isNew && slug) {
      fetchApartmentBySlug(hostId, slug).then((apt) => {
        if (apt) {
          const { id: _, ...rest } = apt;
          // Ensure all current languages exist in descriptions & amenities
          const descs = { ...rest.descriptions };
          const amens = { ...rest.amenities };
          for (const l of languages) {
            if (descs[l] === undefined) descs[l] = "";
            if (amens[l] === undefined) amens[l] = [];
          }
          setForm({ ...rest, descriptions: descs, amenities: amens });
        }
        setLoading(false);
      });
    }
  }, [hostId, slug, isNew, languages]);

  // Sync language additions when settings change
  useEffect(() => {
    if (loading) return;
    setForm((prev) => {
      const descs = { ...prev.descriptions };
      const amens = { ...prev.amenities };
      for (const l of languages) {
        if (descs[l] === undefined) descs[l] = "";
        if (amens[l] === undefined) amens[l] = [];
      }
      return { ...prev, descriptions: descs, amenities: amens };
    });
  }, [languages, loading]);

  const update = useCallback(
    <K extends keyof Omit<Apartment, "id">>(
      key: K,
      value: Omit<Apartment, "id">[K]
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Autosave (only for existing apartments)
  const handleAutosave = useCallback(
    async (data: Omit<Apartment, "id">) => {
      if (!hostId || !slug || isNew) return;
      const { slug: _slug, ...rest } = data;
      await updateApartment(hostId, slug, rest);
    },
    [hostId, slug, isNew]
  );

  const { saving, saved, error: saveError } = useAutosave({
    data: form,
    onSave: handleAutosave,
    enabled: created && !isNew,
    delay: 1500,
  });

  // Validate mandatory fields
  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.slug) errs.push("Slug is required.");
    if (!form.name) errs.push("Name is required.");
    if (!form.facts.guests || form.facts.guests < 1) errs.push("Guests must be at least 1.");
    if (form.facts.bedrooms === undefined || form.facts.bedrooms < 0) errs.push("Bedrooms is required.");
    if (form.facts.bathrooms === undefined || form.facts.bathrooms < 0) errs.push("Bathrooms is required.");
    if (form.facts.doubleBeds === undefined) errs.push("Double beds is required.");
    if (form.facts.singleBeds === undefined) errs.push("Single beds is required.");
    if (form.facts.sqm === undefined || form.facts.sqm <= 0) errs.push("Size (m²) is required.");
    if (!form.priceDefault || form.priceDefault <= 0) errs.push("Default price is required.");
    if (!form.minStayDefault || form.minStayDefault < 1) errs.push("Default minimum stay is required.");
    return errs;
  };

  const handleCreate = async () => {
    if (!hostId) return;
    const errs = validate();
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors([]);
    setCreating(true);
    try {
      await createApartment(hostId, form);
      setCreated(true);
      navigate(`/apartments/${form.slug}`, { replace: true });
    } catch (err) {
      alert("Failed to create. " + (err instanceof Error ? err.message : ""));
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    navigate("/apartments");
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loading…</h1>
      </div>
    );
  }

  // Unique season list (deduplicate across years — use latest year per name)
  const currentYear = new Date().getFullYear();
  const yearSeasons = Object.values(seasons).filter((s) => s.year === currentYear);

  return (
    <div className="pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? "New Apartment" : `Edit: ${form.name || form.slug}`}
          </h1>
        </div>
        <AutosaveIndicator saving={saving} saved={saved} error={saveError} />
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Please fix the following:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-red-700">
            {validationErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sections */}
      <div className="mt-6 space-y-4">
        {/* Section A — Basic Info */}
        <SectionCard
          title="Basic Info"
          open={openSections.basic}
          onToggle={() => toggleSection("basic")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Slug *
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update("slug", slugify(e.target.value))}
                disabled={!isNew}
                placeholder="e.g. wega"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
              />
              {!isNew && (
                <p className="mt-1 text-xs text-gray-400">
                  Slug cannot be changed after creation.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Apartment Wega"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Descriptions per language */}
          <div className="mt-4 space-y-4">
            <p className="text-sm font-medium text-gray-700">Descriptions</p>
            {languages.map((lang) => (
              <div key={lang}>
                <label className="block text-sm font-medium text-gray-500">
                  {langLabel(lang)} ({lang.toUpperCase()})
                </label>
                <textarea
                  value={form.descriptions?.[lang] ?? ""}
                  onChange={(e) =>
                    update("descriptions", {
                      ...form.descriptions,
                      [lang]: e.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 block w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section B — Facts */}
        <SectionCard
          title="Facts"
          open={openSections.facts}
          onToggle={() => toggleSection("facts")}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([
              { key: "guests" as const, label: "Guests *", min: 1 },
              { key: "bedrooms" as const, label: "Bedrooms *", min: 0 },
              { key: "bathrooms" as const, label: "Bathrooms *", min: 0 },
              { key: "doubleBeds" as const, label: "Double Beds *", min: 0 },
              { key: "singleBeds" as const, label: "Single Beds *", min: 0 },
              { key: "sqm" as const, label: "Size (m²) *", min: 0 },
            ]).map(({ key, label, min }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <input
                  type="number"
                  min={min}
                  value={form.facts[key] ?? ""}
                  onChange={(e) =>
                    update("facts", {
                      ...form.facts,
                      [key]: e.target.value ? Number(e.target.value) : 0,
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section C — Images (placeholder) */}
        <SectionCard
          title={`Images (${form.images.length})`}
          open={openSections.images}
          onToggle={() => toggleSection("images")}
        >
          <p className="text-sm text-gray-500">
            Image upload will be available in a future update. Images can be
            managed directly in Firebase Storage.
          </p>
        </SectionCard>

        {/* Section D — Amenities per language */}
        <SectionCard
          title="Amenities"
          open={openSections.amenities}
          onToggle={() => toggleSection("amenities")}
        >
          <div className="space-y-6">
            {languages.map((lang) => (
              <AmenityList
                key={lang}
                lang={lang}
                label={langLabel(lang)}
                amenities={form.amenities?.[lang] ?? []}
                inputValue={amenityInputs[lang] ?? ""}
                onInputChange={(val) =>
                  setAmenityInputs((prev) => ({ ...prev, [lang]: val }))
                }
                onAdd={(val) => {
                  const list = form.amenities?.[lang] ?? [];
                  if (!list.includes(val)) {
                    update("amenities", {
                      ...form.amenities,
                      [lang]: [...list, val],
                    });
                  }
                  setAmenityInputs((prev) => ({ ...prev, [lang]: "" }));
                }}
                onRemove={(idx) => {
                  const list = form.amenities?.[lang] ?? [];
                  update("amenities", {
                    ...form.amenities,
                    [lang]: list.filter((_, j) => j !== idx),
                  });
                }}
              />
            ))}
          </div>
        </SectionCard>

        {/* Section E — Location */}
        <SectionCard
          title="Location"
          open={openSections.location}
          onToggle={() => toggleSection("location")}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <div className="mt-1">
                <AddressAutocomplete
                  value={form.location.address}
                  onChange={(address, lat, lng) =>
                    update("location", { address, lat, lng })
                  }
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Start typing to search. Selecting an address auto-fills
                coordinates.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.location.lat || ""}
                  onChange={(e) =>
                    update("location", {
                      ...form.location,
                      lat: Number(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.location.lng || ""}
                  onChange={(e) =>
                    update("location", {
                      ...form.location,
                      lng: Number(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section F — Booking & Availability */}
        <SectionCard
          title="Booking & Availability"
          open={openSections.booking}
          onToggle={() => toggleSection("booking")}
        >
          {/* Booking Links */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Booking Links</p>
              <button
                onClick={() => {
                  if (!newLinkLabel.trim() && !newLinkUrl.trim()) return;
                  update("bookingLinks", [
                    ...form.bookingLinks,
                    {
                      label: newLinkLabel.trim() || "Link",
                      url: newLinkUrl.trim(),
                    },
                  ]);
                  setNewLinkLabel("");
                  setNewLinkUrl("");
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                + Add Link
              </button>
            </div>
            {form.bookingLinks.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">
                No booking links yet.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {form.bookingLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...form.bookingLinks];
                        next[i] = { ...next[i], label: e.target.value };
                        update("bookingLinks", next);
                      }}
                      placeholder="Label"
                      className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => {
                        const next = [...form.bookingLinks];
                        next[i] = { ...next[i], url: e.target.value };
                        update("bookingLinks", next);
                      }}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        update(
                          "bookingLinks",
                          form.bookingLinks.filter((_, j) => j !== i)
                        )
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="Label"
                className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* iCal URLs */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">iCal URLs</p>
              <button
                onClick={() => {
                  if (!newIcalUrl.trim()) return;
                  update("icalUrls", [...form.icalUrls, newIcalUrl.trim()]);
                  setNewIcalUrl("");
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                + Add URL
              </button>
            </div>
            {form.icalUrls.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No iCal URLs yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {form.icalUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const next = [...form.icalUrls];
                        next[i] = e.target.value;
                        update("icalUrls", next);
                      }}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        update(
                          "icalUrls",
                          form.icalUrls.filter((_, j) => j !== i)
                        )
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2">
              <input
                type="text"
                value={newIcalUrl}
                onChange={(e) => setNewIcalUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!newIcalUrl.trim()) return;
                    update("icalUrls", [...form.icalUrls, newIcalUrl.trim()]);
                    setNewIcalUrl("");
                  }
                }}
                placeholder="https://..."
                className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* Section G — Pricing */}
        <SectionCard
          title="Pricing"
          open={openSections.pricing}
          onToggle={() => toggleSection("pricing")}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Default Price ({currencySymbol(baseCurrency)}/night) *
            </label>
            <input
              type="number"
              min={0}
              value={form.priceDefault || ""}
              onChange={(e) =>
                update("priceDefault", e.target.value ? Number(e.target.value) : 0)
              }
              placeholder="e.g. 120"
              className="mt-1 block w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Used for days not covered by any season.
            </p>
          </div>

          {yearSeasons.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              No seasons configured for {currentYear}.{" "}
              <a
                href="/seasons"
                className="text-indigo-600 hover:text-indigo-700"
              >
                Create seasons →
              </a>
            </p>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Override price per night for specific seasons. Leave blank to use
                the default.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {yearSeasons.map((season) => (
                  <div key={season.id} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: season.color }}
                    />
                    <label className="text-sm text-gray-700 min-w-0 truncate">
                      {season.name}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.prices?.[season.id] ?? ""}
                      onChange={(e) => {
                        const next = { ...form.prices };
                        if (e.target.value) {
                          next[season.id] = Number(e.target.value);
                        } else {
                          delete next[season.id];
                        }
                        update("prices", next);
                      }}
                      placeholder={
                        form.priceDefault
                          ? `default: ${form.priceDefault}`
                          : currencySymbol(baseCurrency)
                      }
                      className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Section H — Minimum Stay */}
        <SectionCard
          title="Minimum Stay"
          open={openSections.minStay}
          onToggle={() => toggleSection("minStay")}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Default (nights) *
            </label>
            <input
              type="number"
              min={1}
              value={form.minStayDefault || ""}
              onChange={(e) =>
                update(
                  "minStayDefault",
                  e.target.value ? Number(e.target.value) : 1
                )
              }
              placeholder="e.g. 3"
              className="mt-1 block w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Used for days not covered by any season.
            </p>
          </div>

          {yearSeasons.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              No seasons configured for {currentYear}.{" "}
              <a
                href="/seasons"
                className="text-indigo-600 hover:text-indigo-700"
              >
                Create seasons →
              </a>
            </p>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Override minimum stay (nights) for specific seasons. Leave blank
                to use the default.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {yearSeasons.map((season) => (
                  <div key={season.id} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: season.color }}
                    />
                    <label className="text-sm text-gray-700 min-w-0 truncate">
                      {season.name}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.minStay?.[season.id] ?? ""}
                      onChange={(e) => {
                        const next = { ...form.minStay };
                        if (e.target.value) {
                          next[season.id] = Number(e.target.value);
                        } else {
                          delete next[season.id];
                        }
                        update("minStay", next);
                      }}
                      placeholder={
                        form.minStayDefault
                          ? `default: ${form.minStayDefault}`
                          : "nights"
                      }
                      className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Sticky bottom bar — only for new apartment creation */}
      {isNew && (
        <div className="fixed bottom-0 left-64 right-0 border-t border-gray-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create Apartment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable collapsible section card
function SectionCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 py-4">{children}</div>
      )}
    </div>
  );
}

// Amenity list for a single language
function AmenityList({
  lang,
  label,
  amenities,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
}: {
  lang: string;
  label: string;
  amenities: string[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
}) {
  const add = () => {
    const val = inputValue.trim();
    if (val) onAdd(val);
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">
        {label} ({lang.toUpperCase()})
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {amenities.map((a, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
          >
            {a}
            <button
              onClick={() => onRemove(i)}
              className="ml-1 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add amenity…"
          className="block flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          onClick={add}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Add
        </button>
      </div>
    </div>
  );
}
