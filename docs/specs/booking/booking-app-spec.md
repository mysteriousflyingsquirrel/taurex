# Booking App — Specification

## 1. Overview

The booking app (`@taurex/booking`) serves booking guests by displaying host public apartment listings and individual apartment pages with booking functionality.

Routing is path-based: `booking.taurex.one/{hostSlug}` = host pages, `booking.taurex.one/{hostSlug}/{apartmentSlug}` = apartment detail + booking.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Vite SPA) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router DOM |
| Data | Firestore via `@taurex/firebase` (read-only) |
| Maps | Leaflet / react-leaflet + OpenStreetMap |
| Images | Firebase Storage URLs, `<img>` with lazy loading |

No authentication required. All Firestore reads are public.

---

## 3. Route Map

```
/{hostSlug}                    → Host home (apartment listing)
/{hostSlug}/{apartmentSlug}    → Apartment detail + booking
*                                → 404 Not Found
```

---

## 4. Internationalisation (i18n)

| Aspect | Implementation |
|---|---|
| **Available locales** | Determined by `host.languages` (e.g. `["en", "de"]`) |
| **Default** | First language in host's `languages` array (usually `en`) |
| **Locale selection** | `?lang=de` query parameter |
| **Switcher** | Language pills in host page header. Only shown when host has 2+ languages. |
| **Content** | Apartment descriptions + amenities from Firestore (keyed by lang). UI strings via a `t()` helper function with a translations map. |
| **URL persistence** | All internal links preserve `?lang` and all other query params |

### UI String Translations

UI strings (button labels, headings, etc.) are stored in a `translations` map keyed by language code. A `useTranslation()` hook reads `?lang` from the URL and returns a `t(key)` function.

Supported languages for UI strings: `en`, `de`, `fr`, `it`.

---

## 5. Host Home Page (`/{hostSlug}`)

### 5.1 Host Resolution

1. Extract `hostSlug` from URL
2. Call `fetchHostBySlug(hostSlug)`
3. If not found → render **Host Not Found** page
4. If found → fetch apartments via `fetchApartments(hostId)`

### 5.2 Layout

**Header**:
- Host name (left)
- Language switcher pills (right, only when 2+ languages)

**Body**: Full-width, `max-w-7xl` centred container.

### 5.3 Availability Bar

White card above apartment grid with all filter controls in a responsive row.

| Control | Type | URL Param | Details |
|---|---|---|---|
| **Date range** | Custom DateRangePicker | `?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` | Single input field showing formatted dates (`dd.mm.yyyy`). Clicking opens a dropdown calendar showing the **current month and the next month** side-by-side. User selects check-in first, then check-out. Min = today. |
| **Guests** | Stepper (−/+) | `?guests=N` | Min 1, max 20. Param omitted when value is 1. |
| **Show only available** | Checkbox | `?onlyAvailable=1` | Disabled until both dates are selected. Availability filtering requires iCal integration (phase 2). |
| **Reset** | Text button | — | Clears all filter params (preserves `?lang`). Only visible when any filter is active. |

**DateRangePicker component**: Custom calendar dropdown that displays **two months side-by-side** (current month + next month). Navigation arrows to move forward/backward. Days before today are disabled. First click selects check-in, second click selects check-out (must be after check-in). The selected range is highlighted. The trigger input shows dates in `dd.mm.yyyy` format.

**Active filtering**: Currently only guest count filtering is functional (`facts.guests >= selectedGuests`). Date-based availability filtering will be wired up when iCal integration (Cloud Function) is implemented.

All filter values persist in URL search params and carry over when navigating to apartment detail pages.

### 5.4 Apartment Map

Below the availability bar, a Leaflet map showing **all host apartments** as markers. Each marker shows a popup with the apartment name and a link to its detail page. The map auto-fits bounds to include all apartments that have valid `location.lat` and `location.lng` values. Hidden if no apartments have coordinates.

### 5.5 Apartment Grid

Responsive grid: 1 col mobile, 2 cols md, 3 cols lg. Gap 24px.

**Filtering**: Only show apartments where `facts.guests >= selectedGuests`.

**Empty state**: "No apartments available" (translated).

### 5.6 Apartment Card

White rounded card (`rounded-2xl shadow-lg`) with hover lift.

| Section | Content |
|---|---|
| **Image** | First image from `images[]` array. Aspect ratio 4:3. Fallback grey box if no images. |
| **Price badge** | Overlaid on image (top-right): "{currency} {priceDefault}/night". Uses `host.baseCurrency`. |
| **Name** | `apartment.name` |
| **Fact pills** | Rounded badges: Guests, Bedrooms, Bathrooms, m² |
| **Link** | Entire card is clickable → `/{hostSlug}/{apartmentSlug}` (preserves query params) |

### 5.7 Host Not Found

Centred message: "Host not found" + link back to `taurex.one`.

---

## 6. Apartment Detail Page (`/{hostSlug}/{apartmentSlug}`)

### 6.1 Data Loading

1. Resolve host (same as host home)
2. Call `fetchApartmentBySlug(hostId, apartmentSlug)`
3. If apartment not found → render **Apartment Not Found**
4. Fetch seasons via `fetchSeasons(hostId)` (for min stay display)

### 6.2 Layout

**Header**: Same as host home (host name + language switcher).

**Breadcrumb**: Host name → Apartment name

### 6.3 Image Gallery

Carousel component showing apartment images.

| Feature | Details |
|---|---|
| **Images** | `images[].src` (thumbnail) |
| **Transition** | Cross-fade (opacity, 500ms) |
| **Navigation** | Left/right arrow buttons + dot indicators |
| **Touch** | Swipe left/right |
| **Height** | 320px mobile, 384px md, 500px lg |
| **Empty state** | Grey box: "No images available" |

### 6.4 Apartment Info

Below gallery, full-width linear layout (no sidebar).

**Name**: Large heading (`text-3xl font-bold`).

**Price**: "{currency} {priceDefault} / night" prominently displayed below name.

### 6.5 Facts

Grid of fact items (2 cols mobile, 3 cols sm, 4 cols lg). Each item is a simple white rounded card (`rounded-lg bg-white p-3`) with **no icons** — just the value and label as text.

Items: Guests, Bedrooms, Double beds (if >0), Single beds (if >0), Bathrooms, m² (if >0).

**Description**: `descriptions[lang]` rendered with `whitespace-pre-line`. Falls back to `descriptions.en` if current language unavailable.

### 6.6 Amenities

Grid of amenity items (2–4 cols responsive). Each item is a simple white rounded card (`rounded-lg bg-white p-3`) with **no icons** — just the amenity name as text. Same visual style as facts.

Source: `amenities[lang][]`. Falls back to `amenities.en` if current language unavailable.

### 6.7 Location

If `location.address` is set, show address text in a white card. Below the address, an embedded Leaflet map (height ~200px) centred on the apartment's `location.lat` / `location.lng` with a single marker pin. Map is interactive (zoom/pan). Only shown when valid lat/lng exist.

### 6.8 Availability & Booking

Side-by-side section (`lg:grid-cols-5 gap-8`) below all content sections.

**Availability (3/5 width)**:
- Heading: "Availability"
- Placeholder: Rounded white card (`h-48`) with "Coming soon…" text centred
- Phase 2: Calendar widget with date range selection, iCal integration

**Booking (2/5 width)**:
- Heading: "Booking"
- White rounded card containing:
  1. **Selected dates** — Read from `?checkIn` and `?checkOut` URL params (carried from host page). Dates displayed in `dd.mm.yyyy` format. If no dates, show italic hint: "Please select your dates on the apartment listing page to see pricing."
  2. **Approximate total** — `nights × priceDefault`, with disclaimer "Approximate estimate. Final price at the discretion of the host."
  3. **Best price guarantee** — Indigo banner: "Best price guaranteed! Book directly through our booking request and get the cheapest price available." with checkmark icon
  4. **Minimum stay** — "Minimum stay: X nights" (if >1)
  5. **Booking Request** button — Primary indigo, disabled (no function yet)
  6. **External booking links** — Outline buttons from `bookingLinks[]`, each opens `url` in new tab

### 6.9 More Apartments

Below main content. Horizontal row of pill links to other apartments of the same host (excluding current). Each pill shows apartment name and links to `/{hostSlug}/{aptSlug}`.

### 6.10 Apartment Not Found

"Apartment not found" + link back to `/{hostSlug}`.

---

## 7. Shared Components

### Badge

Rounded pill. Variants: `default` (grey), `accent` (indigo tint).

### Button

Rounded button/link. Variants: `primary` (indigo), `secondary` (grey), `outline` (border).

### ImageCarousel

Reusable image slider. Props: `images: ApartmentImage[]`, `height?: string`.

Features: cross-fade transitions, arrow navigation, dot indicators, touch swipe, lazy loading.

### GuestStepper

Increment/decrement control. Props: `value`, `onChange`, `min`, `max`.

### DateRangePicker

Custom calendar dropdown for selecting a date range (check-in / check-out).

| Feature | Details |
|---|---|
| **Trigger** | Input field showing `dd.mm.yyyy – dd.mm.yyyy` or placeholder text |
| **Dropdown** | Two months side-by-side (current + next). Navigation arrows to go forward/backward. |
| **Selection** | First click = check-in, second click = check-out. Range highlighted in between. |
| **Constraints** | Days before today disabled. Check-out must be after check-in. |
| **Close** | Clicking outside closes dropdown. Selecting check-out closes dropdown. |

### ApartmentMap

Leaflet/OpenStreetMap map component. Props: `apartments`, `hostSlug`, `lang`.

Shows markers for all apartments with valid lat/lng. Popups with apartment name + link. Auto-fits bounds.

### LocationMap

Simple Leaflet map centred on a single lat/lng coordinate with a marker. Used on apartment detail page. Props: `lat`, `lng`, `label`.

---

## 8. Date Format

The default date format across the entire application (booking, host, apex apps) is **`dd.mm.yyyy`** (e.g. `17.02.2026`).

A shared `formatDate(dateString)` helper converts `YYYY-MM-DD` strings to `dd.mm.yyyy` display format.

---

## 9. Currency Display

All prices display the host's `baseCurrency` symbol:

| Code | Symbol |
|---|---|
| CHF | CHF |
| EUR | € |
| USD | $ |
| GBP | £ |

Guest-side currency conversion (display-only) is a future feature.

---

## 10. Phase 2 Features (Deferred)

These features are planned but not in the initial implementation:

| Feature | Notes |
|---|---|
| **Availability calendar** | Full calendar with iCal integration showing booked/available dates |
| **"Only available" filter** | Requires iCal availability data |
| **Booking modal** | Name + guest count → generates mailto link or sends booking request |
| **iCal availability API** | Fetch + parse external iCal feeds, merge booked ranges (Cloud Function) |
| **Custom domains** | Host resolves by hostname instead of URL slug |

---

## 11. Service Dependencies

```
Host Home Page
  └── fetchHostBySlug(hostSlug)
  └── fetchApartments(hostId)

Apartment Detail Page
  └── fetchHostBySlug(hostSlug)
  └── fetchApartmentBySlug(hostId, apartmentSlug)
  └── fetchApartments(hostId)          ← "More apartments"
  └── fetchSeasons(hostId)             ← min stay display
```

---

## 12. Responsive Breakpoints

Standard Tailwind breakpoints:

| Prefix | Min-width | Usage |
|---|---|---|
| (none) | 0px | Mobile-first |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |

Key behaviours:
- Apartment grid: 1 → 2 → 3 columns
- Image gallery: 320px → 384px → 500px
- Amenities: 1 → 2 → 3 columns
- Booking links: stacked → inline
