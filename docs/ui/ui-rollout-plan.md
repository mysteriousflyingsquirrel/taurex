# UI Constitution Rollout Plan

Apply Taurex UI Constitution v3 across existing code.
No business logic changes.

## Targets

- **Toasts:** bottom-right, success 3s auto-dismiss, error 5s manual dismiss
- **Dates:** dd-mm-yyyy, time HH:mm only when relevant
- **Currency:** CHF 1'000.00 (prefix + space + 2 decimals)
- **Tables:** actions column rightmost, View / Edit / Delete text buttons, row click = View
- **Forms:** single column, required *, validation summary at bottom, Cancel left, primary right (explicit label)
- **Layout:** header title left + primary action top-right
- **Mobile:** tables to cards, sidebar hamburger, no FAB

## Order of Work

1. Shared UI primitives (toast, buttons, table, form)
2. Host app pages
3. Apex app pages
4. Booking app pages
5. Onboarding app pages

## Done Definition

- No duplicated formatting logic in pages
- Components enforce the UI rules by default
