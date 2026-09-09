# Today Workbench 4.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Today view into a shared mobile/desktop workbench with persistent filtering, grouping, sorting, and actionable progress summaries.

**Architecture:** Keep the existing store and event model. Add a small pure view-state/query layer in the existing TypeScript module, render the same semantic task data into responsive layouts, and preserve preferences through the existing preference persistence API.

**Tech Stack:** TypeScript, DOM rendering, SCSS, Node CJS tests, pnpm.

**Spec:** Confirmed in chat on 2026-09-10 as the first 4.0 sub-project.

## Global Constraints

- Preserve 3.0 data compatibility and existing event semantics.
- Keep mobile single-column quick check-in and desktop workbench layouts distinct.
- Do not add social, cloud sync, or reward-market features in this sub-project.
- New behavior must have a failing test before implementation.

---

### Task 1: Today View Query Contract

**Files:**
- Modify: `src/index.ts` near `renderToday`, `getTodayItems`, and view preference handlers.
- Test: `tests/today-view.test.cjs`.

- [x] Add focused tests for filtering by query, pending state, and deterministic sorting.
- [x] Implement the pure `queryTodayItems` helper using existing schedule and sorting predicates.
- [x] Run the focused test and the existing test suite.
- [x] Commit the deterministic Today query behavior.

### Task 2: Persistent Today Controls

**Files:**
- Modify: `src/index.ts` event binding and preference persistence.
- Test: `tests/today-view-preferences.test.cjs`.

- [x] Extend preference normalization for query and pending-only state.
- [x] Wire controls to the existing preference store without changing record data.
- [x] Re-render the Today view after control changes and preserve existing event semantics.
- [x] Run focused and full tests.
- [x] Commit the persistent Today controls.

### Task 3: Responsive Workbench Markup

**Files:**
- Modify: `src/index.ts` Today markup and summary markup.
- Test: `tests/responsive-layout.test.cjs`.

- [x] Add structure assertions for the summary region and Today navigation hooks.
- [x] Add semantic classes and ARIA labels while retaining current handlers and translations.
- [x] Run responsive and accessibility tests.
- [x] Commit the Today workbench semantic regions.

### Task 4: Mobile and Desktop Presentation

**Files:**
- Modify: `src/index.scss` Today, mobile navigation, and desktop container sections.
- Test: `tests/responsive-layout.test.cjs`, `tests/ui-theme.test.cjs`.

- [x] Add assertions for desktop two-column/three-column breakpoints and mobile single-column constraints.
- [x] Implement layout rules using existing tokens and semantic state colors in the isolated Today layer.
- [x] Verify reduced-motion and dark-theme selectors remain valid.
- [x] Run the complete test suite and production build.
- [x] Commit the responsive Today workbench presentation.

### Task 5: Release Verification

**Files:**
- Modify: `package.json`, `plugin.json` only if version metadata needs updating.
- Test: existing release checks and generated `package.zip`.

- [x] Run `pnpm.cmd test`, `pnpm.cmd run check:release`, and `pnpm.cmd run build`.
- [x] Verify package contents and release metadata with the existing release checks.
- [ ] Publish a 4.0 milestone after the remaining views receive the same visual treatment.
