import { calculate_char_width } from '../render/renderer.js';

const grapheme_segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export type TextWrapMode = 'none' | 'char' | 'word';
export type CellBoundaryBias = 'backward' | 'forward' | 'nearest';

export interface GraphemeCell {
    readonly index: number;
    readonly char: string;
    readonly width: number;
    readonly utf16Start: number;
    readonly utf16End: number;
    readonly columnStart: number;
    readonly columnEnd: number;
}

export interface VisualTextPosition { readonly x: number; readonly y: number; }
export interface VisualTextEntry extends VisualTextPosition {
    readonly index: number;
    readonly char: string;
    readonly width: number;
}
export interface VisualTextLine {
    readonly y: number;
    readonly start: number;
    readonly end: number;
    readonly width: number;
    readonly hardBreak: boolean;
}
export interface VisualTextLayout {
    readonly entries: readonly VisualTextEntry[];
    readonly positions: readonly VisualTextPosition[];
    readonly lines: readonly VisualTextLine[];
    readonly width: number;
    readonly height: number;
}

function is_cjk(value: string) {
    return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(value);
}

/** Unicode-aware line opportunity used by both plain and styled text layout. */
export function is_word_break_after(current: string, next?: string) {
    if (/^[\s\p{Z}]+$/u.test(current)) return true;
    if (/^[-‐‑‒–—/\\\p{P}]$/u.test(current)) return true;
    if (is_cjk(current)) return true;
    if (next !== undefined && is_cjk(next)) return true;
    return false;
}

/** Immutable grapheme/cell map. All indices exposed by editors are grapheme indices. */
export class TextLayout {
    public readonly cells: readonly GraphemeCell[];
    public readonly columns: readonly number[];
    protected readonly visual_cache = new Map<string, VisualTextLayout>();

    constructor(public readonly value: string, public readonly ambiguousWidth: number = 1) {
        const cells: GraphemeCell[] = [];
        const columns: number[] = [0];
        let column = 0;
        let index = 0;
        for (const part of grapheme_segmenter.segment(value)) {
            const char = part.segment;
            const width = char === '\n' || char === '\r' ? 0 : calculate_char_width(char, ambiguousWidth);
            cells.push({
                index,
                char,
                width,
                utf16Start: part.index,
                utf16End: part.index + char.length,
                columnStart: column,
                columnEnd: column + width,
            });
            column += width;
            columns.push(column);
            index++;
        }
        this.cells = cells;
        this.columns = columns;
    }

    public get length() { return this.cells.length; }
    public get width() { return this.columns[this.columns.length - 1] ?? 0; }
    public columnAt(index: number) { return this.columns[this.clamp(index)] ?? 0; }
    public widthBetween(start: number, end: number) {
        const from = this.clamp(Math.min(start, end));
        const to = this.clamp(Math.max(start, end));
        return (this.columns[to] ?? 0) - (this.columns[from] ?? 0);
    }
    public slice(start: number, end: number = this.length) {
        const from = this.clamp(Math.min(start, end));
        const to = this.clamp(Math.max(start, end));
        if (from === to) return '';
        return this.value.slice(this.cells[from].utf16Start, this.cells[to - 1].utf16End);
    }
    public indexAtColumn(column: number, bias: CellBoundaryBias = 'nearest', from: number = 0) {
        const start = this.clamp(from);
        const target = Math.max(this.columnAt(start), column);
        let low = start;
        let high = this.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (this.columnAt(middle + 1) <= target) low = middle + 1;
            else high = middle;
        }
        if (low >= this.length) return this.length;
        const cell = this.cells[low];
        if (target <= cell.columnStart) return low;
        if (bias === 'backward') return low;
        if (bias === 'forward') return low + 1;
        return target - cell.columnStart < cell.width / 2 ? low : low + 1;
    }
    public clamp(index: number) { return Math.max(0, Math.min(this.length, Math.floor(index))); }

    public wrap(width: number, mode: TextWrapMode = 'word'): VisualTextLayout {
        const wrap_width = mode === 'none' || !Number.isFinite(width)
            ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(width));
        const key = `${mode}:${wrap_width}`;
        const cached = this.visual_cache.get(key);
        if (cached !== undefined) return cached;
        const layout = this.create_visual_layout(wrap_width, mode);
        if (this.visual_cache.size >= 8) this.visual_cache.delete(this.visual_cache.keys().next().value!);
        this.visual_cache.set(key, layout);
        return layout;
    }

    protected create_visual_layout(wrap_width: number, mode: TextWrapMode): VisualTextLayout {
        const entries: VisualTextEntry[] = [];
        const positions: VisualTextPosition[] = Array.from({ length: this.length + 1 }, () => ({ x: 0, y: 0 }));
        const lines: VisualTextLine[] = [];
        let y = 0;
        let max_width = 0;
        let paragraph_start = 0;

        const append_line = (start: number, end: number, hardBreak: boolean) => {
            let x = 0;
            positions[start] = { x: 0, y };
            for (let index = start; index < end; index++) {
                const cell = this.cells[index];
                positions[index] = { x, y };
                entries.push({ index, char: cell.char, width: cell.width, x, y });
                x += cell.width;
                positions[index + 1] = { x, y };
            }
            lines.push({ y, start, end, width: x, hardBreak });
            max_width = Math.max(max_width, x);
            y++;
        };

        while (paragraph_start <= this.length) {
            let paragraph_end = paragraph_start;
            while (paragraph_end < this.length && this.cells[paragraph_end].char !== '\n') paragraph_end++;

            if (paragraph_start === paragraph_end) append_line(paragraph_start, paragraph_end, paragraph_end < this.length);
            else {
                let line_start = paragraph_start;
                while (line_start < paragraph_end) {
                    let cursor = line_start;
                    let used = 0;
                    let last_break = -1;
                    while (cursor < paragraph_end) {
                        const cell = this.cells[cursor];
                        if (cursor > line_start && used + cell.width > wrap_width) break;
                        used += cell.width;
                        cursor++;
                        if (mode === 'char' || (mode === 'word' && is_word_break_after(cell.char, this.cells[cursor]?.char))) {
                            last_break = cursor;
                        }
                        if (used >= wrap_width && cursor < paragraph_end) break;
                    }
                    if (cursor < paragraph_end && mode === 'word' && last_break > line_start) cursor = last_break;
                    if (cursor <= line_start) cursor = line_start + 1;
                    append_line(line_start, cursor, cursor >= paragraph_end && paragraph_end < this.length);
                    line_start = cursor;
                }
            }

            if (paragraph_end >= this.length) break;
            positions[paragraph_end] = positions[paragraph_end] ?? { x: 0, y: Math.max(0, y - 1) };
            positions[paragraph_end + 1] = { x: 0, y };
            paragraph_start = paragraph_end + 1;
        }

        const layout = { entries, positions, lines, width: max_width, height: Math.max(1, y) };
        return layout;
    }
}

const text_layout_cache = new Map<number, Map<string, TextLayout>>();
const text_layout_lru: TextLayout[] = [];
let cached_code_units = 0;
const MAX_CACHE_ENTRIES = 256;
const MAX_CACHE_CODE_UNITS = 1_000_000;

export function get_text_layout(value: string, ambiguousWidth: number = 1) {
    let width_cache = text_layout_cache.get(ambiguousWidth);
    const cached = width_cache?.get(value);
    if (cached !== undefined) {
        return cached;
    }
    const layout = new TextLayout(value, ambiguousWidth);
    if (width_cache === undefined) {
        width_cache = new Map();
        text_layout_cache.set(ambiguousWidth, width_cache);
    }
    width_cache.set(value, layout);
    text_layout_lru.push(layout);
    cached_code_units += value.length;
    while (text_layout_lru.length > MAX_CACHE_ENTRIES || cached_code_units > MAX_CACHE_CODE_UNITS) {
        const oldest = text_layout_lru.shift();
        if (oldest === undefined) break;
        const cache = text_layout_cache.get(oldest.ambiguousWidth);
        cache?.delete(oldest.value);
        if (cache?.size === 0) text_layout_cache.delete(oldest.ambiguousWidth);
        cached_code_units -= oldest.value.length;
    }
    return layout;
}

export function split_graphemes_with_width(value: string, ambiguousWidth: number = 1) {
    return get_text_layout(value, ambiguousWidth).cells;
}
