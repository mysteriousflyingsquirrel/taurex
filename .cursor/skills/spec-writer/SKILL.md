---
name: spec-writer
description: Draft and refine product and technical specs before implementation. Use for new feature scoping, requirement clarification, and acceptance-criteria updates aligned to Taurex source-of-truth docs.
---

# Spec Writer

Draft and refine Taurex specifications before implementation work starts.

## When to Use

- New feature requests that need clear scope and acceptance criteria.
- Requirement changes that must update existing docs in `docs/specs/`.
- Ambiguous requests that require clarification before coding.
- Pre-implementation planning prompts that need testable outcomes.

## Required Sources of Truth

Review and align with:

- `docs/specs/` for app requirements and acceptance criteria.
- `docs/architecture.md` for system boundaries and cross-surface constraints.
- `docs/data-model.md` for Firestore structure and tenancy expectations.
- `docs/firebase.md` for Firebase configuration and platform conventions.

## Instructions

1. Restate the requested outcome in one concise objective.
2. Identify in-scope and out-of-scope items with smallest viable scope first.
3. Check relevant source-of-truth docs and align terminology/constraints.
4. List assumptions and open questions that block confident specification.
5. Produce explicit, testable acceptance criteria.
6. Call out cross-surface impacts (UI, backend, data model, rules) when relevant.
7. Keep output implementation-free unless the user explicitly asks for code.
8. Enforce date requirements in specs: display `dd-mm-yyyy`, storage/query `YYYY-MM-DD`.

## Output Template

Use this compact structure:

- Objective
- Scope
  - In scope
  - Out of scope
- Assumptions / Open Questions
- Acceptance Criteria
- Risks / Dependencies

## Guardrails

- Do not write implementation code in spec-only requests.
- Do not introduce architecture changes without source-of-truth support.
- Keep requirements concrete and verifiable, not aspirational.
- Preserve Taurex multi-tenant safety expectations in requirements language.
