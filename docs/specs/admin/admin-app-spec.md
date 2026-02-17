# Admin App — Specification

## 1. Overview

The admin app (`@taurex/admin`) is the platform management interface for Taurex.one. It gives platform administrators full visibility and control over all tenants, users, and apartments across the system.

**Primary responsibilities:**
- Monitor platform health (stats, tenant/apartment counts)
- Manage tenants (create, edit, delete)
- Manage users (view, assign to tenants, delete)
- View all apartments across tenants (read-only oversight)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Vite SPA) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router DOM |
| Data | Firestore via `@taurex/firebase` |
| Auth | Firebase Authentication + custom `admin` claim |

Access is restricted to users with the `admin` custom claim on their Firebase Auth token.

---

## 3. Route Map

```
/login                  → Admin login
/                       → Dashboard (platform overview)
/tenants                → Tenant list
/tenants/new            → Create tenant
/tenants/:tenantId      → Tenant detail (apartments, seasons, users)
/tenants/:tenantId/edit → Edit tenant
/users                  → User list
/apartments             → Apartments overview (cross-tenant)
```

---

## 4. Authentication & Authorization

| Aspect | Implementation |
|---|---|
| **Login** | Email + password via Firebase Auth |
| **Guard** | `AdminGuard` checks `admin` custom claim on ID token |
| **Redirect** | Unauthenticated → `/login` |
| **Session** | `onAuthChanged` listener in `AuthContext` |

---

## 5. Layout

### Sidebar Navigation

Dark sidebar (`bg-gray-900`) with amber accent, consistent with existing design.

```
taurex [ADMIN]
─────────────
Dashboard
Tenants
Users
Apartments
─────────────
{user email}
Logout
```

Each nav item has an icon and highlights when active.

---

## 6. Dashboard (`/`)

Platform overview with live stats from Firestore.

### 6.1 Stat Cards

| Card | Data Source |
|---|---|
| **Total Tenants** | `fetchTenants().length` |
| **Total Apartments** | Sum of apartments across all tenants |
| **Total Users** | Count of user profiles |

### 6.2 Quick Actions

Buttons to: Create Tenant, View Tenants, View Users.

---

## 7. Tenant Management

### 7.1 Tenant List (`/tenants`)

Table with columns:

| Column | Source |
|---|---|
| **Name** | `tenant.name` |
| **Slug** | `tenant.slug` |
| **Languages** | `tenant.languages` as pills |
| **Currency** | `tenant.baseCurrency` |
| **Apartments** | Count fetched per tenant |
| **Actions** | View, Edit, Delete |

Search bar filters by name or slug (client-side).

### 7.2 Create Tenant (`/tenants/new`)

Form fields:

| Field | Type | Validation |
|---|---|---|
| **Name** | Text | Required |
| **Slug** | Text | Required, lowercase, alphanumeric + hyphens, unique |
| **Languages** | Multi-select checkboxes | At least 1 |
| **Base Currency** | Radio cards | Required, default CHF |

On submit: calls `createTenant()`. Navigates to `/tenants`.

### 7.3 Edit Tenant (`/tenants/:tenantId/edit`)

Same form as Create, pre-filled with existing values. Slug is **read-only** (cannot change after creation). On submit: calls `updateTenant()`.

### 7.4 Tenant Detail (`/tenants/:tenantId`)

Detail page showing:

1. **Header**: Tenant name, slug, languages, currency. Buttons: Edit, Delete, Open Public Page (link to `/{slug}`).
2. **Apartments tab**: Table of all apartments for this tenant (name, slug, price, location). Read-only.
3. **Seasons tab**: List of seasons for current year (name, color, date range count).
4. **Users tab**: List of users assigned to this tenant (email, UID).

### 7.5 Delete Tenant

**GitHub-style confirmation modal:**
- Warning: "This will permanently delete tenant **{name}** and all associated apartments, seasons, and user associations."
- Prompt: `To confirm, type delete {slug} below:`
- Text input must match exactly `delete {slug}`
- Delete button (red) is disabled until text matches
- On confirm: calls `deleteTenant()`, then navigates to `/tenants`

---

## 8. User Management

### 8.1 User List (`/users`)

Table with columns:

| Column | Source |
|---|---|
| **UID** | `userProfile.uid` |
| **Email** | Fetched via user UID (displayed as UID if email unavailable) |
| **Tenant** | `userProfile.tenantId` → resolved to tenant name |
| **Actions** | Delete |

Search bar filters by UID or tenant.

### 8.2 Delete User

**GitHub-style confirmation modal:**
- Warning: "This will remove the user profile for **{uid}**. The Firebase Auth account will not be affected."
- Prompt: `To confirm, type delete {uid} below:`
- Delete button disabled until text matches
- On confirm: deletes user profile doc from Firestore

> **Note**: Creating users and setting admin claims requires Firebase Admin SDK (Cloud Function). For now, user creation is done manually via Firebase Console. The admin app provides read + delete for user profiles.

---

## 9. Apartments Overview (`/apartments`)

Cross-tenant read-only view of all apartments on the platform.

### 9.1 Table

| Column | Source |
|---|---|
| **Name** | `apartment.name` |
| **Tenant** | Resolved from parent tenant |
| **Slug** | `apartment.slug` |
| **Price** | `apartment.priceDefault` + `tenant.baseCurrency` |
| **Location** | `apartment.location.address` (truncated) |
| **Images** | `apartment.images.length` |

### 9.2 Filters

- **Tenant dropdown**: Filter to a specific tenant
- **Search**: Filter by apartment name

This page is **read-only**. Apartments are managed by tenants in the tenant app.

---

## 10. Shared Components

### ConfirmDeleteModal

GitHub-style destructive action confirmation.

| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Whether modal is visible |
| `title` | `string` | e.g. "Delete Tenant" |
| `description` | `string` | What will happen |
| `confirmPhrase` | `string` | Exact text user must type |
| `buttonLabel` | `string` | e.g. "Delete Tenant" |
| `onConfirm` | `() => void` | Called when confirmed |
| `onCancel` | `() => void` | Called when cancelled |

The delete button is red and **disabled** until the typed input matches `confirmPhrase` exactly.

---

## 11. Firebase Service Extensions

The admin app needs a few additional service functions beyond what exists:

| Function | Description |
|---|---|
| `fetchAllUsers()` | Fetch all documents from `users` collection |
| `deleteUserProfile(uid)` | Delete a user profile document |
| `countApartments(tenantId)` | Fetch apartment count for a tenant |

These are added to the shared `@taurex/firebase` package.

---

## 12. Responsive Design

The admin app is primarily a desktop tool. Standard Tailwind breakpoints apply but the minimum usable width is tablet (`md: 768px`). The sidebar collapses to a hamburger menu on small screens is a future enhancement.
