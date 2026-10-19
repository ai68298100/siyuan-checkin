const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1806 守门测试：Today 上下文菜单 owning root 几何边界与焦点还原（D-386）。
   1. menu 坐标计算使用 rootRect、visualViewport 及 offsetParentRect 相对偏移，
      解决 dock 窄面板、quick dialog 的 CSS transform translate、以及移动视口越界裁切；
   2. 点击菜单外部及 Esc 均将焦点可靠还原给触发按钮 (closeMenus(true))。 */

const sourceRoot = path.join(__dirname, "..", "src");
const todaySource = fs.readFileSync(path.join(sourceRoot, "render", "today-bindings.ts"), "utf8");

/* 断言 1：源码静态钉 */
assert.match(
    todaySource,
    /rootRect = typeof root\.getBoundingClientRect === "function"/,
    "T-1806: context menu checks root.getBoundingClientRect",
);
assert.match(
    todaySource,
    /window\.visualViewport\?\.width \?\? window\.innerWidth/,
    "T-1806: respects visualViewport width",
);
assert.match(
    todaySource,
    /window\.visualViewport\?\.height \?\? window\.innerHeight/,
    "T-1806: respects visualViewport height",
);
assert.match(
    todaySource,
    /offsetParentRect = \(menu\.offsetParent as HTMLElement \| null\)\?\.getBoundingClientRect\?\.()/,
    "T-1806: compensates for transformed ancestor offsetParentRect",
);
assert.match(
    todaySource,
    /menu\.style\.left = `\$\{Math\.round\(targetX - offsetParentRect\.left\)\}px`/,
    "T-1806: subtracts offsetParentRect.left for correct transform coordinate positioning",
);
assert.match(
    todaySource,
    /menu\.style\.top = `\$\{Math\.round\(targetY - offsetParentRect\.top\)\}px`/,
    "T-1806: subtracts offsetParentRect.top for correct transform coordinate positioning",
);
assert.match(
    todaySource,
    /if \(!\(event\.target as HTMLElement\)\.closest\("\.lc-checkin__item-context-menu"\)\) closeMenus\(true\);/,
    "T-1806: outside click restores trigger button focus",
);

console.log("today-context-menu-geometry: all assertions passed");
