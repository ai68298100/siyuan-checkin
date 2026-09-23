/* T-1424 · R-A12 新手首次成功路径——纯状态机（零依赖、无时钟）。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-10.5）：
   - 旅程：not-started（未开始）→ item-created（已建项目：模板或空白）→ recorded
     （首次记录完成）→ feedback-shown（反馈已展示）→ review-visited（已到过回顾，旅程完成）；
   - 单调前进：过期事件不回退阶段；skip-guidance 把 skipped 置真（隐藏引导呈现，
     阶段仍随真实行为前进，指标不失真）；reset 是唯一回退（用户显式动作，
     不自动创建示例数据）；
   - 状态存现有偏好存储（可选字段，缺省 not-started/skipped=false，旧偏好零迁移）；
   - 全部函数显式入参，不读取时钟、不触宿主。 */

export type FirstSuccessStage = "not-started" | "item-created" | "recorded" | "feedback-shown" | "review-visited";
export type FirstSuccessEvent = "item-created" | "record-done" | "feedback-shown" | "review-visited" | "skip-guidance" | "reset";

export interface FirstSuccessState {
    stage: FirstSuccessStage;
    skipped: boolean;
}

export const DEFAULT_FIRST_SUCCESS_STATE: FirstSuccessState = {stage: "not-started", skipped: false};

export const FIRST_SUCCESS_STAGES: readonly FirstSuccessStage[] = ["not-started", "item-created", "recorded", "feedback-shown", "review-visited"];

const STAGE_RANK: Record<FirstSuccessStage, number> = {
    "not-started": 0,
    "item-created": 1,
    recorded: 2,
    "feedback-shown": 3,
    "review-visited": 4,
};

const EVENT_TARGET_RANK: Partial<Record<FirstSuccessEvent, number>> = {
    "item-created": 1,
    "record-done": 2,
    "feedback-shown": 3,
    "review-visited": 4,
};

/** 归一化：非法阶段/字段 fail-closed 回落默认值（旧偏好零迁移）。 */
export function normalizeFirstSuccessState(value: unknown): FirstSuccessState {
    if (!value || typeof value !== "object") return {...DEFAULT_FIRST_SUCCESS_STATE};
    const source = value as Record<string, unknown>;
    const stage = FIRST_SUCCESS_STAGES.includes(source.stage as FirstSuccessStage) ? (source.stage as FirstSuccessStage) : DEFAULT_FIRST_SUCCESS_STATE.stage;
    return {stage, skipped: source.skipped === true};
}

/** 应用事件：前进事件只升不降；skip-guidance 置 skipped（粘性，reset 才清除）；
    reset 回到默认状态。同一输入永远得到同一输出。 */
export function transitionFirstSuccess(state: FirstSuccessState, event: FirstSuccessEvent): FirstSuccessState {
    if (event === "reset") return {...DEFAULT_FIRST_SUCCESS_STATE};
    if (event === "skip-guidance") return state.skipped ? state : {stage: state.stage, skipped: true};
    const targetRank = EVENT_TARGET_RANK[event];
    if (targetRank === undefined) return state;
    const currentRank = STAGE_RANK[state.stage];
    if (targetRank <= currentRank) return state;
    const stage = FIRST_SUCCESS_STAGES[targetRank];
    return {stage, skipped: state.skipped};
}

/** 引导是否被用户跳过（跳过后今日空态不再显示三步引导）。 */
export function isFirstSuccessSuppressed(state: FirstSuccessState): boolean {
    return state.skipped;
}
