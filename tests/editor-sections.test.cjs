const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1571 排期与记录方式提入主流程守门：
   - 主流程段序：做到多少(valueFields) → 什么时候做(when: 排期块+方向+回退警告) → 怎样产生记录(how: 问卷/完成来源/番茄)；
   - 高级区不再含排期块/方向/完成来源/番茄（无重名 name 控件）；
   - 显隐单点收拢：排期相关行不再渲染硬编码 hidden（bind updateConditionalFields 首跑即设）；
   - atMost×非每日显式警告在位，save-form 静默回落行为不变；
   - 番茄显隐收拢至 updateConditionalFields（修复手动切完成来源不联动）。 */

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const editor = read("src", "render", "editor.ts");
const bindEditor = read("src", "render", "bind-editor.ts");
const saveForm = read("src", "render", "save-form.ts");
const i18nSource = read("src", "i18n.ts");

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("main-flow section order: when block after value fields, how block after direction", () => {
        const valueFields = editor.indexOf("data-value-fields");
        const whenHeader = editor.indexOf('data-editor-section="when"');
        const howHeader = editor.indexOf('data-editor-section="how"');
        const scheduleBlock = editor.indexOf("lc-checkin__editor-schedule-fields");
        const direction = editor.indexOf("data-direction-at-most-field");
        const warning = editor.indexOf("data-direction-warning");
        const journal = editor.indexOf("data-journal-field");
        const completion = editor.indexOf("name=\"completionSource\"");
        assert.ok(valueFields >= 0 && valueFields < whenHeader, "做到多少段在前");
        assert.ok(whenHeader < scheduleBlock && scheduleBlock < direction && direction < warning, "when 段：排期块+方向+回退警告");
        assert.ok(warning < howHeader && howHeader < journal && journal < completion, "how 段：问卷/完成来源/番茄");
    });

    check("advanced section keeps organization and output only, no duplicate schedule controls", () => {
        assert.equal((editor.match(/name="schedule"/g) || []).length, 1, "排期 select 唯一（无重名控件）");
        assert.equal((editor.match(/data-quota-schedule/g) || []).length, 1, "配额块唯一");
        const advancedStart = editor.indexOf("lc-checkin__advanced");
        const scheduleInAdvanced = editor.indexOf("lc-checkin__editor-schedule-fields", advancedStart);
        assert.equal(scheduleInAdvanced, -1, "高级区不得残留排期块");
        const advancedBody = editor.slice(advancedStart);
        for (const moved of ["data-direction-at-most-field", "data-tomato-mode-field", "name=\"completionSource\""]) {
            assert.equal(advancedBody.indexOf(moved), -1, `高级区不得残留 ${moved}`);
        }
        for (const kept of ["data-anchor-picker", "data-taskhorizon-visible-field", "editor.autoArchiveLabel", "editor.streakToleranceLabel"]) {
            assert.ok(advancedBody.includes(kept.split(".").pop() || kept) || advancedBody.includes(kept), "高级区保留组织与输出字段");
        }
    });

    check("visibility is bind-driven: schedule rows render without hardcoded hidden", () => {
        for (const attr of ["data-interval-schedule", "data-quota-schedule", "data-direction-at-most-field", "data-tomato-mode-field"]) {
            const index = editor.indexOf(attr);
            assert.ok(index >= 0, `${attr} 在位`);
            const tagEnd = editor.indexOf(">", index);
            const tag = editor.slice(index, tagEnd);
            assert.ok(!tag.includes("hidden"), `${attr} 行不得渲染硬编码 hidden（bind 单点驱动）`);
        }
        assert.match(bindEditor, /directionWarning\.hidden = !\(directionChecked && scheduleSelect\?\.value !== "daily"\)/, "回退警告由 updateConditionalFields 单点驱动");
        assert.match(bindEditor, /tomatoModeField\.hidden = !tomatoVisible/, "番茄计值显隐单点驱动（修复手动切来源不联动）");
    });

    check("atMost fallback warning ships while save-form fallback behavior is unchanged", () => {
        assert.match(saveForm, /directionAtMost.*=== "on" && scheduleType === "daily"/s, "save-form 仍保留仅每日回落防线");
        assert.match(saveForm, /"atMost" as const : undefined/, "回落判定原样");
        for (const key of ["editor.sectionWhen", "editor.sectionHow", "editor.directionFallbackWarn"]) {
            assert.ok((i18nSource.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || []).length >= 2, `${key} 必须中英双语齐备`);
        }
    });

    check("T-1572 output/organization subsections: anchor in output, org fields and TH in org, danger-marked actions", () => {
        const outputHeader = editor.indexOf('data-advanced-section="output"');
        const orgHeader = editor.indexOf('data-advanced-section="org"');
        assert.ok(outputHeader >= 0 && orgHeader > outputHeader, "输出小节在组织小节之前");
        const anchorPicker = editor.indexOf("data-anchor-picker");
        const appendField = editor.indexOf("data-anchor-append-field");
        assert.ok(anchorPicker > outputHeader && anchorPicker < orgHeader, "锚点块归输出小节");
        assert.ok(appendField > outputHeader && appendField < orgHeader, "锚点追加归输出小节");
        const orgBody = editor.slice(orgHeader);
        for (const orgField of ["name=\"group\"", "name=\"priority\"", "name=\"timeSlot\"", "name=\"autoArchiveDays\"", "name=\"streakToleranceDays\"", "data-taskhorizon-visible-field"]) {
            assert.ok(orgBody.includes(orgField), `组织小节必须包含 ${orgField}`);
        }
        assert.ok(orgBody.indexOf("data-anchor-picker") === -1, "组织小节不得再含锚点块");
        assert.match(editor, /data-editor-section="danger"/, "页尾操作栏必须带危险区标记（归档/删除所在）");
        for (const key of ["editor.sectionOutput", "editor.sectionOrg"]) {
            assert.ok((i18nSource.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || []).length >= 2, `${key} 必须中英双语齐备`);
        }
        assert.ok(editor.indexOf("data-journal-field") < editor.indexOf("lc-checkin__advanced"), "问卷绑定保持在主流程段6（不回搬高级区）");
    });

    console.log(`Editor section flow: ${checks} checks passed.`);
} finally {
    /* TZ not modified in this test. */
}
