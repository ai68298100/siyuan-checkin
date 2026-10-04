export interface FocusClockSample {
    wallMs: number;
    monotonicMs: number;
}

export interface FocusClock {
    elapsedMs: number;
    sample: FocusClockSample;
    interrupted: boolean;
}

export const FOCUS_MAX_VISIBLE_GAP_MS = 30000;
export const FOCUS_MAX_CLOCK_SKEW_MS = 2000;

export function createFocusClock(sample: FocusClockSample, elapsedMs = 0): FocusClock {
    return {elapsedMs: Math.max(0, elapsedMs), sample: {...sample}, interrupted: false};
}

export function advanceFocusClock(clock: FocusClock, sample: FocusClockSample, running: boolean, totalSec: number): FocusClock {
    const wallDelta = sample.wallMs - clock.sample.wallMs;
    const monotonicDelta = sample.monotonicMs - clock.sample.monotonicMs;
    const interrupted = running && (!Number.isFinite(wallDelta) || !Number.isFinite(monotonicDelta)
        || wallDelta < 0 || monotonicDelta < 0
        || wallDelta > FOCUS_MAX_VISIBLE_GAP_MS || monotonicDelta > FOCUS_MAX_VISIBLE_GAP_MS
        || Math.abs(wallDelta - monotonicDelta) > FOCUS_MAX_CLOCK_SKEW_MS);
    const delta = running && !interrupted ? monotonicDelta : 0;
    return {...createFocusClock(sample, Math.min(totalSec * 1000, clock.elapsedMs + delta)), interrupted};
}

export function focusRemainingSec(clock: FocusClock, totalSec: number): number {
    return Math.max(0, Math.ceil(totalSec - clock.elapsedMs / 1000));
}
