# UI Theme Implementation Notes

## Architecture

- **Tailwind v4** CSS-first configuration — no `tailwind.config.*` files.
- Theme defined via CSS custom properties in `:root` (light) and `.dark` (dark mode).
- `@theme inline` in each app's global CSS maps vars to Tailwind utility classes.
- `@custom-variant dark (&:where(.dark, .dark *))` enables class-based dark mode.

## How to Switch Theme

- **Automatic:** Defaults to system preference via `prefers-color-scheme`.
- **Manual:** Host and Apex apps have a theme toggle in the sidebar footer (cycles system → light → dark).
- **Storage:** Persisted in `localStorage` under key `taurex-theme` (values: `"light"`, `"dark"`, `"system"`).
- **Flash prevention:** An inline `<script>` in `index.html` / `layout.tsx` applies `.dark` before React hydrates.

## Token Reference

| Token                | Utility class       | Light         | Dark          |
| -------------------- | ------------------- | ------------- | ------------- |
| `--background`       | `bg-background`     | `#FFFFFF`     | `#0B1120`     |
| `--foreground`       | `text-foreground`   | `#0F172A`     | `#F1F5F9`     |
| `--surface`          | `bg-surface`        | `#F8FAFC`     | `#0F1D32`     |
| `--surface-alt`      | `bg-surface-alt`    | `#F1F5F9`     | `#162844`     |
| `--border`           | `border-border`     | `#E2E8F0`     | `#1E3A5F`     |
| `--input`            | `border-input`      | `#CBD5E1`     | `#334155`     |
| `--muted`            | `text-muted`        | `#64748B`     | `#94A3B8`     |
| `--primary`          | `bg-primary`        | `#0EA5E9`     | `#38BDF8`     |
| `--primary-fg`       | `text-primary-fg`   | `#FFFFFF`     | `#0B1120`     |
| `--primary-hover`    | `bg-primary-hover`  | `#0284C7`     | `#0EA5E9`     |
| `--accent`           | `bg-accent`         | `#06B6D4`     | `#22D3EE`     |
| `--accent-fg`        | `text-accent-fg`    | `#FFFFFF`     | `#0B1120`     |
| `--ring`             | `ring-ring`         | `#0EA5E9`     | `#38BDF8`     |
| `--destructive`      | `bg-destructive`    | `#EF4444`     | `#F87171`     |
| `--destructive-bg`   | `bg-destructive-bg` | `#FEF2F2`     | `#451A1A`     |
| `--success`          | `text-success`      | `#16A34A`     | `#4ADE80`     |
| `--success-bg`       | `bg-success-bg`     | `#F0FDF4`     | `#14291A`     |
| `--warning`          | `text-warning`      | `#D97706`     | `#FBBF24`     |
| `--warning-bg`       | `bg-warning-bg`     | `#FFFBEB`     | `#422006`     |

## Files Touched

### CSS (theme tokens + base body style)

| File | Change |
| ---- | ------ |
| `apps/host/src/index.css` | Added `:root`, `.dark`, `@theme inline`, `@layer base` |
| `apps/apex/src/index.css` | Same |
| `apps/onboarding/app/globals.css` | Same |
| `apps/booking/app/globals.css` | Same |

### Theme hook (dark/light toggle)

| File | Change |
| ---- | ------ |
| `apps/host/src/hooks/useTheme.ts` | New — `useTheme()` hook |
| `apps/apex/src/hooks/useTheme.ts` | New — `useTheme()` hook |

### Flash prevention scripts

| File | Change |
| ---- | ------ |
| `apps/host/index.html` | Inline `<script>` before `#root` |
| `apps/apex/index.html` | Inline `<script>` before `#root` |
| `apps/onboarding/app/layout.tsx` | `dangerouslySetInnerHTML` script + `suppressHydrationWarning` |
| `apps/booking/app/layout.tsx` | `dangerouslySetInnerHTML` script + `suppressHydrationWarning` |

### Host app components & pages

| File | Change |
| ---- | ------ |
| `src/layouts/DashboardLayout.tsx` | Sidebar, nav, theme toggle, all color tokens |
| `src/pages/Login.tsx` | Form, inputs, buttons, error states |
| `src/components/Button.tsx` | Variant classes → tokens |
| `src/components/PageHeader.tsx` | Title text → `text-foreground` |
| `src/components/Toast.tsx` | Success/error → semantic tokens |
| `src/components/StickyFormFooter.tsx` | Container + warning text |
| `src/components/DiscardChangesModal.tsx` | Modal chrome → tokens |
| `src/components/AuthGuard.tsx` | Loading/error states |
| `src/components/AddressAutocomplete.tsx` | Input + dropdown |
| `src/components/AutosaveIndicator.tsx` | Status colors |
| `src/pages/Dashboard.tsx` | Stat cards, setup guide, actions |
| `src/pages/Apartments.tsx` | Table, empty state |
| `src/pages/ApartmentEdit.tsx` | Form, sections, amenities |
| `src/pages/Calendar.tsx` | Card chrome |
| `src/pages/Seasons.tsx` | Year selector, panels, modal |
| `src/pages/Settings.tsx` | Billing, currencies, languages |

### Apex app components & pages

| File | Change |
| ---- | ------ |
| `src/layouts/DashboardLayout.tsx` | Sidebar, nav, theme toggle |
| `src/pages/Login.tsx` | Form (APEX badge kept amber) |
| `src/components/Button.tsx` | Variant classes → tokens |
| `src/components/PageHeader.tsx` | Title text |
| `src/components/Toast.tsx` | Success/error |
| `src/components/StickyFormFooter.tsx` | Container + warning |
| `src/components/DiscardChangesModal.tsx` | Modal chrome |
| `src/components/ConfirmDeleteModal.tsx` | Modal chrome |
| `src/components/ApexGuard.tsx` | Loading state |
| `src/components/AddressAutocomplete.tsx` | Input + dropdown |
| `src/components/AutosaveIndicator.tsx` | Status colors |
| `src/pages/Dashboard.tsx` | Stats, revenue, host list |
| `src/pages/Apartments.tsx` | Table, selects |
| `src/pages/Users.tsx` | Table, create modal |
| `src/pages/Hosts.tsx` | Table, status badges |
| `src/pages/HostManageLayout.tsx` | Breadcrumb, confirm, safety |
| `src/pages/HostViewLayout.tsx` | Breadcrumb, title |
| `src/pages/HostConfigPage.tsx` | Config sections, toggles |
| `src/pages/HostForm.tsx` | Form, inputs |
| `src/pages/ApexApartmentEdit.tsx` | Form, sections |

### Onboarding app

| File | Change |
| ---- | ------ |
| `app/layout.tsx` | Flash script + `suppressHydrationWarning` |
| `app/page.tsx` | Nav, hero, features, pricing, CTA, footer |

### Booking app

| File | Change |
| ---- | ------ |
| `app/layout.tsx` | Flash script + `suppressHydrationWarning` + footer |
| `app/page.tsx` | Host list |
| `app/[hostSlug]/page.tsx` | Apartment cards, map |
| `app/[hostSlug]/[apartmentSlug]/page.tsx` | Detail page |
| `components/HostHeader.tsx` | Nav, language switcher |
| `components/AvailabilityBar.tsx` | Filters |
| `components/DateRangePicker.tsx` | Calendar widget |
| `components/GuestStepper.tsx` | Counter |
| `components/ImageCarousel.tsx` | Gallery |

## Not Changed

- **Business logic:** Zero changes to any service, hook, context, or data flow.
- **APEX badge:** Stays `bg-amber-500 text-gray-900` — intentional role indicator.
- **`packages/firebase`:** Untouched.
- **`scripts/generate-favicons.mjs`:** Untouched (pre-existing).
