/* 共享矢量图标路径与渲染。 */

export const UI_ICON_PATHS: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z M9 20v-6h6v6",
    calendar: "M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1z M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01",
    history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
    summary: "M5 19V9M12 19V5M19 19v-7",
    insight: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z",
    archive: "M4 7h16v13H4z M3 4h18v3H3z M9 11h6",
    settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9A7 7 0 0 0 15.5 6L15 3.5h-4L10.5 6a7 7 0 0 0-1.1.8l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 7 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.3.3.7.6 1.1.8l.5 2.5h4l.5-2.5c.4-.2.8-.5 1.1-.8l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
    add: "M12 5v14M5 12h14",
    back: "m15 5-7 7 7 7",
    forward: "m9 5 7 7-7 7",
    search: "m11 5a6 6 0 1 0 3.9 10.6L20 20",
    external: "M14 5h5v5M19 5l-8 8",
    focus: "M12 6v6l4 2M12 3a9 9 0 1 0 9 9",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    edit: "m4 16.5-.8 3.3 3.3-.8L18 7.5 14.5 4zM13 5.5l3.5 3.5",
    trash: "M5 7h14M10 11v6M14 11v6M9 7V4h6v3m-9 0 1 13h10l1-13",
    timer: "M12 7v5l3 2M8 3h8M12 3v2M5.6 6.4 4 4.8M18.4 6.4 20 4.8M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
    expand: "M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5",
    close: "M6 6l12 12M18 6 6 18",
    check: "m5 12 4 4L19 6",
    circle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
};

export type UiIconName = keyof typeof UI_ICON_PATHS;

export function uiIcon(name: UiIconName, className = ""): string {
    return `<svg class="lc-checkin__glyph ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${UI_ICON_PATHS[name]}" /></svg>`;
}
