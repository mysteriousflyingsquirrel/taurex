# Data Model – Taurex.one

This document defines the host-scoped domain data stored in Firestore and Firebase Storage.

It is the single source of truth for:
- Apartment and season document structure
- Storage layout for images
- TypeScript types
- Service layer signatures

Do not rename fields or change structure without updating this document.

---

## 1. Firestore Structure

All domain data lives under `hosts/{hostId}/`. No host data may exist at root level.

```
Firestore Root
│
├── hosts/
│   └── {hostId}/
│       ├── name: string
│       ├── slug: string
│       ├── languages: array<string>           # e.g. ["en", "de"]. Default ["en"].
│       ├── baseCurrency: string               # e.g. "CHF". Default "CHF".
│       │
│       ├── apartments/                          # Subcollection
│       │   └── {slug}/                          # Document (ID = apartment slug)
│       │       ├── slug: string                 # URL identifier, e.g. "wega"
│       │       ├── name: string                 # Display name, e.g. "Apartment Wega"
│       │       ├── descriptions: map            # Keyed by language code
│       │       │   ├── en: string
│       │       │   ├── de: string
│       │       │   └── ...
│       │       ├── images: array
│       │       │   └── [i]: map
│       │       │       ├── src: string          # Thumbnail URL (Firebase Storage)
│       │       │       ├── srcBig: string       # Full-res URL (optional)
│       │       │       └── alt: string
│       │       ├── facts: map
│       │       │   ├── guests: number
│       │       │   ├── bedrooms: number
│       │       │   ├── doubleBeds: number
│       │       │   ├── singleBeds: number
│       │       │   ├── bathrooms: number
│       │       │   └── sqm: number
│       │       ├── amenities: map
│       │       │   ├── en: array<string>
│       │       │   ├── de: array<string>
│       │       │   └── ...
│       │       ├── location: map
│       │       │   ├── address: string
│       │       │   ├── lat: number
│       │       │   └── lng: number
│       │       ├── bookingLinks: array
│       │       │   └── [i]: map
│       │       │       ├── label: string
│       │       │       └── url: string
│       │       ├── icalUrls: array<string>
│       │       ├── priceDefault: number
│       │       ├── prices: map                  # (optional) Per-season price overrides
│       │       │   └── {seasonId}: number
│       │       ├── minStayDefault: number
│       │       └── minStay: map                 # (optional) Per-season overrides
│       │           └── {seasonId}: number
│       │
│       └── seasons/                             # Subcollection
│           └── {seasonId}/
│               ├── year: number
│               ├── name: string
│               ├── color: string
│               └── dateRanges: array
│                   └── [i]: map
│                       ├── start: string        # "YYYY-MM-DD" format
│                       └── end: string
│
├── users/                                       # Top-level (see firebase.md)
│   └── {uid}/
│       └── hostId: string
```

---

## 2. Firebase Storage Structure

Images are scoped by host and apartment.

```
Firebase Storage Root
│
├── images/                                      # Thumbnails (~768px wide)
│   └── {hostId}/
│       └── {apartment-slug}/
│           ├── {filename}.jpg
│           └── ...
│
└── images_big/                                  # Full-resolution images
    └── {hostId}/
        └── {apartment-slug}/
            ├── {filename}.jpg
            └── ...
```

---

## 3. Design Rules

| Rule | Detail |
|---|---|
| **Host scoping** | All apartment and season data lives under `hosts/{hostId}/`. No domain data at root level. |
| **Languages** | Host `languages` array determines which locales are available. EN is always present (default). Available: `en`, `de`, `fr`, `it`. |
| **Base currency** | Host `baseCurrency` determines the currency for all prices. Available: `CHF`, `EUR`, `USD`, `GBP`. Default: `CHF`. |
| **Apartment document ID** | Equals the `slug` field. Enables O(1) lookups. Immutable after creation. |
| **Season document ID** | Format: `{year}-{slugified-name}`. E.g. "High season" for 2026 → `2026-high-season`. |
| **Seasons are year-scoped** | Each season belongs to one year. Use "Copy from previous year" to clone. |
| **Year range** | UI limits year selection to current year + 4 years. |
| **Date format** | `"YYYY-MM-DD"` strings (ISO 8601). |
| **No season overlap** | Each calendar day belongs to at most one season. |
| **Season-to-apartment link** | `prices` and `minStay` maps on each apartment use season document IDs as keys. |
| **All Facts mandatory** | `guests`, `bedrooms`, `doubleBeds`, `singleBeds`, `bathrooms`, `sqm` — all required. |
| **Descriptions & amenities** | Keyed by language code. Only languages from host's `languages` array are shown in the UI. |
| **Autosave** | All edit pages use debounced autosave (1.5–2s). New apartment creation still requires manual "Create" action. |
| **Images stored as URLs** | `images[].src` and `images[].srcBig` contain full Firebase Storage download URLs. |
| **Address normalization** | Location addresses are normalized via Nominatim to "Street Nr, ZIP City" format. |

---

## 3b. Firestore Indexes

Firestore automatically creates single-field indexes for every field. The queries below use additional ordering or filtering that may require composite indexes.

### Current Queries

| Service | Query | Index Needed |
|---|---|---|
| `fetchHosts()` | `hosts` ordered by `slug` | Single-field (auto) |
| `fetchSeasons(hostId, year)` | `hosts/{hostId}/seasons` where `year == X` | Single-field (auto) |
| `fetchApartments(hostId)` | `hosts/{hostId}/apartments` (all docs) | None |
| `fetchAllUsers()` | `users` (all docs) | None |

No composite indexes are required for the current query patterns. All queries either fetch full collections, filter on a single field, or order on a single field — all covered by automatic indexes.

### Future Considerations

If queries grow to combine filters (e.g., `where("year", "==", X)` + `orderBy("name")`), composite indexes will need to be declared in `firestore.indexes.json` and deployed via Firebase CLI.

---

## 4. TypeScript Types

These types are defined in `@taurex/firebase` and shared across all applications.

```typescript
// Available languages
const AVAILABLE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
] as const

type LanguageCode = "en" | "de" | "fr" | "it"

// Available currencies
const AVAILABLE_CURRENCIES = [
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
] as const

type CurrencyCode = "CHF" | "EUR" | "USD" | "GBP"

// Host & User

type Host = {
  id: string
  name: string
  slug: string
  languages: LanguageCode[]
  baseCurrency: CurrencyCode
  billing?: HostBilling
}

type HostBilling = {
  unlocked: boolean
  pricePerApartment: number | null
}

type UserProfile = {
  uid: string
  hostId: string
}

// Apartments

type Apartment = {
  id: string
  slug: string
  name: string
  descriptions: Record<string, string>
  images: ApartmentImage[]
  facts: ApartmentFacts
  amenities: Record<string, string[]>
  location: ApartmentLocation
  bookingLinks: BookingLink[]
  icalUrls: string[]
  priceDefault: number
  prices?: Record<string, number>
  minStayDefault: number
  minStay?: Record<string, number>
}

// Seasons

type Season = {
  id: string
  year: number
  name: string
  color: string
  dateRanges: SeasonDateRange[]
}
```

---

## 5. Service Layer

All service functions live in `@taurex/firebase` and are shared across applications. Every function that accesses host data takes `hostId` as the first parameter.

### Host Service

| Function | Signature | Description |
|---|---|---|
| `fetchHosts` | `() → Promise<Host[]>` | Fetch all hosts (apex only) |
| `fetchHostBySlug` | `(slug) → Promise<Host \| undefined>` | Fetch host by slug (doc ID) |
| `createHost` | `(host) → Promise<void>` | Create new host |
| `updateHost` | `(hostId, data) → Promise<void>` | Partial update |
| `deleteHost` | `(hostId) → Promise<void>` | Delete host |

### Apartment Service

| Function | Signature | Description |
|---|---|---|
| `fetchApartments` | `(hostId) → Promise<Apartment[]>` | Fetch all apartments for a host |
| `fetchApartmentBySlug` | `(hostId, slug) → Promise<Apartment \| undefined>` | Fetch single apartment |
| `createApartment` | `(hostId, apartment) → Promise<void>` | Create new apartment |
| `updateApartment` | `(hostId, slug, data) → Promise<void>` | Partial update |
| `deleteApartment` | `(hostId, slug) → Promise<void>` | Delete apartment |

### Season Service

| Function | Signature | Description |
|---|---|---|
| `fetchSeasons` | `(hostId, year?) → Promise<Record<string, Season>>` | Fetch seasons |
| `setSeason` | `(hostId, seasonId, data) → Promise<void>` | Create or overwrite season |
| `deleteSeason` | `(hostId, seasonId) → Promise<void>` | Delete season |
| `copySeasonsToYear` | `(hostId, fromYear, toYear) → Promise<Record<string, Season>>` | Copy seasons |

### User Service

| Function | Signature | Description |
|---|---|---|
| `fetchUserProfile` | `(uid) → Promise<UserProfile \| undefined>` | Resolve user → hostId |
| `createUserProfile` | `(uid, hostId) → Promise<void>` | Link user to host |
