---
name: release-qa
description: Run release-readiness QA checks after changes. Use for pre-merge or pre-release validation to confirm tests, regressions, and residual risks across touched Taurex surfaces.
---

# Release QA

Execute concise release-readiness validation after implementation work.

## When to Use

- Pre-merge checks for non-trivial changes.
- Pre-release validation across one or more app/package surfaces.
- Post-fix verification to confirm no regressions were introduced.
- Handoff checks when work is claimed complete.

## Required Inputs

Collect and use:

- Change scope (files/surfaces touched).
- Relevant test commands and expected behavior from specs.
- Latest signals from tests, linting, and manual verification.

## Required Sources of Truth

- `docs/specs/` for acceptance criteria and expected flows.
- `docs/architecture.md` and `docs/data-model.md` for cross-surface safety checks.
- `docs/ui/ui-constitution.md` and `docs/ui/ui-theme.md` for UI/UX and theme compliance.
- `storage.rules` when storage/data-access behavior is involved.

## Instructions

1. Restate release-check scope from changed surfaces.
2. Run or verify relevant automated checks (tests/lints/build where applicable).
3. Validate key user paths and edge states (loading/error/empty) for affected apps.
4. Confirm no obvious regressions against referenced acceptance criteria.
5. Identify security/tenancy/rules risks when backend or data behavior changed.
6. Summarize pass/fail status with evidence and remaining risk.
7. If failures are found, provide smallest safe fix path and re-check steps.

## Output Template

Use this compact structure:

- Validation Scope
- Checks Run
- Results (Pass/Fail/Partial)
- Regressions or Gaps
- Residual Risks
- Recommended Next Actions

## Guardrails

- Prefer evidence-backed conclusions over assumptions.
- Keep QA findings scoped to touched behavior and likely blast radius.
- Do not silently waive failing checks.
- If full verification is blocked, state exactly what is missing and why.
