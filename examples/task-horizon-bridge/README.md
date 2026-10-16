# Task Horizon bridge example

This example consumes only the public `window.siyuanCheckin` facade. It does not
inspect Task Horizon's blocks or private storage: the host supplies `itemId`,
`blockId`, `localDate`, and invokes `recordTaskCompletion` only after a real
native checkbox completion.

Write-back is a one-way, current-local-day v4 example. Undoing a Task Horizon
checkbox does not retract a recorded check-in fact. Historical backfill and
v5 batch write-back are outside this bridge.

```js
const bridge = createTaskHorizonBridge({
  // Persist this ID and the displayed unit in Task Horizon settings after the user selects it.
  itemId: "<selected-checkin-item-id>",
  unit: "个",
  range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"},
  onRefresh: (summary) => renderCheckinSummary(summary),
  onProjection: (projection) => renderCheckinLayer(projection),
});

const status = await bridge.start();
if (status.ready) {
  await bridge.recordTaskCompletion({blockId, localDate});
}
// A thrown write is retained with the same externalRef for a later retry.
await bridge.retryPending();
// On plugin unload:
bridge.stop();
```

`getCalendarProjection({startDate, endDateExclusive})` is a synchronous,
bounded read. The bridge keeps the exact half-open range, coalesces concurrent
reads, and drops a result made stale by a later data event; it does not claim
that `AbortSignal` or a timeout can interrupt the provider call. The optional
`signal` argument only prevents a read before it starts or suppresses rendering
after a caller aborts.

`api.subscribe(listener)` delivers integration event types without the
`checkin:` prefix (`event-recorded`, `item-updated`, and so on). The prefix is
used only by the corresponding `window` CustomEvent names.

The bridge retries by reusing the same `blockId`, selected `itemId`, and
`localDate`; the canonical `taskhorizon:<blockId>:<localDate>` reference makes
replay idempotent. Before every initial write and every queued retry, it compares
that date with the current local date. A past/future date returns `undefined`
without calling `recordEvent`, keeps the original payload with
`pendingReason: "date-not-current"`, and reports `onError({phase: "record-date",
error: "date-not-current"})`. This includes a pending write whose retry crosses
midnight: `retryPending()` counts it in `deferred`, not `attempted`, and leaves it
queued. The bridge never substitutes today's date or a different `externalRef`.
The UI must show that historical handling or explicit discard is needed;
repeating a v4 retry cannot preserve the source date after midnight.

A returned event means new or idempotent-existing. `undefined`
means “no success receipt”, but the v4 single-write API does not expose why, so the
bridge keeps the exact payload in `getPendingCompletions()` and reports it as
`rejected` on retry. The Task Horizon UI must show that state and let the user
revalidate the target or explicitly discard it; it must never replace the
`externalRef` or silently retarget the pending item. The bridge checks the
`siyuan-checkin` protocol, API version, selected item ID, archived/direction/unit
compatibility before writing. Results expose `failed` for transport exceptions;
those payloads remain queued. Overlapping `retryPending()` calls share one
in-flight attempt and result, preventing duplicate transport writes from
concurrent refresh handlers. `start()` is likewise single-flight and idempotent;
calling `stop()` while readiness is pending prevents late subscription or refresh
work.

`getPendingCompletions()` includes
`pendingReason: "rejected" | "transport" | "date-not-current" | "clock-invalid"`.
The default clock uses the real local date. Deterministic tests can inject
`now: () => Date` (or epoch milliseconds); an invalid/throwing clock retains the
payload as `clock-invalid` and prevents writes. This queue is in memory; a real
consumer must persist pending identities before claiming recovery across reloads.
After the user deliberately resolves a permanent target problem, call
`discardPendingCompletion({blockId, localDate, itemId})`; this only removes the
consumer queue entry and never creates a deletion event in the provider.
It does not cancel the provider's own pending-write inbox. A legacy v4 storage
failure may enter that inbox and recover automatically on provider startup, so
an `undefined` result or discarding this bridge's queue cannot prove that no
check-in fact exists or will later be recorded. A new Task Horizon integration
should prefer v5 batch receipts with the original source timestamp; this legacy
bridge does not implement that path.
Stopping during a retry batch lets the current transport call finish but skips
starting any later pending payloads.
Refresh calls for the same request share an in-flight summary read. A data event
invalidates that read; its result is discarded, and a fresh read may be needed.
An event burst therefore does not guarantee exactly one summary read. The single-flight key
includes the requested range and summary options, so different ranges never
receive a mismatched cached result.
Writes for the same `itemId + source + externalRef` identity are also
single-flight; different items, tasks, or dates can still write concurrently.
If `stop()` wins while
a summary read is pending, the late read is discarded without invoking
`onRefresh`.
Facade capability and item-enumeration exceptions return diagnostic startup
reasons instead of escaping as unhandled Promise rejections. Non-array item
responses are rejected explicitly, and malformed subscription events are
contained by the diagnostic boundary.
