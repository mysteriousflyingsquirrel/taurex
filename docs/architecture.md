# Architecture – Taurex.one

## 1. Purpose

This document defines the high-level technical architecture of Taurex.one.

The goal is to:
- Keep the system simple
- Separate concerns clearly
- Minimize infrastructure complexity
- Ensure security by design
- Enable long-term scalability without early overengineering

---

## 2. System Structure

Taurex.one consists of four separate frontend applications and one shared backend.

### Applications

1. **Onboarding** — https://taurex.one
   - Marketing pages (landing, features, pricing, FAQ)
   - Onboarding flows
   - No authentication required
   - **Tech: Next.js** (SEO important)

2. **Booking** — https://booking.taurex.one
   - Public host pages (`/{hostSlug}`)
   - Public booking pages (`/{hostSlug}/{apartmentSlug}`)
   - Support for host custom domains
   - No authentication required
   - **Tech: Next.js** (SEO important)

3. **Host Dashboard** — https://host.taurex.one
   - Login
   - Host dashboard
   - Apartment and calendar management
   - Host settings (including custom domain configuration)
   - Requires authentication
   - **Tech: Vite + React SPA**

4. **Apex Dashboard** — https://apex.taurex.one
   - Host overview and billing management
   - Platform configuration
   - System monitoring
   - Requires apex privileges
   - **Tech: Vite + React SPA**

Each application is deployed independently.

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel (Hosting)                        │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Onboarding  │ │   Booking    │ │   Host   │ │   Apex   │   │
│  │  (Next.js)   │ │  (Next.js)   │ │  (Vite)  │ │  (Vite)  │   │
│  │  taurex.one  │ │booking.taurex│ │host.taurex│ │apex.taurex│  │
│  │              │ │   .one       │ │  .one    │ │  .one    │   │
│  │  No auth     │ │  No auth     │ │ Auth req │ │ Apex req │   │
│  └──────────────┘ └──────┬───────┘ └────┬─────┘ └────┬─────┘   │
│                          │              │             │         │
└──────────────────────────┼──────────────┼─────────────┼─────────┘
                           │              │             │
                    read-only        read/write     read/write
                     (public)      (host-scoped)     (all hosts)
                           │              │             │
                  ┌────────┴──────────────┴─────────────┴────────┐
                  │              Firebase (Backend)                │
                  │                                               │
                  │  ┌────────────┐  ┌───────────┐  ┌─────────┐  │
                  │  │    Auth    │  │ Firestore │  │ Storage │  │
                  │  └────────────┘  └───────────┘  └─────────┘  │
                  │                                               │
                  │  ┌──────────────────────────────────────────┐ │
                  │  │  @taurex/firebase (shared package)       │ │
                  │  │  config · auth · types · services        │ │
                  │  └──────────────────────────────────────────┘ │
                  └───────────────────────────────────────────────┘
```

---

## 3. User Types

| Type | Access | Auth |
|---|---|---|
| **Guest** | Public booking pages, onboarding site | None |
| **Host** | Own host data via host.taurex.one | Firebase Auth |
| **Apex** | All hosts via apex.taurex.one | Firebase Auth + `admin: true` claim |

There are no additional roles.

---

## 4. Tech Stack

### Frontend
- React 19
- TypeScript
- Onboarding + Booking: **Next.js 15** (App Router, SSR/SSG for SEO)
- Host + Apex: **Vite 6** (SPAs, SEO irrelevant)
- Tailwind CSS v4
  - Vite apps: via `@tailwindcss/vite` plugin
  - Next.js apps: via `@tailwindcss/postcss`
- React Router DOM (Vite apps only)

### Backend
- Firebase (Auth, Firestore, Cloud Functions, Storage)

### Tooling
- npm workspaces (monorepo management)
- Single root `package.json` with workspace scripts

### Dev Servers
- Onboarding (Next.js): http://localhost:3000
- Host (Vite): http://localhost:3001
- Apex (Vite): http://localhost:3002
- Booking (Next.js): http://localhost:3003

---

## 5. Repository Structure

Monorepo managed with npm workspaces. Single GitHub repository.

```
/apps
  /onboarding     → @taurex/onboarding (Next.js)
  /booking        → @taurex/booking (Next.js)
  /host           → @taurex/host (Vite SPA)
  /apex           → @taurex/apex (Vite SPA)
/packages
  /firebase       → @taurex/firebase (shared config, auth, services, types)
/docs
```

All applications share:
- Firebase configuration via `@taurex/firebase` workspace package
- Base TypeScript configuration (`tsconfig.base.json`)

### Firebase Initialization

The `@taurex/firebase` package exports an `initFirebase(config)` function. Each app initializes Firebase with its own environment variables:
- Vite apps: `import.meta.env.VITE_*`
- Next.js apps: `process.env.NEXT_PUBLIC_*`

Each application:
- Has its own build configuration (Vite or Next.js)
- Has its own build process
- Is deployed separately on Vercel

---

## 6. Hosting & Deployment

### Frontend
- Vercel — one project per app, deployed from its respective folder
- Git push → Vercel auto deploy

### Backend
- Firebase (single project initially)
- Deployed via Firebase CLI

---

## 7. Separation of Concerns

**Onboarding App:**
- Marketing content and onboarding flows
- Links to Host Dashboard for sign-in/registration
- No Firebase dependency

**Booking App:**
- Guest-facing host pages and booking flows
- Host-specific public pages
- Custom domain handling
- No private dashboard functionality

**Host App:**
- Authenticated host dashboard
- Host-scoped management
- No cross-host visibility
- No platform-wide control

**Apex App:**
- Platform-wide visibility and configuration
- Host management and monitoring

All applications communicate only with Firebase.

---

## 8. Apex Host Management

The apex user can view and edit any host's full configuration directly from the apex dashboard.

| Route | Mode | Description |
|-------|------|-------------|
| `/hosts/:id` | View | Read-only view of settings, billing, apartments |
| `/hosts/:id/edit` | Edit | Security gate → full edit access |
| `/hosts/:id/edit/apartments/:slug` | Edit | Apartment editor for host |

Edit mode requires typing a confirmation string (`edit host {slug}`) before any changes can be made. A persistent amber banner indicates active edit mode.

See [docs/apex-host-management.md](apex-host-management.md) for full specification.

---

## 9. Billing Model

No feature tiers. No gating. Every host gets full access to all features.

Pricing is per apartment per month (standard rate: CHF 5).

| Billing State | Description |
|---------------|-------------|
| Unlocked | No charge (apex, demos) |
| Discounted | Custom rate per apartment (friends) |
| Standard | Default rate per apartment |

Managed by apex via Host Detail → Billing tab.

See [docs/billing.md](billing.md) for full specification.

---

## 10. Design Principles

- Keep infrastructure minimal
- Prefer managed services
- Avoid premature complexity
- Separate public and private applications clearly
- Secure by default
- Optimize for developer simplicity
