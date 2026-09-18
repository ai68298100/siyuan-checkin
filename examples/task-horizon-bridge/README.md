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
transport failure. Only thrown writes enter `getPendingCompletions()`.
