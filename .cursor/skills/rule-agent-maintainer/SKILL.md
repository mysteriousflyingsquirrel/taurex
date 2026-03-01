---
name: rule-agent-maintainer
description: Update and maintain Cursor project rules, skills, and subagents safely. Use when refining AI guidance, adjusting activation scope, or adding new persona agents for Taurex workflows.
---

# Rule Agent Maintainer

Maintain high-signal AI guidance assets in this repository:

- `.cursor/rules/`
- `.cursor/skills/`
- `.cursor/agents/`

## When to Use

- Creating or refining project rules in `.cursor/rules/`.
- Creating or refining skills in `.cursor/skills/`.
- Creating or refining subagents in `.cursor/agents/`.
- Reducing over-broad triggers or improving role boundaries.
- Aligning guidance assets to current Taurex architecture and docs.

## Required Sources of Truth

- `docs/architecture.md`
- `docs/data-model.md`
- `docs/firebase.md`
- `docs/specs/`
- `docs/ui/ui-constitution.md`
- `docs/ui/ui-theme.md`

## Instructions

1. Identify the exact guidance asset(s) to update (rule/skill/subagent).
2. Confirm desired activation style:
   - always apply
   - apply intelligently
   - file-scoped via globs
   - manual/explicit
3. Keep each asset focused on one responsibility with clear boundaries.
4. Improve description/frontmatter to increase relevance and reduce accidental activation.
5. Preserve naming consistency:
   - lowercase-hyphen IDs for skills and subagent names
   - folder name matches skill `name`
6. Add concise, testable output structures where useful.
7. Validate interactions with existing assets to avoid overlap and contradictory guidance.
8. Keep changes incremental and reviewable.

## Output Template

Use this compact structure:

- Target Asset(s)
- Intended Behavior
- Changes Applied
- Interaction Notes
- Validation Notes

## Guardrails

- Do not modify unrelated product code when working on guidance assets.
- Avoid duplicating guidance across multiple assets unless intentionally layered.
- Prefer explicit constraints over vague advice.
- Keep prompts concise; avoid bloated persona text without clear value.
