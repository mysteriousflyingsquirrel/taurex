"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import "../../lib/firebase";
import {
  fetchHostBySlug,
  fetchApartments,
  fetchSeasons,
  formatMoney,
  formatDate,
  type Host,
  type Apartment,
  type CurrencyCode,
  type Season,
} from "@taurex/firebase";
import HostHeader from "../../components/HostHeader";
import AvailabilityBar from "../../components/AvailabilityBar";
import ImageCarousel from "../../components/ImageCarousel";
import Map, { type MapPin } from "../../components/Map";
import { t, getLang } from "../../lib/i18n";

export default function HostPage() {
  const params = useParams<{ hostSlug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hostSlug = params.hostSlug;

  const [host, setHost] = useState<Host | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [seasons, setSeasons] = useState<Record<string, Season>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = parseInt(searchParams.get("guests") ?? "1", 10) || 1;
  const onlyAvailable = searchParams.get("onlyAvailable") === "1";
  const lang = getLang(searchParams.get("lang"), host?.languages ?? ["en"]);
  const hasDateRange = !!checkIn && !!checkOut && checkOut > checkIn;

  useEffect(() => {
    if (!hostSlug) return;
    setLoading(true);
    setNotFound(false);
    fetchHostBySlug(hostSlug)
      .then(async (h) => {
        if (!h) { setNotFound(true); setLoading(false); return; }
        setHost(h);
        const [apts, seasonMap] = await Promise.all([
          fetchApartments(h.id),
          fetchSeasons(h.id),
        ]);
        setApartments(apts);
        setSeasons(seasonMap);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [hostSlug]);

  useEffect(() => {
    if (!host) return;
    document.title = host.name;
    const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (host.logoUrl) {
      const link = existing ?? document.createElement("link");
      link.setAttribute("rel", "icon");
      link.setAttribute("href", host.logoUrl);
      if (!existing) document.head.appendChild(link);
    } else if (existing) {
      existing.remove();
    }
  }, [host]);

  const filteredApartments = useMemo(() => {
    let result = apartments;
    if (guests > 1) result = result.filter((a) => a.facts && a.facts.guests >= guests);
    if (onlyAvailable && hasDateRange) {
      result = result.filter((apt) => {
        const stayEnd = addDays(checkOut, -1);
        if (stayEnd < checkIn) return false;
        const calendar = apt.calendar;
        const unavailableRanges = [
          ...(calendar?.manualBlocks ?? []),
          ...(calendar?.importedBusyRanges ?? []),
        ];
        const hasBlockedDates = unavailableRanges.some((item) =>
          rangesOverlap(checkIn, stayEnd, item.startDate, item.endDate)
        );
        if (hasBlockedDates) return false;
        const hasConflicts = (calendar?.conflicts ?? []).some(
          (item) =>
            item.status !== "resolved" &&
            rangesOverlap(checkIn, stayEnd, item.startDate, item.endDate)
        );
        if (hasConflicts) return false;

        const nights = getNights(checkIn, checkOut);
        const effectiveMinStay = getEffectiveMinStayForDate(apt, checkIn, seasons);
        return nights >= effectiveMinStay;
      });
    }
    return result;
  }, [apartments, guests, onlyAvailable, hasDateRange, checkIn, checkOut, seasons]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    router.replace(`/${hostSlug}?${params.toString()}`);
  };

  const setCheckIn = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("checkIn", val); else params.delete("checkIn");
    if (val && checkOut && val >= checkOut) params.delete("checkOut");
    router.replace(`/${hostSlug}?${params.toString()}`);
  };

  const setCheckOut = (val: string) => updateParam("checkOut", val);
  const setGuests = (val: number) => updateParam("guests", val <= 1 ? null : String(val));
  const setOnlyAvailable = (val: boolean) => updateParam("onlyAvailable", val ? "1" : null);

  const resetFilters = () => {
    const params = new URLSearchParams();
    const langParam = searchParams.get("lang");
    if (langParam) params.set("lang", langParam);
    router.replace(`/${hostSlug}?${params.toString()}`);
  };

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-6xl font-bold text-muted">404</h1>
        <p className="mt-4 text-xl font-semibold text-foreground">{t(lang, "notFound.host")}</p>
        <a href="https://taurex.one" className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover">{t(lang, "notFound.backToHome")}</a>
      </div>
    );
  }

  if (loading || !host) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const cur = (host.baseCurrency ?? "CHF") as CurrencyCode;
  const hasBanner = !!host.bannerUrl;
  const pricingDate = checkIn || new Date().toISOString().slice(0, 10);

  const isDateInRange = (date: string, start: string, end: string) =>
    !!date && !!start && !!end && date >= start && date <= end;

  function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
    return !(aEnd < bStart || bEnd < aStart);
  }

  function addDays(dateStr: string, days: number) {
    const value = new Date(`${dateStr}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  function getNights(start: string, end: string) {
    return (
      Math.max(
        0,
        Math.round(
          (new Date(`${end}T00:00:00Z`).getTime() -
            new Date(`${start}T00:00:00Z`).getTime()) /
            86400000
        )
      )
    );
  }

  function getEffectiveMinStayForDate(
    apt: Apartment,
    date: string,
    seasonMap: Record<string, Season>
  ) {
    for (const season of Object.values(seasonMap)) {
      const matches = season.dateRanges?.some((r) => isDateInRange(date, r.start, r.end));
      if (matches) {
        const seasonMinStay = apt.minStay?.[season.id];
        if (typeof seasonMinStay === "number" && seasonMinStay >= 1) return seasonMinStay;
      }
    }
    return apt.minStayDefault ?? 1;
  }

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

  const apartmentGrid = filteredApartments.length === 0 ? (
    <div className="mt-16 text-center">
      <p className="text-lg text-muted">{apartments.length === 0 ? t(lang, "apartments.empty") : t(lang, "apartments.emptyFiltered")}</p>
    </div>
  ) : (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {filteredApartments.map((apt) => (
        <Link key={apt.id} href={`/${host.slug}/${apt.slug}?${searchParams.toString()}`} className="group overflow-hidden rounded-2xl bg-surface shadow-lg transition hover:-translate-y-1 hover:shadow-2xl">
          <div className="relative">
            <ImageCarousel images={apt.images ?? []} height="h-56" emptyText={t(lang, "apartment.noImages")} preferThumbnail />
            {(() => {
              const promo = getPromotionPrice(apt, pricingDate);
              if (promo.discountedPrice <= 0) return null;
              return (
                <div className="absolute left-3 top-3 rounded-lg bg-foreground/85 px-3 py-2 text-background backdrop-blur-sm">
                  {promo.active ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                        {promo.promotion.name || t(lang, "apartment.promoActive")}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-background/70 line-through">
                          {formatMoney(promo.basePrice, cur)}
                        </span>
                        <span className="text-sm font-semibold">
                          {formatMoney(promo.discountedPrice, cur)}
                        </span>
                      </div>
                      <p className="text-[11px] text-background/80">
                        {t(lang, "apartment.promoPeriod", {
                          start: formatDate(promo.promotion.startDate),
                          end: formatDate(promo.promotion.endDate),
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm font-semibold">
                      {formatMoney(promo.basePrice, cur)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">{apt.name}</h3>
            {apt.facts && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg">{apt.facts.guests} {t(lang, "apartment.guests")}</span>
                {apt.facts.bedrooms > 0 && <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-muted">{apt.facts.bedrooms} {t(lang, "apartment.bedrooms")}</span>}
                {apt.facts.bathrooms > 0 && <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-muted">{apt.facts.bathrooms} {t(lang, "apartment.bathrooms")}</span>}
                {apt.facts.sqm > 0 && <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-muted">{apt.facts.sqm} {t(lang, "apartment.sqm")}</span>}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );

  const mapSection = (() => {
    const pins: MapPin[] = filteredApartments
      .filter((apt) => apt.location?.lat && apt.location?.lng)
      .map((apt) => ({
        lat: apt.location.lat,
        lng: apt.location.lng,
        label: apt.name,
        href: `/${host.slug}/${apt.slug}?${searchParams.toString()}`,
      }));
    if (pins.length === 0) return null;
    return (
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-foreground">{t(lang, "apartments.map")}</h2>
        <div className="mt-3">
          <Map pins={pins} className="h-80 w-full md:h-96" />
        </div>
      </div>
    );
  })();

  if (hasBanner) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero banner */}
        <div className="relative">
          <div className="h-[420px] w-full overflow-hidden">
            <img
              src={host.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          {/* Gradient overlay: dark top for header text, fading to white at bottom */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 via-40% to-white" />

          {/* Header on top of banner */}
          <div className="absolute top-0 left-0 right-0">
            <HostHeader host={host} basePath={`/${host.slug}`} transparent />
          </div>

          {/* Filter bar positioned at bottom of hero */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-1/2">
            <div className="mx-auto max-w-7xl px-6">
              <AvailabilityBar checkIn={checkIn} checkOut={checkOut} guests={guests} onlyAvailable={onlyAvailable} lang={lang} onCheckInChange={setCheckIn} onCheckOutChange={setCheckOut} onGuestsChange={setGuests} onOnlyAvailableChange={setOnlyAvailable} onReset={resetFilters} />
            </div>
          </div>
        </div>

        {/* Content below hero */}
        <main className="mx-auto max-w-7xl px-6 pt-16 pb-8">
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "apartments.title")}</h1>
          {apartmentGrid}
          {mapSection}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HostHeader host={host} basePath={`/${host.slug}`} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "apartments.title")}</h1>
        <div className="mt-4">
          <AvailabilityBar checkIn={checkIn} checkOut={checkOut} guests={guests} onlyAvailable={onlyAvailable} lang={lang} onCheckInChange={setCheckIn} onCheckOutChange={setCheckOut} onGuestsChange={setGuests} onOnlyAvailableChange={setOnlyAvailable} onReset={resetFilters} />
        </div>
        {apartmentGrid}
        {mapSection}
      </main>
    </div>
  );
}
