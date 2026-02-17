# Admin Tenant Management – Taurex.one

## 1. Purpose

The admin can view and edit any tenant's full configuration from the admin dashboard, with a safety layer to prevent accidental changes.

---

## 2. Routes

| Route | Mode | Description |
|-------|------|-------------|
| `/tenants` | — | Tenants list (existing) |
| `/tenants/:tenantId` | View | Read-only view of tenant config + apartments |
| `/tenants/:tenantId/edit` | Edit | Security gate → full edit access |
| `/tenants/:tenantId/edit/apartments/new` | Edit | Create new apartment for tenant |
| `/tenants/:tenantId/edit/apartments/:slug` | Edit | Edit apartment for tenant |

---

## 3. View Mode

Read-only display of everything the tenant has:
- Tenant info (name, slug, languages, currency)
- Billing summary
- Apartments list (clickable for detail, but read-only)
- Same layout as edit mode, but all inputs disabled and action buttons hidden

---

## 4. Edit Mode

### Security Gate

Before the edit UI loads, the admin must type a confirmation string:

```
edit tenant {slug}
```

Example: `edit tenant stieregg`

This prevents accidental edits. The gate blocks the entire edit view until confirmed.

### Edit UI

Once confirmed:
- Persistent amber banner: "You are editing {Tenant Name}'s configuration"
- Tenant settings (languages, currency) — editable with autosave
- Apartments list — add, edit, delete
- Clicking an apartment opens the full apartment editor

### Apartment Editor

Same editor as the tenant app (all sections: basic info, facts, images, amenities, location, booking links, pricing, minimum stay).

Autosave is active for existing apartments. New apartments require explicit creation.

---

## 5. Safety Principles

- Confirmation string required before any edit access
- Persistent visual indicator that admin is editing tenant data
- No autosave on the security gate — explicit confirmation only
- View mode is the default; edit requires deliberate navigation
