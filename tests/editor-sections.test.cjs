const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1571/T-1572 编辑器主流程分段守门：
   - T-1571 段序：做到多少(valueFields) → 什么时候做(when: 排期块+方向+回退警告) → 怎样产生记录(how: 问卷/完成来源/番茄)；
     高级区不再含排期块/方向/完成来源/番茄（无重名 name 控件）；
     显隐单点收拢：排期相关行不再渲染硬编码 hidden（bind updateConditionalFields 首跑即设）；
     atMost×非每日显式警告在位，save-form 静默回落行为不变；
     番茄显隐收拢至 updateConditionalFields（修复手动切完成来源不联动）。
   - T-1572 高级区两小节：输出（锚点）/组织（分组/优先级/时段/自动归档/容错/Task Horizon 显示）；
     页尾操作栏带危险区标记；问卷绑定保持主流程段6。
   - T-1570 应用模板徽标：会话标示、两条应用路径打标、项目落盘后清除。 */

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const editor = read("src", "render", "editor.ts");
const bindEditor = read("src", "render", "bind-editor.ts");
const saveForm = read("src", "render", "save-form.ts");
const i18nSource = read("src", "i18n.ts");
const indexSource = read("src", "index.ts");

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
check("editor root delegated handlers are single-install and cleaned before redraw", () => {
    assert.match(bindEditor, /editorRootBindingCleanups = new WeakMap/);
    assert.match(bindEditor, /const previousCleanup = editorRootBindingCleanups\.get\(root\)/);
    assert.match(bindEditor, /previousCleanup\?\.\(\)/);
    assert.match(bindEditor, /root\.removeEventListener\("click", listener\)/);
    assert.equal((bindEditor.match(/listenRootClick\(/g) || []).length, 3, "three delegated handlers use the single-install helper");
});
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
            assert.ok(advancedBody.includes(kept) || advancedBody.includes(kept.split(".").pop()), "高级区保留组织与输出字段");
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

    check("T-1570 applied-template badge: session note, both apply paths mark, save clears", () => {
        assert.match(editor, /data-template-applied-note/, "编辑器必须渲染应用模板徽标容器");
        assert.match(editor, /appliedTemplateNote\?/, "ctx 必须透传会话标示");
        assert.equal((bindEditor.match(/markTemplateApplied\((?:templateName\(template\)|template\.name)\)/g) || []).length, 2, "目录模板与我的模板两条应用路径都必须打标");
        assert.match(bindEditor, /host\.markTemplateApplied\?\./, "打标必须经宿主会话字段（不重渲染）");
        assert.match(indexSource, /markTemplateApplied\(note: string, root\?: HTMLElement\)/, "宿主按表面记录模板状态");
        assert.match(indexSource, /this\.appliedTemplateNote = undefined;/, "项目落盘后清除标示（失败路径保留）");
        assert.ok((i18nSource.match(/"editor\.templateApplied"/g) || []).length >= 2, "editor.templateApplied 必须中英双语齐备");
    });

    check("T-1573 preview/action-bar shared computation: single source, single DOM, mobile reposition only", () => {
        assert.equal((editor.match(/export function describeEditorPreviewActions/g) || []).length, 1, "预览动作计算唯一定义");
        assert.equal((editor.match(/export function describeEditorPreviewMeta/g) || []).length, 1, "预览元信息计算唯一定义");
        assert.equal((bindEditor.match(/describeEditorPreviewActions\(\{/g) || []).length, 1, "实时更新消费同一计算（updateEditorPreview）");
        assert.equal((editor.match(/class="lc-checkin__editor-actions"/g) || []).length, 1, "操作栏单一 DOM（桌面/移动共用，仅 CSS 重排）");
        const responsive = read("src", "ui", "content-responsive.scss");
        assert.match(responsive, /\.lc-checkin__editor-actions \{ position: sticky; bottom: 0;/, "移动宽度档仅 sticky 重排操作栏（无第二份计算）");
    });

    check("T-1574 legacy compatibility: every storage field renders from item state and failures keep drafts", () => {
        for (const pattern of [
            "item?.quickSteps",
            "item?.autoArchive?.afterDays",
            "item?.streakTolerance",
            "item?.direction === \"atMost\"",
            "item?.journal?.templateId",
            "item?.noteAnchor?.blockId",
            "item?.taskHorizonCalendarVisible",
            "item?.recordStep",
            "item?.schedule",
        ]) {
            assert.match(editor, new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `旧项目字段必须从 item 状态渲染初始值：${pattern}`);
        }
        assert.match(editor, /weekdays\.includes\(index\) \? "checked"/, "星期按既有项目回填");
        assert.match(bindEditor, /updateConditionalFields\(false\);\s*\n\s*updateEditorPreview\(\);\s*\n\s*updateAdvancedSummary\(\);\s*\n\s*ensureEditorVisible/, "bind 挂载即回填条件显隐与预览");
        assert.match(saveForm, /msg\.saveFail/, "保存失败显式反馈");
        assert.match(saveForm, /返回保存条目 id，供宿主消费联动预接线计划（失败路径均返回 undefined，零副作用）/, "保存失败零副作用语义保持");
        assert.match(bindEditor, /data-action='retry-save'/, "失败保留草稿并提供重试（不丢用户输入）");
    });

    console.log(`Editor section flow: ${checks} checks passed.`);
} finally {
    /* TZ not modified in this test. */
}
