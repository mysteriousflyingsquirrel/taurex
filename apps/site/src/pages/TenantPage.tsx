import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  fetchTenantBySlug,
  fetchApartments,
  type Tenant,
  type Apartment,
} from "@taurex/firebase";
import TenantHeader from "../components/TenantHeader";
import AvailabilityBar from "../components/AvailabilityBar";
import ImageCarousel from "../components/ImageCarousel";
import ApartmentMap from "../components/ApartmentMap";
import { t, useLang, currencySymbol } from "../i18n";

export default function TenantPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Read filter state from URL params
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = parseInt(searchParams.get("guests") ?? "1", 10) || 1;
  const onlyAvailable = searchParams.get("onlyAvailable") === "1";
  const lang = useLang(searchParams, tenant?.languages ?? ["en"]);

  useEffect(() => {
    if (!tenantSlug) return;
    setLoading(true);
    setNotFound(false);

    fetchTenantBySlug(tenantSlug)
      .then(async (t) => {
        if (!t) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setTenant(t);
        const apts = await fetchApartments(t.id);
        setApartments(apts);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [tenantSlug]);

  // Filter apartments by guest count (availability filtering deferred to iCal integration)
  const filteredApartments = useMemo(() => {
    let result = apartments;
    if (guests > 1) {
      result = result.filter((a) => a.facts && a.facts.guests >= guests);
    }
    return result;
  }, [apartments, guests]);

  // URL param updaters
  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    setSearchParams(params);
  };

  const setCheckIn = (val: string) => {
    const params = new URLSearchParams(searchParams);
    if (val) params.set("checkIn", val);
    else params.delete("checkIn");
    // If check-out is before new check-in, clear it
    if (val && checkOut && val >= checkOut) params.delete("checkOut");
    setSearchParams(params);
  };

  const setCheckOut = (val: string) => updateParam("checkOut", val);
  const setGuests = (val: number) => updateParam("guests", val <= 1 ? null : String(val));
  const setOnlyAvailable = (val: boolean) => updateParam("onlyAvailable", val ? "1" : null);

  const resetFilters = () => {
    const params = new URLSearchParams();
    const langParam = searchParams.get("lang");
    if (langParam) params.set("lang", langParam);
    setSearchParams(params);
  };

  // Not found
  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="mt-4 text-xl font-semibold text-gray-700">
          {t(lang, "notFound.tenant")}
        </p>
        <Link
          to="/"
          className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t(lang, "notFound.backToHome")}
        </Link>
      </div>
    );
  }

  // Loading
  if (loading || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const currency = currencySymbol[tenant.baseCurrency] ?? tenant.baseCurrency ?? "CHF";

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantHeader tenant={tenant} basePath={`/${tenant.slug}`} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          {t(lang, "apartments.title")}
        </h1>

        {/* Availability Bar */}
        <div className="mt-4">
          <AvailabilityBar
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            onlyAvailable={onlyAvailable}
            lang={lang}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
            onGuestsChange={setGuests}
            onOnlyAvailableChange={setOnlyAvailable}
            onReset={resetFilters}
          />
        </div>

        {/* Grid */}
        {filteredApartments.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-lg text-gray-500">
              {apartments.length === 0
                ? t(lang, "apartments.empty")
                : t(lang, "apartments.emptyFiltered")}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApartments.map((apt) => (
              <ApartmentCard
                key={apt.id}
                apartment={apt}
                tenantSlug={tenant.slug}
                currency={currency}
                lang={lang}
                searchParams={searchParams}
              />
            ))}
          </div>
        )}

        {/* Map */}
        <ApartmentMap
          apartments={filteredApartments}
          tenantSlug={tenant.slug}
          searchParams={searchParams}
        />
      </main>
    </div>
  );
}

/* ─── Apartment Card ─── */

function ApartmentCard({
  apartment,
  tenantSlug,
  currency,
  lang,
  searchParams,
}: {
  apartment: Apartment;
  tenantSlug: string;
  currency: string;
  lang: string;
  searchParams: URLSearchParams;
}) {
  return (
    <Link
      to={`/${tenantSlug}/${apartment.slug}?${searchParams.toString()}`}
      className="group overflow-hidden rounded-2xl bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
    >
      {/* Image */}
      <div className="relative">
        <ImageCarousel
          images={apartment.images ?? []}
          height="h-56"
          emptyText={t(lang, "apartment.noImages")}
        />
        {/* Price badge */}
        {apartment.priceDefault > 0 && (
          <div className="absolute right-3 top-3 rounded-lg bg-gray-900/80 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            {currency} {apartment.priceDefault}{" "}
            <span className="text-xs font-normal text-gray-300">
              {t(lang, "apartment.perNight")}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
          {apartment.name}
        </h3>

        {/* Fact pills */}
        {apartment.facts && (
          <div className="mt-3 flex flex-wrap gap-2">
            <FactBadge
              label={`${apartment.facts.guests} ${t(lang, "apartment.guests")}`}
              accent
            />
            {apartment.facts.bedrooms > 0 && (
              <FactBadge
                label={`${apartment.facts.bedrooms} ${t(lang, "apartment.bedrooms")}`}
              />
            )}
            {apartment.facts.bathrooms > 0 && (
              <FactBadge
                label={`${apartment.facts.bathrooms} ${t(lang, "apartment.bathrooms")}`}
              />
            )}
            {apartment.facts.sqm > 0 && (
              <FactBadge label={`${apartment.facts.sqm} ${t(lang, "apartment.sqm")}`} />
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function FactBadge({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        accent
          ? "bg-indigo-50 text-indigo-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}
    </span>
  );
}
