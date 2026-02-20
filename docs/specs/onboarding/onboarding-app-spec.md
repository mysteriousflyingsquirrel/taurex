# Onboarding App Specification — Taurex.one

## 1. Overview

The onboarding app (`@taurex/onboarding`) is the public marketing website at https://taurex.one. It presents the product to potential hosts, explains features and pricing, and directs users to the host dashboard to get started.

No authentication required. No Firebase dependency.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/postcss`) |
| SEO | SSR/SSG via Next.js |

No backend services. Static/marketing content only.

---

## 3. Route Map

```
/                → Landing page (hero, features, pricing, CTA, footer)
```

Single-page application. All sections are anchor-linked within the landing page.

---

## 4. Landing Page (`/`)

### 4.1 Navigation

Fixed top bar with blur background. Contains:
- Logo: "taurex" (left, links to `/`)
- Desktop links: Features (`#features`), Pricing (`#pricing`), Sign In (→ `host.taurex.one`), Get Started button (→ `host.taurex.one`)
- Mobile: links hidden (`md:flex`)

### 4.2 Hero Section

- Heading: "Vacation rentals, simplified" with accent color on "simplified"
- Subheading describing the product value proposition
- Two CTAs: "Start for Free" (primary → `host.taurex.one`), "Learn More" (secondary → `#features`)
- Gradient background (indigo/violet)

### 4.3 Features Section

Anchor: `#features`

Grid of 4 feature cards (1 col mobile, 2 cols sm, 4 cols lg):

| Feature | Description |
|---|---|
| Easy Booking Pages | Public booking pages, no middleman |
| Calendar Management | Intuitive calendar, no double-booking |
| Custom Domains | White-labeled booking pages |
| Secure & Simple | Enterprise infrastructure, effortless setup |

Each card: icon (SVG), title, description.

### 4.4 Pricing Section

Anchor: `#pricing`

Grid of 3 pricing cards (1 col mobile, 3 cols lg):

| Plan | Price | Highlighted |
|---|---|---|
| Starter | Free | No |
| Professional | CHF 29.00/month | Yes (accent background) |
| Business | CHF 79.00/month | No |

Each card: plan name, description, price, feature list with checkmarks, CTA button (→ `host.taurex.one`).

Highlighted plan has inverted color scheme (indigo background, white text).

### 4.5 CTA Section

Final call-to-action with heading, description, and "Get Started for Free" button (→ `host.taurex.one`).

### 4.6 Footer

Border-top separator. Contains: logo, copyright text. Responsive row (stacked on mobile).

---

## 5. External Links

All CTAs link to `https://host.taurex.one`:
- "Get Started" buttons
- "Start for Free" buttons
- "Sign In" link
- All pricing plan CTA buttons

No internal routing beyond the single page.

---

## 6. Responsive Design

Standard Tailwind breakpoints:

| Prefix | Min-width | Usage |
|---|---|---|
| (none) | 0px | Mobile-first |
| `sm` | 640px | Small adjustments |
| `md` | 768px | Nav links visible |
| `lg` | 1024px | Full grid layouts |

Key behaviours:
- Nav links: hidden on mobile, visible at `md`
- Feature grid: 1 → 2 → 4 columns
- Pricing grid: 1 → 3 columns
- Hero text: `text-5xl` → `text-7xl`
- Footer: stacked → row

---

## 7. Design

- Primary color: Indigo (`indigo-600`)
- Background: White with subtle gradient on hero
- Cards: Rounded corners (`rounded-2xl`), subtle borders
- Typography: System font, bold headings, gray body text
- Max content width: `max-w-7xl`

---

## Acceptance Criteria

### Navigation
- [ ] Fixed top nav with blur background is visible on all viewports
- [ ] Logo links to `/`
- [ ] Desktop nav shows Features, Pricing, Sign In, and Get Started links
- [ ] Nav links hidden on mobile (visible at `md` breakpoint)
- [ ] Sign In and Get Started link to `host.taurex.one`

### Hero
- [ ] Heading displays with accent color on "simplified"
- [ ] "Start for Free" button links to `host.taurex.one`
- [ ] "Learn More" button scrolls to `#features`
- [ ] Gradient background renders correctly

### Features
- [ ] 4 feature cards displayed in responsive grid (1/2/4 cols)
- [ ] Each card has icon, title, and description
- [ ] Section reachable via `#features` anchor

### Pricing
- [ ] 3 pricing plans displayed in responsive grid (1/3 cols)
- [ ] Professional plan visually highlighted (inverted colors)
- [ ] Each plan shows name, price, feature list, and CTA
- [ ] All CTA buttons link to `host.taurex.one`
- [ ] Section reachable via `#pricing` anchor

### CTA
- [ ] Final CTA section displays heading, description, and button
- [ ] Button links to `host.taurex.one`

### Footer
- [ ] Logo and copyright text displayed
- [ ] Responsive layout (stacked mobile, row desktop)

### Responsive
- [ ] Page renders correctly on mobile (375px)
- [ ] Page renders correctly on tablet (768px)
- [ ] Page renders correctly on desktop (1024px+)
- [ ] No horizontal scroll on any viewport
