# Taurex.one UI Theme Specification

Derived from the Taurex logo palette: **space navy** backgrounds + **cyan/blue energy** accents.

---

## 1. Color Palette

### Brand Colors

| Name           | Hex       | Usage                              |
| -------------- | --------- | ---------------------------------- |
| Navy 950       | `#030B1A` | Deepest dark-mode background       |
| Navy 900       | `#0B1120` | Dark-mode page background          |
| Navy 800       | `#0F1D32` | Dark-mode surface / sidebar        |
| Navy 700       | `#162844` | Dark-mode elevated surface         |
| Navy 600       | `#1E3A5F` | Dark-mode borders                  |
| Sky 600        | `#0284C7` | Primary hover (light)              |
| Sky 500        | `#0EA5E9` | **Primary** — main action color    |
| Sky 400        | `#38BDF8` | Primary on dark backgrounds        |
| Cyan 600       | `#0891B2` | Accent hover (light)               |
| Cyan 500       | `#06B6D4` | **Accent** — secondary brand color |
| Cyan 400       | `#22D3EE` | Accent on dark backgrounds         |

### Neutral Scale (Slate)

| Token         | Light      | Dark       |
| ------------- | ---------- | ---------- |
| Background    | `#FFFFFF`  | `#0B1120`  |
| Surface       | `#F8FAFC`  | `#0F1D32`  |
| Surface-alt   | `#F1F5F9`  | `#162844`  |
| Border        | `#E2E8F0`  | `#1E3A5F`  |
| Input border  | `#CBD5E1`  | `#334155`  |
| Foreground    | `#0F172A`  | `#F1F5F9`  |
| Muted fg      | `#64748B`  | `#94A3B8`  |

### Status Colors

| Status      | Light      | Dark       |
| ----------- | ---------- | ---------- |
| Destructive | `#EF4444`  | `#F87171`  |
| Destr. bg   | `#FEF2F2`  | `#451A1A`  |
| Success     | `#16A34A`  | `#4ADE80`  |
| Success bg  | `#F0FDF4`  | `#14291A`  |
| Warning     | `#D97706`  | `#FBBF24`  |
| Warning bg  | `#FFFBEB`  | `#422006`  |

---

## 2. Design Tokens (CSS Custom Properties)

These tokens are set on `:root` (light) and `.dark` (dark mode). Tailwind v4 `@theme inline` maps them to utility classes.

```
--background         Page background
--foreground         Default text color
--surface            Card / panel background
--surface-alt        Alternate surface (sidebar, well)
--border             Default border color
--input              Input field border
--muted              Muted text color
--primary            Primary action color
--primary-fg         Text on primary background
--primary-hover      Primary hover state
--accent             Secondary brand color (cyan)
--accent-fg          Text on accent background
--accent-hover       Accent hover state
--ring               Focus ring color
--destructive        Error / destructive color
--destructive-bg     Destructive background tint
--success            Success color
--success-bg         Success background tint
--warning            Warning color
--warning-bg         Warning background tint
```

---

## 3. Component Styling Rules

### Cards

```
Background:   bg-surface
Border:       border border-border rounded-2xl
Shadow:       shadow-sm (light only — none in dark)
Padding:      p-6 or p-8
```

### Buttons

**Primary:**
```
bg-primary text-primary-fg
hover:bg-primary-hover
focus:ring-2 focus:ring-ring focus:ring-offset-2
border border-primary
```

**Secondary (ghost-bordered):**
```
bg-surface text-foreground
hover:bg-surface-alt
border border-border
focus:ring-2 focus:ring-ring focus:ring-offset-2
```

**Ghost:**
```
bg-transparent text-muted
hover:bg-surface-alt hover:text-foreground
focus:ring-2 focus:ring-ring
```

**Destructive:**
```
bg-destructive text-white
hover:opacity-90
focus:ring-2 focus:ring-destructive
border border-destructive
```

### Inputs

```
bg-background text-foreground
border border-input rounded-lg
placeholder:text-muted
focus:border-primary focus:ring-1 focus:ring-ring
```

### Focus Rings

```
ring-2 ring-ring ring-offset-2 ring-offset-background
```

All interactive elements must show a visible focus ring on `:focus-visible`.

### Sidebar (Host & Apex)

```
Light mode:  bg-surface-alt border-r border-border
Dark mode:   bg-surface-alt (resolves to navy-700)
```

Apex retains the "APEX" amber badge as a role indicator — not a theme color.

---

## 4. Usage Guidelines

- **Gradients:** Only for CTAs and hero sections (e.g., `bg-gradient-to-r from-primary to-accent`). Never on surfaces, cards, or sidebars.
- **Shadows:** Use `shadow-sm` in light mode for elevation. In dark mode, rely on border + surface color shifts instead of shadows.
- **Contrast:** All text/bg combinations must meet WCAG AA (4.5:1 for body text, 3:1 for large text). The primary palette on white achieves ≥ 4.5:1.
- **Opacity:** Do not use opacity for disabled states on colored backgrounds — use `disabled:opacity-50` only on the element itself.
- **Dark mode class:** Toggled via `.dark` on `<html>`. Defaults to system preference via `prefers-color-scheme`. Stored in `localStorage` key `taurex-theme`.
- **No glow effects.** No neon, no text-shadow, no box-shadow with color spread. Keep it minimal and premium.
