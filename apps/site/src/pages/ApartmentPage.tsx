import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  fetchTenantBySlug,
  fetchApartmentBySlug,
  fetchApartments,
  type Tenant,
  type Apartment,
} from "@taurex/firebase";
import TenantHeader from "../components/TenantHeader";
import ImageCarousel from "../components/ImageCarousel";
import { t, useLang, currencySymbol, formatDate } from "../i18n";
import LocationMap from "../components/LocationMap";

export default function ApartmentPage() {
  const { tenantSlug, apartmentSlug } =
    useParams<{ tenantSlug: string; apartmentSlug: string }>();
  const [searchParams] = useSearchParams();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [otherApartments, setOtherApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState<"tenant" | "apartment" | null>(null);

  const lang = useLang(searchParams, tenant?.languages ?? ["en"]);

  // Read dates from URL (carried over from tenant page availability bar)
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const hasDates = checkIn && checkOut;

  useEffect(() => {
    if (!tenantSlug || !apartmentSlug) return;
    setLoading(true);
    setNotFound(null);

    fetchTenantBySlug(tenantSlug)
      .then(async (t) => {
        if (!t) {
          setNotFound("tenant");
          setLoading(false);
          return;
        }
        setTenant(t);

        const [apt, allApts] = await Promise.all([
          fetchApartmentBySlug(t.id, apartmentSlug),
          fetchApartments(t.id),
        ]);

        if (!apt) {
          setNotFound("apartment");
          setLoading(false);
          return;
        }

        setApartment(apt);
        setOtherApartments(allApts.filter((a) => a.slug !== apartmentSlug));
        setLoading(false);
      })
      .catch(() => {
        setNotFound("tenant");
        setLoading(false);
      });
  }, [tenantSlug, apartmentSlug]);

  // Not found states
  if (notFound === "tenant") {
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

  if (notFound === "apartment") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="mt-4 text-xl font-semibold text-gray-700">
          {t(lang, "notFound.apartment")}
        </p>
        <Link
          to={`/${tenantSlug}?${searchParams.toString()}`}
          className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t(lang, "notFound.backToTenant")}
        </Link>
      </div>
    );
  }

  if (loading || !tenant || !apartment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const currency =
    currencySymbol[tenant.baseCurrency] ?? tenant.baseCurrency ?? "CHF";

  // Get description in current language, fallback to en
  const description =
    apartment.descriptions?.[lang] ?? apartment.descriptions?.en ?? "";

  // Get amenities in current language, fallback to en
  const amenities =
    apartment.amenities?.[lang] ?? apartment.amenities?.en ?? [];

  // Calculate minimum stay
  const minStay = apartment.minStayDefault ?? 1;

  // Calculate nights if dates are selected
  const nightsCount =
    hasDates
      ? Math.max(
          0,
          Math.round(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              86400000
          )
        )
      : 0;

  // Build fact items
  const facts: { label: string; value: string | number }[] = [];
  if (apartment.facts) {
    facts.push({ label: t(lang, "apartment.guests"), value: apartment.facts.guests });
    facts.push({ label: t(lang, "apartment.bedrooms"), value: apartment.facts.bedrooms });
    if (apartment.facts.doubleBeds > 0)
      facts.push({ label: t(lang, "apartment.doubleBeds"), value: apartment.facts.doubleBeds });
    if (apartment.facts.singleBeds > 0)
      facts.push({ label: t(lang, "apartment.singleBeds"), value: apartment.facts.singleBeds });
    facts.push({ label: t(lang, "apartment.bathrooms"), value: apartment.facts.bathrooms });
    if (apartment.facts.sqm > 0)
      facts.push({ label: t(lang, "apartment.sqm"), value: apartment.facts.sqm });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantHeader tenant={tenant} basePath={`/${tenant.slug}`} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            to={`/${tenant.slug}?${searchParams.toString()}`}
            className="hover:text-indigo-600"
          >
            {tenant.name}
          </Link>
          <span>›</span>
          <span className="text-gray-900">{apartment.name}</span>
        </nav>

        {/* Title */}
        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          {apartment.name}
        </h1>

        {/* Facts (between title and image, no heading, same style as amenities) */}
        {facts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {facts.map((fact, i) => (
              <div
                key={i}
                className="rounded-lg bg-white px-4 py-2.5 text-sm text-gray-700"
              >
                <span className="font-medium">{fact.value}</span> {fact.label}
              </div>
            ))}
          </div>
        )}

        {/* Image Gallery with price overlay */}
        <div className="relative mt-6">
          <ImageCarousel
            images={apartment.images ?? []}
            height="h-64 md:h-80 lg:h-[500px]"
            emptyText={t(lang, "apartment.noImages")}
          />
          {apartment.priceDefault > 0 && (
            <div className="absolute left-4 top-4 z-10 rounded-lg bg-indigo-600 px-4 py-2 text-white shadow-lg">
              <span className="text-lg font-bold">
                {currency} {apartment.priceDefault}
              </span>
              <span className="ml-1 text-sm font-normal opacity-80">
                {t(lang, "apartment.perNight")}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              {t(lang, "apartment.description")}
            </h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-600">
              {description}
            </p>
          </div>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              {t(lang, "apartment.amenities")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {amenities.map((amenity, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-white px-4 py-2.5 text-sm text-gray-700"
                >
                  {amenity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {(apartment.location?.address || (apartment.location?.lat && apartment.location?.lng)) && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              {t(lang, "apartment.location")}
            </h2>
            {apartment.location.address && (
              <div className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-700">
                {apartment.location.address}
              </div>
            )}
            {apartment.location.lat && apartment.location.lng && (
              <LocationMap
                lat={apartment.location.lat}
                lng={apartment.location.lng}
                label={apartment.name}
              />
            )}
          </div>
        )}

        {/* Availability + Booking */}
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Availability (3/5) */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {t(lang, "apartment.availability")}
            </h2>
            <div className="mt-3 flex h-48 items-center justify-center rounded-2xl border border-gray-200 bg-white">
              <p className="text-gray-400">
                {t(lang, "apartment.availabilityComingSoon")}
              </p>
            </div>
          </div>

          {/* Booking (2/5) */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {t(lang, "apartment.booking")}
            </h2>
            <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-6">
              {/* Selected dates */}
              {hasDates ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    {t(lang, "apartment.selectedDates")}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <span className="text-xs text-gray-500">
                        {t(lang, "filter.checkIn")}
                      </span>
                      <p className="font-medium">{formatDate(checkIn)}</p>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <span className="text-xs text-gray-500">
                        {t(lang, "filter.checkOut")}
                      </span>
                      <p className="font-medium">{formatDate(checkOut)}</p>
                    </div>
                  </div>
                  {nightsCount > 0 && (
                    <p className="text-sm text-gray-500">
                      {t(lang, "apartment.nightsSelected", {
                        nights: nightsCount,
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-sm italic text-gray-500">
                    {t(lang, "apartment.selectDatesFirst")}
                  </p>
                </div>
              )}

              {/* Approx price for stay */}
              {hasDates && nightsCount > 0 && apartment.priceDefault > 0 && (
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-lg font-semibold text-gray-900">
                    {t(lang, "apartment.approxTotal", {
                      currency,
                      total: (nightsCount * apartment.priceDefault).toLocaleString(),
                    })}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t(lang, "apartment.approxDisclaimer")}
                  </p>
                </div>
              )}

              {/* Best price guarantee */}
              <div className="mt-4 flex items-start gap-3 rounded-lg bg-indigo-50 px-4 py-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-indigo-700">
                    {t(lang, "apartment.bestPriceTitle")}
                  </p>
                  <p className="mt-0.5 text-xs text-indigo-600/80">
                    {t(lang, "apartment.bestPriceDesc")}
                  </p>
                </div>
              </div>

              {/* Min stay */}
              {minStay > 1 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-center text-sm text-gray-500">
                    {t(lang, "apartment.minStay", { nights: minStay })}
                  </p>
                </div>
              )}

              {/* Booking buttons */}
              <div className="mt-6 space-y-3">
                {/* Direct booking button */}
                <button
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
                >
                  {t(lang, "apartment.directBooking")}
                </button>

                {/* External booking links */}
                {apartment.bookingLinks &&
                  apartment.bookingLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-indigo-500 hover:text-indigo-600"
                    >
                      {link.label}
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                        />
                      </svg>
                    </a>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* More apartments */}
        {otherApartments.length > 0 && (
          <div className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              {t(lang, "apartment.moreApartments")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {otherApartments.map((apt) => (
                <Link
                  key={apt.slug}
                  to={`/${tenantSlug}/${apt.slug}?${searchParams.toString()}`}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  {apt.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-gray-400">
            Powered by{" "}
            <Link
              to="/"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Taurex
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
