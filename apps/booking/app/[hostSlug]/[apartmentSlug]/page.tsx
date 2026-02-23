"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import "../../../lib/firebase";
import {
  fetchHostBySlug,
  fetchApartmentBySlug,
  fetchApartments,
  formatMoney,
  formatDate,
  type Host,
  type Apartment,
  type CurrencyCode,
} from "@taurex/firebase";
import HostHeader from "../../../components/HostHeader";
import ImageCarousel from "../../../components/ImageCarousel";
import Map from "../../../components/Map";
import { t, getLang } from "../../../lib/i18n";

export default function ApartmentPage() {
  const { hostSlug, apartmentSlug } = useParams<{ hostSlug: string; apartmentSlug: string }>();
  const searchParams = useSearchParams();

  const [host, setHost] = useState<Host | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [otherApartments, setOtherApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState<"host" | "apartment" | null>(null);

  const lang = getLang(searchParams.get("lang"), host?.languages ?? ["en"]);
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const hasDates = checkIn && checkOut;

  useEffect(() => {
    if (!hostSlug || !apartmentSlug) return;
    setLoading(true);
    setNotFound(null);
    fetchHostBySlug(hostSlug)
      .then(async (h) => {
        if (!h) { setNotFound("host"); setLoading(false); return; }
        setHost(h);
        const [apt, allApts] = await Promise.all([
          fetchApartmentBySlug(h.id, apartmentSlug),
          fetchApartments(h.id),
        ]);
        if (!apt) { setNotFound("apartment"); setLoading(false); return; }
        setApartment(apt);
        setOtherApartments(allApts.filter((a) => a.slug !== apartmentSlug));
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
  const minStay = apartment.minStayDefault ?? 1;
  const nightsCount = hasDates ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 0;

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
          {apartment.priceDefault > 0 && (
            <div className="absolute left-4 top-4 z-10 rounded-lg bg-primary px-4 py-2 text-primary-fg shadow-lg">
              <span className="text-lg font-bold">{formatMoney(apartment.priceDefault, cur)}</span>
              <span className="ml-1 text-sm font-normal opacity-80">{t(lang, "apartment.perNight")}</span>
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
            <div className="mt-3 flex h-48 items-center justify-center rounded-2xl border border-border bg-surface">
              <p className="text-muted">{t(lang, "apartment.availabilityComingSoon")}</p>
            </div>
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-foreground">{t(lang, "apartment.booking")}</h2>
            <div className="mt-3 rounded-2xl border border-border bg-surface p-6">
              {hasDates ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t(lang, "apartment.selectedDates")}</p>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <div className="rounded-lg bg-surface-alt px-3 py-2"><span className="text-xs text-muted">{t(lang, "filter.checkIn")}</span><p className="font-medium">{formatDate(checkIn)}</p></div>
                    <span className="text-muted">→</span>
                    <div className="rounded-lg bg-surface-alt px-3 py-2"><span className="text-xs text-muted">{t(lang, "filter.checkOut")}</span><p className="font-medium">{formatDate(checkOut)}</p></div>
                  </div>
                  {nightsCount > 0 && <p className="text-sm text-muted">{t(lang, "apartment.nightsSelected", { nights: nightsCount })}</p>}
                </div>
              ) : (
                <div className="rounded-lg bg-surface-alt px-4 py-3"><p className="text-sm italic text-muted">{t(lang, "apartment.selectDatesFirst")}</p></div>
              )}
              {hasDates && nightsCount > 0 && apartment.priceDefault > 0 && (
                <div className="mt-4 rounded-lg bg-surface-alt px-4 py-3">
                  <p className="text-lg font-semibold text-foreground">{t(lang, "apartment.approxTotal", { total: formatMoney(nightsCount * apartment.priceDefault, cur) })}</p>
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
              {minStay > 1 && (
                <div className="mt-4 border-t border-border pt-4"><p className="text-center text-sm text-muted">{t(lang, "apartment.minStay", { nights: minStay })}</p></div>
              )}
              <div className="mt-6 space-y-3">
                <button disabled className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg opacity-60 cursor-not-allowed">{t(lang, "apartment.directBooking")}</button>
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
    </div>
  );
}
