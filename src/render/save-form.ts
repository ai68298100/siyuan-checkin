/* 编辑器表单保存：从 index.ts 外置（T-022）。
   纯数据装配 + 冲突检测；持久化/广播经 SaveFormHost 回调完成。 */
import {t} from "../i18n";
import {makeId} from "../model";
import {nextItemUpdatedAt, isValidLocalDateInput, normalizePriorityInput, normalizeTimeSlotInput} from "../shared";
import {normalizeQuickSteps, normalizeRecordStep} from "../record-step";
import {KIND_OPTIONS} from "../catalog";
import {validateEditorInput} from "../editor-validation";
import {validateAnchorBlockId} from "../features/note-anchor";
import {showMessage} from "siyuan";
import type {CheckinItem, CheckinItemRevision, CheckinKind, CheckinSchedule, CheckinStore, CompletionSource, ScheduleType, TomatoValueMode} from "../types";

export interface SaveFormHost {
    store: CheckinStore;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    itemFingerprint(item: CheckinItem): string;
    persist(): Promise<void>;
    invalidateSummary(): void;
    broadcast(event: unknown): void;
    renderBackgroundUpdate(): void;
    showToday(): void;
}

export async function saveEditorForm(
    host: SaveFormHost,
    data: FormData,
    editingId: string | undefined,
    submittedAt: {occurredAt: string; localDate: string},
    expectedFingerprint?: string,
): Promise<void> {
    const name = String(data.get("name") || "").trim();
    const requestedKind = String(data.get("kind") || "binary");
    const kind: CheckinKind = KIND_OPTIONS.some((option) => option.kind === requestedKind) ? requestedKind as CheckinKind : "binary";
    const requestedSchedule = String(data.get("schedule") || "daily");
    const scheduleType: ScheduleType = ["daily", "workdays", "weekly", "custom", "interval", "quota"].includes(requestedSchedule) ? requestedSchedule as ScheduleType : "daily";
    const checkedWeekdays = data.getAll("weekday").map((value) => Number(value));
    const requestedInterval = Number(data.get("intervalDays"));
    const intervalDaysValue = Number.isFinite(requestedInterval) ? Math.max(1, Math.min(3650, Math.round(requestedInterval))) : 1;
    const requestedAnchor = String(data.get("anchorDate") || "");
    const anchorDateValue = isValidLocalDateInput(requestedAnchor) ? requestedAnchor : submittedAt.localDate;
    const requestedQuotaPeriod = data.get("quotaPeriod") === "month" ? "month" : "week";
    const requestedQuotaMode = data.get("quotaCountMode") === "value" ? "value" : "dates";
    const requestedQuotaAmount = Number(data.get("quotaAmount"));
    const quotaAmountValue = Number.isFinite(requestedQuotaAmount) ? Math.max(requestedQuotaMode === "dates" ? 1 : 0.1, requestedQuotaAmount) : 0;
    const validation = validateEditorInput({name, kind, target: kind === "binary" ? 1 : Number(data.get("target")), unit: kind === "binary" ? "次" : String(data.get("unit") || "").trim(), schedule: scheduleType, weekdays: checkedWeekdays, quotaAmount: requestedQuotaAmount});
    if (!validation.valid) {
        showMessage(`[小驴打卡] ${validation.errors.name || validation.errors.target || validation.errors.unit || validation.errors.schedule || t("msg.formInvalid")}`);
        return;
    }
    const schedule: CheckinSchedule = scheduleType === "interval"
        ? {type: scheduleType, intervalDays: intervalDaysValue, anchorDate: anchorDateValue}
        : scheduleType === "quota"
            ? {type: scheduleType, quota: {period: requestedQuotaPeriod, amount: Math.round(quotaAmountValue * 100) / 100, countMode: requestedQuotaMode, ...(requestedQuotaPeriod === "week" ? {weekStartsOn: 1 as const} : {})}}
            : {type: scheduleType, weekdays: scheduleType === "daily" || scheduleType === "workdays" ? undefined : checkedWeekdays};
    const existing = editingId ? host.store.items.find((item) => item.id === editingId) : undefined;
    if (editingId && (!existing || !expectedFingerprint || host.itemFingerprint(existing) !== expectedFingerprint)) {
        showMessage(t("msg.conflictEdit"));
        host.showToday();
        return;
    }
    const createdDate = existing?.createdDate || submittedAt.localDate;
    const target = kind === "binary" ? 1 : Math.max(0.1, Number(data.get("target")) || 1);
    const kindOption = KIND_OPTIONS.find((option) => option.kind === kind) || KIND_OPTIONS[0];
    const unit = kind === "binary" ? "次" : String(data.get("unit") || kindOption.defaultUnit).trim().slice(0, 16) || kindOption.defaultUnit;
    const recordStep = normalizeRecordStep(kind, data.get("recordStep"));
    const autoArchiveDays = Math.max(0, Math.round(Number(data.get("autoArchiveDays")) || 0));
    const group = String(data.get("group") || "").trim().slice(0, 32);
    const priority = normalizePriorityInput(data.get("priority"));
    const timeSlot = normalizeTimeSlotInput(data.get("timeSlot"));
    const completionSource: CompletionSource = data.get("completionSource") === "tomato" ? "tomato" : "manual";
    const tomatoMode: TomatoValueMode = data.get("tomatoMode") === "sessions" ? "sessions" : "minutes";
    /* T-1231：笔记锚点——非法输入显式拒绝（不静默丢弃）。 */
    const requestedAnchorBlock = String(data.get("anchorBlockId") || "").trim();
    const anchorBlockId = requestedAnchorBlock ? validateAnchorBlockId(requestedAnchorBlock) : undefined;
    if (requestedAnchorBlock && !anchorBlockId) {
        showMessage(`[小驴打卡] ${t("editor.anchorInvalid")}`);
        return;
    }
    const anchorAppendNotes = Boolean(anchorBlockId) && data.get("anchorAppendNotes") === "on";
    /* T-1239（D-219）：戒除类方向仅支持每日排期，其他排期静默回落 at-least。 */
    const direction = data.get("directionAtMost") === "on" && scheduleType === "daily" ? "atMost" as const : undefined;
    /* T-1390（D-259）：Task Horizon 日历显示——勾选为缺省（不写字段），取消勾选仅物化 false。 */
    const taskHorizonCalendarVisible = data.get("taskHorizonVisible") === "on";
    /* T-1409 容错连续：留空=严格断链（不物化）；1~30 取整。 */
    const streakTolerance = Math.max(0, Math.min(30, Math.round(Number(data.get("streakToleranceDays")) || 0)));
    /* T-1462 数值快捷增量：逗号/空白分隔文本归一为 ≤4 个正数；留空/非法不物化（仅默认步长）。 */
    const quickSteps = normalizeQuickSteps(kind, data.get("quickSteps"));
    /* T-1465（D-273）问卷日记绑定：slug 校验与 normalizeItem 同口径；空=不物化。 */
    const journalTemplateId = String(data.get("journalTemplateId") || "").trim().toLowerCase();
    const sortOrder = existing?.sortOrder ?? host.store.items.reduce((maximum, candidate) => candidate.group === group ? Math.max(maximum, candidate.sortOrder || 0) : maximum, 0) + 1;
    const revision: CheckinItemRevision = {
        effectiveDate: submittedAt.localDate,
        kind,
        target,
        unit,
        ...(recordStep ? {recordStep} : {}),
        schedule: {...schedule, weekdays: schedule.weekdays ? [...schedule.weekdays] : undefined},
    };
    const revisions: CheckinItemRevision[] = existing?.revisions.map((entry) => ({
        ...entry,
        schedule: {...entry.schedule, weekdays: entry.schedule.weekdays ? [...entry.schedule.weekdays] : undefined},
    })) || [];
    const revisionIndex = revisions.findIndex((entry) => entry.effectiveDate === revision.effectiveDate);
    if (revisionIndex >= 0) {
        revisions[revisionIndex] = revision;
    } else {
        revisions.push(revision);
        revisions.sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
    }
    const item: CheckinItem = {
        id: existing?.id || makeId("item"),
        name,
        icon: String(data.get("icon") || "✓"),
        kind,
        target,
        unit,
        ...(recordStep ? {recordStep} : {}),
        schedule,
        createdAt: existing?.createdAt || submittedAt.occurredAt,
        updatedAt: nextItemUpdatedAt(existing?.updatedAt, submittedAt.occurredAt),
        createdDate,
        revisions,
        archivePeriods: existing?.archivePeriods.map((period) => ({...period})) || [],
        /* 与 normalizeStore 的规范条目保持同一字段集合：缺省 archived 会被
           规范化物化为 false，写后校验按 JSON 指纹比较，两侧必须逐键一致。 */
        archived: existing?.archived ?? false,
        ...(autoArchiveDays > 0 ? {autoArchive: {afterDays: autoArchiveDays}} : {}),
        group,
        priority,
        sortOrder,
        timeSlot,
        completionSource,
        tomatoMode,
        ...(direction ? {direction} : {}),
        ...(anchorBlockId ? {noteAnchor: {blockId: anchorBlockId, ...(anchorAppendNotes ? {appendNotes: true} : {})}} : {}),
        ...(!taskHorizonCalendarVisible ? {taskHorizonCalendarVisible: false as const} : {}),
        ...(streakTolerance >= 1 ? {streakTolerance} : {}),
        /* 与 normalizeItem 的规范字段集合保持逐键一致（写后校验按 JSON 指纹比较）。 */
        ...(quickSteps.length ? {quickSteps} : {}),
        ...(/^[a-z0-9][a-z0-9-]{0,39}$/.test(journalTemplateId) ? {journal: {templateId: journalTemplateId}} : {}),
    };
    const previous = host.store;
    host.store = {
        ...host.store,
        items: existing ? host.store.items.map((candidate) => candidate.id === item.id ? item : candidate) : [...host.store.items, item],
    };
    try {
        await host.persist();
    } catch {
        host.store = previous;
        showMessage(t("msg.saveFail"));
        host.renderBackgroundUpdate();
        return;
    }
    host.invalidateSummary();
    host.broadcast({type: existing ? "item-updated" : "item-created", item});
    host.showToday();
}
