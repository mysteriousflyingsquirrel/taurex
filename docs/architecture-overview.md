# Taurex.one – Architecture Overview

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

1. Marketing & Public Booking Application  
   Domain: https://taurex.one  
   Purpose: Public website and guest booking pages

   This application contains:
   - Marketing pages (landing, features, pricing, FAQ)
   - Public tenant pages (e.g. /<tenantSlug>)
   - Public booking pages (e.g. /<tenantSlug>/<apartmentSlug>)
   - Support for tenant custom domains

   Guests (end customers) access booking pages without authentication.

2. Tenant Application  
   Domain: https://app.taurex.one  
   Purpose: Customer-facing SaaS dashboard

   This application contains:
   - Login
   - Tenant dashboard
   - Apartment and calendar management
   - Tenant settings (including custom domain configuration)

   Access requires authentication.

3. Admin Application  
   Domain: https://admin.taurex.one  
   Purpose: Platform-wide administration and control

   This application contains:
   - Tenant overview
   - Platform configuration
   - System monitoring

   Access requires admin privileges.

Each application is deployed independently.

---

## 3. Public vs Private Access Model

The system defines three user types:

1. Guest  
   - End customer booking an apartment  
   - No login required  
   - Accesses:
     - https://taurex.one/<tenantSlug>
     - https://taurex.one/<tenantSlug>/<apartmentSlug>
     - Or a tenant custom domain (e.g. https://booking.stieregg.ch)

2. Tenant  
   - Apartment owner / customer of the SaaS  
   - Logs in at:
     - https://app.taurex.one  
   - Access is limited strictly to their own tenant-scoped data  
   - Cannot access other tenants or platform-level configuration

3. Admin  
   - Platform owner  
   - Logs in at:
     - https://admin.taurex.one  
   - Has full application-wide access  
   - Can manage all tenants and system-wide configuration  

There are no additional roles.

---

## 4. Tech Stack

### Frontend
- React 19
- TypeScript
- Vite 6 (all three apps are SPAs)
- Tailwind CSS v4 (via @tailwindcss/vite plugin)
- React Router DOM

### Backend
- Firebase (Auth, Firestore, Cloud Functions, Storage)

### Tooling
- npm workspaces (monorepo management)
- Single root package.json with workspace scripts

### Dev Servers
- Marketing: http://localhost:3000
- Tenant: http://localhost:3001
- Admin: http://localhost:3002

---

## 5. Repository Strategy

The project uses a monorepo structure managed with npm workspaces.

Single GitHub repository containing:

/apps
  /marketing      → @taurex/marketing (includes public booking pages)
  /tenant         → @taurex/tenant
  /admin          → @taurex/admin
/firebase         → @taurex/firebase (shared Firebase config, auth utilities, and admin scripts)
/docs

All applications share:
- Firebase configuration via @taurex/firebase workspace package
- Base TypeScript configuration (tsconfig.base.json)
- Shared utilities (if needed)

Each application:
- Has its own Vite configuration
- Has its own build process (tsc + vite build)
- Is deployed separately on Vercel

---

## 6. Hosting & Deployment

### Frontend Hosting
- Vercel
- One Vercel project per app
- Each app deployed from its respective folder

### Backend
- Firebase (single project initially)

Deployment flow:
- Git push → Vercel auto deploy
- Firebase deployed via CLI

---

## 7. Backend Services

The backend is fully managed.

Firebase provides:
- Authentication (Firebase Auth)
- Database (Firestore)
- Server logic (Cloud Functions)
- Optional storage (Firebase Storage)

No custom servers.
No self-managed infrastructure.

---

## 8. Authentication & Access Control

All private applications use Firebase Authentication.

### Role Model

1. Admin
   - Identified via Firebase custom claim:
     admin: true
   - Has full platform-wide access
   - Designated admin account: admin@taurex.one

2. Tenant
   - Authenticated user
   - Access restricted to their own tenant data

Guests do not authenticate.

Access control is enforced via:
- Frontend route guards
- Firestore security rules
- Firebase custom claims for admin

Admin claims are managed via a script using the Firebase Admin SDK:
- firebase/scripts/set-admin-claim.ts
- Requires a service account key (GOOGLE_APPLICATION_CREDENTIALS)
- Run with: npm run set-admin -w firebase

Hidden URLs are not considered security.

---

## 9. Custom Domain Model

Tenants may configure a custom domain for their public booking pages.

Example:
- booking.stieregg.ch

Custom domains:
- Point to the Marketing & Public Booking application
- Are resolved internally to the correct tenant
- Do not redirect visibly to taurex.one/<tenantSlug>
- Maintain tenant branding in the browser

Tenant dashboards remain exclusively on:
- https://app.taurex.one

Admin access remains exclusively on:
- https://admin.taurex.one

---

## 10. Separation of Concerns

Marketing & Public Booking App:
- Public content
- Guest booking flows
- Tenant-specific public pages
- Custom domain handling
- No private dashboard functionality

Tenant App:
- Authenticated tenant dashboard
- Tenant-scoped management
- No cross-tenant visibility
- No platform-wide control

Admin App:
- Platform-wide visibility
- Application-wide configuration
- Tenant management and monitoring

All applications communicate only with Firebase.

---

## 11. Design Principles

- Keep infrastructure minimal
- Prefer managed services
- Avoid premature complexity
- Separate public and private applications clearly
- Secure by default
- Optimize for developer simplicity

---

## 12. Summary

Taurex.one is structured as:

- One GitHub monorepo (npm workspaces)
- Three independent frontend applications (React, TypeScript, Vite, Tailwind CSS):
  - Marketing & Public Booking
  - Tenant Dashboard
  - Admin
- One shared Firebase package (@taurex/firebase)
- One managed backend (Firebase)
- Three Vercel deployments
- Three user types: Guest, Tenant, Admin

This architecture prioritizes clarity, simplicity, and strong separation between public booking flows, tenant management, and platform administration.
