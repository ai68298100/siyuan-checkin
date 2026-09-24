/* T-1454 · 方向 11 场景组合包（habit stacks v1）——预览投影纯函数面。
   纪律（docs/roadmap-product-strategy-2026-09.md 方向 11）：
   - 组合包是纯内容资产：本模块只做「解析引用 → 分类新旧 → 计数」的只读投影，
     不创建项目、不触碰 Store v3；应用仍逐条走既有模板表单确认通道；
   - 重复判定基于本地化后的显示名与现有活跃项目名比对（localizeName 由调用方
     注入，保持本模块零依赖、无时钟、确定性）；
   - 引用了不存在模板名的组合包安全降级（计入 unknownNames，不抛异常）。 */

export interface TemplatePackPreviewEntry<T> {
    template: T;
    /** 本地化后的显示名（供渲染层直接使用）。 */
    name: string;
    status: "new" | "duplicate";
}

export interface TemplatePackPreview<T> {
    entries: readonly TemplatePackPreviewEntry<T>[];
    newCount: number;
    duplicateCount: number;
    /** 组合包引用了但目录中不存在的模板名（fail-closed 降级，不进 entries）。 */
    unknownNames: readonly string[];
}

/** 组合包预览：按目录顺序解析引用的模板，比对现有项目名（经 localizeName 本地化）
    标记 new / duplicate。同一组合包同输入两次构建得到深度相等结果。 */
export function buildTemplatePackPreview<T extends {name: string}>(
    packTemplates: readonly string[],
    catalog: readonly T[],
    existingNames: readonly string[],
    options: {localizeName?: (name: string) => string} = {},
): TemplatePackPreview<T> {
    const localizeName = options.localizeName ?? ((name: string) => name);
    const existing = new Set(existingNames);
    const entries: TemplatePackPreviewEntry<T>[] = [];
    const unknownNames: string[] = [];
    let newCount = 0;
    let duplicateCount = 0;
    for (const name of packTemplates) {
        const template = catalog.find((candidate) => candidate.name === name);
        if (!template) {
            unknownNames.push(name);
            continue;
        }
        const displayName = localizeName(template.name);
        const status = existing.has(displayName) ? "duplicate" : "new";
        if (status === "new") newCount += 1;
        else duplicateCount += 1;
        entries.push({template, name: displayName, status});
    }
    return {entries, newCount, duplicateCount, unknownNames};
}
