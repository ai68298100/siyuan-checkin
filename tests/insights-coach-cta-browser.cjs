/* Real DOM regression for every Insights action, compiled from current source without dist. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const {chromium} = require("playwright");
const repository = path.resolve(__dirname, "..");
const production = ts.transpileModule(fs.readFileSync(path.join(repository, "src/render/bind-page-navigation.ts"), "utf8"), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}
}).outputText;

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        const actions = ["records", "edit-rules"];
        const items = ["alpha", "beta", "gamma", "archived", "unknown", ""];
        await page.setContent(["left", "right"].map(surface => `<section id="${surface}">
            ${items.map((item, index) => `<div data-position="${index === 0 ? "primary" : "coach"}">
                ${actions.map(action => `<button id="${surface}-${action}-${index}" data-insight-${action}="${item}"><span>${surface} ${action} ${item || "empty"}</span></button>`).join("")}
            </div>`).join("")}
        </section>`).join(""));
        // Unrelated imported features are never invoked by this narrow fixture.
        await page.addScriptTag({content: `(() => {
            const exports = {};
            const require = name => name === '../ui/responsive-charts' ? {bindResponsiveCharts: () => {}} : {};
            ${production}
            window.__navigation = exports;
        })();`});
        await page.evaluate(() => {
            window.__calls = [];
            window.__review = {};
            window.__insights = {};
            const store = {items: [{id: "alpha"}, {id: "beta"}, {id: "gamma"}, {id: "archived", archived: true}]};
            window.__host = {
                store, currentPage: "insights", isMobileFrontend: true,
                bindDialogClose() {}, bindMobileNav() {},
                reviewStateForRoot(root) {return window.__review[root.id];},
                insightsStateForRoot(root) {return window.__insights[root.id];},
                setReviewStateForRoot(root, patch) {Object.assign(window.__review[root.id], patch);},
                setInsightsStateForRoot(root, patch) {Object.assign(window.__insights[root.id], patch);},
                showReview(root) {
                    window.__calls.push({kind: "records", root: root.id, review: {...window.__review[root.id]}, returnTo: window.__insights[root.id].insightsReturnPage});
                },
                showEditor(item, returnTo, root) {
                    window.__calls.push({kind: "edit-rules", root: root.id, itemId: item.id, returnTo, exactItem: store.items.includes(item)});
                }
            };
            for (const id of ["left", "right"]) {
                window.__review[id] = {historyItemId: `previous-${id}`, historyPage: 9, historyBatchPreviewOpen: true,
                    editingHistoryNoteId: `note-${id}`, reviewWorkspace: "analysis"};
                window.__insights[id] = {insightsItemId: id === "left" ? "alpha" : "beta", insightsReturnPage: "today", insightsItemQuery: `query-${id}`};
                window.__navigation.bindPageNavigationHandlers(document.getElementById(id), window.__host);
            }
        });
        const snapshot = () => page.evaluate(() => ({review: window.__review, insights: window.__insights, calls: window.__calls}));
        for (const surface of ["left", "right"]) {
            const other = surface === "left" ? "right" : "left";
            for (let index = 0; index < 3; index++) {
                for (const action of actions) {
                    if (action === "records") {
                        await page.evaluate(id => Object.assign(window.__review[id], {
                            historyItemId: "previous", historyPage: 9, historyBatchPreviewOpen: true,
                            editingHistoryNoteId: "editing-note", reviewWorkspace: "analysis"
                        }), surface);
                    }
                    const before = await snapshot();
                    // Click the child to exercise currentTarget rather than event.target.
                    await page.locator(`#${surface}-${action}-${index} span`).click();
                    const after = await snapshot();
                    assert.equal(after.calls.length, before.calls.length + 1, `${surface} ${action} ${index}: primary and every coach CTA fire exactly once`);
                    assert.deepEqual(after.review[other], before.review[other], "another surface keeps its Review state");
                    assert.deepEqual(after.insights[other], before.insights[other], "another surface keeps its Insights state");
                    assert.equal(after.insights[surface].insightsItemId, before.insights[surface].insightsItemId, "navigation preserves the Insights selection");
                    const call = after.calls.at(-1);
                    if (action === "records") {
                        assert.deepEqual(call, {kind: "records", root: surface, review: {
                            historyItemId: items[index], historyPage: 0, historyBatchPreviewOpen: false,
                            editingHistoryNoteId: undefined, reviewWorkspace: "records"
                        }, returnTo: "review"}, "records receives the clicked item, resets transient Review state and preserves its origin root");
                    } else {
                        assert.deepEqual(call, {kind: "edit-rules", root: surface, itemId: items[index], returnTo: "insights", exactItem: true}, "editor receives the exact stored item and its origin root");
                        assert.deepEqual(after.review[surface], before.review[surface], "editing rules does not mutate Review state");
                        assert.deepEqual(after.insights[surface], before.insights[surface], "editing rules does not mutate Insights state");
                    }
                }
            }
            for (let index = 3; index < items.length; index++) {
                for (const action of actions) {
                    const before = await snapshot();
                    await page.locator(`#${surface}-${action}-${index} span`).click();
                    assert.deepEqual(await snapshot(), before, `${surface} ${action} ${items[index] || "empty"}: invalid and archived items remain guarded`);
                }
            }
        }
        assert.deepEqual(errors, [], "binding and clicks produce no browser errors");
        console.log("Insights CTA browser checks passed: 12 valid primary/coach clicks and 12 guarded clicks across two roots; exact item, Review reset, return page and root isolation verified.");
    } finally {
        await browser.close();
    }
})().catch(error => {console.error(error); process.exitCode = 1;});
