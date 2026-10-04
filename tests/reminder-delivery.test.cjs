const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const compiledModules = new Map();
let checks = 0;

function harness(shared = {stored: undefined, queue: Promise.resolve(), writes: []}) {
    let nowMs = new Date(2026, 9, 4, 12).getTime();
    const messages = [];
    const modules = new Map();
    class TestDate extends Date {
        constructor(...values) { if (values.length) super(...values); else super(nowMs); }
        static now() { return nowMs; }
    }
    const document = {activeElement: undefined, failMount: false};
    class Element {
        constructor(tag = "div") {
            this.tagName = tag;
            this.dataset = {};
            this.attributes = new Map();
            this.listeners = new Map();
            this.children = [];
            this.controls = new Map();
            this.disabled = false;
            this.hidden = false;
            this.textWrites = 0;
        }
        get isConnected() { return this === document.body || Boolean(this.parent?.isConnected); }
        set innerHTML(value) {
            this.markup = value;
            if (value.includes("data-daily-reminder-close")) {
                for (const name of ["center", "mute", "close", "error"]) {
                    const child = new Element(name === "error" ? "small" : "button");
                    child.hidden = name === "error";
                    this.controls.set(`[data-daily-reminder-${name}]`, child);
                    this.appendChild(child);
                }
            }
        }
        get innerHTML() { return this.markup; }
        set textContent(value) { this.text = value; this.textWrites += 1; }
        get textContent() { return this.text ?? ""; }
        appendChild(child) {
            if (this === document.body && document.failMount) {
                document.failMount = false;
                throw new Error("Mount failed");
            }
            this.children.push(child);
            child.parent = this;
            return child;
        }
        remove() {
            if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
            this.parent = undefined;
        }
        contains(child) { return child === this || this.children.some((candidate) => candidate.contains(child)); }
        querySelector(selector) { return this.controls.get(selector) ?? null; }
        setAttribute(name, value) { this.attributes.set(name, value); }
        getAttribute(name) { return this.attributes.get(name); }
        addEventListener(name, listener) { this.listeners.set(name, [...this.listeners.get(name) ?? [], listener]); }
        async dispatch(name, properties = {}) {
            if (name === "click" && this.disabled) return;
            const event = {currentTarget: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...properties};
            await Promise.all((this.listeners.get(name) ?? []).map((listener) => listener(event)));
            return event;
        }
        focus() { document.activeElement = this; }
        scrollIntoView(options) { this.scrollOptions = options; }
    }
    document.body = new Element("body");
    document.createElement = (tag) => new Element(tag);
    function load(relative) {
        const filename = path.resolve(root, relative);
        if (modules.has(filename)) return modules.get(filename).exports;
        let compiled = compiledModules.get(filename);
        if (!compiled) {
            compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
            compiledModules.set(filename, compiled);
        }
        const module = {exports: {}};
        modules.set(filename, module);
        new Function("require", "module", "exports", "document", "HTMLElement", "Date", compiled)((dependency) => {
            if (dependency === "siyuan") return {showMessage: (message) => messages.push(message)};
            if (!dependency.startsWith(".")) return require(dependency);
            return load(path.relative(root, path.resolve(path.dirname(filename), `${dependency}.ts`)));
        }, module, module.exports, document, Element, TestDate);
        return module.exports;
    }
    const delivery = load("src/render/reminder-delivery.ts");
    const state = load("src/features/reminder-delivery.ts");
    function makeHost() {
        const createdAt = new TestDate(2026, 9, 1).toISOString();
        return {
            disposed: false, disposing: false, storageReady: true,
            store: {version: 1, items: [{id: "read", name: "Reading", icon: "📖", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt}], events: []},
            occasionStore: {version: 1, occasions: []}, reminderUserActions: [], occasionRemindOnce: false,
            dailyReminder: {enabled: true, slots: []}, reminderQuietHours: {enabled: false, start: "22:00", end: "07:00"},
            palette: "violet", reducedMotion: true, renders: 0,
            withStorageLock(operation) {
                const pending = shared.queue.then(operation, operation);
                shared.queue = pending.then(() => undefined, () => undefined);
                return pending;
            },
            async loadData(name) { assert.equal(name, delivery.REMINDER_DELIVERY_STORAGE_NAME); return shared.stored; },
            async saveData(name, value) {
                assert.equal(name, delivery.REMINDER_DELIVERY_STORAGE_NAME);
                if (shared.failWrite) { shared.failWrite = false; throw new Error("Write failed"); }
                shared.stored = value;
                shared.writes.push(JSON.parse(value));
            },
            resolvedAppearance: () => "light", render() { this.renders += 1; },
            openQuickDialog() { this.quickDialogElement = new Element(); document.body.appendChild(this.quickDialogElement); },
            showSummary(surface) { this.summaryRoot = surface; },
        };
    }
    return {
        delivery, state, makeHost, shared, document, Element, messages, load,
        now: () => new TestDate(), setNow: (date) => { nowMs = date.getTime(); },
        advance: (milliseconds) => { nowMs += milliseconds; },
        notices: () => document.body.children.filter((element) => element.dataset.dailyReminderNotice),
        announcers: () => document.body.children.filter((element) => element.className === "lc-checkin__reminder-announcer"),
        persisted: () => shared.stored ? JSON.parse(shared.stored) : undefined,
    };
}

async function check(name, run) {
    await run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

(async () => {
    await check("durable launch identity survives host unload, plugin reload and a separate window", async () => {
        const first = harness();
        const host = first.makeHost();
        await first.delivery.maybeSendDailyReminderFor(host, "launch", first.now());
        assert.equal(first.notices().length, 1);
        assert.deepEqual(first.persisted().delivered, [{localDate: "2026-10-04", slot: "launch", context: "workspace"}]);
        first.delivery.stopReminderDeliveryFor(host);
        const reloaded = harness(first.shared);
        await reloaded.delivery.maybeSendDailyReminderFor(reloaded.makeHost(), "launch", reloaded.now());
        assert.equal(reloaded.notices().length, 0);
        assert.equal(first.shared.writes.length, 1);
    });
    await check("simultaneous windows re-read under one lock and mount exactly one notice", async () => {
        const first = harness();
        const second = harness(first.shared);
        await Promise.all([
            first.delivery.maybeSendDailyReminderFor(first.makeHost(), "launch", first.now()),
            second.delivery.maybeSendDailyReminderFor(second.makeHost(), "slot", second.now()),
        ]);
        assert.equal(first.notices().length + second.notices().length, 1);
        assert.equal(first.shared.writes.length, 1);
    });
    await check("overdue slots coalesce on launch and each later slot delivers only once", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        host.dailyReminder.slots = ["09:00", "11:00", "18:00"];
        await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
        assert.deepEqual(fixture.persisted().delivered.map((entry) => entry.slot), ["09:00", "11:00"]);
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.shared.writes.length, 1);
        fixture.setNow(new Date(2026, 9, 4, 18));
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.shared.writes.length, 2);
        assert.equal(fixture.notices().length, 1);
        assert.equal(fixture.persisted().delivered.length, 3);
    });
    await check("empty facts, quiet hours and disabled preferences never consume an identity", async () => {
        for (const mode of ["empty", "quiet", "disabled", "not-ready"]) {
            const fixture = harness();
            const host = fixture.makeHost();
            if (mode === "empty") host.store.items = [];
            if (mode === "quiet") host.reminderQuietHours = {enabled: true, start: "11:00", end: "13:00"};
            if (mode === "disabled") host.dailyReminder.enabled = false;
            if (mode === "not-ready") host.storageReady = false;
            await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
            assert.equal(fixture.shared.writes.length, 0, mode);
            assert.equal(fixture.notices().length, 0, mode);
            host.store.items = fixture.makeHost().store.items;
            host.reminderQuietHours.enabled = false;
            host.dailyReminder.enabled = true;
            host.storageReady = true;
            await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
            assert.equal(fixture.shared.writes.length, 1, "an unused default identity can deliver when actionable facts appear");
        }
    });
    await check("banner-covered occasions do not deliver twice, while overdue occasions remain actionable", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        host.store.items = [];
        const createdAt = new Date(2026, 9, 1).toISOString();
        host.occasionStore.occasions = [{id: "bill", name: "Bill", kind: "scheduled", date: "2026-10-04", recurrence: "once", enabled: true, remindBeforeDays: 0, completedDates: [], createdAt, updatedAt: createdAt}];
        await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
        assert.equal(fixture.shared.writes.length, 0);
        host.occasionStore.occasions[0].date = "2026-10-03";
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.notices().length, 1);
        assert.match(fixture.notices()[0].innerHTML, /Bill/);
    });
    await check("close and Escape only dismiss the current notice and restore its preceding focus", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        const origin = new fixture.Element("button");
        fixture.document.body.appendChild(origin);
        origin.focus();
        await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
        const notice = fixture.notices()[0];
        const close = notice.querySelector("[data-daily-reminder-close]");
        close.focus();
        await close.dispatch("click");
        assert.equal(fixture.document.activeElement, origin);
        assert.equal(fixture.notices().length, 0);
        assert.deepEqual(fixture.persisted().mutedDates, []);
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.notices().length, 0);
        fixture.advance(86400000);
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        const escaped = await fixture.notices()[0].dispatch("keydown", {key: "Escape"});
        assert.equal(escaped.defaultPrevented, true);
        assert.equal(fixture.notices().length, 0);
    });
    await check("mute persists across windows and reloads, closes existing notices and expires tomorrow", async () => {
        const first = harness();
        const second = harness(first.shared);
        const host = first.makeHost();
        host.dailyReminder.slots = ["09:00", "18:00"];
        await first.delivery.maybeSendDailyReminderFor(host, "launch", first.now());
        const otherHost = second.makeHost();
        assert.equal(await second.delivery.muteDailyReminderTodayFor(otherHost, second.now()), true);
        await first.delivery.refreshReminderDeliveryStateFor(host, first.now());
        assert.equal(first.notices().length, 0);
        assert.equal(first.delivery.shouldAnnouncePriorityRemindersFor(host, first.now()), false);
        first.setNow(new Date(2026, 9, 4, 18));
        await first.delivery.maybeSendDailyReminderFor(host, "slot", first.now());
        assert.equal(first.notices().length, 0);
        const reloaded = harness(first.shared);
        await reloaded.delivery.maybeSendDailyReminderFor(reloaded.makeHost(), "launch", reloaded.now());
        assert.equal(reloaded.notices().length, 0);
        first.advance(86400000);
        await first.delivery.maybeSendDailyReminderFor(host, "slot", first.now());
        assert.equal(first.notices().length, 1);
        assert.equal(first.delivery.shouldAnnouncePriorityRemindersFor(host, first.now()), true);
    });
    await check("failed mute retains the notice, reports failure and permits a successful retry", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
        const notice = fixture.notices()[0];
        const button = notice.querySelector("[data-daily-reminder-mute]");
        fixture.shared.failWrite = true;
        await button.dispatch("click");
        assert.equal(button.disabled, false);
        assert.equal(notice.getAttribute("aria-busy"), "false");
        assert.equal(notice.querySelector("[data-daily-reminder-error]").hidden, false);
        assert.deepEqual(fixture.persisted().mutedDates, []);
        assert.equal(fixture.delivery.shouldAnnouncePriorityRemindersFor(host, fixture.now()), true);
        await button.dispatch("click");
        assert.equal(fixture.notices().length, 0);
        assert.deepEqual(fixture.persisted().mutedDates, ["2026-10-04"]);
    });
    await check("write failure does not display success and retries with bounded backoff", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        fixture.shared.failWrite = true;
        await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
        assert.equal(fixture.notices().length, 0);
        assert.equal(fixture.persisted(), undefined);
        assert.equal(fixture.messages.length, 1);
        fixture.advance(59000);
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.shared.writes.length, 0);
        fixture.advance(1000);
        fixture.shared.failWrite = true;
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.messages.length, 1, "repeated errors do not repeatedly announce");
        fixture.advance(299000);
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.shared.writes.length, 0);
        fixture.advance(1000);
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.notices().length, 1);
    });
    await check("mount failure rolls back the saved identity under lock and later retries", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        fixture.document.failMount = true;
        await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
        assert.deepEqual(fixture.persisted().delivered, []);
        assert.equal(fixture.shared.writes.length, 2);
        fixture.advance(60000);
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.notices().length, 1);
        assert.equal(fixture.persisted().delivered.length, 1);
    });
    await check("corrupt state fails visibly without overwriting unknown records", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        fixture.shared.stored = "{bad";
        await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
        assert.equal(fixture.shared.stored, "{bad");
        assert.equal(fixture.shared.writes.length, 0);
        assert.equal(fixture.notices().length, 0);
        assert.equal(fixture.messages.length, 1);
        fixture.shared.stored = undefined;
        fixture.advance(60000);
        await fixture.delivery.maybeSendDailyReminderFor(host, "slot", fixture.now());
        assert.equal(fixture.notices().length, 1);
    });
    await check("retention keeps seven valid local dates, deduplicates and rejects malformed identities", () => {
        const fixture = harness();
        const delivered = ["2026-09-27", "2026-09-28", "2026-10-04", "2026-10-05"].map((localDate) => ({localDate, slot: "launch", context: "workspace"}));
        const normalized = fixture.state.deserializeReminderDeliveryState({version: 1, delivered: [...delivered, delivered[2]], mutedDates: ["2026-09-27", "2026-09-28", "2026-10-04", "2026-10-04"]}, "2026-10-04");
        assert.deepEqual(normalized.delivered.map((entry) => entry.localDate), ["2026-09-28", "2026-10-04"]);
        assert.deepEqual(normalized.mutedDates, ["2026-09-28", "2026-10-04"]);
        for (const entry of [{localDate: "2026-02-30", slot: "launch", context: "workspace"}, {localDate: "2026-10-04", slot: "24:00", context: "workspace"}, {localDate: "2026-10-04", slot: "launch", context: "window"}]) {
            assert.equal(fixture.state.deserializeReminderDeliveryState({version: 1, delivered: [entry], mutedDates: []}, "2026-10-04"), undefined);
        }
    });
    await check("one stable live region announces changed digests across roots without repeating on redraw", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        await fixture.delivery.refreshReminderDeliveryStateFor(host, fixture.now());
        const first = new fixture.Element();
        const second = new fixture.Element();
        const card = new fixture.Element();
        card.dataset = {priorityDigest: "read|today", priorityAnnouncement: "Reading is due today"};
        for (const surface of [first, second]) {
            fixture.document.body.appendChild(surface);
            surface.controls.set("[data-priority-reminder]", card);
            fixture.delivery.syncPriorityReminderAnnouncementFor(host, surface, fixture.now());
        }
        const announcer = fixture.announcers()[0];
        assert.equal(fixture.announcers().length, 1);
        assert.equal(announcer.textWrites, 1);
        assert.equal(announcer.textContent, "Reading is due today");
        first.controls.set("[data-priority-reminder]", {...card, dataset: {...card.dataset}});
        fixture.delivery.syncPriorityReminderAnnouncementFor(host, first, fixture.now());
        assert.equal(announcer.textWrites, 1);
        card.dataset = {priorityDigest: "read|overdue", priorityAnnouncement: "Reading is overdue"};
        fixture.delivery.syncPriorityReminderAnnouncementFor(host, second, fixture.now());
        assert.equal(announcer.textWrites, 2);
        await fixture.delivery.muteDailyReminderTodayFor(host, fixture.now());
        card.dataset = {priorityDigest: "read|overdue|changed", priorityAnnouncement: "Changed while muted"};
        fixture.delivery.syncPriorityReminderAnnouncementFor(host, second, fixture.now());
        assert.equal(announcer.textWrites, 2);
        fixture.delivery.stopReminderDeliveryFor(host);
        assert.equal(announcer.isConnected, false);
    });
    await check("global disabling or quiet hours close notifications while preserving ordinary in-page facts", async () => {
        for (const mode of ["disabled", "quiet"]) {
            const fixture = harness();
            const host = fixture.makeHost();
            await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
            const before = JSON.stringify(host.store);
            if (mode === "disabled") host.dailyReminder.enabled = false;
            else host.reminderQuietHours = {enabled: true, start: "11:00", end: "13:00"};
            fixture.delivery.syncPriorityReminderAnnouncementFor(host, undefined, fixture.now());
            assert.equal(fixture.notices().length, 0);
            assert.equal(JSON.stringify(host.store), before);
        }
    });
    await check("reminder center opens the originating root and focuses its heading", () => {
        const fixture = harness();
        const host = fixture.makeHost();
        const surface = new fixture.Element();
        const center = new fixture.Element();
        const heading = new fixture.Element("h2");
        fixture.document.body.appendChild(surface);
        surface.controls.set(".lc-checkin__reminder-center", center);
        center.controls.set("h2", heading);
        fixture.delivery.openReminderCenterFor(host, surface);
        assert.equal(host.summaryRoot, surface);
        assert.equal(heading.getAttribute("tabindex"), "-1");
        assert.equal(fixture.document.activeElement, heading);
        assert.deepEqual(center.scrollOptions, {block: "start"});
    });
    await check("a host disposed during its write rolls back the identity and never mounts a late notice", async () => {
        const fixture = harness();
        const host = fixture.makeHost();
        const save = host.saveData.bind(host);
        host.saveData = async (...args) => { await save(...args); host.disposed = true; };
        await fixture.delivery.maybeSendDailyReminderFor(host, "launch", fixture.now());
        assert.deepEqual(fixture.persisted().delivered, []);
        assert.equal(fixture.notices().length, 0);
        assert.equal(fixture.messages.length, 0);
    });
    console.log(`Reminder delivery: ${checks} behavior checks passed.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
