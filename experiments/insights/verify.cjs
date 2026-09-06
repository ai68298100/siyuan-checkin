const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

const output = path.join(__dirname, "screenshots");
fs.mkdirSync(output, {recursive: true});

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.CHECKIN_BROWSER ? {executablePath: process.env.CHECKIN_BROWSER} : {channel: "msedge"})});
    try {
        const page = await browser.newPage({viewport: {width: 1440, height: 1000}, timezoneId: "Asia/Shanghai"});
        const errors = [];
        const network = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("request", (request) => {if (/^https?:/.test(request.url())) network.push(request.url());});
        await page.goto(pathToFileURL(path.join(__dirname, "dist/index.html")).href);
        await page.locator(".day").first().waitFor();
        assert.equal(await page.locator(".day").count(), 84);
        assert.equal(await page.locator(".habit").count(), 4);
        assert(await page.locator("[data-metric='current-streak']").innerText().then((value) => value.startsWith("6")));
        assert(await page.locator(".brand img").evaluate((element) => element.complete && element.naturalWidth > 0));
        await page.screenshot({path: path.join(output, "insights-desktop.png"), fullPage: true});

        const day = await page.locator(".day.complete").first().getAttribute("data-date");
        await page.locator(`[data-date='${day}']`).click();
        assert.equal(await page.locator("#records h2").innerText(), day);
        assert.equal(await page.locator(".record").count(), 2);
        await page.getByRole("button", {name: "后一天", exact: true}).click();
        assert.notEqual(await page.locator("#records h2").innerText(), day);
        await page.getByRole("button", {name: "查看全部记录", exact: true}).click();
        assert.equal(await page.locator("#records h2").innerText(), "原始记录");
        await page.locator(".week-bar").first().click();
        assert(await page.locator("#records h2").innerText().then((value) => value.includes("至")));

        await page.locator("[data-item='movement']").click();
        assert(await page.locator(".day.off").count() > 0);
        assert(await page.locator(".day.unavailable").count() > 0);
        await page.locator(".day.unavailable").first().click();
        assert(await page.locator("#records").innerText().then((value) => value.includes("归档期间")));
        await page.locator("[data-range='28']").click();
        assert.equal(await page.locator(".day").count(), 28);
        await page.locator("[data-range='180']").click();
        assert.equal(await page.locator(".day").count(), 180);
        const dateBefore = await page.locator("#as-of").inputValue();
        for (const invalidDate of ["", "1899-01-01", "9999-12-31"]) {
            await page.locator("#as-of").fill(invalidDate);
            await page.locator("#as-of").dispatchEvent("change");
            assert.equal(await page.locator("#as-of").inputValue(), dateBefore);
        }
        await page.locator("#as-of").fill("2026-01-15");
        await page.locator("#as-of").dispatchEvent("change");
        assert.equal(await page.locator("[data-metric='rate']").innerText(), "暂无");
        await page.locator("#as-of").fill(dateBefore);
        await page.locator("#as-of").dispatchEvent("change");
        await page.locator("[data-range='84']").click();
        await page.locator("[data-item='reading']").click();
        await page.getByRole("button", {name: "深色外观", exact: true}).click();
        assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
        await page.screenshot({path: path.join(output, "insights-dark.png"), fullPage: true});

        const checkBounds = async () => {
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
            assert.equal(overflow, false, "document must not overflow horizontally");
            const overlap = await page.evaluate(() => {
                const a = document.querySelector(".brand").getBoundingClientRect();
                const b = document.querySelector(".header-actions").getBoundingClientRect();
                return a.right > b.left;
            });
            assert.equal(overlap, false, "header actions must not overlap branding");
        };
        await page.getByRole("button", {name: "浅色外观", exact: true}).click();
        for (const width of [390, 320]) {
            await page.setViewportSize({width, height: 844});
            await checkBounds();
            await page.screenshot({path: path.join(output, `insights-mobile-${width}.png`), fullPage: true});
        }

        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", {name: "导出当前复盘 JSON", exact: true}).click();
        const download = await downloadPromise;
        const exported = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
        assert.equal(exported.format, "checkin-insights-report");
        assert.equal(exported.days.length, 84);
        assert.equal(exported.currentStreak, 6);

        await page.locator("#dataset").selectOption("empty");
        assert.equal(await page.locator("h1").innerText(), "还没有习惯记录");
        assert.equal(await page.locator("[data-action='export']").isDisabled(), true);
        await page.locator("#file-input").setInputFiles({name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("not-json")});
        assert(await page.locator("[role='status']").innerText().then((value) => value.startsWith("读取失败")));
        assert.equal(await page.locator("h1").innerText(), "还没有习惯记录");

        const fixture = {version: 2, items: [{id: "custom", name: "自定义<安全>长项目名称", icon: "✓", kind: "quantity", target: 0.3, unit: "公里", schedule: {type: "daily"}, createdAt: `${dateBefore}T00:00:00.000Z`, createdDate: dateBefore}], events: [
            {id: "one", itemId: "custom", occurredAt: `${dateBefore}T01:00:00.000Z`, localDate: dateBefore, value: 0.1, unit: "公里", source: "manual", note: "<img src=x onerror=alert(1)>"},
            {id: "two", itemId: "custom", occurredAt: `${dateBefore}T02:00:00.000Z`, localDate: dateBefore, value: 0.2, unit: "公里", source: "manual"},
        ], eventTombstones: []};
        const original = JSON.stringify(fixture);
        await page.locator("#file-input").setInputFiles({name: "checkin-export.json", mimeType: "application/json", buffer: Buffer.from(original)});
        assert.equal(await page.locator("h1").innerText(), fixture.items[0].name);
        assert.equal(await page.locator(".record-body p").innerText(), fixture.events[0].note);
        assert.equal(await page.locator(".record-body img").count(), 0);
        assert.equal(await page.locator("[data-metric='rate']").innerText(), "100%");
        assert.equal(await page.locator(".day.complete").count(), 1);
        await checkBounds();
        assert.equal(JSON.stringify(fixture), original);
        fixture.items[0].target = 0.0003;
        fixture.events[0].value = 0.0001;
        fixture.events[1].value = 0.0002;
        await page.locator("#file-input").setInputFiles({name: "small-values.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture))});
        assert.equal(await page.locator("[data-metric='rate']").innerText(), "100%");
        assert.match(await page.locator(".totals").innerText(), /0\.0003/);
        assert.match(await page.locator(".record-body>strong").last().innerText(), /0\.0001/);
        fixture.items[0] = {...fixture.items[0], createdDate: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z", kind: "quantity", target: 2, unit: "km", schedule: {type: "workdays"}, revisions: [
            {effectiveDate: "2026-01-01", kind: "duration", target: 20, unit: "minutes", schedule: {type: "daily"}},
            {effectiveDate: "2026-02-01", kind: "quantity", target: 2, unit: "km", schedule: {type: "workdays"}},
        ]};
        fixture.events = [{id: "historical", itemId: "custom", occurredAt: "2026-01-15T04:00:00.000Z", localDate: "2026-01-15", value: 20, unit: "minutes", source: "manual"}];
        await page.locator("#file-input").setInputFiles({name: "revisions.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture))});
        await page.locator("#as-of").fill("2026-01-15");
        await page.locator("#as-of").dispatchEvent("change");
        assert.match(await page.locator(".report-title p").innerText(), /20 minutes.*每天/);
        assert.match(await page.locator("[data-date='2026-01-15']").getAttribute("aria-label"), /20 \/ 20 minutes/);
        await page.locator("#as-of").fill("2026-02-02");
        await page.locator("#as-of").dispatchEvent("change");
        assert.match(await page.locator(".report-title p").innerText(), /2 km.*工作日/);
        assert.deepEqual(errors, []);
        assert.deepEqual(network, [], "preview must not request remote assets or upload data");
        console.log("insights UI: 84/28/180 days, drill-down, weekly filter, archive states, theme, desktop/mobile, empty/error/import/export and offline checks passed");
        console.log(`Screenshots: ${output}`);
    } finally {
        await browser.close();
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
