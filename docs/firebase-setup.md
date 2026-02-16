# Firebase Setup – Taurex.one

This document defines the required Firebase structure for Taurex.one.

It is the single source of truth for:
- Collection names
- Document structure
- Role handling
- Tenant linkage

Do not rename collections or change structure without updating this document.

---

# 1. Firebase Project

Single Firebase project (initially).

Services used:
- Firebase Auth
- Firestore
- Cloud Functions (later)
- Firebase Storage (optional)

---

# 2. Firestore Collections

The database uses a multi-tenant structure.

There are only two top-level collections required for authentication and tenant resolution:

## 2.1 tenants (collection)

Path:
tenants/{tenantId}

Example:
tenants/exampletenant

Fields:
- name (string)
- slug (string)

Example document:
{
  "name": "Example Tenant",
  "slug": "exampletenant"
}

The tenantId equals the slug for simplicity.

All tenant-specific data (apartments, bookings, etc.) must live under:
tenants/{tenantId}/...

No tenant data may exist at root level.

---

## 2.2 users (collection)

Path:
users/{uid}

This links a Firebase Auth user to a tenant.

Fields:
- tenantId (string)

Example:
users/abc123uid

{
  "tenantId": "exampletenant"
}

The UID must match the Firebase Authentication user UID exactly.

This collection is required for tenant resolution after login.

---

# 3. Authentication Model

Firebase Auth is used for all private applications.

There are only two authenticated roles:

## 3.1 Tenant

- Normal authenticated user
- Has a document in:
  users/{uid}
- Has tenantId assigned
- Access limited to:
  tenants/{tenantId}/...

No cross-tenant access allowed.

---

## 3.2 Admin

- Platform owner
- Identified via Firebase custom claim:
  admin: true

Admin users may:
- Access all tenants
- Use the admin application

Admin claim is NOT stored in Firestore.
It is stored as a Firebase Auth custom claim.

---

# 4. Tenant Resolution Logic (Tenant App)

After login:

1. Get current user UID
2. Read:
   users/{uid}
3. Extract tenantId
4. Read:
   tenants/{tenantId}
5. Load tenant context

If users/{uid} does not exist:
→ Deny access

If tenantId does not exist:
→ Deny access

---

# 5. Public Booking Resolution (Marketing App)

Public tenant pages are resolved by:

1. URL slug:
   taurex.one/{tenantSlug}

OR

2. Custom domain:
   booking.customer.com

Custom domains must map internally to:
tenants/{tenantId}

The browser must not be redirected to taurex.one/{tenantSlug}.

Tenant is resolved internally.

---

# 6. Firestore Security Rules (Conceptual)

- Tenant users may only read/write:
  tenants/{tenantId}/...

- Admin (admin: true claim) may read/write all tenants.

- Guests have no direct Firestore access to private data.

Actual rules must enforce tenant isolation strictly.

---

# 7. Example Test Setup

To create a test tenant:

1. Create:
   tenants/exampletenant

2. Create Firebase Auth user:
   tenant@example.com

3. Create:
   users/{uid}
   {
     "tenantId": "exampletenant"
   }

Login at:
http://localhost:3001

This must load the example tenant dashboard.

---

# End of Firebase Setup
