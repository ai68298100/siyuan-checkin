/* 生成文件的保存通道（T-1255）。
   思源 Android/iOS/鸿蒙客户端里没有「网页下载」这回事：blob: URL 会被 WebView 当成一次导航，
   结果不是保存文件，而是宿主自己重启。这些容器必须走宿主的原生保存通道——
   先把内容写进 /assets，再把该 URL 交给宿主的 saveExportFile。
   桌面端与普通浏览器仍用临时 Blob 下载，行为不变。 */
import {fetchPost, saveExportFile, showMessage} from "siyuan";
import {t} from "./i18n";

export interface GeneratedFile {
    fileName: string;
    content: string;
    mime: string;
}

export type SaveOutcome = "native" | "browser" | "failed";

type NativeBridge = {JSAndroid?: {saveExportFile?: unknown}; webkit?: {messageHandlers?: {saveExportFile?: unknown}}; JSHarmony?: {saveExportFile?: unknown}};

/** 只认宿主的原生保存桥，不按 getFrontend() 名字猜：browser-mobile 是真浏览器，Blob 下载没问题。 */
export function nativeExportBridge(): "android" | "ios" | "harmony" | undefined {
    const host = window as unknown as NativeBridge;
    if (host.JSAndroid?.saveExportFile) return "android";
    if (host.webkit?.messageHandlers?.saveExportFile) return "ios";
    if (host.JSHarmony?.saveExportFile) return "harmony";
    return undefined;
}

/** 资源文件名：扩展名按原名取，主干只留 ASCII 安全字符并带时间戳，避免同名覆盖与目录穿越。 */
export function assetPathFor(fileName: string, stamp: number): string {
    const leaf = fileName.trim().replace(/\\/g, "/");
    const base = leaf.slice(leaf.lastIndexOf("/") + 1);
    const dot = base.lastIndexOf(".");
    const ext = dot > 0 ? base.slice(dot).toLowerCase() : "";
    const stem = (dot > 0 ? base.slice(0, dot) : base).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "export";
    return `/assets/${stem}-${stamp}${ext}`;
}

function putAsset(path: string, content: string, mime: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.set("path", path);
        form.set("isDir", "false");
        form.set("file", new File([content], path.slice(path.lastIndexOf("/") + 1), {type: mime}));
        fetchPost("/api/file/putFile", form, (response) => {
            if (!response || response.code === 0) resolve();
            else reject(new Error(String(response.msg || `code ${response.code}`)));
        }, undefined, (response) => reject(new Error(String(response?.msg || "putFile failed"))));
    });
}

function callContainerBridge(container: "android" | "ios" | "harmony", uri: string): boolean {
    const host = window as unknown as NativeBridge & {JSAndroid?: {saveExportFile?: (uri: string) => void}; webkit?: {messageHandlers?: {saveExportFile?: {postMessage: (uri: string) => void}}}; JSHarmony?: {saveExportFile?: (uri: string) => void}};
    if (container === "android") { if (!host.JSAndroid?.saveExportFile) return false; host.JSAndroid.saveExportFile(uri); return true; }
    if (container === "ios") { const handler = host.webkit?.messageHandlers?.saveExportFile; if (!handler) return false; handler.postMessage(uri); return true; }
    if (!host.JSHarmony?.saveExportFile) return false;
    host.JSHarmony.saveExportFile(uri);
    return true;
}

function requestNativeSave(container: "android" | "ios" | "harmony", uri: string): void {
    if (typeof saveExportFile === "function") {
        void Promise.resolve(saveExportFile(uri)).then((result: unknown) => {
            /* 宿主的保存通道会按前端能力直接拒绝（返回 status:"error"），
               这时必须退回容器原生桥，否则文件写进了 /assets 却没有任何保存动作。 */
            const status = (result as {status?: string} | undefined)?.status;
            if (status && status !== "success" && !callContainerBridge(container, uri)) {
                showMessage(t("msg.exportSaveFail", {error: String(status)}), 7000, "error");
            }
        }).catch((error) => { if (!callContainerBridge(container, uri)) showMessage(t("msg.exportSaveFail", {error: String(error)}), 7000, "error"); });
        return;
    }
    /* 宿主未导出该 API 时直接用原生桥（V1 形态，不占用宿主的完成回调全局函数）。 */
    if (!callContainerBridge(container, uri)) showMessage(t("msg.exportSaveFail", {error: `${container} bridge unavailable`}), 7000, "error");
}

function browserDownload(file: GeneratedFile): void {
    const url = URL.createObjectURL(new Blob([file.content], {type: file.mime}));
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** 保存一份插件生成的文件；原生容器下绝不产生 blob 导航。 */
export async function saveGeneratedFile(file: GeneratedFile, stamp: number = Date.now()): Promise<SaveOutcome> {
    const container = nativeExportBridge();
    if (!container) {
        browserDownload(file);
        return "browser";
    }
    try {
        const path = assetPathFor(file.fileName, stamp);
        await putAsset(path, file.content, file.mime);
        requestNativeSave(container, `${location.origin}${path}`);
        showMessage(t("msg.exportSaved", {path}), 6200);
        return "native";
    } catch (error) {
        showMessage(t("msg.exportSaveFail", {error: String(error instanceof Error ? error.message : error)}), 7000, "error");
        return "failed";
    }
}
