"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import "../../lib/firebase";
import { fetchHostBySlug, fetchApartments, formatMoney, type Host, type Apartment, type CurrencyCode } from "@taurex/firebase";
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = parseInt(searchParams.get("guests") ?? "1", 10) || 1;
  const onlyAvailable = searchParams.get("onlyAvailable") === "1";
  const lang = getLang(searchParams.get("lang"), host?.languages ?? ["en"]);

  useEffect(() => {
    if (!hostSlug) return;
    setLoading(true);
    setNotFound(false);
    fetchHostBySlug(hostSlug)
      .then(async (h) => {
        if (!h) { setNotFound(true); setLoading(false); return; }
        setHost(h);
        const apts = await fetchApartments(h.id);
        setApartments(apts);
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
    return result;
  }, [apartments, guests]);

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

  const apartmentGrid = filteredApartments.length === 0 ? (
    <div className="mt-16 text-center">
      <p className="text-lg text-muted">{apartments.length === 0 ? t(lang, "apartments.empty") : t(lang, "apartments.emptyFiltered")}</p>
    </div>
  ) : (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {filteredApartments.map((apt) => (
        <Link key={apt.id} href={`/${host.slug}/${apt.slug}?${searchParams.toString()}`} className="group overflow-hidden rounded-2xl bg-surface shadow-lg transition hover:-translate-y-1 hover:shadow-2xl">
          <div className="relative">
            <ImageCarousel images={apt.images ?? []} height="h-56" emptyText={t(lang, "apartment.noImages")} />
            {apt.priceDefault > 0 && (
              <div className="absolute right-3 top-3 rounded-lg bg-foreground/80 px-3 py-1.5 text-sm font-semibold text-background backdrop-blur-sm">
                {formatMoney(apt.priceDefault, cur)} <span className="text-xs font-normal opacity-80">{t(lang, "apartment.perNight")}</span>
              </div>
            )}
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
