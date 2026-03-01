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

// Host & User (top-level collections)

// Billing

/** Standard price per apartment per month (CHF) */
export const STANDARD_PRICE_PER_APARTMENT = 5;

export type HostBilling = {
  unlocked: boolean; // true = no charge at all (apex, demos)
  pricePerApartment: number | null; // custom rate override, null = standard rate
};

export const DEFAULT_BILLING: HostBilling = {
  unlocked: false,
  pricePerApartment: null,
};

/** Returns the effective price per apartment for a host */
export function getEffectivePrice(billing?: HostBilling): number {
  if (!billing || billing.unlocked) return 0;
  return billing.pricePerApartment ?? STANDARD_PRICE_PER_APARTMENT;
}

/** Returns the monthly total for a host */
export function getMonthlyTotal(
  billing: HostBilling | undefined,
  apartmentCount: number,
): number {
  return getEffectivePrice(billing) * apartmentCount;
}

// Host

export type Host = {
  id: string;
  name: string;
  slug: string;
  languages: LanguageCode[]; // e.g. ["en", "de"], default ["en"]
  baseCurrency: CurrencyCode; // e.g. "CHF", default "CHF"
  billing?: HostBilling;
  logoUrl?: string;
  bannerUrl?: string;
};

export type UserProfile = {
  uid: string;
  hostId: string;
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

export type ApartmentPromotion = {
  name: string;
  discountPercent: number; // integer 1..99
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive?: boolean;
};

export type CalendarSyncStatus = "pending" | "ok" | "error";

export type ApartmentCalendarImport = {
  id: string;
  name: string;
  url: string;
  color: string; // Hex, e.g. "#3B82F6"
  isActive: boolean;
  lastStatus?: CalendarSyncStatus;
  lastSyncAt?: string;
  lastError?: string;
};

export type ApartmentCalendarManualBlock = {
  id: string;
  startDate: string;
  endDate: string;
  note?: string;
};

export type ApartmentCalendarBusyRange = {
  source: "import";
  sourceId: string;
  startDate: string;
  endDate: string;
  note?: string;
};

export type ApartmentCalendarConflict = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  sourceIds: string[];
  status: "open" | "resolved";
};

export type ApartmentCalendar = {
  manualBlocks: ApartmentCalendarManualBlock[];
  importedBusyRanges: ApartmentCalendarBusyRange[];
  conflicts: ApartmentCalendarConflict[];
  lastAutoSyncAt?: string;
  lastInternalUpdateAt?: string;
};

export type ApartmentCalendarPrivate = {
  exportToken: string;
  imports: ApartmentCalendarImport[];
  conflictPolicy: "strict-no-overwrite";
  updatedAt?: string;
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
  icalUrls?: string[]; // legacy
  calendar?: ApartmentCalendar;
  priceDefault: number;
  prices?: Record<string, number>; // keyed by seasonId
  promotion?: ApartmentPromotion;
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

// Formatting helpers

/** Resolve a CurrencyCode to its display symbol */
export function currencySymbol(code: CurrencyCode): string {
  const entry = AVAILABLE_CURRENCIES.find((c) => c.code === code);
  return entry?.symbol ?? code;
}

/**
 * Format a monetary amount: "CHF 1'000.00"
 * Apostrophe thousands separator, always 2 decimals.
 */
export function formatMoney(amount: number, code: CurrencyCode): string {
  const symbol = currencySymbol(code);
  const fixed = Math.abs(amount).toFixed(2);
  const [whole, decimal] = fixed.split(".");
  const withSep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  const sign = amount < 0 ? "-" : "";
  return `${symbol} ${sign}${withSep}.${decimal}`;
}

/** Format a YYYY-MM-DD date string as dd-mm-yyyy */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
}
