# Taurex UI Constitution v3.1

This document defines the binding UI and interaction rules
for all Taurex applications:

- onboarding
- booking
- host
- apex

Consistency > creativity.
Clarity > cleverness.
Predictability > experimentation.

This is a contract, not a suggestion.

------------------------------------------------------------
1. CORE PRINCIPLE
------------------------------------------------------------

Taurex is built for non-technical users.

If a grandmother understands what to do without explanation,
the UI is correct.

Avoid:
- Technical language
- Clever wording
- Humor
- System terminology

Prefer:
- Explicit labels
- Action-oriented language
- Stable layouts

------------------------------------------------------------
2. PAGE LAYOUT STANDARD
------------------------------------------------------------

Every page must follow this structure:

[ Page Header ]
  - Title (left)
  - Primary Action (top-right)

[ Content Sections ]
  - Cards or Tables

No deviation allowed.

Primary Action Rules:
- Always top-right in header
- Only ONE primary button per page
- Additional actions must be secondary buttons
- No dropdown for primary actions
- No floating action buttons (no FAB)

Host & Apex override:
- Title ONLY
- No subtitles
- No secondary header text

On mobile:
- Primary action remains in header

------------------------------------------------------------
3. SIDEBAR
------------------------------------------------------------

Desktop:
- Always expanded

Mobile:
- Collapsed
- Hamburger menu top-left

Active state:
- Highlighted background only

Apex:
- Different sidebar color palette
- Everything else identical

------------------------------------------------------------
4. SPACING SYSTEM
------------------------------------------------------------

Strict 8px system.

Base unit: 8px

Allowed values:
4px (micro only)
8px
16px
24px
32px
40px
48px
64px

No arbitrary spacing values allowed.

------------------------------------------------------------
5. TYPOGRAPHY
------------------------------------------------------------

Single font family across all apps.

Hierarchy:

H1 – Page Title
H2 – Section Title
Body – Default text
Small – Secondary text

No decorative fonts.
No inconsistent sizing.

------------------------------------------------------------
6. BUTTONS (STRICT ENFORCEMENT)
------------------------------------------------------------

All buttons must:
- Have the same frame
- Have the same height (40px desktop, min 44px mobile)
- Have consistent padding
- Have consistent border radius

Allowed differences:
- Text
- Color
- Width

Primary:
- Solid fill
- One per page
- Bottom-right in forms

Secondary:
- Framed (not link style)
- Used for Cancel / Back

Destructive:
- Red
- Same size as primary
- Never hidden in dropdown

Strictly NOT allowed:
- Link-style buttons
- Text-only action buttons
- Mixed button heights
- Icon-only critical buttons

Table action buttons must follow the same height + framed rules.

------------------------------------------------------------
7. CARDS
------------------------------------------------------------

Padding: 24px
Vertical spacing between cards: 32px
Subtle shadow OR light border
No heavy shadows

------------------------------------------------------------
8. MODALS
------------------------------------------------------------

Width:
Max 480px (forms)
420px (confirmation)

Padding:
24px

Structure:
Title
Description
Content
Actions (primary right-aligned)

No full-screen modals on desktop.

------------------------------------------------------------
9. ICONS
------------------------------------------------------------

Allowed:
- Navigation
- Optional in buttons (left of text)

Not allowed:
- Icon-only critical actions
- Decorative-only icons

------------------------------------------------------------
10. DATE & TIME (IMMUTABLE)
------------------------------------------------------------

Date:
dd.mm.yyyy

Time:
HH:mm (24h)

No weekday.
No seconds.
No AM/PM.
Time only when relevant.

------------------------------------------------------------
11. CURRENCY (IMMUTABLE)
------------------------------------------------------------

Format:
CHF 1'000.00

Rules:
- Prefix before number
- Space between prefix and amount
- Apostrophe thousands separator
- Always 2 decimals

Same pattern for all currencies.

------------------------------------------------------------
12. TABLES
------------------------------------------------------------

Density: Medium
Row height: 44–48px

Structure:
Rightmost column: Actions

Row behavior:
Clicking row opens View

Actions:
View | Edit | Delete (red)

Delete:
Red
Visible
Not in dropdown

Search:
Inside table header row

Pagination:
None

Filtered empty state:
No results.
Clear filters.

Mobile:
Convert to card layout
No horizontal scroll

------------------------------------------------------------
13. FORMS (STICKY FOOTER + DIRTY STATE)
------------------------------------------------------------

Layout:
Single column only

Spacing:
16px between fields

Required:
Marked with *

Validation:
Inline + summary at bottom above primary button

Sticky Footer (MANDATORY for all save/create forms):
- Sticky to bottom of viewport
- Always visible
- Left: Cancel (secondary)
- Right: Primary (explicit granny label)
- Primary always bottom-right

Dirty State Indicator:
- If form data changed, show message next to primary button:
  "Unsaved changes"
- Visible only while dirty
- Disappears after save/reset

Unsaved Changes Guard (MANDATORY):

Any action that would lose entered data MUST trigger modal:

Trigger on:
- Route navigation
- Sidebar click
- Cancel button
- Row click while editing
- Closing modal form
- Switching tabs/sections

Modal:
Title: Discard changes?
Body: You have unsaved changes.
Actions: Cancel | Discard

Rules:
- Case-insensitive confirmation where applicable
- No browser confirm()
- No toast
- No silent discard
- No auto-save

------------------------------------------------------------
14. DESTRUCTIVE ACTIONS
------------------------------------------------------------

All destructive buttons:
Red

Delete confirmation:
User must type entity name to confirm.

Case-insensitive.

Applies to Host and Apex.

------------------------------------------------------------
15. EMPTY STATES
------------------------------------------------------------

Structure:
Title
Short explanation
Primary action

No illustrations.
No playful messaging.

------------------------------------------------------------
16. LOADING STATES
------------------------------------------------------------

Use spinners only.

Buttons:
Inline spinner replaces text

Page-level:
Centered spinner

Never disable silently.

------------------------------------------------------------
17. NOTIFICATIONS (TOASTS)
------------------------------------------------------------

Position:
Bottom-right

Success:
3 seconds
Auto dismiss

Error:
5 seconds
Manual dismiss required

Minimal wording only.

------------------------------------------------------------
18. ENTITY NAMING (FIXED)
------------------------------------------------------------

Use only:
Apartment
Host
Booking request

No synonyms.

------------------------------------------------------------
19. ACCESSIBILITY
------------------------------------------------------------

Minimum contrast:
WCAG AA compliant

All interactive elements:
Visible focus state

Touch targets:
Min 44px mobile

No color-only indicators.

------------------------------------------------------------
20. NON-NEGOTIABLES
------------------------------------------------------------

Do not:
- Change date format
- Change currency format
- Change toast position
- Introduce density differences
- Add floating action buttons
- Add auto-save
- Hide destructive actions
- Introduce playful tone
- Use link-style buttons
- Add subtitles in Host/Apex

Consistency > preference.
