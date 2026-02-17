# Data Model – Taurex.one

This document defines the tenant-scoped domain data stored in Firestore and Firebase Storage.

It is the single source of truth for:
- Apartment and season document structure
- Storage layout for images
- TypeScript types
- Service layer signatures

Do not rename fields or change structure without updating this document.

---

## 1. Firestore Structure

All domain data lives under `tenants/{tenantId}/`. No tenant data may exist at root level.

```
Firestore Root
│
├── tenants/
│   └── {tenantId}/
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
│       │       │   ├── en: string               # English description
│       │       │   ├── de: string               # German description (if enabled)
│       │       │   └── ...                      # Other enabled languages
│       │       ├── images: array                # Ordered array of image objects
│       │       │   └── [i]: map
│       │       │       ├── src: string          # Thumbnail URL (Firebase Storage)
│       │       │       ├── srcBig: string       # Full-res URL (optional)
│       │       │       └── alt: string          # Alt text
│       │       ├── facts: map                   # All fields mandatory
│       │       │   ├── guests: number           # Max guest capacity (≥1)
│       │       │   ├── bedrooms: number
│       │       │   ├── doubleBeds: number
│       │       │   ├── singleBeds: number
│       │       │   ├── bathrooms: number
│       │       │   └── sqm: number              # Size in m²
│       │       ├── amenities: map               # Keyed by language code
│       │       │   ├── en: array<string>        # English amenity labels
│       │       │   ├── de: array<string>        # German amenity labels (if enabled)
│       │       │   └── ...
│       │       ├── location: map
│       │       │   ├── address: string          # Normalized: "Street Nr, ZIP City"
│       │       │   ├── lat: number              # Latitude
│       │       │   └── lng: number              # Longitude
│       │       ├── bookingLinks: array          # External booking platform links
│       │       │   └── [i]: map
│       │       │       ├── label: string        # e.g. "Airbnb", "Booking request"
│       │       │       └── url: string          # URL or mailto: link
│       │       ├── icalUrls: array<string>      # External iCal feed URLs for availability
│       │       ├── priceDefault: number         # Default price per night (in tenant baseCurrency), mandatory
│       │       ├── prices: map                  # (optional) Per-season price overrides
│       │       │   └── {seasonId}: number       # e.g. "2026-high-season": 180
│       │       ├── minStayDefault: number       # Default minimum stay in nights, mandatory
│       │       └── minStay: map                 # (optional) Per-season overrides
│       │           └── {seasonId}: number       # e.g. "2026-high-season": 7
│       │
│       └── seasons/                             # Subcollection
│           └── {seasonId}/                      # Document (ID = "{year}-{slugified-name}")
│               ├── year: number                 # e.g. 2026
│               ├── name: string                 # e.g. "High season"
│               ├── color: string                # Hex colour, e.g. "#EF4444"
│               └── dateRanges: array            # Date ranges this season covers
│                   └── [i]: map
│                       ├── start: string        # "YYYY-MM-DD" format
│                       └── end: string          # "YYYY-MM-DD" format
│
├── users/                                       # Top-level (see firebase.md)
│   └── {uid}/
│       └── tenantId: string
```

---

## 2. Firebase Storage Structure

Images are scoped by tenant and apartment.

```
Firebase Storage Root
│
├── images/                                      # Thumbnails (~768px wide)
│   └── {tenantId}/
│       └── {apartment-slug}/
│           ├── {filename}.jpg
│           └── ...
│
└── images_big/                                  # Full-resolution images
    └── {tenantId}/
        └── {apartment-slug}/
            ├── {filename}.jpg
            └── ...
```

---

## 3. Design Rules

| Rule | Detail |
|---|---|
| **Tenant scoping** | All apartment and season data lives under `tenants/{tenantId}/`. No domain data at root level. |
| **Languages** | Tenant `languages` array determines which locales are available. EN is always present (default). Available: `en`, `de`, `fr`, `it`. |
| **Base currency** | Tenant `baseCurrency` determines the currency for all prices (`priceDefault`, `prices`). Available: `CHF`, `EUR`, `USD`, `GBP`. Default: `CHF`. Guest-side currency conversion handled by the site app. |
| **Apartment document ID** | Equals the `slug` field. Enables O(1) lookups. Immutable after creation. |
| **Season document ID** | Format: `{year}-{slugified-name}`. E.g. "High season" for 2026 → `2026-high-season`. |
| **Seasons are year-scoped** | Each season belongs to one year. Creating a season for 2026 does not affect 2027. Use "Copy from previous year" to clone. |
| **Year range** | UI limits year selection to current year + 4 years (e.g. 2026–2030). |
| **Date format** | `"YYYY-MM-DD"` strings (ISO 8601). E.g. `"2026-01-03"` = January 3rd, 2026. |
| **No season overlap** | Each calendar day belongs to at most one season. Painting a day for one season removes it from all others. |
| **Season-to-apartment link** | `prices` and `minStay` maps on each apartment use season document IDs as keys. Orphaned keys have no effect. |
| **All Facts mandatory** | `guests`, `bedrooms`, `doubleBeds`, `singleBeds`, `bathrooms`, `sqm` — all required. |
| **Descriptions & amenities** | Keyed by language code. Only languages from tenant's `languages` array are shown in the UI. |
| **Autosave** | All edit pages use debounced autosave (1.5–2s). New apartment creation still requires manual "Create" action. |
| **Images stored as URLs** | `images[].src` and `images[].srcBig` contain full Firebase Storage download URLs. |
| **Address normalization** | Location addresses are normalized via Nominatim to "Street Nr, ZIP City" format. |

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

// Tenant & User

type Tenant = {
  id: string
  name: string
  slug: string
  languages: LanguageCode[]    // default ["en"]
  baseCurrency: CurrencyCode   // default "CHF"
}

type UserProfile = {
  uid: string
  tenantId: string
}

// Apartments

type Apartment = {
  id: string
  slug: string
  name: string
  descriptions: Record<string, string>      // keyed by language code
  images: ApartmentImage[]
  facts: ApartmentFacts
  amenities: Record<string, string[]>       // keyed by language code
  location: ApartmentLocation
  bookingLinks: BookingLink[]
  icalUrls: string[]
  priceDefault: number                      // per night, in tenant baseCurrency
  prices?: Record<string, number>           // keyed by seasonId
  minStayDefault: number                    // nights
  minStay?: Record<string, number>          // keyed by seasonId
}

type ApartmentImage = {
  src: string
  srcBig?: string
  alt: string
}

type ApartmentFacts = {
  guests: number      // all mandatory
  bedrooms: number
  doubleBeds: number
  singleBeds: number
  bathrooms: number
  sqm: number
}

type ApartmentLocation = {
  address: string     // "Street Nr, ZIP City"
  lat: number
  lng: number
}

type BookingLink = {
  label: string
  url: string
}

// Seasons

type DateString = string  // "YYYY-MM-DD" format

type SeasonDateRange = {
  start: DateString
  end: DateString
}

type Season = {
  id: string           // "{year}-{slugified-name}"
  year: number
  name: string
  color: string
  dateRanges: SeasonDateRange[]
}
```

---

## 5. Service Layer

All service functions live in `@taurex/firebase` and are shared across applications. Every function that accesses tenant data takes `tenantId` as the first parameter.

### Apartment Service

| Function | Signature | Description |
|---|---|---|
| `fetchApartments` | `(tenantId) → Promise<Apartment[]>` | Fetch all apartments for a tenant, ordered by slug |
| `fetchApartmentBySlug` | `(tenantId, slug) → Promise<Apartment \| undefined>` | Fetch single apartment by slug (doc ID) |
| `createApartment` | `(tenantId, apartment) → Promise<void>` | Create new apartment (slug = doc ID) |
| `updateApartment` | `(tenantId, slug, data) → Promise<void>` | Partial update via `updateDoc()` |
| `deleteApartment` | `(tenantId, slug) → Promise<void>` | Delete apartment document |

### Season Service

| Function | Signature | Description |
|---|---|---|
| `fetchSeasons` | `(tenantId, year?) → Promise<Record<string, Season>>` | Fetch seasons, optionally filtered by year |
| `setSeason` | `(tenantId, seasonId, data) → Promise<void>` | Create or overwrite a season document |
| `deleteSeason` | `(tenantId, seasonId) → Promise<void>` | Delete a season document |
| `copySeasonsToYear` | `(tenantId, fromYear, toYear) → Promise<Record<string, Season>>` | Copy all seasons from one year to another, shifting dates |

### Tenant Service

| Function | Signature | Description |
|---|---|---|
| `fetchTenants` | `() → Promise<Tenant[]>` | Fetch all tenants (admin only) |
| `fetchTenantBySlug` | `(slug) → Promise<Tenant \| undefined>` | Fetch tenant by slug (doc ID) |
| `createTenant` | `(tenant) → Promise<void>` | Create new tenant |
| `updateTenant` | `(tenantId, data) → Promise<void>` | Partial update (e.g. languages) |
| `deleteTenant` | `(tenantId) → Promise<void>` | Delete tenant |

### User Service

| Function | Signature | Description |
|---|---|---|
| `fetchUserProfile` | `(uid) → Promise<UserProfile \| undefined>` | Resolve user → tenantId |
| `createUserProfile` | `(uid, tenantId) → Promise<void>` | Link user to tenant |

### Image Service

| Function | Signature | Description |
|---|---|---|
| `uploadImage` | `(file, tenantId, slug, filename?) → Promise<string>` | Upload thumbnail to `images/{tenantId}/{slug}/`. Returns download URL. |
| `uploadBigImage` | `(file, tenantId, slug, filename?) → Promise<string>` | Upload full-res to `images_big/{tenantId}/{slug}/`. Returns download URL. |
| `deleteImage` | `(storagePath) → Promise<void>` | Delete image by storage path |
| `listApartmentImages` | `(tenantId, slug, folder?) → Promise<string[]>` | List all image URLs in a folder |
