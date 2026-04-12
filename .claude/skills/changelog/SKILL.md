---
name: changelog
description: Generate or update the changelog with recent feature changes. Also triggers after /pr to ask if new features should be documented.
allowed-tools: Bash Read Write Edit Grep Glob Agent
---

# Generate Changelog

Update `docs/CHANGELOG.md`, `README.md`, and supporting docs with new features since the last changelog commit.

## Context

Current changelog:
!`cat docs/CHANGELOG.md 2>/dev/null || echo "(no changelog yet)"`

Current README "What's New" section:
!`sed -n '/## What.s New/,/^## /p' README.md 2>/dev/null | head -30 || echo "(no What's New section yet)"`

Last changelog commit:
!`git log -1 --format="%H %as" -- docs/CHANGELOG.md 2>/dev/null || echo "(never committed)"`

Commits since last changelog update (excluding shaders and images):
!`git log $(git log -1 --format="%H" -- docs/CHANGELOG.md 2>/dev/null || echo "HEAD~50")..HEAD --no-merges --format="%h|%as|%s" -- ':!shaders' ':!public/images' ':!*.png' ':!*.jpg' ':!*.webp' ':!*.gif'`

Recent merges (for PR numbers):
!`git log $(git log -1 --format="%H" -- docs/CHANGELOG.md 2>/dev/null || echo "HEAD~50")..HEAD --merges --oneline | head -20`

Existing feature docs:
!`ls docs/*.md 2>/dev/null`

## When invoked directly (`/changelog`)

1. **Only add what's new**: Compare the commits above against what's already in the changelog. Skip anything already documented.

2. **Focus on what a user would be excited about**: New capabilities, meaningful UX improvements, and important fixes. Skip internal refactors, doc typos, CI tweaks, and code cleanup unless they change user-facing behavior.

3. **Categorize** into: **Features**, **Fixes**, or **Developer Experience**.

4. **Write concise entries**: Bold the feature name, dash, one-sentence description. Include PR numbers as GitHub links when available (e.g. `[#98](https://github.com/loqwai/paper-cranes/pull/98)`).

5. **Link to feature docs**: If a dedicated doc exists in `docs/`, link the entry to it. If a new feature is significant enough to warrant its own doc, create one — keep it lean (under 60 lines), focusing on non-obvious details.

6. **Update README.md**: Keep the "What's New" section near the top with the 3-5 most recent major features. This should read like highlights, not a full log — link to the changelog for the rest. Also update the Documentation table and "Fun developer features" bullets if new docs were created.

7. **Update CLAUDE.md** if new features add query params, new files, or architectural concepts. Keep additions minimal — one-line summaries with doc links.

8. **Group changelog entries by date**, newest first. Use `## YYYY-MM-DD` headers.

9. If `$ARGUMENTS` specifies a time range, use that instead of "since last changelog commit".

## When invoked after `/pr`

After a PR is created, review the commits included in that PR. If the PR introduces a feature that a user would be excited about (new capability, new query param, new UI, new integration — not just a fix or refactor), ask the user:

> "This PR adds [feature]. Want me to update the changelog?"

If they say yes, follow the steps above. If the PR is just a bugfix, refactor, or shader-only change, don't ask — it's not changelog-worthy.
