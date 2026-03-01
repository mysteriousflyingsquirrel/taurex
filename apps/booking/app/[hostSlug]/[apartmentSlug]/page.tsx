"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import "../../../lib/firebase";
import {
  createBookingRequest,
  fetchHostBySlug,
  fetchApartmentBySlug,
  fetchApartments,
  fetchSeasons,
  formatMoney,
  formatDate,
  type Host,
  type Apartment,
  type CurrencyCode,
  type Season,
} from "@taurex/firebase";
import HostHeader from "../../../components/HostHeader";
import ImageCarousel from "../../../components/ImageCarousel";
import Map from "../../../components/Map";
import DateRangePicker from "../../../components/DateRangePicker";
import { t, getLang } from "../../../lib/i18n";

export default function ApartmentPage() {
  const { hostSlug, apartmentSlug } = useParams<{ hostSlug: string; apartmentSlug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [host, setHost] = useState<Host | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [otherApartments, setOtherApartments] = useState<Apartment[]>([]);
  const [seasons, setSeasons] = useState<Record<string, Season>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState<"host" | "apartment" | null>(null);

  const lang = getLang(searchParams.get("lang"), host?.languages ?? ["en"]);
  const [selectedCheckIn, setSelectedCheckIn] = useState(searchParams.get("checkIn") ?? "");
  const [selectedCheckOut, setSelectedCheckOut] = useState(searchParams.get("checkOut") ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedCheckIn(searchParams.get("checkIn") ?? "");
    setSelectedCheckOut(searchParams.get("checkOut") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!hostSlug || !apartmentSlug) return;
    setLoading(true);
    setNotFound(null);
    fetchHostBySlug(hostSlug)
      .then(async (h) => {
        if (!h) { setNotFound("host"); setLoading(false); return; }
        setHost(h);
        const [apt, allApts, seasonMap] = await Promise.all([
          fetchApartmentBySlug(h.id, apartmentSlug),
          fetchApartments(h.id),
          fetchSeasons(h.id),
        ]);
        if (!apt) { setNotFound("apartment"); setLoading(false); return; }
        setApartment(apt);
        setOtherApartments(allApts.filter((a) => a.slug !== apartmentSlug));
        setSeasons(seasonMap);
        setLoading(false);
      })
      .catch(() => { setNotFound("host"); setLoading(false); });
  }, [hostSlug, apartmentSlug]);

  useEffect(() => {
    if (!host) return;
    document.title = apartment ? `${apartment.name} – ${host.name}` : host.name;
    const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (host.logoUrl) {
      const link = existing ?? document.createElement("link");
      link.setAttribute("rel", "icon");
      link.setAttribute("href", host.logoUrl);
      if (!existing) document.head.appendChild(link);
    } else if (existing) {
      existing.remove();
    }
  }, [host, apartment]);

  const unavailableRanges = useMemo(() => {
    const calendar = apartment?.calendar;
    if (!calendar) return [];
    return [
      ...(calendar.manualBlocks ?? []),
      ...(calendar.importedBusyRanges ?? []),
      ...(calendar.conflicts ?? [])
        .filter((item) => item.status !== "resolved")
        .map((item) => ({ startDate: item.startDate, endDate: item.endDate })),
    ];
  }, [apartment]);

  if (notFound === "host") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-6xl font-bold text-muted">404</h1>
        <p className="mt-4 text-xl font-semibold text-foreground">{t(lang, "notFound.host")}</p>
        <a href="https://taurex.one" className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover">{t(lang, "notFound.backToHome")}</a>
      </div>
    );
  }

  if (notFound === "apartment") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-6xl font-bold text-muted">404</h1>
        <p className="mt-4 text-xl font-semibold text-foreground">{t(lang, "notFound.apartment")}</p>
        <Link href={`/${hostSlug}?${searchParams.toString()}`} className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover">{t(lang, "notFound.backToHost")}</Link>
      </div>
    );
  }

  if (loading || !host || !apartment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const cur = (host.baseCurrency ?? "CHF") as CurrencyCode;
  const description = apartment.descriptions?.[lang] ?? apartment.descriptions?.en ?? "";
  const amenities = apartment.amenities?.[lang] ?? apartment.amenities?.en ?? [];
  const pricingDate = selectedCheckIn || new Date().toISOString().slice(0, 10);

  const isDateInRange = (date: string, start: string, end: string) =>
    !!date && !!start && !!end && date >= start && date <= end;

  const getEffectiveNightlyPrice = (apt: Apartment, date: string): number => {
    for (const season of Object.values(seasons)) {
      const matches = season.dateRanges?.some((r) => isDateInRange(date, r.start, r.end));
      if (matches) {
        const seasonalPrice = apt.prices?.[season.id];
        if (typeof seasonalPrice === "number" && seasonalPrice > 0) return seasonalPrice;
      }
    }
    return apt.priceDefault;
  };

  const getPromotionPrice = (apt: Apartment, date: string) => {
    const basePrice = getEffectiveNightlyPrice(apt, date);
    const promotion = apt.promotion;
    const active =
      !!promotion &&
      !!promotion.endDate &&
      date <= promotion.endDate &&
      promotion.discountPercent >= 1 &&
      promotion.discountPercent <= 99;
    if (!active || !promotion) {
      return { active: false as const, basePrice, discountedPrice: basePrice };
    }
    const discountedPrice = Math.round(basePrice * (1 - promotion.discountPercent / 100) * 100) / 100;
    return { active: true as const, basePrice, discountedPrice, promotion };
  };
  const promo = getPromotionPrice(apartment, pricingDate);

  function addDays(dateStr: string, days: number) {
    const value = new Date(`${dateStr}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
    return !(aEnd < bStart || bEnd < aStart);
  }

  function updateDateParam(
    key: "checkIn" | "checkOut",
    value: string,
    extraMutator?: (params: URLSearchParams) => void
  ) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    extraMutator?.(params);
    router.replace(`/${hostSlug}/${apartmentSlug}?${params.toString()}`, { scroll: false });
  }

  function onCheckInChange(date: string) {
    setSelectedCheckIn(date);
    updateDateParam("checkIn", date, (params) => {
      if (selectedCheckOut && date >= selectedCheckOut) {
        params.delete("checkOut");
      }
    });
    if (selectedCheckOut && date >= selectedCheckOut) {
      setSelectedCheckOut("");
    }
  }

  function onCheckOutChange(date: string) {
    setSelectedCheckOut(date);
    updateDateParam("checkOut", date);
  }

  function isUnavailableDate(day: string) {
    return unavailableRanges.some((item) =>
      day >= item.startDate && day <= item.endDate
    );
  }

  function getAvailabilityDayState(day: string): "available" | "unavailable" | "default" {
    if (isUnavailableDate(day)) return "unavailable";
    return "available";
  }

  function getEffectiveMinStay(date: string) {
    if (!apartment) return 1;
    for (const season of Object.values(seasons)) {
      const matches = season.dateRanges?.some((r) => isDateInRange(date, r.start, r.end));
      if (matches) {
        const seasonMinStay = apartment.minStay?.[season.id];
        if (typeof seasonMinStay === "number" && seasonMinStay >= 1) return seasonMinStay;
      }
    }
    return apartment.minStayDefault ?? 1;
  }

  const hasDates = !!selectedCheckIn && !!selectedCheckOut && selectedCheckOut > selectedCheckIn;
  const nightsCount = hasDates
    ? Math.max(
        0,
        Math.round(
          (new Date(`${selectedCheckOut}T00:00:00Z`).getTime() -
            new Date(`${selectedCheckIn}T00:00:00Z`).getTime()) /
            86400000
        )
      )
    : 0;
  const effectiveMinStay = selectedCheckIn ? getEffectiveMinStay(selectedCheckIn) : apartment.minStayDefault ?? 1;
  const stayEnd = hasDates ? addDays(selectedCheckOut, -1) : "";
  const overlapsUnavailable = hasDates
    ? unavailableRanges.some((item) =>
        rangesOverlap(selectedCheckIn, stayEnd, item.startDate, item.endDate)
      )
    : false;
  const meetsMinStay = nightsCount >= effectiveMinStay;
  const canRequest = hasDates && !overlapsUnavailable && meetsMinStay;
  const approxTotal = nightsCount > 0 ? nightsCount * promo.discountedPrice : 0;

  async function handleSubmitBookingRequest() {
    if (!canRequest || !host || !apartment) return;
    if (!guestName.trim() || !guestEmail.trim()) {
      setSubmitError(t(lang, "apartment.requestIdentityRequired"));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await createBookingRequest({
        hostId: host.id,
        apartmentSlug: apartment.slug,
        checkIn: selectedCheckIn,
        checkOut: selectedCheckOut,
        guestCount,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestMessage: guestMessage.trim(),
        approxTotal,
      });
      setConfirmOpen(false);
      setSubmitSuccess(t(lang, "apartment.requestSuccess"));
      setGuestMessage("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t(lang, "apartment.requestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const facts: { label: string; value: string | number }[] = [];
  if (apartment.facts) {
    facts.push({ label: t(lang, "apartment.guests"), value: apartment.facts.guests });
    facts.push({ label: t(lang, "apartment.bedrooms"), value: apartment.facts.bedrooms });
    if (apartment.facts.doubleBeds > 0) facts.push({ label: t(lang, "apartment.doubleBeds"), value: apartment.facts.doubleBeds });
    if (apartment.facts.singleBeds > 0) facts.push({ label: t(lang, "apartment.singleBeds"), value: apartment.facts.singleBeds });
    facts.push({ label: t(lang, "apartment.bathrooms"), value: apartment.facts.bathrooms });
    if (apartment.facts.sqm > 0) facts.push({ label: t(lang, "apartment.sqm"), value: apartment.facts.sqm });
  }

  return (
    <div className="min-h-screen bg-background">
      <HostHeader host={host} basePath={`/${host.slug}`} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href={`/${host.slug}?${searchParams.toString()}`} className="hover:text-primary">{host.name}</Link>
          <span>›</span>
          <span className="text-foreground">{apartment.name}</span>
        </nav>
        <h1 className="mt-6 text-3xl font-bold text-foreground">{apartment.name}</h1>
        {facts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {facts.map((fact, i) => (<div key={i} className="rounded-lg bg-surface px-4 py-2.5 text-sm text-foreground"><span className="font-medium">{fact.value}</span> {fact.label}</div>))}
          </div>
        )}
        <div className="relative mt-6">
          <ImageCarousel images={apartment.images ?? []} height="h-64 md:h-80 lg:h-[500px]" emptyText={t(lang, "apartment.noImages")} />
          {promo.discountedPrice > 0 && (
            <div className="absolute left-4 top-4 z-10 rounded-lg bg-primary px-4 py-2 text-primary-fg shadow-lg">
              {promo.active ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-fg/85">
                    {promo.promotion.name || t(lang, "apartment.promoActive")}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-75 line-through">
                      {formatMoney(promo.basePrice, cur)}
                    </span>
                    <span className="text-lg font-bold">
                      {formatMoney(promo.discountedPrice, cur)}
                    </span>
                  </div>
                  <p className="text-xs opacity-85">
                    {t(lang, "apartment.promoPeriod", {
                      start: formatDate(promo.promotion.startDate),
                      end: formatDate(promo.promotion.endDate),
                    })}
                  </p>
                </div>
              ) : (
                <span className="text-lg font-bold">{formatMoney(promo.basePrice, cur)}</span>
              )}
            </div>
          )}
        </div>
        {description && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">{t(lang, "apartment.description")}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{description}</p>
          </div>
        )}
        {amenities.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">{t(lang, "apartment.amenities")}</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {amenities.map((amenity, i) => (<div key={i} className="rounded-lg bg-surface px-4 py-2.5 text-sm text-foreground">{amenity}</div>))}
            </div>
          </div>
        )}
        {apartment.location?.lat && apartment.location?.lng && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">{t(lang, "apartment.location")}</h2>
            {apartment.location.address && (
              <p className="mt-2 text-sm text-muted">{apartment.location.address}</p>
            )}
            <div className="mt-3">
              <Map
                pins={[{ lat: apartment.location.lat, lng: apartment.location.lng, label: apartment.name }]}
                zoom={14}
                className="h-72 w-full md:h-80"
              />
            </div>
          </div>
        )}
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="text-lg font-semibold text-foreground">{t(lang, "apartment.availability")}</h2>
            <DateRangePicker
              checkIn={selectedCheckIn}
              checkOut={selectedCheckOut}
              onCheckInChange={onCheckInChange}
              onCheckOutChange={onCheckOutChange}
              isDateDisabled={isUnavailableDate}
              getDayState={getAvailabilityDayState}
              inline
            />
            {hasDates && overlapsUnavailable && (
              <p className="mt-2 text-sm text-destructive">{t(lang, "apartment.unavailableRange")}</p>
            )}
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-foreground">{t(lang, "apartment.booking")}</h2>
            <div className="mt-3 rounded-2xl border border-border bg-surface p-6">
              {submitSuccess && (
                <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  {submitSuccess}
                </div>
              )}
              {hasDates ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t(lang, "apartment.selectedDates")}</p>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <div className="rounded-lg bg-surface-alt px-3 py-2"><span className="text-xs text-muted">{t(lang, "filter.checkIn")}</span><p className="font-medium">{formatDate(selectedCheckIn)}</p></div>
                    <span className="text-muted">→</span>
                    <div className="rounded-lg bg-surface-alt px-3 py-2"><span className="text-xs text-muted">{t(lang, "filter.checkOut")}</span><p className="font-medium">{formatDate(selectedCheckOut)}</p></div>
                  </div>
                  {nightsCount > 0 && <p className="text-sm text-muted">{t(lang, "apartment.nightsSelected", { nights: nightsCount })}</p>}
                </div>
              ) : (
                <div className="rounded-lg bg-surface-alt px-4 py-3"><p className="text-sm italic text-muted">{t(lang, "apartment.selectDatesFirst")}</p></div>
              )}
              {hasDates && nightsCount > 0 && promo.discountedPrice > 0 && (
                <div className="mt-4 rounded-lg bg-surface-alt px-4 py-3">
                  <p className="text-lg font-semibold text-foreground">{t(lang, "apartment.approxTotal", { total: formatMoney(nightsCount * promo.discountedPrice, cur) })}</p>
                  <p className="mt-1 text-xs text-muted">{t(lang, "apartment.approxDisclaimer")}</p>
                </div>
              )}
              <div className="mt-4 flex items-start gap-3 rounded-lg bg-accent px-4 py-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-fg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="text-sm font-semibold text-accent-fg">{t(lang, "apartment.bestPriceTitle")}</p>
                  <p className="mt-0.5 text-xs text-accent-fg/80">{t(lang, "apartment.bestPriceDesc")}</p>
                </div>
              </div>
              {effectiveMinStay > 1 && (
                <div className="mt-4 border-t border-border pt-4"><p className="text-center text-sm text-muted">{t(lang, "apartment.minStay", { nights: effectiveMinStay })}</p></div>
              )}
              {hasDates && !meetsMinStay && (
                <p className="mt-3 text-sm text-destructive">
                  {t(lang, "apartment.minStayError", { nights: effectiveMinStay })}
                </p>
              )}
              <div className="mt-6 space-y-3">
                <button
                  disabled={!canRequest || submitting}
                  onClick={() => {
                    setSubmitError("");
                    setConfirmOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t(lang, "apartment.directBooking")}
                </button>
                {apartment.bookingLinks?.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary">
                    {link.label}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        {otherApartments.length > 0 && (
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-lg font-semibold text-foreground">{t(lang, "apartment.moreApartments")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {otherApartments.map((apt) => (
                <Link key={apt.slug} href={`/${hostSlug}/${apt.slug}?${searchParams.toString()}`} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:bg-accent hover:text-accent-fg">{apt.name}</Link>
              ))}
            </div>
          </div>
        )}
      </main>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">{t(lang, "apartment.confirmTitle")}</h3>
            <p className="mt-1 text-sm text-muted">
              {formatDate(selectedCheckIn)} - {formatDate(selectedCheckOut)} · {nightsCount} {t(lang, "apartment.nights")}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {t(lang, "apartment.approxTotal", { total: formatMoney(approxTotal, cur) })}
            </p>

            <div className="mt-4 grid gap-3">
              <input
                type="text"
                placeholder={t(lang, "apartment.guestName")}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
              />
              <input
                type="email"
                placeholder={t(lang, "apartment.guestEmail")}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
              />
              <input
                type="number"
                min={1}
                max={apartment.facts?.guests || 20}
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value || 1)))}
                className="rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
              />
              <textarea
                placeholder={t(lang, "apartment.guestMessage")}
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
                rows={3}
                className="rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </div>

            {submitError && <p className="mt-3 text-sm text-destructive">{submitError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt"
              >
                {t(lang, "apartment.cancel")}
              </button>
              <button
                onClick={handleSubmitBookingRequest}
                disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
              >
                {submitting ? t(lang, "apartment.submitting") : t(lang, "apartment.submitRequest")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
