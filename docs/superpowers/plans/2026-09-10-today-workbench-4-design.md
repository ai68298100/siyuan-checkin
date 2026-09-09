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

- [ ] Write failing tests for filtering by query, grouping by time/priority/group, and deterministic sorting.
- [ ] Run `node tests/today-view.test.cjs` and confirm failure because the exported/testable query contract is absent.
- [ ] Implement a pure `getTodayViewModel` helper using existing `sortCheckinItems`, `isComplete`, and schedule predicates.
- [ ] Run the focused test and then the existing test suite.
- [ ] Commit `feat(today): add deterministic workbench view model`.

### Task 2: Persistent Today Controls

**Files:**
- Modify: `src/index.ts` event binding and preference persistence.
- Test: `tests/today-view-preferences.test.cjs`.

- [ ] Add failing tests proving group mode, sort mode, query, and pending-only state normalize safely.
- [ ] Run the focused test and verify the expected failure.
- [ ] Wire controls to the existing preference store without changing record data.
- [ ] Re-render only the Today view after control changes and preserve scroll position.
- [ ] Run focused and full tests.
- [ ] Commit `feat(today): persist workbench controls`.

### Task 3: Responsive Workbench Markup

**Files:**
- Modify: `src/index.ts` Today markup and summary markup.
- Test: `tests/responsive-layout.test.cjs`.

- [ ] Add failing structure assertions for a summary region, group navigation hooks, and a single primary record action per task.
- [ ] Run the focused test and confirm failure.
- [ ] Add semantic classes and ARIA labels while retaining current handlers and translations.
- [ ] Run responsive and accessibility tests.
- [ ] Commit `feat(today): add workbench semantic regions`.

### Task 4: Mobile and Desktop Presentation

**Files:**
- Modify: `src/index.scss` Today, mobile navigation, and desktop container sections.
- Test: `tests/responsive-layout.test.cjs`, `tests/ui-theme.test.cjs`.

- [ ] Add failing assertions for desktop two-column/three-column breakpoints and mobile single-column constraints.
- [ ] Implement layout rules using existing tokens and semantic state colors.
- [ ] Verify reduced-motion and dark-theme selectors remain valid.
- [ ] Run the complete test suite and production build.
- [ ] Commit `feat(ui): present today workbench across devices`.

### Task 5: Release Verification

**Files:**
- Modify: `package.json`, `plugin.json` only if version metadata needs updating.
- Test: existing release checks and generated `package.zip`.

- [ ] Run `pnpm.cmd test`, `pnpm.cmd run check:release`, and `pnpm.cmd run build`.
- [ ] Verify JSON files are UTF-8 without BOM and package contents include `plugin.json`, `index.js`, `index.css`, README, LICENSE, icon, and preview.
- [ ] Commit the 4.0 milestone only after all checks pass.
