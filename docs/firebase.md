# Firebase – Taurex.one

This document defines the Firebase project setup, authentication model, and host resolution logic.

It is the single source of truth for:
- Firebase project and services
- Authentication and role model
- Top-level collections (`hosts`, `users`)
- Host resolution logic
- Security rules

For host-scoped domain data (apartments, seasons, images), see [data-model.md](data-model.md).

Do not rename collections or change structure without updating this document.

---

## 1. Firebase Project

Single Firebase project (initially).

Services used:
- Firebase Auth
- Firestore
- Firebase Storage
- Cloud Functions (later)

Environment variables:

Vite apps (in `.env` per app):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Next.js apps (in `.env` per app):
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

Firebase is initialized in each app's entry point using `initFirebase()` from `@taurex/firebase` (`packages/firebase/src/config.ts`).

---

## 2. Top-Level Collections

The database uses a multi-host structure. There are two top-level collections for authentication and host resolution.

### 2.1 `hosts`

Path: `hosts/{hostId}`

Links a host ID to its metadata. The `hostId` equals the `slug` for simplicity.

```json
{
  "name": "Example Host",
  "slug": "examplehost"
}
```

All host-specific data (apartments, seasons, etc.) lives under `hosts/{hostId}/...` as subcollections. No host data may exist at root level.

### 2.2 `users`

Path: `users/{uid}`

Links a Firebase Auth user to a host. The `uid` must match the Firebase Authentication user UID exactly.

```json
{
  "hostId": "examplehost"
}
```

This collection is required for host resolution after login.

---

## 3. Authentication Model

Firebase Auth is used for all private applications. There are two authenticated roles.

### 3.1 Host

- Normal authenticated user
- Has a document in `users/{uid}` with a `hostId`
- Access limited to `hosts/{hostId}/...`
- No cross-host access allowed

### 3.2 Apex

- Platform owner
- Identified via Firebase custom claim: `admin: true`
- May access all hosts and use the apex application
- Designated apex account: `apex@taurex.one`

Apex claim is stored as a Firebase Auth custom claim (`admin: true`), not in Firestore.

Apex claims are managed via a script using the Firebase Admin SDK:
- Script: `packages/firebase/scripts/set-apex-claim.ts`
- Requires: `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Run with: `npm run set-apex -w packages/firebase`

Guests do not authenticate.

---

## 4. Host Resolution Logic (Host App)

After login:

1. Get current user UID
2. Read `users/{uid}`
3. Extract `hostId`
4. Read `hosts/{hostId}`
5. Load host context

Access is denied if:
- `users/{uid}` does not exist
- The referenced host ID does not exist

---

## 5. Public Booking Resolution (Booking App)

Public host pages are resolved by:

1. **URL slug:** `booking.taurex.one/{hostSlug}`
2. **Custom domain:** `booking.customer.com`

Custom domains map internally to `hosts/{hostId}`. The browser must not be redirected to `booking.taurex.one/{hostSlug}` — the host is resolved internally.

---

## 6. Firestore Security Rules

Conceptual rules (to be implemented):

- **Host users** may only read/write `hosts/{their-hostId}/...`
- **Apex** (`admin: true` claim) may read/write all hosts
- **Public read** access to `hosts/{hostId}/apartments` for the booking app (no auth required)
- **Guests** have no direct Firestore access to private data

Actual rules must enforce host isolation strictly.

---

## 7. Test Setup

To create a test host:

1. Create Firestore document: `hosts/examplehost`
   ```json
   { "name": "Example Host", "slug": "examplehost" }
   ```

2. Create Firebase Auth user: `host@example.com`

3. Create Firestore document: `users/{uid}`
   ```json
   { "hostId": "examplehost" }
   ```

4. Login at: http://localhost:3001

This must load the example host dashboard.
