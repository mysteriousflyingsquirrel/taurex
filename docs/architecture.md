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

Taurex.one consists of three separate frontend applications and one shared backend.

### Applications

1. **Site & Public Booking** — https://taurex.one
   - Public pages (landing, features, pricing, FAQ)
   - Public tenant pages (`/{tenantSlug}`)
   - Public booking pages (`/{tenantSlug}/{apartmentSlug}`)
   - Support for tenant custom domains
   - No authentication required

2. **Tenant Dashboard** — https://app.taurex.one
   - Login
   - Tenant dashboard
   - Apartment and calendar management
   - Tenant settings (including custom domain configuration)
   - Requires authentication

3. **Admin Dashboard** — https://admin.taurex.one
   - Tenant overview and billing management
   - Platform configuration
   - System monitoring
   - Requires admin privileges

Each application is deployed independently.

---

## 3. User Types

| Type | Access | Auth |
|---|---|---|
| **Guest** | Public booking pages, site | None |
| **Tenant** | Own tenant data via app.taurex.one | Firebase Auth |
| **Admin** | All tenants via admin.taurex.one | Firebase Auth + `admin: true` claim |

There are no additional roles.

---

## 4. Tech Stack

### Frontend
- React 19
- TypeScript
- Vite 6 (all three apps are SPAs)
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- React Router DOM

### Backend
- Firebase (Auth, Firestore, Cloud Functions, Storage)

### Tooling
- npm workspaces (monorepo management)
- Single root `package.json` with workspace scripts

### Dev Servers
- Site: http://localhost:3000
- Tenant: http://localhost:3001
- Admin: http://localhost:3002

---

## 5. Repository Structure

Monorepo managed with npm workspaces. Single GitHub repository.

```
/apps
  /site           → @taurex/site
  /tenant         → @taurex/tenant
  /admin          → @taurex/admin
/firebase         → @taurex/firebase (shared config, auth, services, types)
/docs
```

All applications share:
- Firebase configuration via `@taurex/firebase` workspace package
- Base TypeScript configuration (`tsconfig.base.json`)

Each application:
- Has its own Vite configuration
- Has its own build process (`tsc` + `vite build`)
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

**Site App:**
- Public content and guest booking flows
- Tenant-specific public pages
- Custom domain handling
- No private dashboard functionality

**Tenant App:**
- Authenticated tenant dashboard
- Tenant-scoped management
- No cross-tenant visibility
- No platform-wide control

**Admin App:**
- Platform-wide visibility and configuration
- Tenant management and monitoring

All applications communicate only with Firebase.

---

## 8. Admin Tenant Management

The admin can view and edit any tenant's full configuration directly from the admin dashboard.

| Route | Mode | Description |
|-------|------|-------------|
| `/tenants/:id` | View | Read-only view of settings, billing, apartments |
| `/tenants/:id/edit` | Edit | Security gate → full edit access |
| `/tenants/:id/edit/apartments/:slug` | Edit | Apartment editor for tenant |

Edit mode requires typing a confirmation string (`edit tenant {slug}`) before any changes can be made. A persistent amber banner indicates active edit mode.

See [docs/admin-tenant-management.md](admin-tenant-management.md) for full specification.

---

## 9. Billing Model

No feature tiers. No gating. Every tenant gets full access to all features.

Pricing is per apartment per month (standard rate: CHF 5).

| Billing State | Description |
|---------------|-------------|
| Unlocked | No charge (admin, demos) |
| Discounted | Custom rate per apartment (friends) |
| Standard | Default rate per apartment |

Managed by admin via Tenant Detail → Billing tab.

See [docs/billing.md](billing.md) for full specification.

---

## 10. Design Principles

- Keep infrastructure minimal
- Prefer managed services
- Avoid premature complexity
- Separate public and private applications clearly
- Secure by default
- Optimize for developer simplicity
