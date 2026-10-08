/* T-1773（D-344）：编辑器草稿 dirty 判定的纯函数。
   编辑器表单值只存在于 DOM——离开（返回/切页/跳洞察）经 applyNavigation 单一
   咽喉点；绑定期把表单签名写入 root dataset 作为基线，离开时重算签名比对。
   文件输入（data: 附件）走独立 pending 管线，不进签名；键序无关（排序后比较）。 */
export type FormEntryValue = string | File;

/** 把 FormData 归一为与键序无关的稳定签名。 */
export function formSignatureFromData(data: FormData): string {
    const entries: string[] = [];
    data.forEach((value, key) => {
        if (typeof value !== "string") return;
        entries.push(`${key}\u0000${value}`);
    });
    return entries.sort((left, right) => left.localeCompare(right)).join("\u0001");
}

/** 与基线签名比对；无基线（从未绑定）视为不脏，避免误拦全局导航。 */
export function isEditorFormDirty(data: FormData | undefined, baseline: string | undefined): boolean {
    if (!data || baseline === undefined) return false;
    return formSignatureFromData(data) !== baseline;
}
