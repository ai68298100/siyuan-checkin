export interface SiyuanBlockLink {
    blockId: string;
    url: string;
    label: string;
}

export interface SiyuanBlockLinkSpan extends SiyuanBlockLink {
    start: number;
    end: number;
}

// Lute's node IDs are a timestamp (14 digits) followed by seven lower-case
// letters or digits. Keep this check local so a note can never inject a URL.
const NODE_ID_PATTERN = /^[0-9]{14}-[a-z0-9]{7}$/;
const BLOCK_REF_PATTERN = /\(\(\s*([0-9]{14}-[a-z0-9]{7})(?:\s+(?:"((?:\\[\s\S]|[^"\\])*)"|'((?:\\[\s\S]|[^'\\])*)'))?\s*\)\)/g;
const HTML_TAG_PATTERN = /<!--[\s\S]*?(?:-->|$)|<\/?[a-z][^<>"']*(?:(?:"[^"]*"|'[^']*')[^<>"']*)*>/gi;
const URL_PREFIX = "siyuan://";

/**
 * Extract the supported SiYuan block-reference forms from a note.
 *
 * This intentionally scans a small, documented subset instead of attempting
 * to parse Markdown. Returned labels are display text only; callers must HTML
 * escape them before inserting them into a page.
 */
export function extractSiyuanBlockLinks(note: string): SiyuanBlockLink[] {
    const seen = new Set<string>();
    return extractSiyuanBlockLinkSpans(note).filter((link) => {
        if (seen.has(link.blockId)) return false;
        seen.add(link.blockId);
        return true;
    }).map(({start: _start, end: _end, ...link}) => link);
}

/**
 * Extract links with their source spans so a caller can render the original
 * note while replacing only validated references with safe anchors.
 */
export function extractSiyuanBlockLinkSpans(note: string): SiyuanBlockLinkSpan[] {
    if (!note) return [];

    const matches: SiyuanBlockLinkSpan[] = [];
    const htmlTags = [...note.matchAll(HTML_TAG_PATTERN)].map((match) => ({start: match.index!, end: match.index! + match[0].length}));

    BLOCK_REF_PATTERN.lastIndex = 0;
    let reference: RegExpExecArray | null;
    while ((reference = BLOCK_REF_PATTERN.exec(note)) !== null) {
        if (isEscaped(note, reference.index)) continue;
        const blockId = reference[1];
        const anchor = reference[2] === undefined ? reference[3] : reference[2];
        matches.push({
            blockId, url: blockUrl(blockId), label: anchor === undefined ? blockId : unescapeAnchor(anchor),
            start: reference.index, end: reference.index + reference[0].length,
        });
    }

    let offset = 0;
    while (offset < note.length) {
        const index = note.indexOf(URL_PREFIX, offset);
        if (index < 0) break;
        let end = scanUrlEnd(note, index + URL_PREFIX.length);
        while (/[.,!?;:]/.test(note[end - 1] || "")) end -= 1;
        const rawUrl = note.slice(index, end);
        const blockId = parseSiyuanBlockUrl(rawUrl);
        const markdown = blockId ? markdownLabel(note, index, blockId) : undefined;
        const previous = note[index - 1];
        if (blockId && markdown !== undefined && !isEscaped(note, index) && !hasEnclosingUrl(note, index)
            && (!previous || !/[a-zA-Z0-9_:/?=&%.\-"']/.test(previous))) {
            matches.push({
                blockId, url: blockUrl(blockId), label: markdown.label,
                start: markdown.start, end: markdown.end,
            });
        }
        // Always advance beyond the marker, even when the candidate is invalid.
        offset = Math.max(end, index + URL_PREFIX.length);
    }

    matches.sort((left, right) => left.start - right.start || right.end - left.end);
    const result: SiyuanBlockLinkSpan[] = [];
    for (const match of matches) {
        if (htmlTags.some((tag) => match.start >= tag.start && match.start < tag.end)) continue;
        if (result.length && match.start < result[result.length - 1].end) continue;
        result.push(match);
    }
    return result;
}

function blockUrl(blockId: string): string {
    return `${URL_PREFIX}blocks/${blockId}`;
}

export function parseSiyuanBlockUrl(rawUrl: string): string | undefined {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch (_error) {
        return undefined;
    }
    if (parsed.protocol !== "siyuan:" || parsed.hostname !== "blocks"
        || parsed.username || parsed.password || parsed.port
        || parsed.search || parsed.hash || parsed.pathname.length < 2) {
        return undefined;
    }
    const blockId = parsed.pathname.slice(1);
    // Requiring the canonical raw string also rejects percent-encoded IDs
    // and any alternate spelling accepted by the URL parser.
    return NODE_ID_PATTERN.test(blockId) && rawUrl === blockUrl(blockId) ? blockId : undefined;
}

function scanUrlEnd(note: string, start: number): number {
    let end = start;
    while (end < note.length && !isUrlDelimiter(note[end])) end += 1;
    return end;
}

function isUrlDelimiter(character: string): boolean {
    return /[\s，。！？、；：]/.test(character) || character === ")" || character === "]"
        || character === ">" || character === "<" || character === "["
        || character === "\"" || character === "'";
}

function hasEnclosingUrl(note: string, index: number): boolean {
    let start = index;
    while (start > 0 && !/[\s<>"'\[\]]/.test(note[start - 1])) start -= 1;
    return /[a-z][a-z0-9+.-]*:\/\//i.test(note.slice(start, index));
}

function markdownLabel(note: string, urlIndex: number, fallback: string): {label: string; start: number; end: number} | undefined {
    const plain = {label: fallback, start: urlIndex, end: urlIndex + blockUrl(fallback).length};
    let cursor = urlIndex - 1;
    while (cursor >= 0 && /\s/.test(note[cursor])) cursor -= 1;
    if (note[cursor] !== "(" || note[cursor - 1] !== "]" || isEscaped(note, cursor - 1)) return plain;
    // A Markdown destination must have its closing parenthesis. Without this
    // guard a malformed `[label](siyuan://...)` would look like a valid link.
    if (note[urlIndex + blockUrl(fallback).length] !== ")") return undefined;
    const closeBracket = cursor - 1;
    cursor -= 2;
    while (cursor >= 0) {
        if (note[cursor] === "]" && !isEscaped(note, cursor)) return plain;
        if (note[cursor] === "[") {
            if (isEscaped(note, cursor)) {
                cursor -= 1;
                continue;
            }
            return {label: unescapeAnchor(note.slice(cursor + 1, closeBracket)) || fallback, start: cursor, end: plain.end + 1};
        }
        cursor -= 1;
    }
    return undefined;
}

function unescapeAnchor(anchor: string): string {
    return anchor.replace(/\\([\\"'\[\]()])/g, "$1");
}

function isEscaped(note: string, index: number): boolean {
    let backslashes = 0;
    while (index > 0 && note[--index] === "\\") backslashes += 1;
    return backslashes % 2 === 1;
}
