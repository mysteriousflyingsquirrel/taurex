# Host App Specification – Taurex.one

## 1. Authentication & Access

| Aspect | Specification |
|---|---|
| **Entry point** | https://host.taurex.one (dev: http://localhost:3001) |
| **Auth provider** | Firebase Authentication (email + password) |
| **Auth flow** | 1) User enters email/password → `signInWithEmailAndPassword()`. 2) On success, resolve `users/{uid}` → extract `hostId`. 3) Fetch `hosts/{hostId}` → load host context (including `languages`). 4) If `users/{uid}` does not exist or `hostId` is invalid → sign out + "Not authorized" error. 5) If valid → redirect to `/`. |
| **Session persistence** | Default Firebase persistence — survives browser restarts |
| **Route guard** | `AuthGuard` wraps all authenticated routes. On mount: if `loading` → show spinner; if `!user` → redirect to `/login`. After auth, `HostContext` resolves host. If resolution fails → sign out + redirect. |
| **Logout** | Button in sidebar → `signOut()` → redirect to `/login` |

### Host Resolution

After Firebase Auth succeeds, the app must resolve the host before rendering any dashboard content:

1. Read `users/{uid}` → extract `hostId`
2. Read `hosts/{hostId}` → load host metadata (including `languages` array)
3. If `languages` is empty/missing, default to `["en"]`
4. Provide `hostId`, `languages`, and `refreshHost()` via `HostContext` to all pages
5. All service calls use this `hostId` to scope Firestore paths

If resolution fails at any step, the user is signed out and shown an error.

---

## 2. Layout

```
┌──────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────────────┐ │
│ │  SIDEBAR  │ │         MAIN CONTENT             │ │
│ │           │ │                                  │ │
│ │ taurex    │ │  (varies by page)                │ │
│ │ ───────── │ │                                  │ │
│ │ Dashboard │ │                                  │ │
│ │ Calendar  │ │                                  │ │
│ │ Apartments│ │                                  │ │
│ │ Seasons   │ │                                  │ │
│ │ Settings  │ │                                  │ │
│ │           │ │                                  │ │
│ │ ───────── │ │                                  │ │
│ │ user@mail │ │                                  │ │
│ │ Logout    │ │                                  │ │
│ └──────────┘ └──────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- **Sidebar**: Fixed width (`w-64`). Nav items: Dashboard → Calendar → Apartments → Seasons → Settings. Active item highlighted. Active detection uses `pathname.startsWith(href)` for nested route support.
- **Main area**: Scrollable, padded.
- **Bottom of sidebar**: User email + Logout button.

---

## 3. Route Map

```
/login                   → Login page (no auth required)
/                        → Dashboard (setup guide + overview stats)
/calendar                → Read-only availability calendar
/apartments              → Apartment list (table)
/apartments/new          → Create new apartment
/apartments/{slug}       → Edit existing apartment (autosave)
/seasons                 → Season manager + calendar painter (autosave)
/settings                → Host settings: languages (autosave)
```

---

## 4. Dashboard Page (`/`)

**Purpose**: Guide the user through initial setup and show overview.

### Setup Guide

A checklist card shown until all steps are complete:

| Step | Condition for "done" | Link |
|---|---|---|
| Configure languages | `languages.length > 1` | `/settings` |
| Create seasons for {currentYear} | At least 1 season exists for current year | `/seasons` |
| Add your first apartment | At least 1 apartment exists | `/apartments/new` |
| Set pricing | At least 1 apartment has `priceDefault > 0` | `/apartments/{slug}` |

Progress bar shows `{done}/{total}`. When all complete: "🎉 All set!" with green styling.

### Stats Cards

- Apartments count (links to `/apartments`)
- Seasons count for current year (links to `/seasons`)
- Public page link (`taurex.one/{slug}`)

### Quick Actions

- "+ Add Apartment" button → `/apartments/new`
- "Manage Seasons" button → `/seasons`
- "Settings" button → `/settings`

---

## 5. Calendar Page (`/calendar`)

**Purpose**: Read-only overview of apartment availability (sourced from external iCal feeds).

### Controls

| Control | Behaviour |
|---|---|
| **Apartment selector** (dropdown) | "All Apartments" (default) or any single apartment |
| **← Prev / Today / Next →** buttons | Shift view by 1 month. "Today" resets to current month. |

### Data Source

Availability is fetched from iCal feeds configured per apartment (`icalUrls`). Implementation options:
- **Cloud Function** that fetches & parses iCal feeds server-side (recommended — avoids CORS)
- **Client-side** iCal parsing (CORS-dependent)

This feature may be deferred to a later phase. The page should gracefully handle missing iCal data.

---

## 6. Apartments Page (`/apartments`)

### 6.1 List View

| Column | Content | Responsive |
|---|---|---|
| **Apartment** | Name + slug | Always visible |
| **Guests** | Number | Hidden on mobile |
| **Bedrooms** | Number | Hidden on mobile |
| **m²** | Number or "—" | Hidden on mobile + tablet |
| **Price/night** | "{currency} X" (`priceDefault`) or "—" | Hidden on mobile |
| **Min Stay** | "X nights" (`minStayDefault`) or "—" | Hidden on mobile |
| **Actions** | Edit button + Delete button | Always visible |

- **Row click** → navigates to `/apartments/{slug}`.
- **"+ Add Apartment"** button (top right) → navigates to `/apartments/new`.
- **Delete**: Confirmation dialog. Deletes Firestore document. Removes row from table.
- **Empty state**: "No apartments yet." with "Create your first apartment" link.

### 6.2 Edit / Create Page (`/apartments/{slug}`)

**Route param**: `slug` = existing apartment slug or `"new"` for creation.

**Top bar**: ← Back button, title ("New Apartment" or "Edit: {name}"), autosave indicator.

**Autosave**: After initial creation, all edits are autosaved with a 1.5s debounce. New apartment creation still requires a manual "Create Apartment" button (sticky bottom bar).

#### Section A — Basic Info (default: open)

| Field | Type | Notes |
|---|---|---|
| Slug | Text input | Auto-slugified. Disabled after creation (immutable). |
| Name | Text input | **Required**. |
| Descriptions | Textarea per language | One textarea for each language from host's `languages` array. Label: "{Language} ({CODE})". |

#### Section B — Facts (default: open)

All fields are **mandatory**.

| Field | Type |
|---|---|
| Guests | Number (min 1) |
| Bedrooms | Number (min 0) |
| Bathrooms | Number (min 0) |
| Double Beds | Number (min 0) |
| Single Beds | Number (min 0) |
| Size (m²) | Number (min 0) |

Grid layout: 2 cols mobile, 3 cols desktop.

#### Section C — Images (default: open)

Title shows count: "Images (N)". Future feature — currently shows placeholder text.

#### Section D — Amenities (default: open)

One amenity list **per language** (from host's `languages` array).

Each language block:
- Language label: "{Language} ({CODE})"
- Existing amenities as **chips** (rounded pills with × remove buttons)
- Add input: text field + "Add" button. Also supports Enter key. Trims whitespace. Prevents duplicates.

#### Section E — Location (default: collapsed)

| Field | Type |
|---|---|
| Address | Text input with Nominatim autocomplete |
| Latitude | Number (step "any") |
| Longitude | Number (step "any") |

**Address autocomplete**: Searches via Nominatim API (debounced, 400ms) with `addressdetails=1`. Results are normalized to "Street Nr, ZIP City" format. Raw `display_name` shown as secondary text. Selecting a result fills address + lat/lng.

#### Section F — Booking & Availability (default: collapsed)

Same as before — booking links list and iCal URLs list.

#### Section G — Pricing (default: collapsed)

**Default Price ({baseCurrency}/night)**: Number input, **mandatory**. Currency label is dynamic from host settings.

**Per-season overrides** (dynamic): One field per season (current year) with colour dot and season name. Leave blank to use default.

#### Section H — Minimum Stay (default: collapsed)

**Default (nights)**: Number input (min 1), **mandatory**.

**Per-season overrides**: Same pattern as pricing — one field per current-year season.

### 6.3 Validation (on Create)

Required fields: slug, name, guests ≥ 1, bedrooms, bathrooms, doubleBeds, singleBeds, sqm > 0, priceDefault > 0, minStayDefault ≥ 1.

Validation errors shown in a red card above sections.

---

## 7. Seasons Page (`/seasons`)

**Purpose**: Create, edit, and delete seasons. Assign date ranges to seasons via a visual year calendar.

### 7.1 Header

- Title: "Seasons"
- Autosave indicator (saving/saved/error)

### 7.2 Year Selector

**Tab-style buttons** for available years: current year + next 4 (e.g. 2026, 2027, 2028, 2029, 2030). Selected year has indigo styling. Changing year fetches seasons for that year from Firestore.

### 7.3 Season List Panel

Card with "Seasons for {year} (N)" header.

**Actions**:
- "Copy from {year-1}" button — copies all seasons (with shifted dates) from previous year. Confirmation dialog.
- "+ Add Season" button — opens create modal.

**Season pills**: Horizontal flex-wrap list. Each pill:
- Colour dot + season name
- On hover: edit ✏️ + delete 🗑️ buttons

**Selected state**: Bold border, tinted background.

### 7.4 Create / Edit Modal

| Field | Type | Notes |
|---|---|---|
| Name | Text input | Shows generated ID preview: `{year}-{slugified-name}`. |
| Colour | Palette picker | 12 preset colours as circle buttons. |

**Create logic**:
1. Generate ID: `{year}-{slugify(name)}`
2. Validate: ID must not be empty, must not already exist for this year.
3. Create season with `year` field set to selected year and empty `dateRanges`.
4. Auto-select new season for painting.

**Edit logic**: Updates `name` and `color`.

### 7.5 Delete Flow

1. Confirmation dialog: "Are you sure you want to delete **{name}**?"
2. Immediate Firestore delete.
3. First remaining season auto-selected.

### 7.6 Year Calendar

12 mini-month components in responsive grid (2 cols mobile, 3 tablet, 4 desktop).

Each mini-month: month name heading, Mo–Su day headers, day cells as rounded buttons.

**Day cell states**: unassigned (grey), assigned (season colour), preview (reduced opacity), selection start (ring), hover (ring).

### 7.7 Painting Interaction

Same state machine as before:
- IDLE → click assigned day = remove; click other day = start range.
- RANGE_IN_PROGRESS → click = complete range (add to season, remove overlaps from others); Escape = cancel.

### 7.8 Autosave

Seasons are autosaved with a 2s debounce after any painting or editing. Delete is immediate (not batched).

### 7.9 Legend Panel

Card below calendar showing per-season day counts for the displayed year + "Default" days remaining.

---

## 8. Settings Page (`/settings`)

**Purpose**: Host configuration — base currency and language management.

### Host Info

Read-only display: Host ID, Name, Slug.

### Branding

Allows the host to upload a logo and banner image for their public booking page.

**Logo**:
- Preview of current logo (or placeholder icon)
- "Upload" button opens file picker; "Remove" button deletes the image
- Accepted formats: PNG, JPEG, WebP, SVG
- Max dimensions: 512×512px; max file size: 500 KB
- Stored at `branding/{hostId}/logo.{ext}` in Firebase Storage
- Download URL saved to `hosts/{hostId}.logoUrl`

**Banner**:
- Preview of current banner (or placeholder)
- "Upload" button opens file picker; "Remove" button deletes the image
- Accepted formats: PNG, JPEG, WebP
- Max dimensions: 1920×600px; max file size: 2 MB
- Stored at `branding/{hostId}/banner.{ext}` in Firebase Storage
- Download URL saved to `hosts/{hostId}.bannerUrl`

Both uploads save immediately (no dirty/save flow). On remove, the storage file is deleted and the host field is removed.

### Base Currency

- Description: "All prices are stored and displayed in this currency. Guests on your website will be able to convert prices to their preferred currency."
- Radio card list of available currencies: CHF (default), EUR, USD, GBP.
- Each card shows: symbol, label, code.
- Changes autosave (1s debounce) via `updateHost(hostId, { baseCurrency })`.
- All price labels in the host app update dynamically based on `baseCurrency` from context.
- Note: Guest-side currency conversion (display-only, using exchange rates) is handled by the booking app.

### Languages

- Description: "Choose which languages are available for apartment descriptions and amenities on your website."
- List of available languages: EN (default, always on, cannot be removed), DE, FR, IT.
- Each language shown as a toggle card with checkbox.
- Changes autosave (1s debounce) via `updateHost(hostId, { languages, baseCurrency })`.
- After save, `refreshHost()` updates the context so all pages immediately see updated settings.

---

## 9. Service Dependencies

```
Dashboard
  └── fetchApartments(hostId)
  └── fetchSeasons(hostId, currentYear)

Calendar Page
  └── fetchApartments(hostId)
  └── iCal availability (Cloud Function or client-side, phase 2)

Apartments List Page
  └── fetchApartments(hostId)
  └── deleteApartment(hostId, slug)

Apartment Edit Page
  └── fetchApartmentBySlug(hostId, slug)
  └── createApartment(hostId, apartment)
  └── updateApartment(hostId, slug, data)       ← autosave
  └── fetchSeasons(hostId)
  └── uploadImage / uploadBigImage                 ← future

Seasons Page
  └── fetchSeasons(hostId, year)
  └── setSeason(hostId, seasonId, data)          ← autosave
  └── deleteSeason(hostId, seasonId)
  └── copySeasonsToYear(hostId, fromYear, toYear)

Settings Page
  └── updateHost(hostId, { languages, baseCurrency })  ← autosave
  └── uploadHostLogo(hostId, file)                     ← immediate
  └── uploadHostBanner(hostId, file)                   ← immediate
  └── deleteStorageFile(path)                          ← immediate
  └── refreshHost()
```

---

## Acceptance Criteria

### Authentication & Access
- [ ] Login with email/password succeeds and redirects to `/`.
- [ ] Invalid or missing `users/{uid}` or `hostId` results in sign-out and "Not authorized" error.
- [ ] Host resolution: `users/{uid}` → `hostId`, then `hosts/{hostId}` loaded; empty/missing `languages` defaults to `["en"]`.
- [ ] `AuthGuard` shows spinner while loading; if `!user`, redirects to `/login`.
- [ ] Host resolution failure triggers sign-out and redirect.
- [ ] Logout button in sidebar calls `signOut()` and redirects to `/login`.
- [ ] Session persists across browser restart (Firebase default persistence).

### Layout
- [ ] Sidebar has fixed width (`w-64`) with nav items: Dashboard, Calendar, Apartments, Seasons, Settings.
- [ ] Active nav item is highlighted; active state uses `pathname.startsWith(href)` for nested routes.
- [ ] Bottom of sidebar shows user email and Logout button.
- [ ] Main content area is scrollable and padded.

### Dashboard
- [ ] Setup guide checklist is shown until all steps are complete.
- [ ] Checklist steps: Configure languages (`languages.length > 1` → link to `/settings`), Create seasons for current year (link `/seasons`), Add first apartment (link `/apartments/new`), Set pricing (at least one apartment with `priceDefault > 0`).
- [ ] Progress bar displays `{done}/{total}`.
- [ ] When all steps complete, "🎉 All set!" is shown with green styling.
- [ ] Stats cards show apartments count (link to `/apartments`), seasons count for current year (link to `/seasons`), and public page link `taurex.one/{slug}`.
- [ ] Quick actions: "+ Add Apartment" → `/apartments/new`, "Manage Seasons" → `/seasons`, "Settings" → `/settings`.

### Calendar
- [ ] Apartment selector offers "All Apartments" (default) and each single apartment.
- [ ] Prev / Today / Next month buttons shift view by one month; "Today" resets to current month.
- [ ] Page handles missing or unavailable iCal data without breaking (deferred).

### Apartments
- [ ] List view shows columns: Apartment (name + slug), Guests, Bedrooms, m², Price/night, Min Stay, Actions; responsive hiding per spec (e.g. m² hidden on mobile + tablet).
- [ ] Row click navigates to `/apartments/{slug}`.
- [ ] "+ Add Apartment" button navigates to `/apartments/new`.
- [ ] Delete shows confirmation dialog; on confirm, deletes Firestore document and removes row.
- [ ] Empty state shows "No apartments yet." and "Create your first apartment" link.
- [ ] Edit/Create page has Back button, title ("New Apartment" or "Edit: {name}"), and autosave indicator.
- [ ] After creation, edits autosave with 1.5s debounce; new apartment requires manual "Create Apartment" (sticky bottom bar).
- [ ] Section A: Slug auto-slugified and disabled after creation; Name required; Descriptions textarea per host language.
- [ ] Section B: All fields mandatory (guests ≥ 1, bedrooms, bathrooms, doubleBeds, singleBeds, sqm ≥ 0); grid 2 cols mobile, 3 desktop.
- [ ] Section C: Images section shows placeholder (deferred).
- [ ] Section D: Amenities per language as chips with remove; Add input + Enter; trim and prevent duplicates.
- [ ] Section E: Address with Nominatim autocomplete (400ms debounce), lat/lng filled on selection.
- [ ] Section F: Booking links list and iCal URLs list.
- [ ] Section G: Default price (mandatory, currency from host); per-season overrides for current-year seasons.
- [ ] Section H: Default min stay (mandatory, min 1); per-season overrides for current-year seasons.
- [ ] Create validation: required slug, name, guests ≥ 1, bedrooms, bathrooms, doubleBeds, singleBeds, sqm > 0, priceDefault > 0, minStayDefault ≥ 1; errors in red card above sections.

### Seasons
- [ ] Header shows title "Seasons" and autosave indicator (saving/saved/error).
- [ ] Year selector shows current year + next 4 as tabs; selected year has indigo styling; changing year loads seasons for that year.
- [ ] Season list card: "Seasons for {year} (N)", "Copy from {year-1}" with confirmation, "+ Add Season" opens create modal.
- [ ] Season pills show colour dot + name; hover reveals edit and delete; selected has bold border and tinted background.
- [ ] Create/Edit modal: Name (with ID preview `{year}-{slugified-name}`), Colour (12 preset palette).
- [ ] Create: ID = `{year}-{slugify(name)}`; validated non-empty and unique for year; new season has empty `dateRanges` and is auto-selected.
- [ ] Edit updates name and color.
- [ ] Delete: confirmation "Are you sure you want to delete **{name}**?"; Firestore delete; first remaining season auto-selected.
- [ ] Year calendar: 12 mini-months in responsive grid (2/3/4 cols); Mo–Su headers; day cells as rounded buttons with states: unassigned (grey), assigned (season colour), preview, selection start (ring), hover (ring).
- [ ] Painting: IDLE — click assigned day removes; click other starts range. RANGE_IN_PROGRESS — click completes range (add to season, remove overlaps); Escape cancels.
- [ ] Seasons autosave with 2s debounce after painting or editing; delete is immediate.
- [ ] Legend panel shows per-season day counts and "Default" days remaining for the displayed year.

### Settings
- [ ] Host info displayed read-only: Host ID, Name, Slug.
- [ ] Branding section shows logo preview (or placeholder) with Upload and Remove buttons.
- [ ] Logo upload validates max 512×512px, max 500 KB, accepted formats: PNG, JPEG, WebP, SVG.
- [ ] Branding section shows banner preview (or placeholder) with Upload and Remove buttons.
- [ ] Banner upload validates max 1920×600px, max 2 MB, accepted formats: PNG, JPEG, WebP.
- [ ] Upload saves file to Firebase Storage and persists download URL to host document immediately.
- [ ] Remove deletes file from Storage and removes URL from host document.
- [ ] Base currency: description shown; radio cards CHF (default), EUR, USD, GBP; selection autosaves (1s debounce) via `updateHost(hostId, { baseCurrency })`.
- [ ] Price labels across host app use `baseCurrency` from context.
- [ ] Languages: description shown; EN default and always on (cannot be removed); DE, FR, IT as toggle cards; changes autosave (1s debounce) via `updateHost(hostId, { languages, baseCurrency })`.
- [ ] After language/currency save, `refreshHost()` runs so all pages see updated settings immediately.
