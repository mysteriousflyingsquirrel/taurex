# Apex App — Specification

## 1. Overview

The apex app (`@taurex/apex`) is the platform management interface for Taurex.one. It gives platform administrators full visibility and control over all hosts, users, and apartments across the system.

**Primary responsibilities:**
- Monitor platform health (stats, host/apartment counts)
- Manage hosts (create, edit, delete)
- Manage users (view, assign to hosts, delete)
- View all apartments across hosts (read-only oversight)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Vite SPA) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router DOM |
| Data | Firestore via `@taurex/firebase` |
| Auth | Firebase Authentication + custom `apex` claim |

Access is restricted to users with the `apex` custom claim on their Firebase Auth token.

---

## 3. Route Map

```
/login                  → Apex login
/                       → Dashboard (platform overview)
/hosts                  → Host list
/hosts/new              → Create host
/hosts/:hostId          → Host detail (apartments, seasons, users)
/hosts/:hostId/edit     → Edit host
/users                  → User list
/apartments             → Apartments overview (cross-host)
```

---

## 4. Authentication & Authorization

| Aspect | Implementation |
|---|---|
| **Login** | Email + password via Firebase Auth |
| **Guard** | `ApexGuard` checks `apex` custom claim on ID token |
| **Redirect** | Unauthenticated → `/login` |
| **Session** | `onAuthChanged` listener in `AuthContext` |

---

## 5. Layout

### Sidebar Navigation

Dark sidebar (`bg-gray-900`) with amber accent, consistent with existing design.

```
taurex [APEX]
─────────────
Dashboard
Hosts
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
| **Total Hosts** | `fetchHosts().length` |
| **Total Apartments** | Sum of apartments across all hosts |
| **Total Users** | Count of user profiles |

### 6.2 Quick Actions

Buttons to: Create Host, View Hosts, View Users.

---

## 7. Host Management

### 7.1 Host List (`/hosts`)

Table with columns:

| Column | Source |
|---|---|
| **Name** | `host.name` |
| **Slug** | `host.slug` |
| **Languages** | `host.languages` as pills |
| **Currency** | `host.baseCurrency` |
| **Apartments** | Count fetched per host |
| **Actions** | View, Edit, Delete |

Search bar filters by name or slug (client-side).

### 7.2 Create Host (`/hosts/new`)

Form fields:

| Field | Type | Validation |
|---|---|---|
| **Name** | Text | Required |
| **Slug** | Text | Required, lowercase, alphanumeric + hyphens, unique |
| **Languages** | Multi-select checkboxes | At least 1 |
| **Base Currency** | Radio cards | Required, default CHF |

On submit: calls `createHost()`. Navigates to `/hosts`.

### 7.3 Edit Host (`/hosts/:hostId/edit`)

Same form as Create, pre-filled with existing values. Slug is **read-only** (cannot change after creation). On submit: calls `updateHost()`.

### 7.4 Host Detail (`/hosts/:hostId`)

Detail page showing:

1. **Header**: Host name, slug, languages, currency. Buttons: Edit, Delete, Open Public Page (link to `/{slug}`).
2. **Apartments tab**: Table of all apartments for this host (name, slug, price, location). Read-only.
3. **Seasons tab**: List of seasons for current year (name, color, date range count).
4. **Users tab**: List of users assigned to this host (email, UID).

### 7.5 Delete Host

**GitHub-style confirmation modal:**
- Warning: "This will permanently delete host **{name}** and all associated apartments, seasons, and user associations."
- Prompt: `To confirm, type delete {slug} below:`
- Text input must match exactly `delete {slug}`
- Delete button (red) is disabled until text matches
- On confirm: calls `deleteHost()`, then navigates to `/hosts`

---

## 8. User Management

### 8.1 User List (`/users`)

Table with columns:

| Column | Source |
|---|---|
| **UID** | `userProfile.uid` |
| **Email** | Fetched via user UID (displayed as UID if email unavailable) |
| **Host** | `userProfile.hostId` → resolved to host name |
| **Actions** | Delete |

Search bar filters by UID or host.

### 8.2 Delete User

**GitHub-style confirmation modal:**
- Warning: "This will remove the user profile for **{uid}**. The Firebase Auth account will not be affected."
- Prompt: `To confirm, type delete {uid} below:`
- Delete button disabled until text matches
- On confirm: deletes user profile doc from Firestore

> **Note**: Creating users and setting apex claims requires Firebase Admin SDK (Cloud Function). For now, user creation is done manually via Firebase Console. The apex app provides read + delete for user profiles.

---

## 9. Apartments Overview (`/apartments`)

Cross-host read-only view of all apartments on the platform.

### 9.1 Table

| Column | Source |
|---|---|
| **Name** | `apartment.name` |
| **Host** | Resolved from parent host |
| **Slug** | `apartment.slug` |
| **Price** | `apartment.priceDefault` + `host.baseCurrency` |
| **Location** | `apartment.location.address` (truncated) |
| **Images** | `apartment.images.length` |

### 9.2 Filters

- **Host dropdown**: Filter to a specific host
- **Search**: Filter by apartment name

This page is **read-only**. Apartments are managed by hosts in the host app.

---

## 10. Shared Components

### ConfirmDeleteModal

GitHub-style destructive action confirmation.

| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Whether modal is visible |
| `title` | `string` | e.g. "Delete Host" |
| `description` | `string` | What will happen |
| `confirmPhrase` | `string` | Exact text user must type |
| `buttonLabel` | `string` | e.g. "Delete Host" |
| `onConfirm` | `() => void` | Called when confirmed |
| `onCancel` | `() => void` | Called when cancelled |

The delete button is red and **disabled** until the typed input matches `confirmPhrase` exactly.

---

## 11. Firebase Service Extensions

The apex app needs a few additional service functions beyond what exists:

| Function | Description |
|---|---|
| `fetchAllUsers()` | Fetch all documents from `users` collection |
| `deleteUserProfile(uid)` | Delete a user profile document |
| `countApartments(hostId)` | Fetch apartment count for a host |

These are added to the shared `@taurex/firebase` package.

---

## 12. Responsive Design

The apex app is primarily a desktop tool. Standard Tailwind breakpoints apply but the minimum usable width is tablet (`md: 768px`). The sidebar collapses to a hamburger menu on small screens is a future enhancement.
