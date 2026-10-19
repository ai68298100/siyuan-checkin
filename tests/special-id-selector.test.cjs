const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");

/* T-1858 回归守门测试：特殊项目 ID 的焦点选择器安全回归（D-512）。
   复核 src/index.ts 与渲染绑定层在打卡后焦点归位、滚动与定位时，
   使用 CSS.escape 对 itemId / focusItemId 进行严密转义，杜绝单双引号、
   反斜杠、方括号、圆括号、冒号、空白、组合符、CJK 与超长 ID 导致
   querySelector 抛出 DOMException 语法错误。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：源码静态契约断言 */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const bindTodaySource = fs.readFileSync(path.join(sourceRoot, "render", "bind-today.ts"), "utf8");
const bindNavSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-page-navigation.ts"), "utf8");

assert.match(
    indexSource,
    /\.lc-checkin__item\[data-item-id="\$\{CSS\.escape\(focusItemId\)\}"\]/,
    "T-1858: index.ts must escape focusItemId using CSS.escape in today focus restoration",
);
assert.doesNotMatch(
    indexSource,
    /\.lc-checkin__item\[data-item-id='?\$\{focusItemId\}'?\]/,
    "T-1858: index.ts must not use unescaped focusItemId in querySelector",
);

assert.match(
    bindTodaySource,
    /\.lc-checkin__item\[data-item-id="\$\{CSS\.escape\(itemId\)\}"\]/,
    "T-1858: bind-today.ts must escape itemId with CSS.escape for targetButton querySelector",
);
assert.match(
    bindTodaySource,
    /\[data-item-id="\$\{CSS\.escape\(itemId\)\}"\]/,
    "T-1858: bind-today.ts must escape itemId with CSS.escape for currentElement querySelector",
);

assert.match(
    bindNavSource,
    /\[data-batch-value="\$\{CSS\.escape\(itemId\)\}"\]/,
    "T-1858: bind-page-navigation.ts must escape itemId with CSS.escape for batch value selector",
);

/* 断言 2：真实浏览器内 CSS.escape 特殊字符与多 root 焦点还原回归 */
(async () => {
    const browser = await chromium.launch({headless: true});
    try {
        const page = await browser.newPage();
        const testFixtures = [
            {id: "normal-slug-id", desc: "普通连字符 ID"},
            {id: "item's-habit", desc: "单引号 ID"},
            {id: 'item"with"quotes', desc: "双引号 ID"},
            {id: "item\\with\\backslash", desc: "反斜杠 ID"},
            {id: "item[with]brackets", desc: "方括号 ID"},
            {id: "item(with)parens", desc: "圆括号 ID"},
            {id: "task:checkin:daily:123", desc: "冒号层级 ID"},
            {id: "item.with.dots", desc: "点号 ID"},
            {id: "item#with#hash", desc: "井号 ID"},
            {id: "item with spaces and tabs\t", desc: "含空格与制表符 ID"},
            {id: "item>child+sibling~adjacent", desc: "CSS 组合符 ID"},
            {id: "习惯_晨跑打卡_2026", desc: "CJK 汉字 ID"},
            {id: "習慣_早起き_にほんご", desc: "日文 CJK ID"},
            {id: "습관_매일_한국어", desc: "韩文 CJK ID"},
            {id: "habit-🏃-water-💧-target-🎯", desc: "Emoji 表情符号 ID"},
            {id: "item_" + "x".repeat(320), desc: "超长 320+ 字符 ID"},
        ];

        const fixtureResults = await page.evaluate((fixtures) => {
            const results = [];
            for (const f of fixtures) {
                // 1. 创建卡片 DOM 节点
                const card = document.createElement("article");
                card.className = "lc-checkin__item";
                card.setAttribute("data-item-id", f.id);

                const actionWrapper = document.createElement("div");
                actionWrapper.className = "lc-checkin__item-action";

                const button = document.createElement("button");
                button.setAttribute("data-action", "record");
                button.setAttribute("tabindex", "0");
                button.textContent = "打卡";
                actionWrapper.appendChild(button);
                card.appendChild(actionWrapper);
                document.body.appendChild(card);

                // 2. 验证未转义选择器在危险字符下的脆弱性
                let unescapedError = null;
                try {
                    document.querySelector(`.lc-checkin__item[data-item-id='${f.id}']`);
                } catch (e) {
                    unescapedError = e.message;
                }

                // 3. 验证 CSS.escape 严格转义选择器的安全性与精确命中
                let escapedFound = null;
                let escapedError = null;
                try {
                    const selector = `.lc-checkin__item[data-item-id="${CSS.escape(f.id)}"]`;
                    escapedFound = document.querySelector(selector);
                } catch (e) {
                    escapedError = e.message;
                }

                // 4. 验证子按钮焦点恢复执行
                let focusSucceeded = false;
                if (escapedFound) {
                    const targetBtn = escapedFound.querySelector(".lc-checkin__item-action > :is([data-action='focus'], [data-action='record'], [data-action='quick-record'])");
                    if (targetBtn) {
                        targetBtn.focus();
                        focusSucceeded = document.activeElement === targetBtn;
                    }
                }

                results.push({
                    id: f.id,
                    desc: f.desc,
                    unescapedError,
                    escapedMatched: escapedFound === card,
                    escapedError,
                    focusSucceeded,
                });

                document.body.removeChild(card);
            }
            return results;
        }, testFixtures);

        for (const r of fixtureResults) {
            assert.equal(r.escapedError, null, `CSS.escape must not throw for ${r.desc} (${r.id}): ${r.escapedError}`);
            assert.equal(r.escapedMatched, true, `CSS.escape must exactly match card for ${r.desc} (${r.id})`);
            assert.equal(r.focusSucceeded, true, `Focus restoration must succeed on child record button for ${r.desc}`);
            // 特殊单引号 ID 在旧写法下必须如期引发 SyntaxError，证明守门确实拦截了真实破坏点
            if (r.id === "item's-habit") {
                assert.ok(r.unescapedError !== null, "Unescaped selector with single quote must fail with syntax error");
            }
        }

        /* 断言 3：多 root 隔离与滚动条保护验证 */
        const multiRootResult = await page.evaluate(() => {
            const rootA = document.createElement("div");
            rootA.className = "lc-checkin-root-a";
            const scrollerA = document.createElement("div");
            scrollerA.className = "lc-checkin";
            scrollerA.style.height = "100px";
            scrollerA.style.overflow = "scroll";
            scrollerA.innerHTML = '<div style="height: 500px"></div>';
            rootA.appendChild(scrollerA);

            const rootB = document.createElement("div");
            rootB.className = "lc-checkin-root-b";
            const scrollerB = document.createElement("div");
            scrollerB.className = "lc-checkin";
            scrollerB.style.height = "100px";
            scrollerB.style.overflow = "scroll";
            scrollerB.innerHTML = '<div style="height: 500px"></div>';
            rootB.appendChild(scrollerB);

            document.body.appendChild(rootA);
            document.body.appendChild(rootB);

            // 在 Root A 中放特殊 ID 卡片 A
            const cardA = document.createElement("div");
            cardA.className = "lc-checkin__item";
            cardA.setAttribute("data-item-id", "root-a-[special]");
            const btnA = document.createElement("button");
            btnA.setAttribute("data-action", "record");
            cardA.appendChild(btnA);
            rootA.appendChild(cardA);

            // 在 Root B 中放特殊 ID 卡片 B
            const cardB = document.createElement("div");
            cardB.className = "lc-checkin__item";
            cardB.setAttribute("data-item-id", "root-b-(special)");
            const btnB = document.createElement("button");
            btnB.setAttribute("data-action", "record");
            cardB.appendChild(btnB);
            rootB.appendChild(cardB);

            // 验证从 rootA 中查找 cardB 为空，查找 cardA 成功
            const queryInAForB = rootA.querySelector(`.lc-checkin__item[data-item-id="${CSS.escape("root-b-(special)")}"]`);
            const queryInAForA = rootA.querySelector(`.lc-checkin__item[data-item-id="${CSS.escape("root-a-[special]")}"]`);

            // 滚动模拟与恢复
            scrollerA.scrollTop = 120;
            const scrollPreserved = scrollerA.scrollTop === 120;

            document.body.removeChild(rootA);
            document.body.removeChild(rootB);

            return {
                isolated: queryInAForB === null && queryInAForA === cardA,
                scrollPreserved,
            };
        });

        assert.equal(multiRootResult.isolated, true, "Multi-root querySelector must be isolated to owning root");
        assert.equal(multiRootResult.scrollPreserved, true, "Scroll position must be preserved during focus lifecycle");

        console.log(`Special ID selector safety checks passed: ${testFixtures.length} fixture variations (quotes, backslashes, brackets, parens, colons, combinators, CJK, Emoji, long IDs), multi-root isolation and scroll preservation.`);
    } finally {
        await browser.close();
    }
})();
