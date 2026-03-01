---
name: review-checklist
description: Perform findings-first code and change reviews. Use for review, audit, PR feedback, and post-change validation with severity-ordered findings, assumptions, and residual risk/test-gap callouts.
---

# Review Checklist

Run structured, evidence-based reviews for Taurex code and change sets.

## When to Use

- Explicit review, audit, or validation requests.
- PR feedback requests on changed files or branches.
- Post-implementation quality checks before sign-off.
- Risk-focused checks for regressions, tenancy, and security boundaries.

## Required Sources of Truth

Use relevant references based on the change surface:

- `docs/specs/` for acceptance criteria and expected behavior.
- `docs/ui/ui-constitution.md` for frontend behavior/UX compliance.
- `docs/architecture.md` and `docs/data-model.md` for system/data constraints.
- `storage.rules` when data access or storage behavior is touched.

## Instructions

1. Identify review scope and requested outcome.
2. Examine changed behavior, not only changed lines.
3. Prioritize findings by severity and user/business impact.
4. Validate against specs and observable evidence; avoid assumption-only claims.
5. Check for:
   - correctness and regressions
   - security and multi-tenant isolation risks
   - loading/error/empty/edge-state handling gaps
   - architecture/data-model/rules implications when relevant
6. Capture open questions that block confidence.
7. List residual risks and concrete test gaps.
8. Do not implement fixes unless explicitly requested.

## Output Template

Use this compact structure:

- Findings (ordered by severity)
- Impact Summary
- Open Questions / Assumptions
- Residual Risks / Test Gaps

## Guardrails

- Put findings first; keep summaries concise.
- Report evidence and probable impact, not just stylistic preferences.
- Avoid over-scoping unrelated concerns beyond likely blast radius.
- If no findings are present, state that explicitly and still call out residual risk level.
