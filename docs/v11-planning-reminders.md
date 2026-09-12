# 11.0 planning and reminders plan

## Goal

Turn check-in schedules and occasions into one predictable reminder center while preserving their current storage models and completion semantics.

## Delivery slices

1. Build a pure reminder projection model with stable identity, source, due date, urgency, completion state, and deterministic sorting.
2. Project occasions first, then scheduled check-in opportunities. Keep storage unchanged during this phase.
3. Add reminder-center UI for Today, upcoming, completed, and overdue entries with mobile-first density.
4. Add explicit snooze and skip semantics with local-date boundaries and migration coverage.
5. Publish an integration event contract for external reminder providers. Background notification support requires verified SiYuan APIs and remains outside the pure model.

## Ordering contract

- Due today and overdue entries appear before future entries.
- Within an urgency group, earlier due dates come first, followed by stable source and identity ordering.
- Completed entries remain queryable but do not displace pending entries.
- A reminder projection never writes check-in or occasion data by itself.

## Acceptance

- Timezone and local-date tests cover day boundaries.
- Repeated projection returns stable identities and does not mutate stores.
- Existing occasion completion and check-in recording continue through their current mutation paths.
- Desktop, mobile, ecosystem, performance, release, and production-build gates pass.
