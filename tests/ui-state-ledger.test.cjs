/* T-1422 · R-A11 UI 维护台账——统一状态族的活清单与守门。
   台账把「保存中/成功/失败/重试/空态/加载/禁用/依赖缺失」八个状态族登记为
   可断言的事实：每个族必须同时具备 SCSS 呈现、渲染消费方、双语 i18n 文案与
   无障碍语义（role/aria-live）；新增状态或改口径时在此登记并同步断言。
   窄宽度/长文本/双主题/焦点可见由 responsive-layout、ui-theme、i18n-parity、
   css-hygiene 等既有门禁覆盖，此处只交叉引用不重复断言。
   R-18.4（R-A18）：原保留词表 lc-checkin__loading / lc-checkin__success /
   is-saving / msg.saving 经核查零消费方，已统一退役（见文末退役断言）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const fragments = read("src", "render", "fragments.ts");
const review = read("src", "render", "review.ts");
const settings = read("src", "render", "settings.ts");
const bindToday = read("src", "render", "bind-today.ts");
const bindEditor = read("src", "render", "bind-editor.ts");
const interactionStates = read("src", "ui", "interaction-states.scss");
const components = read("src", "ui", "components.scss");
const i18n = read("src", "i18n.ts");

const bilingual = (key, note) => {
    const occurrences = i18n.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）——${note}`);
};

/* —— 族 1/2/3：保存中 · 失败 · 重试（今日与编辑器共用 renderSaveStatusView） —— */
/* 决策登记：saving 刻意静默——异步保存期插入状态块会引起布局跳动（checkin-toast
   守门在位）；反馈由 recentRecord 成功 toast（2600ms 自清）与 error alert+重试承担。
   is-saving 样式与 msg.saving 文案为保留词表，静默期间不得被"修复式"复活。 */
assert.match(fragments, /saving 刻意保持静默/, "静默决策必须留有注释依据");
assert.ok(
    !/state === "saving"/.test(fragments.replace(/\/\*[\s\S]*?\*\//g, "")),
    "渲染层不得为 saving 插入布局块"
);
assert.match(read("tests", "checkin-toast.test.cjs"), /saving must not insert a layout-shifting block/, "布局防跳守门必须在位");
assert.match(fragments, /is-error" role="alert"/, "失败为 role=alert 强提示");
assert.match(fragments, /data-action="retry-save"/, "失败必须携带重试入口");
bilingual("msg.saveFailedShort", "保存失败文案");
bilingual("msg.retrySave", "重试文案");
assert.match(components, /&\.is-error/, "失败样式变体必须在基座类内");
assert.match(bindToday, /data-action='retry-save'/, "今日视图重试必须可点");
assert.match(bindEditor, /data-action='retry-save'/, "编辑器重试必须可点");

/* —— 族 4：空态（今日三种 + 检索空态） —— */
assert.match(components, /\.lc-checkin__empty \{ min-width:0; overflow-wrap:anywhere; \}/, "空态基座防溢出");
for (const marker of ["emptyActiveTitle", "emptyOnboardTitle", "emptyScheduledTitle", "searchEmpty"]) {
    assert.match(fragments, new RegExp(`today\\.${marker}`), `今日空态文案 ${marker} 必须在渲染中`);
}
assert.match(interactionStates, /\.lc-checkin__empty-actions \{ flex-wrap: wrap;/, "空态动作按钮窄宽换行");

/* —— 族 5：加载（R-18.4 退役 lc-checkin__loading 后，骨架屏 skeleton 家族为加载呈现） —— */
assert.match(components, /\.lc-checkin__skeleton \{/, "加载骨架基座类存在");
assert.match(components, /\.lc-checkin\[data-reduced-motion="true"\] \.lc-checkin__skeleton \{ animation:none; \}/, "加载动效尊重 reduced motion");

/* —— 族 6：禁用 —— */
assert.match(
    interactionStates,
    /\.lc-checkin :where\(button, input, select, textarea, summary\):disabled,\n\.lc-checkin :where\(button\)\[aria-disabled="true"\] \{\n    opacity: \.58;\n    cursor: not-allowed;\n\}/,
    "统一禁用基线必须保留（零权重 :where，组件特化可覆盖）"
);
assert.match(components, /\.lc-checkin__record-button\[disabled\] \{ opacity: \.66; \}/, "组件级禁用特化仍优先生效");

/* —— 族 7：依赖缺失/降级（设置页依赖桶 + 行动台专注降级） —— */
assert.match(settings, /data-dependency-state="\$\{tomatoDependencyState\}"/, "番茄提供方依赖状态必须可见");
assert.match(settings, /data-dependency-state="\$\{agentDependencyState\}"/, "智能体依赖状态必须可见");
assert.match(settings, /role="status"/, "依赖状态用 role=status 呈现");
bilingual("set.tomatoRecovery", "依赖恢复指引");
bilingual("set.agentRecovery", "智能体恢复指引");
assert.match(fragments, /today\.consoleFocusMissing/, "行动台专注缺失降级提示存在");
bilingual("today.consoleFocusMissing", "专注缺失提示");

/* —— 族 8：成功/错误提示基座（回顾助手错误已收编） —— */
assert.match(review, /class="lc-checkin__error" role="alert"/, "回顾助手错误必须用基座错误类");
assert.match(components, /\.lc-checkin__error \{ padding:10px; border:1px solid var\(--lc-checkin-danger\);/, "基座错误样式存在");
assert.match(components, /\.lc-checkin\[data-appearance="light"\] \.lc-checkin__error \{/, "错误样式具备亮色变体");
assert.ok(!review.includes('class="is-error"'), "回顾助手不得再使用散落的 is-error 类（已收编到基座）");

/* —— 保留词表已退役（R-18.4 · R-A18，D-051 可证明性口径）——
   lc-checkin__loading / lc-checkin__success / is-saving / msg.saving 经全库核查
   零消费方（2026-09-26），统一退役：CSS 规则与 i18n 键删除；加载/成功反馈由
   toast、recent-record 与 save-status(error) 通道承担。断言翻转为「不得复活」：
   静默重新引入视为违规，如需加载骨架请登记新族后再引入。 */
for (const retired of ["lc-checkin__loading", "lc-checkin__success", "is-saving", "msg.saving", "lc-checkin-spin"]) {
    assert.ok(!components.includes(retired), `已退役词表不得回流 SCSS：${retired}`);
    assert.ok(!i18n.includes(`"${retired}"`), `已退役词表不得回流 i18n：${retired}`);
}
assert.ok(!fragments.includes("__loading") && !fragments.includes("__success"), "渲染层不得引用已退役类");
assert.match(components, /\.lc-checkin__skeleton \{/, "skeleton 家族仍有消费方，保留（与已退役 loading 无关）");

/* —— 交叉引用：矩阵维度由既有门禁承担 —— */
for (const gate of ["tests/responsive-layout.test.cjs", "tests/ui-theme.test.cjs", "tests/i18n-parity.test.cjs", "tests/css-hygiene.test.cjs", "tests/mobile-release-quality.test.cjs"]) {
    assert.ok(fs.existsSync(path.join(root, gate)), `交叉门禁 ${gate} 必须在位`);
}

console.log("ui-state-ledger checks passed: 保存中/失败/重试/空态/加载/禁用/依赖缺失/成功错误 八族台账 + 保留词表 + 交叉门禁全部在位");
