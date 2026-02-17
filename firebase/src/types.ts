// Available languages
export const AVAILABLE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
] as const;

export type LanguageCode = (typeof AVAILABLE_LANGUAGES)[number]["code"];

// Available currencies
export const AVAILABLE_CURRENCIES = [
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
] as const;

export type CurrencyCode = (typeof AVAILABLE_CURRENCIES)[number]["code"];

// Tenant & User (top-level collections)

// Billing

/** Standard price per apartment per month (CHF) */
export const STANDARD_PRICE_PER_APARTMENT = 5;

export type TenantBilling = {
  unlocked: boolean; // true = no charge at all (admin, demos)
  pricePerApartment: number | null; // custom rate override, null = standard rate
};

export const DEFAULT_BILLING: TenantBilling = {
  unlocked: false,
  pricePerApartment: null,
};

/** Returns the effective price per apartment for a tenant */
export function getEffectivePrice(billing?: TenantBilling): number {
  if (!billing || billing.unlocked) return 0;
  return billing.pricePerApartment ?? STANDARD_PRICE_PER_APARTMENT;
}

/** Returns the monthly total for a tenant */
export function getMonthlyTotal(
  billing: TenantBilling | undefined,
  apartmentCount: number,
): number {
  return getEffectivePrice(billing) * apartmentCount;
}

// Tenant

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  languages: LanguageCode[]; // e.g. ["en", "de"], default ["en"]
  baseCurrency: CurrencyCode; // e.g. "CHF", default "CHF"
  billing?: TenantBilling;
};

export type UserProfile = {
  uid: string;
  tenantId: string;
};

// Apartments

export type ApartmentImage = {
  src: string;
  srcBig?: string;
  alt: string;
};

export type ApartmentFacts = {
  guests: number;
  bedrooms: number;
  doubleBeds: number;
  singleBeds: number;
  bathrooms: number;
  sqm: number;
};

export type ApartmentLocation = {
  address: string;
  lat: number;
  lng: number;
};

export type BookingLink = {
  label: string;
  url: string;
};

export type Apartment = {
  id: string;
  slug: string;
  name: string;
  descriptions: Record<string, string>; // keyed by language code
  images: ApartmentImage[];
  facts: ApartmentFacts;
  amenities: Record<string, string[]>; // keyed by language code
  location: ApartmentLocation;
  bookingLinks: BookingLink[];
  icalUrls: string[];
  priceDefault: number;
  prices?: Record<string, number>; // keyed by seasonId
  minStayDefault: number;
  minStay?: Record<string, number>; // keyed by seasonId
};

// Seasons

export type DateString = string; // "YYYY-MM-DD" format

export type SeasonDateRange = {
  start: DateString;
  end: DateString;
};

export type Season = {
  id: string; // e.g. "2026-high-season"
  year: number; // e.g. 2026
  name: string; // e.g. "High season"
  color: string; // Hex, e.g. "#EF4444"
  dateRanges: SeasonDateRange[];
};

// Date formatting

/** Format a YYYY-MM-DD date string as dd.mm.yyyy */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
}
