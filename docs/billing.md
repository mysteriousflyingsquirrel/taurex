# Billing – Taurex.one

## 1. Principle

No feature tiers. No gating. Every tenant gets full access to all features.

Billing is purely based on the number of apartments a tenant has.

The platform must be so simple that anyone can use it.

---

## 2. Billing Model

Each tenant pays a flat rate per apartment per month.

The standard rate is defined once as a platform-wide constant.

### Billing States

| State | Description | Price |
|-------|-------------|-------|
| **Unlocked** | No charge at all (admin, demos) | CHF 0 |
| **Discounted** | Custom price per apartment (friends, partners) | Custom |
| **Standard** | Default platform rate per apartment | Standard rate |

---

## 3. Data Model

### Platform Constant

```
STANDARD_PRICE_PER_APARTMENT = 5 (CHF/month)
```

Defined in code, not in the database.

### Tenant Billing Fields

Added to each tenant document in Firestore:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `billing.unlocked` | boolean | false | No charge at all |
| `billing.pricePerApartment` | number or null | null | Custom rate override. Null = standard rate |

---

## 4. Price Calculation

```
If unlocked → CHF 0 / month
If pricePerApartment is set → pricePerApartment × number of apartments
Otherwise → STANDARD_PRICE_PER_APARTMENT × number of apartments
```

---

## 5. Admin App

### Dashboard

Revenue overview stat card:
- Monthly Revenue (CHF) — sum of all tenant monthly totals
- Breakdown: X paying tenants · Y unlocked

### Tenants List

Billing-focused table. Columns:

| Column | Content |
|--------|---------|
| Name | Tenant name |
| Slug | Tenant slug |
| Apartments | Count |
| Rate | CHF X/apt, or "Free" if unlocked |
| Monthly Total | CHF amount (rate × apartments), or "Free" |
| Status | Badge: Unlocked (green) / Discounted (amber) / Standard (gray) |
| Actions | View / Edit |

Languages and currency are not shown here (detail view only).

### Tenant Detail Page

A "Billing" tab alongside Apartments, Seasons, Users:
- Unlock toggle with visual indicator
- Price per apartment field (editable, blank = standard rate)
- Calculated monthly total based on current apartment count

---

## 6. Tenant App

### Settings Page

Read-only billing summary:
- If unlocked: "Your account has full access — no charges apply."
- Otherwise: "CHF X / apartment / month · Y apartments · CHF Z / month total"

---

## 7. Not Included (Future)

- Stripe integration / self-service payments
- Invoicing
- Feature gating (intentionally none — ever)
- Plan tiers
