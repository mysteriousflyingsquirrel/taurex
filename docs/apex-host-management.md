# Apex Host Management – Taurex.one

## 1. Purpose

The apex user can view and edit any host's full configuration from the apex dashboard, with a safety layer to prevent accidental changes.

---

## 2. Routes

| Route | Mode | Description |
|-------|------|-------------|
| `/hosts` | — | Hosts list (existing) |
| `/hosts/:hostId` | View | Read-only view of host config + apartments |
| `/hosts/:hostId/edit` | Edit | Security gate → full edit access |
| `/hosts/:hostId/edit/apartments/new` | Edit | Create new apartment for host |
| `/hosts/:hostId/edit/apartments/:slug` | Edit | Edit apartment for host |

---

## 3. View Mode

Read-only display of everything the host has:
- Host info (name, slug, languages, currency)
- Billing summary
- Apartments list (clickable for detail, but read-only)
- Same layout as edit mode, but all inputs disabled and action buttons hidden

---

## 4. Edit Mode

### Security Gate

Before the edit UI loads, the apex user must type a confirmation string:

```
edit host {slug}
```

Example: `edit host stieregg`

This prevents accidental edits. The gate blocks the entire edit view until confirmed.

### Edit UI

Once confirmed:
- Persistent amber banner: "You are editing {Host Name}'s configuration"
- Host settings (languages, currency) — editable with autosave
- Apartments list — add, edit, delete
- Clicking an apartment opens the full apartment editor

### Apartment Editor

Same editor as the host app (all sections: basic info, facts, images, amenities, location, booking links, pricing, minimum stay).

Autosave is active for existing apartments. New apartments require explicit creation.

---

## 5. Safety Principles

- Confirmation string required before any edit access
- Persistent visual indicator that apex is editing host data
- No autosave on the security gate — explicit confirmation only
- View mode is the default; edit requires deliberate navigation
