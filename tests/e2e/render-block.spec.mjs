/* E2E（T-1293）：渲染块真实宿主验证。
   公开内核 API 创建笔记本/文档（文档 id 即锚点块 id），注入合成 ```checkin``` 代码块，
   经插件真实渲染管线（事件刷新→胶水扫描→锚点解析→纯视图构造）断言：
   docId 命中渲染项目行；未命中文档 fail-closed 出空视图，不放大范围。 */
import fs from "node:fs";
import {expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, seedStore, snapshotStore} from "./helpers/app.mjs";

test("渲染块:docId 作用域真实渲染,未命中 fail-closed", async ({page}) => {
    const client = createClient();
    await openCheckin(page);

    /* 真实笔记本与文档:文档 id 本身即合法块 id,可直接作为锚点。 */
    const nbData = await client.postChecked("/api/notebook/createNotebook", {name: `E2E nb ${Date.now()}`});
    const notebookId = typeof nbData === "string" ? nbData : String(nbData?.id ?? nbData?.notebook?.id ?? "");
    const created = await client.postChecked("/api/filetree/createDocWithMd", {notebook: notebookId, path: "/E2E render", markdown: ""});
    const anchoredDocId = typeof created === "string" ? created : String(created?.id ?? created?.docID ?? "");
    expect(anchoredDocId.length).toBeGreaterThanOrEqual(8);

    const item = makeTestItem("render");
    item.noteAnchor = {blockId: anchoredDocId};
    await seedStore(client, await snapshotStore(page), [item]);
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    /* 注入两个合成代码块并触发插件自己的刷新事件(真实渲染管线入口)。 */
    await page.evaluate(({anchoredDocId, notebookId, missDocId}) => {
        const host = document.createElement("div");
        host.setAttribute("data-e2e-renderhost", "true");
        host.innerHTML =
            `<div class="code-block"><div class="protyle-action__language">checkin</div><pre><code class="hljs"><div contenteditable="true">{"view":"month"}</div></code></pre></div>` +
            `<div class="code-block"><div class="protyle-action__language">checkin</div><pre><code class="hljs"><div contenteditable="true">{"view":"heatmap","year":2026}</div></code></pre></div>` +
            `<div class="code-block"><div class="protyle-action__language">checkin</div><pre><code class="hljs"><div contenteditable="true">not-json-at-all</div></code></pre></div>` +
            `<div class="code-block"><div class="protyle-action__language">checkin</div><pre><code class="hljs"><div contenteditable="true">${JSON.stringify({view: "summary", docId: anchoredDocId})}</div></code></pre></div>` +
            `<div class="code-block"><div class="protyle-action__language">checkin</div><pre><code class="hljs"><div contenteditable="true">${JSON.stringify({view: "summary", notebook: notebookId})}</div></code></pre></div>` +
            `<div class="code-block"><div class="protyle-action__language">checkin</div><pre><code class="hljs"><div contenteditable="true">${JSON.stringify({view: "summary", docId: missDocId})}</div></code></pre></div>`;
        document.body.append(host);
        window.dispatchEvent(new CustomEvent("checkin:event-recorded"));
    }, {anchoredDocId, notebookId, missDocId: "20990101120000-notexist99"});

    /* 命中块:预览包含项目行(经锚点解析);未命中块:fail-closed 空视图,不含项目行。 */
    await expect.poll(async () => {
        const texts = await page.locator("[data-checkin-preview]").allTextContents();
        const hit = texts.some((text) => text.includes(item.name));
        const missIsEmpty = texts.some((text) => text.includes("没有匹配的活跃项目") || text.includes("No matching active items") || text.trim() === "");
        const nameCount = texts.filter((text) => text.includes(item.name)).length;
        const monthRendered = await page.locator("[data-renderblock-month]").count();
        const heatmapRendered = await page.locator("[data-renderblock-year]").count();
        const errorShown = await page.locator("[data-checkin-preview] [role='alert']").count();
        return {hit, missIsEmpty, nameCount, monthRendered, heatmapRendered, errorShown};
    }, {timeout: 20000}).toEqual({hit: true, missIsEmpty: true, nameCount: 2, monthRendered: 1, heatmapRendered: 1, errorShown: 1});

    fs.writeFileSync(".artifacts/render-dump-final.json", JSON.stringify({ok: true, item: item.name}));
});
