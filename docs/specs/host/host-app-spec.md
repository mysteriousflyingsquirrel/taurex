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

- **Sidebar**: Fixed width (`w-64`). Nav items: Dashboard → Calendar → Apartments → Bookings → Seasons → Settings. Active item highlighted. Active detection uses `pathname.startsWith(href)` for nested route support.
- **Main area**: Scrollable, padded.
- **Bottom of sidebar**: User email + Logout button.

---

## 3. Route Map

```
/login                   → Login page (no auth required)
/                        → Dashboard (setup guide + overview stats)
/calendar                → Availability timeline + blocking manager
/apartments              → Apartment list (table)
/apartments/new          → Create new apartment
/apartments/{slug}       → Edit existing apartment (autosave)
/bookings                → Booking requests (pending + processed, accept/decline)
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

**Purpose**: Manage availability across apartments with a 48-month timeline, color-coded source visibility, conflict visibility, and in-calendar blocking flow.

### Controls

| Control | Behaviour |
|---|---|
| **Scope selector** | Toggle between one apartment and all apartments overview |
| **Apartment selector** | Enabled in single-apartment mode |
| **Refresh/sync** | Manual sync button to fetch latest external iCal events before actions |
| **Timeline viewport** | Horizontally scrollable day grid covering current date through next 48 months |
| **Block mode** | Enables range selection directly on calendar day cells (single-apartment mode only) |
| **Block confirmation** | Popup confirms selected range before writing manual block |
| **Conflict dashboard** | Top summary of open conflicts and affected apartments |

### Timeline Behavior

- Timeline is horizontally scrollable and renders up to 48 months ahead from the current month.
- In single-apartment mode, one row is shown for the selected apartment.
- In all-apartments mode, each apartment is rendered as its own row against the same timeline.
- Month header uses short month + year labels (`Mon YYYY`).
- A dedicated top week track displays ISO calendar week numbers aligned to the day grid.
- Day cells are booking-style square buttons and show the calendar day number.
- Day states include:
  - available (green)
  - imported busy (per-import configured color)
  - manual block (orange)
  - conflict (red)
- If multiple import sources overlap on the same day, the day is treated as conflict (red).
- Calendar legend includes both fixed statuses and import source color map.

### Blocking Flow (strict no-overwrite)

1. Host enables **Block mode**.
2. Host selects start and end date directly on calendar cells.
3. Host confirms range in popup.
4. System runs sync first (auto sync exists in backend, manual sync triggered here).
5. If conflicts are detected, block write is rejected and conflicts are shown for manual resolution.
6. If no conflicts, manual block is stored.

### Sync Model

- Automatic periodic sync runs in backend.
- Manual sync is available in host UI.
- Imported calendars merge into apartment availability projection.

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

Title shows count: "Images (N)".

- **New mode**: Shows message "Save the apartment first to upload images." (images require a slug to determine the storage path).
- **Edit mode**: Renders the `ApartmentImageManager` component.

| Aspect | Specification |
|---|---|
| **Max images** | 15 per apartment |
| **Accepted formats** | JPEG, PNG, WebP |
| **Max file size** | 10 MB per file |
| **Grid** | 3 cols mobile, 4 cols desktop; each cell 4:3 aspect ratio |
| **Upload** | Hidden multi-file picker triggered by dashed "Add images" cell (last in grid) |
| **Client-side resize** | Each file is resized via canvas before upload: thumbnail max 768px wide (WebP), full-res max 1920px wide (WebP) |
| **Storage paths** | `thumbnails/{hostId}/{slug}/{filename}.webp` (thumb), `images/{hostId}/{slug}/{filename}.webp` (full-res) |
| **Persistence** | Immediate — each image uploads to Storage, then the apartment document's `images` array is updated. Does not participate in the form dirty/save flow. |
| **Remove** | X button overlay (top-right, visible on hover) deletes both Storage files and removes the entry from the `images` array. |
| **Limit enforcement** | "Add images" cell hidden when at 15 images. File picker limited to remaining slots. |
| **Loading** | Per-image spinner placeholder during upload; spinner in remove button during removal. |
| **Error display** | Inline below the grid (format/size validation, upload failures). |
| **Status line** | "{N}/15 images. JPEG, PNG, or WebP, max 10 MB each." |

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

| Area | Behaviour |
|---|---|
| **Booking links** | Same as before (label + URL list) |
| **Generated export iCal** | Created automatically for every apartment and rotatable via token action |
| **Import sources** | Host can add/remove external iCal sources (Airbnb/etc.), set source color, and toggle active state |
| **Import sync state** | Last sync status/time per source shown in host UI |
| **Conflict handling** | Imported overlaps and block conflicts shown explicitly; no silent overwrite |

#### Section G — Pricing (default: collapsed)

**Default Price ({baseCurrency}/night)**: Number input, **mandatory**. Currency label is dynamic from host settings.

**Per-season overrides** (dynamic): One field per season (current year) with colour dot and season name. Leave blank to use default.

#### Section H — Minimum Stay (default: collapsed)

**Default (nights)**: Number input (min 1), **mandatory**.

**Per-season overrides**: Same pattern as pricing — one field per current-year season.

#### Section I — Promotion (default: collapsed)

Hosts can configure one optional promotion per apartment.

| Field | Type | Rules |
|---|---|---|
| Name | Text | Optional display label, e.g. "Winter Deal" |
| Discount (%) | Number | Required for active promotion, integer 1–99 |
| Start date | Date | Required for active promotion |
| End date | Date | Required for active promotion; must be >= start date |

Behaviour:
- A single `promotion` object is stored on the apartment document (no promotion array).
- Promotion fields are directly editable in the apartment form (no dedicated Add/Edit promotion actions).
- In edit mode, promotion changes are local form changes and persist only when clicking `Save apartment`.
- `Remove promotion` clears the local promotion state; deletion persists on `Save apartment`.
- Booking visibility rule: once set, promotion is shown immediately and auto-hides when `endDate` is passed (display-only expiry; no automatic document deletion).
- Validation errors are shown inline and in the form validation summary.

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

## 7b. Bookings Page (`/bookings`)

**Purpose**: Review incoming booking requests and decide accept/decline with conflict-safe handling.

### 7b.1 Layout

- Header title: `Bookings`
- Two list segments:
  - **Pending** requests (`status = pending`)
  - **Processed** requests (`status = accepted | declined`)
- Desktop table + mobile cards pattern aligned with Apartments page conventions.

### 7b.2 Request Columns

| Column | Content |
|---|---|
| Apartment | Apartment name + slug |
| Dates | Check-in and check-out (`dd-mm-yyyy`) |
| Nights | Derived stay length |
| Guest | Name + email |
| Guests | Requested guest count |
| Price | Approximate total shown to host for review |
| Status | Pending / Accepted / Declined |
| Actions | Accept / Decline (pending only) |

### 7b.3 Decision Flow

**Accept**:
1. Trigger backend decision endpoint.
2. Backend refreshes iCal imports and re-checks overlaps/conflicts.
3. If valid, backend writes a calendar manual block tied to booking request ID.
4. Request status becomes `accepted`.

**Decline**:
1. Trigger backend decision endpoint.
2. Request status becomes `declined`.
3. No manual block is added.

For both outcomes, backend queues guest decision email through Firebase Trigger Email extension.

### 7b.4 Errors

- If accept fails due to conflict/race, host sees explicit error and request remains pending.
- Page supports retry without requiring hard refresh.

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
  └── refreshApartmentCalendarImports(hostId, apartmentSlug)
  └── setApartmentManualBlock(hostId, apartmentSlug, block)
  └── removeApartmentManualBlock(hostId, apartmentSlug, blockId)

Bookings Page
  └── fetchBookingRequests(hostId, status?)
  └── decideBookingRequest(hostId, requestId, decision)

Apartments List Page
  └── fetchApartments(hostId)
  └── deleteApartment(hostId, slug)

Apartment Edit Page
  └── fetchApartmentBySlug(hostId, slug)
  └── createApartment(hostId, apartment)
  └── updateApartment(hostId, slug, data)       ← autosave
  └── fetchSeasons(hostId)
  └── rotateApartmentCalendarExportToken(hostId, slug)
  └── addApartmentCalendarImport(hostId, slug, payload)
  └── removeApartmentCalendarImport(hostId, slug, importId)
  └── setApartmentCalendarImportActive(hostId, slug, importId, isActive)
  └── refreshApartmentCalendarImports(hostId, slug)
  └── uploadApartmentImage(hostId, slug, file)      ← immediate
  └── removeApartmentImage(hostId, slug, filename) ← immediate

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
- [ ] Sidebar has fixed width (`w-64`) with nav items: Dashboard, Calendar, Apartments, Bookings, Seasons, Settings.
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
- [ ] Calendar renders a horizontally scrollable 48-month timeline.
- [ ] Calendar header shows short month + year labels (`Mon YYYY`) and an aligned ISO week-number track.
- [ ] Host can switch between single-apartment mode and all-apartments overview.
- [ ] In single-apartment mode, host enables Block mode, selects date range on day cells, confirms in popup, and requests blocking.
- [ ] Blocking action requires a successful sync first; conflicts block writes.
- [ ] Automatic periodic sync plus manual sync button are both supported.
- [ ] Conflicts are shown explicitly and require manual host resolution (strict no-overwrite).
- [ ] Day colors follow mapping: available green, manual orange, import source color, conflict red.
- [ ] Calendar page shows top conflict dashboard and import color legend.

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
- [ ] Section C: In new mode, shows "Save the apartment first to upload images." In edit mode, shows image grid with upload/remove.
- [ ] Section C: Upload accepts JPEG/PNG/WebP up to 10 MB; client-side resizes to thumbnail (768px) and full-res (1920px) as WebP.
- [ ] Section C: Uploads save immediately to Storage and update apartment document; do not trigger form dirty state.
- [ ] Section C: Remove deletes both Storage files and updates apartment document.
- [ ] Section C: Maximum 15 images enforced; "Add images" cell hidden at limit.
- [ ] Section D: Amenities per language as chips with remove; Add input + Enter; trim and prevent duplicates.
- [ ] Section E: Address with Nominatim autocomplete (400ms debounce), lat/lng filled on selection.
- [ ] Section F: Booking links list and structured iCal import management.
- [ ] Every apartment has a generated export iCal feed and rotatable export token.
- [ ] Hosts can add/remove external iCal imports, set per-source colors, and toggle source activation.
- [ ] Section G: Default price (mandatory, currency from host); per-season overrides for current-year seasons.
- [ ] Section H: Default min stay (mandatory, min 1); per-season overrides for current-year seasons.
- [ ] Section I: Promotion uses single-save flow (no Add/Edit buttons, only Remove promotion action).
- [ ] Section I: Promotion add/edit/remove persist only via apartment Create/Save actions.
- [ ] Section I: Promotion validation enforces percent 1–99, start/end required, and start <= end.
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

### Bookings
- [ ] `/bookings` route is available to authenticated hosts.
- [ ] Pending and processed requests are shown in responsive list/table views.
- [ ] Each request shows apartment, stay dates, nights, guest identity, guest count, status, and actions.
- [ ] Accept action triggers backend sync + conflict re-check; on success request moves to accepted.
- [ ] Decline action updates request to declined without calendar write.
- [ ] Conflict/race failures on accept show explicit error and do not change request state.
- [ ] Guest decision email queueing is triggered for both accepted and declined outcomes.

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
