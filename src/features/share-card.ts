/* R-18.1（2026-09-26）分享图片导出：年度格子 + 统计卡的本地 canvas 绘制。
   纪律：纯函数布局模型（buildShareCardModel）与最小 canvas 接口绘制（drawShareCard）
   分离——绘制只依赖显式传入的模型与调色板，零网络零遥测，图片仅在本地生成与保存。
   色阶沿用年热力图的 0..4 级（T-1410 口径），绘制层以 accent 透明度阶梯表达（单色亮度
   阶梯，T-1461 基线）；留白格（-1）不绘制。 */

export interface ShareCardDay {
    date: string;
    /** 0=无记录；1..4=强度级；-1=留白（窗口外的对齐格）。 */
    level: number;
}

export interface ShareCardModel {
    year: number;
    total: number;
    activeDays: number;
    maxStreak: number;
    /** 列主序格子（周一起始 7 行）：level 0..4 可绘制，-1=留白。 */
    cells: Array<{column: number; row: number; level: number}>;
    columns: number;
}

export interface ShareCardPalette {
    bg: string;
    text: string;
    muted: string;
    accent: string;
    track: string;
}

/** 最小 canvas 2D 接口：真实 CanvasRenderingContext2D 结构性满足，测试可用桩替换。 */
export interface ShareCardCanvas {
    fillStyle: string;
    font: string;
    globalAlpha: number;
    fillRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number): void;
}

export const SHARE_CARD_CELL = 12;
export const SHARE_CARD_GAP = 3;
export const SHARE_CARD_MARGIN = 18;

export function buildShareCardModel(input: {year: number; days: ReadonlyArray<ShareCardDay>; total: number; maxStreak: number; activeDays: number}): ShareCardModel {
    if (!Array.isArray(input.days) || !input.days.length) return {year: input.year, total: 0, activeDays: 0, maxStreak: 0, cells: [], columns: 0};
    const first = input.days[0].date;
    const leading = /^\d{4}-\d{2}-\d{2}$/.test(first) ? (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7 : 0;
    const cells: ShareCardModel["cells"] = [];
    let columns = 0;
    let index = 0;
    for (const day of input.days) {
        const slot = leading + index;
        const column = Math.floor(slot / 7);
        const row = slot % 7;
        if (day.level >= 0) cells.push({column, row, level: Math.max(0, Math.min(4, day.level))});
        columns = column + 1;
        index += 1;
    }
    return {year: input.year, total: Math.max(0, input.total), activeDays: Math.max(0, input.activeDays), maxStreak: Math.max(0, input.maxStreak), cells, columns};
}

export function shareCardSize(model: ShareCardModel): {width: number; height: number} {
    const gridWidth = model.columns * (SHARE_CARD_CELL + SHARE_CARD_GAP) - SHARE_CARD_GAP;
    return {
        width: SHARE_CARD_MARGIN * 2 + Math.max(gridWidth, 260),
        height: SHARE_CARD_MARGIN + 30 + 24 + 7 * (SHARE_CARD_CELL + SHARE_CARD_GAP) + 26 + SHARE_CARD_MARGIN,
    };
}

/** 绘制：背景 → 标题 → 统计行 → 格子 → 落款。文本与格子都是显式坐标，无随机无时钟。 */
export function drawShareCard(canvas: ShareCardCanvas, model: ShareCardModel, palette: ShareCardPalette, texts: {title: string; stats: string; footer: string}): void {
    const size = shareCardSize(model);
    canvas.globalAlpha = 1;
    canvas.fillStyle = palette.bg;
    canvas.fillRect(0, 0, size.width, size.height);
    canvas.fillStyle = palette.text;
    canvas.font = "bold 20px sans-serif";
    canvas.fillText(texts.title, SHARE_CARD_MARGIN, SHARE_CARD_MARGIN + 16);
    canvas.fillStyle = palette.muted;
    canvas.font = "13px sans-serif";
    canvas.fillText(texts.stats, SHARE_CARD_MARGIN, SHARE_CARD_MARGIN + 40);
    const levelAlpha = [0, 0.18, 0.38, 0.65, 1];
    const originY = SHARE_CARD_MARGIN + 58;
    for (const cell of model.cells) {
        const x = SHARE_CARD_MARGIN + cell.column * (SHARE_CARD_CELL + SHARE_CARD_GAP);
        const y = originY + cell.row * (SHARE_CARD_CELL + SHARE_CARD_GAP);
        if (cell.level <= 0) {
            canvas.globalAlpha = 1;
            canvas.fillStyle = palette.track;
        } else {
            canvas.globalAlpha = levelAlpha[cell.level];
            canvas.fillStyle = palette.accent;
        }
        canvas.fillRect(x, y, SHARE_CARD_CELL, SHARE_CARD_CELL);
    }
    canvas.globalAlpha = 1;
    canvas.fillStyle = palette.muted;
    canvas.font = "11px sans-serif";
    canvas.fillText(texts.footer, SHARE_CARD_MARGIN, size.height - SHARE_CARD_MARGIN + 4);
}
