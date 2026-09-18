# Task Horizon bridge example

This example consumes only the public `window.siyuanCheckin` facade. It does not
inspect Task Horizon's blocks or private storage: the host supplies `itemId`,
`blockId`, `localDate`, and invokes `recordTaskCompletion` only after a real
native checkbox completion.

```js
const bridge = createTaskHorizonBridge({
  range: {startDate: "2026-09-01", endDateExclusive: "2026-10-01"},
  onRefresh: (summary) => renderCheckinLayer(summary),
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

The bridge retries by reusing the same `blockId` and `localDate`; the canonical
`taskhorizon:<blockId>:<localDate>` reference makes replay idempotent. A returned
event means new or idempotent-existing; `undefined` means rejected and is not a
transport failure. The bridge also checks the `siyuan-checkin` protocol and API
version before writing. Only thrown writes enter `getPendingCompletions()`. A
retry result reports rejected writes separately from successful writes, so a
definitive API rejection is removed from the transport queue without being
counted as a success. Overlapping `retryPending()` calls share one in-flight
attempt and result, preventing duplicate transport writes from concurrent
refresh handlers. `start()` is likewise single-flight and idempotent; calling
`stop()` while readiness is pending prevents late subscription or refresh work.
Refresh calls are single-flight as well, so an event burst performs one summary
read and shares its result with concurrent callers. The single-flight key
includes the requested range and summary options, so different ranges never
receive a mismatched cached result.
