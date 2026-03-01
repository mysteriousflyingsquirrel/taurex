import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchApartmentBySlug,
  createApartment,
  updateApartment,
  fetchSeasons,
  buildApartmentCalendarExportUrl,
  rotateApartmentCalendarExportToken,
  addApartmentCalendarImport,
  removeApartmentCalendarImport,
  setApartmentCalendarImportActive,
  refreshApartmentCalendarImports,
  AVAILABLE_LANGUAGES,
  currencySymbol,
  formatMoney,
  formatDate,
  type Apartment,
  type ApartmentPromotion,
  type ApartmentCalendar,
  type Season,
  type LanguageCode,
} from "@taurex/firebase";
import { useHost } from "../contexts/HostContext";
import AddressAutocomplete from "../components/AddressAutocomplete";
import Button from "../components/Button";
import DiscardChangesModal from "../components/DiscardChangesModal";
import { useToast } from "../components/Toast";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import ApartmentImageManager from "../components/ApartmentImageManager";
import DateRangePicker from "../components/DateRangePicker";
import { useAutosave } from "../hooks/useAutosave";
import { HOST_AUTOSAVE_DELAY_MS } from "../config/autosave";
import { ENABLE_APARTMENT_CALENDAR_INTEGRATION } from "../config/features";

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

function validatePromotion(promotion: ApartmentPromotion): string[] {
  const errs: string[] = [];
  if (!Number.isInteger(promotion.discountPercent) || promotion.discountPercent < 1 || promotion.discountPercent > 99) {
    errs.push("Promotion discount must be an integer between 1 and 99.");
  }
  if (!promotion.startDate) errs.push("Promotion start date is required.");
  if (!promotion.endDate) errs.push("Promotion end date is required.");
  if (promotion.startDate && promotion.endDate && promotion.startDate > promotion.endDate) {
    errs.push("Promotion start date must be before or equal to end date.");
  }
  return errs;
}

export default function ApartmentEdit() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { hostId, languages, baseCurrency } = useHost();
  const isNew = slug === "new";

  const [form, setForm] = useState<Omit<Apartment, "id">>(() => emptyForm(languages));
  const [savedForm, setSavedForm] = useState<Omit<Apartment, "id"> | null>(null);
  const [seasons, setSeasons] = useState<Record<string, Season>>({});
  const [loading, setLoading] = useState(!isNew);
  const [creating, setCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const toast = useToast();
  const [openSections, setOpenSections] = useState({
    basic: true,
    facts: true,
    images: true,
    amenities: true,
    location: false,
    booking: false,
    calendar: false,
    pricing: false,
    promotion: false,
    minStay: false,
  });

  // Amenity input state (per language)
  const [amenityInputs, setAmenityInputs] = useState<Record<string, string>>({});

  // Booking link / calendar import input
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newCalendarImportName, setNewCalendarImportName] = useState("");
  const [newCalendarImportUrl, setNewCalendarImportUrl] = useState("");
  const [refreshingCalendar, setRefreshingCalendar] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(false);

  const createCalendarDraft = useCallback((): ApartmentCalendar => {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    return {
      exportToken: token,
      imports: [],
      manualBlocks: [],
      importedBusyRanges: [],
      lastInternalUpdateAt: new Date().toISOString(),
    };
  }, []);

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
          const data = {
            ...rest,
            descriptions: descs,
            amenities: amens,
            calendar: rest.calendar ?? createCalendarDraft(),
          };
          setForm(data);
          setSavedForm(data);
        }
        setLoading(false);
      });
    }
  }, [hostId, slug, isNew, languages, createCalendarDraft]);

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

  const isDirty =
    savedForm !== null &&
    JSON.stringify(form) !== JSON.stringify(savedForm);
  const { showModal, confirmDiscard, cancelDiscard, guardedNavigate } =
    useUnsavedChangesGuard(isDirty);

  const {
    lastSavedAt: apartmentLastSavedAt,
    lastError: apartmentAutosaveError,
  } = useAutosave({
    enabled: !!hostId && !!slug && !isNew,
    isDirty,
    watch: form,
    delayMs: HOST_AUTOSAVE_DELAY_MS,
    saveFn: async (next) => {
      if (!hostId || !slug || isNew) return;
      const { slug: _slug, ...rest } = next;
      await updateApartment(hostId, slug, rest);
      setSavedForm(next);
    },
  });

  useEffect(() => {
    if (!isNew && apartmentLastSavedAt) {
      toast.success("Saving successfull");
    }
  }, [apartmentLastSavedAt, isNew, toast]);

  useEffect(() => {
    if (!isNew && apartmentAutosaveError) {
      toast.error("Saving failed");
    }
  }, [apartmentAutosaveError, isNew, toast]);

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
    if (form.promotion && (form.promotion.isActive ?? true)) {
      errs.push(...validatePromotion(form.promotion));
    }
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
      toast.success("Apartment created.");
      navigate(`/apartments/${form.slug}`, { replace: true });
    } catch {
      toast.error("Saving failed.");
    } finally {
      setCreating(false);
    }
  };

  const updatePromotionField = (patch: Partial<ApartmentPromotion>) => {
    const current: ApartmentPromotion = form.promotion ?? {
      name: "",
      discountPercent: 0,
      startDate: "",
      endDate: "",
      isActive: true,
    };
    update("promotion", { ...current, ...patch, isActive: true });
  };

  const handleResetPromotion = () => {
    update("promotion", {
      name: "",
      discountPercent: 0,
      startDate: "",
      endDate: "",
      isActive: false,
    });
  };

  const updateCalendar = useCallback(
    (calendar: ApartmentCalendar) => {
      update("calendar", {
        ...calendar,
        lastInternalUpdateAt: new Date().toISOString(),
      });
    },
    [update]
  );

  const handleAddCalendarImport = () => {
    const name = newCalendarImportName.trim();
    const url = newCalendarImportUrl.trim();
    if (!name || !url) return;
    const draft = form.calendar ?? createCalendarDraft();
    updateCalendar({
      ...draft,
      imports: [
        ...draft.imports,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          url,
          isActive: true,
          lastStatus: "pending",
        },
      ],
    });
    setNewCalendarImportName("");
    setNewCalendarImportUrl("");
  };

  const handleRefreshCalendarImports = async () => {
    if (!hostId || !slug || isNew) return;
    setRefreshingCalendar(true);
    try {
      await refreshApartmentCalendarImports(hostId, slug);
      const apt = await fetchApartmentBySlug(hostId, slug);
      if (apt) {
        const { id: _, ...rest } = apt;
        setForm(rest);
        setSavedForm(rest);
      }
      toast.success("Imports refreshed.");
    } catch {
      toast.error("Refresh failed.");
    } finally {
      setRefreshingCalendar(false);
    }
  };

  const handleRotateExportToken = async () => {
    if (!hostId || !slug || isNew) return;
    setRotatingToken(true);
    try {
      const token = await rotateApartmentCalendarExportToken(hostId, slug);
      const draft = form.calendar ?? createCalendarDraft();
      updateCalendar({
        ...draft,
        exportToken: token,
      });
      toast.success("Export token rotated.");
    } catch {
      toast.error("Token rotation failed.");
    } finally {
      setRotatingToken(false);
    }
  };

  const handleBack = () => {
    guardedNavigate("/apartments");
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Loading…</h1>
      </div>
    );
  }

  // Unique season list (deduplicate across years — use latest year per name)
  const currentYear = new Date().getFullYear();
  const yearSeasons = Object.values(seasons).filter((s) => s.year === currentYear);
  const promotionErrors =
    form.promotion && (form.promotion.isActive ?? true)
      ? validatePromotion(form.promotion)
      : [];
  const today = new Date().toISOString().slice(0, 10);
  const promotionIsExpired = !!form.promotion?.endDate && form.promotion.endDate < today;
  const promotionStatus = !form.promotion || form.promotion.isActive === false
    ? { label: "Inactive", className: "bg-surface-alt text-muted" }
    : promotionIsExpired
      ? { label: "Expired", className: "bg-warning-bg text-warning" }
      : { label: "Active", className: "bg-success-bg text-success" };

  return (
    <div className="pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={handleBack}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? "New Apartment" : `Edit: ${form.name || form.slug}`}
          </h1>
        </div>
        {isNew && (
          <Button variant="primary" loading={creating} onClick={handleCreate}>
            Create apartment
          </Button>
        )}
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-destructive-bg p-4">
          <p className="text-sm font-semibold text-destructive">
            Please fix the following:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-destructive">
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
              <label className="block text-sm font-medium text-foreground">
                Slug *
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update("slug", slugify(e.target.value))}
                disabled={!isNew}
                placeholder="e.g. wega"
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none disabled:bg-surface-alt disabled:text-muted"
              />
              {!isNew && (
                <p className="mt-1 text-xs text-muted">
                  Slug cannot be changed after creation.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Apartment Wega"
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </div>
          </div>

          {/* Descriptions per language */}
          <div className="mt-4 space-y-4">
            <p className="text-sm font-medium text-foreground">Descriptions</p>
            {languages.map((lang) => (
              <div key={lang}>
                <label className="block text-sm font-medium text-muted">
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
                  className="mt-1 block w-full resize-y rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
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
                <label className="block text-sm font-medium text-foreground">
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
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section C — Images */}
        <SectionCard
          title={`Images (${form.images.length})`}
          open={openSections.images}
          onToggle={() => toggleSection("images")}
        >
          {isNew ? (
            <p className="text-sm text-muted">
              Save the apartment first to upload images.
            </p>
          ) : (
            <ApartmentImageManager
              hostId={hostId!}
              slug={slug!}
              images={form.images}
              onImagesChange={(imgs) => {
                setForm((f) => ({ ...f, images: imgs }));
              }}
            />
          )}
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
              <label className="block text-sm font-medium text-foreground">
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
              <p className="mt-1 text-xs text-muted">
                Start typing to search. Selecting an address auto-fills
                coordinates.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground">
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
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
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
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section F — Booking Links */}
        <SectionCard
          title="Booking Links"
          open={openSections.booking}
          onToggle={() => toggleSection("booking")}
        >
          {form.bookingLinks.length === 0 ? (
            <p className="text-sm text-muted">No booking links yet.</p>
          ) : (
            <div className="space-y-2">
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
                    className="w-40 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
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
                    className="flex-1 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                  <div className="ml-auto">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        update(
                          "bookingLinks",
                          form.bookingLinks.filter((_, j) => j !== i)
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
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
              className="w-40 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
            />
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
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
            >
              + Add link
            </Button>
          </div>
        </SectionCard>

        {/* Section G — Calendar integration (iCal) */}
        <SectionCard
          title="Calendar integration (iCal)"
          open={openSections.calendar}
          onToggle={() => toggleSection("calendar")}
        >
          {form.icalUrls.length === 0 ? (
            <p className="text-sm text-muted">No imports yet.</p>
          ) : (
            <div className="space-y-2">
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
                    className="flex-1 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                  <div className="ml-auto">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        update(
                          "icalUrls",
                          form.icalUrls.filter((_, j) => j !== i)
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
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
              className="flex-1 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!newIcalUrl.trim()) return;
                update("icalUrls", [...form.icalUrls, newIcalUrl.trim()]);
                setNewIcalUrl("");
              }}
            >
              + Add import
            </Button>
          </div>
        </SectionCard>

        {/* Section G — Pricing */}
        <SectionCard
          title="Pricing"
          open={openSections.pricing}
          onToggle={() => toggleSection("pricing")}
        >
          <div>
            <label className="block text-sm font-medium text-foreground">
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
              className="mt-1 block w-48 rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              Used for days not covered by any season.
            </p>
          </div>

          {yearSeasons.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted">
              <span>No seasons configured for {currentYear}.</span>
              <Button variant="secondary" size="sm" onClick={() => navigate("/seasons")}>Create seasons</Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted">
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
                    <label className="text-sm text-foreground min-w-0 truncate">
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
                          ? `default: ${formatMoney(form.priceDefault, baseCurrency)}`
                          : currencySymbol(baseCurrency)
                      }
                      className="w-28 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Section H — Promotion */}
        <SectionCard
          title="Promotion"
          open={openSections.promotion}
          onToggle={() => toggleSection("promotion")}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${promotionStatus.className}`}
              >
                {promotionStatus.label}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetPromotion}
                disabled={!form.promotion}
              >
                Reset Promotion
              </Button>
            </div>
            <p className="text-xs text-muted">
              Promotion changes are saved automatically after {HOST_AUTOSAVE_DELAY_MS / 1000}s of inactivity.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  type="text"
                  value={form.promotion?.name ?? ""}
                  onChange={(e) => updatePromotionField({ name: e.target.value })}
                  placeholder="e.g. Winter Deal"
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Discount (%) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={
                    form.promotion?.discountPercent
                      ? String(form.promotion.discountPercent)
                      : ""
                  }
                  onChange={(e) =>
                    updatePromotionField({
                      discountPercent: e.target.value ? Number(e.target.value) : 0,
                    })
                  }
                  placeholder="e.g. 20"
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Date range *
                </label>
                <div className="mt-1">
                  <DateRangePicker
                    checkIn={form.promotion?.startDate ?? ""}
                    checkOut={form.promotion?.endDate ?? ""}
                    onCheckInChange={(value) =>
                      updatePromotionField({ startDate: value })
                    }
                    onCheckOutChange={(value) =>
                      updatePromotionField({ endDate: value })
                    }
                    placeholderFrom="Select start date"
                    placeholderTo="Select end date"
                  />
                </div>
              </div>
            </div>
            {promotionErrors.length > 0 && (
              <ul className="list-inside list-disc text-sm text-destructive">
                {promotionErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        {/* Section I — Minimum Stay */}
        <SectionCard
          title="Minimum Stay"
          open={openSections.minStay}
          onToggle={() => toggleSection("minStay")}
        >
          <div>
            <label className="block text-sm font-medium text-foreground">
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
              className="mt-1 block w-48 rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              Used for days not covered by any season.
            </p>
          </div>

          {yearSeasons.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted">
              <span>No seasons configured for {currentYear}.</span>
              <Button variant="secondary" size="sm" onClick={() => navigate("/seasons")}>Create seasons</Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted">
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
                    <label className="text-sm text-foreground min-w-0 truncate">
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
                      className="w-28 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <DiscardChangesModal
        open={showModal}
        onCancel={cancelDiscard}
        onDiscard={confirmDiscard}
      />
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
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <svg
          className={`h-5 w-5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
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
        <div className="border-t border-border px-6 py-4">{children}</div>
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
      <p className="text-sm font-medium text-foreground">
        {label} ({lang.toUpperCase()})
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {amenities.map((a, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1 text-sm text-foreground"
          >
            {a}
            <button
              onClick={() => onRemove(i)}
              className="ml-1 text-muted hover:text-foreground"
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
          className="block flex-1 rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
        />
        <button
          onClick={add}
          className="rounded-lg bg-surface-alt px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-alt"
        >
          Add
        </button>
      </div>
    </div>
  );
}
