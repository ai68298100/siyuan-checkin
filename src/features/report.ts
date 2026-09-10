/* 8.3 周报 Markdown 生成：纯函数，输入已构建的 SummaryContext，输出可粘贴的 Markdown。 */

import type {SummaryContext} from "../analytics";

export function buildWeeklyReportMarkdown(summary: SummaryContext, title: string): string {
    const lines: string[] = [];
    const rate = summary.scheduledItems ? Math.round((summary.completedItems / summary.scheduledItems) * 100) : 0;
    lines.push(`## ${title}`);
    lines.push("");
    lines.push(`- 记录 **${summary.totalEvents}** 条`);
    lines.push(`- **${summary.completedItems}/${summary.scheduledItems}** 项有完成（${rate}%）`);
    lines.push(`- 范围：${summary.startDate} ~ ${summary.endDate}`);
    if (summary.items.length) {
        lines.push("");
        lines.push("| 项目 | 完成 | 完成率 |");
        lines.push("| --- | --- | --- |");
        for (const item of summary.items) {
            lines.push(`| ${item.name} | ${item.completedDays}/${item.scheduledDays} 天 | ${item.completionRate}% |`);
        }
    }
    lines.push("");
    lines.push("> 由小驴打卡生成");
    return lines.join("\n");
}
