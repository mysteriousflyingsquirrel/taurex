# Firebase – Taurex.one

This document defines the Firebase project setup, authentication model, and tenant resolution logic.

It is the single source of truth for:
- Firebase project and services
- Authentication and role model
- Top-level collections (`tenants`, `users`)
- Tenant resolution logic
- Security rules

For tenant-scoped domain data (apartments, seasons, images), see [data-model.md](data-model.md).

Do not rename collections or change structure without updating this document.

---

## 1. Firebase Project

Single Firebase project (initially).

Services used:
- Firebase Auth
- Firestore
- Firebase Storage
- Cloud Functions (later)

Environment variables (in `.env.local` per app):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Firebase is initialized in `@taurex/firebase` (`firebase/src/config.ts`) and shared across all applications via the npm workspace.

---

## 2. Top-Level Collections

The database uses a multi-tenant structure. There are two top-level collections for authentication and tenant resolution.

### 2.1 `tenants`

Path: `tenants/{tenantId}`

Links a tenant ID to its metadata. The `tenantId` equals the `slug` for simplicity.

```json
{
  "name": "Example Tenant",
  "slug": "exampletenant"
}
```

All tenant-specific data (apartments, seasons, etc.) lives under `tenants/{tenantId}/...` as subcollections. No tenant data may exist at root level.

### 2.2 `users`

Path: `users/{uid}`

Links a Firebase Auth user to a tenant. The `uid` must match the Firebase Authentication user UID exactly.

```json
{
  "tenantId": "exampletenant"
}
```

This collection is required for tenant resolution after login.

---

## 3. Authentication Model

Firebase Auth is used for all private applications. There are two authenticated roles.

### 3.1 Tenant

- Normal authenticated user
- Has a document in `users/{uid}` with a `tenantId`
- Access limited to `tenants/{tenantId}/...`
- No cross-tenant access allowed

### 3.2 Admin

- Platform owner
- Identified via Firebase custom claim: `admin: true`
- May access all tenants and use the admin application
- Designated admin account: `admin@taurex.one`

Admin claim is stored as a Firebase Auth custom claim, not in Firestore.

Admin claims are managed via a script using the Firebase Admin SDK:
- Script: `firebase/scripts/set-admin-claim.ts`
- Requires: `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Run with: `npm run set-admin -w firebase`

Guests do not authenticate.

---

## 4. Tenant Resolution Logic (Tenant App)

After login:

1. Get current user UID
2. Read `users/{uid}`
3. Extract `tenantId`
4. Read `tenants/{tenantId}`
5. Load tenant context

Access is denied if:
- `users/{uid}` does not exist
- The referenced `tenantId` does not exist

---

## 5. Public Booking Resolution (Site App)

Public tenant pages are resolved by:

1. **URL slug:** `taurex.one/{tenantSlug}`
2. **Custom domain:** `booking.customer.com`

Custom domains map internally to `tenants/{tenantId}`. The browser must not be redirected to `taurex.one/{tenantSlug}` — the tenant is resolved internally.

---

## 6. Firestore Security Rules

Conceptual rules (to be implemented):

- **Tenant users** may only read/write `tenants/{their-tenantId}/...`
- **Admin** (`admin: true` claim) may read/write all tenants
- **Public read** access to `tenants/{tenantId}/apartments` for the site app (no auth required)
- **Guests** have no direct Firestore access to private data

Actual rules must enforce tenant isolation strictly.

---

## 7. Test Setup

To create a test tenant:

1. Create Firestore document: `tenants/exampletenant`
   ```json
   { "name": "Example Tenant", "slug": "exampletenant" }
   ```

2. Create Firebase Auth user: `tenant@example.com`

3. Create Firestore document: `users/{uid}`
   ```json
   { "tenantId": "exampletenant" }
   ```

4. Login at: http://localhost:3001

This must load the example tenant dashboard.
