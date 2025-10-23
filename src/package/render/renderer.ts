import { WriteStream } from "node:tty";
import { Color } from "../util/color.js";
import { PixelTextStyle, Buffer } from "./buffer.js";
import { Rect } from "../util/rect.js";
import { Scene } from "../scene/scene.js";
import { BorderType } from "../style/border_style.js";

export const ANSI = {
    none: '',

    clear: '\x1B[2J\x1B[3J\x1B[H\x1Bc',
    hide_cursor: '\x1B[?25l',
    show_cursor: '\x1B[?25h',
    move_to: (x: number, y: number) => `\x1B[${y + 1};${x + 1}H`,

    reset: '\x1B[0m',
    bold: '\x1B[1m',
    dim: '\x1B[2m',
    italic: '\x1B[3m',
    underline: '\x1B[4m',
    inverse: '\x1B[7m',

    fg: (n: number) => `\x1B[38;5;${n}m`,
    bg: (n: number) => `\x1B[48;5;${n}m`,
    rgb: (c: Color) => `\x1B[38;2;${c.r};${c.g};${c.b}m`,
    bg_rgb: (c: Color) => `\x1B[48;2;${c.r};${c.g};${c.b}m`,

    color: {
        red: '\x1B[31m',
        green: '\x1B[32m',
        yellow: '\x1B[33m',
        blue: '\x1B[34m',
        magenta: '\x1B[35m',
        cyan: '\x1B[36m',
        white: '\x1B[37m',
    },
};

// #region emoji_regax
export const emoji_regax = /\p{Emoji_Presentation}/u;
// #endregion

export function calculate_char_region(char: string) {
    let x = char.charCodeAt(0);
    let y = (char.length == 2) ? char.charCodeAt(1) : 0;
    let codePoint = x;
    if ((0xD800 <= x && x <= 0xDBFF) && (0xDC00 <= y && y <= 0xDFFF)) {
        x &= 0x3FF;
        y &= 0x3FF;
        codePoint = (x << 10) | y;
        codePoint += 0x10000;
    }

    if ((0x3000 == codePoint) ||
        (0xFF01 <= codePoint && codePoint <= 0xFF60) ||
        (0xFFE0 <= codePoint && codePoint <= 0xFFE6)) {
        return 'F';
    }
    if ((0x20A9 == codePoint) ||
        (0xFF61 <= codePoint && codePoint <= 0xFFBE) ||
        (0xFFC2 <= codePoint && codePoint <= 0xFFC7) ||
        (0xFFCA <= codePoint && codePoint <= 0xFFCF) ||
        (0xFFD2 <= codePoint && codePoint <= 0xFFD7) ||
        (0xFFDA <= codePoint && codePoint <= 0xFFDC) ||
        (0xFFE8 <= codePoint && codePoint <= 0xFFEE)) {
        return 'H';
    }
    if ((0x1100 <= codePoint && codePoint <= 0x115F) ||
        (0x11A3 <= codePoint && codePoint <= 0x11A7) ||
        (0x11FA <= codePoint && codePoint <= 0x11FF) ||
        (0x2329 <= codePoint && codePoint <= 0x232A) ||
        (0x2E80 <= codePoint && codePoint <= 0x2E99) ||
        (0x2E9B <= codePoint && codePoint <= 0x2EF3) ||
        (0x2F00 <= codePoint && codePoint <= 0x2FD5) ||
        (0x2FF0 <= codePoint && codePoint <= 0x2FFB) ||
        (0x3001 <= codePoint && codePoint <= 0x303E) ||
        (0x3041 <= codePoint && codePoint <= 0x3096) ||
        (0x3099 <= codePoint && codePoint <= 0x30FF) ||
        (0x3105 <= codePoint && codePoint <= 0x312D) ||
        (0x3131 <= codePoint && codePoint <= 0x318E) ||
        (0x3190 <= codePoint && codePoint <= 0x31BA) ||
        (0x31C0 <= codePoint && codePoint <= 0x31E3) ||
        (0x31F0 <= codePoint && codePoint <= 0x321E) ||
        (0x3220 <= codePoint && codePoint <= 0x3247) ||
        (0x3250 <= codePoint && codePoint <= 0x32FE) ||
        (0x3300 <= codePoint && codePoint <= 0x4DBF) ||
        (0x4E00 <= codePoint && codePoint <= 0xA48C) ||
        (0xA490 <= codePoint && codePoint <= 0xA4C6) ||
        (0xA960 <= codePoint && codePoint <= 0xA97C) ||
        (0xAC00 <= codePoint && codePoint <= 0xD7A3) ||
        (0xD7B0 <= codePoint && codePoint <= 0xD7C6) ||
        (0xD7CB <= codePoint && codePoint <= 0xD7FB) ||
        (0xF900 <= codePoint && codePoint <= 0xFAFF) ||
        (0xFE10 <= codePoint && codePoint <= 0xFE19) ||
        (0xFE30 <= codePoint && codePoint <= 0xFE52) ||
        (0xFE54 <= codePoint && codePoint <= 0xFE66) ||
        (0xFE68 <= codePoint && codePoint <= 0xFE6B) ||
        (0x1B000 <= codePoint && codePoint <= 0x1B001) ||
        (0x1F200 <= codePoint && codePoint <= 0x1F202) ||
        (0x1F210 <= codePoint && codePoint <= 0x1F23A) ||
        (0x1F240 <= codePoint && codePoint <= 0x1F248) ||
        (0x1F250 <= codePoint && codePoint <= 0x1F251) ||
        (0x20000 <= codePoint && codePoint <= 0x2F73F) ||
        (0x2B740 <= codePoint && codePoint <= 0x2FFFD) ||
        (0x30000 <= codePoint && codePoint <= 0x3FFFD)) {
        return 'W';
    }
    if ((0x0020 <= codePoint && codePoint <= 0x007E) ||
        (0x00A2 <= codePoint && codePoint <= 0x00A3) ||
        (0x00A5 <= codePoint && codePoint <= 0x00A6) ||
        (0x00AC == codePoint) ||
        (0x00AF == codePoint) ||
        (0x27E6 <= codePoint && codePoint <= 0x27ED) ||
        (0x2985 <= codePoint && codePoint <= 0x2986)) {
        return 'Na';
    }
    if ((0x00A1 == codePoint) ||
        (0x00A4 == codePoint) ||
        (0x00A7 <= codePoint && codePoint <= 0x00A8) ||
        (0x00AA == codePoint) ||
        (0x00AD <= codePoint && codePoint <= 0x00AE) ||
        (0x00B0 <= codePoint && codePoint <= 0x00B4) ||
        (0x00B6 <= codePoint && codePoint <= 0x00BA) ||
        (0x00BC <= codePoint && codePoint <= 0x00BF) ||
        (0x00C6 == codePoint) ||
        (0x00D0 == codePoint) ||
        (0x00D7 <= codePoint && codePoint <= 0x00D8) ||
        (0x00DE <= codePoint && codePoint <= 0x00E1) ||
        (0x00E6 == codePoint) ||
        (0x00E8 <= codePoint && codePoint <= 0x00EA) ||
        (0x00EC <= codePoint && codePoint <= 0x00ED) ||
        (0x00F0 == codePoint) ||
        (0x00F2 <= codePoint && codePoint <= 0x00F3) ||
        (0x00F7 <= codePoint && codePoint <= 0x00FA) ||
        (0x00FC == codePoint) ||
        (0x00FE == codePoint) ||
        (0x0101 == codePoint) ||
        (0x0111 == codePoint) ||
        (0x0113 == codePoint) ||
        (0x011B == codePoint) ||
        (0x0126 <= codePoint && codePoint <= 0x0127) ||
        (0x012B == codePoint) ||
        (0x0131 <= codePoint && codePoint <= 0x0133) ||
        (0x0138 == codePoint) ||
        (0x013F <= codePoint && codePoint <= 0x0142) ||
        (0x0144 == codePoint) ||
        (0x0148 <= codePoint && codePoint <= 0x014B) ||
        (0x014D == codePoint) ||
        (0x0152 <= codePoint && codePoint <= 0x0153) ||
        (0x0166 <= codePoint && codePoint <= 0x0167) ||
        (0x016B == codePoint) ||
        (0x01CE == codePoint) ||
        (0x01D0 == codePoint) ||
        (0x01D2 == codePoint) ||
        (0x01D4 == codePoint) ||
        (0x01D6 == codePoint) ||
        (0x01D8 == codePoint) ||
        (0x01DA == codePoint) ||
        (0x01DC == codePoint) ||
        (0x0251 == codePoint) ||
        (0x0261 == codePoint) ||
        (0x02C4 == codePoint) ||
        (0x02C7 == codePoint) ||
        (0x02C9 <= codePoint && codePoint <= 0x02CB) ||
        (0x02CD == codePoint) ||
        (0x02D0 == codePoint) ||
        (0x02D8 <= codePoint && codePoint <= 0x02DB) ||
        (0x02DD == codePoint) ||
        (0x02DF == codePoint) ||
        (0x0300 <= codePoint && codePoint <= 0x036F) ||
        (0x0391 <= codePoint && codePoint <= 0x03A1) ||
        (0x03A3 <= codePoint && codePoint <= 0x03A9) ||
        (0x03B1 <= codePoint && codePoint <= 0x03C1) ||
        (0x03C3 <= codePoint && codePoint <= 0x03C9) ||
        (0x0401 == codePoint) ||
        (0x0410 <= codePoint && codePoint <= 0x044F) ||
        (0x0451 == codePoint) ||
        (0x2010 == codePoint) ||
        (0x2013 <= codePoint && codePoint <= 0x2016) ||
        (0x2018 <= codePoint && codePoint <= 0x2019) ||
        (0x201C <= codePoint && codePoint <= 0x201D) ||
        (0x2020 <= codePoint && codePoint <= 0x2022) ||
        (0x2024 <= codePoint && codePoint <= 0x2027) ||
        (0x2030 == codePoint) ||
        (0x2032 <= codePoint && codePoint <= 0x2033) ||
        (0x2035 == codePoint) ||
        (0x203B == codePoint) ||
        (0x203E == codePoint) ||
        (0x2074 == codePoint) ||
        (0x207F == codePoint) ||
        (0x2081 <= codePoint && codePoint <= 0x2084) ||
        (0x20AC == codePoint) ||
        (0x2103 == codePoint) ||
        (0x2105 == codePoint) ||
        (0x2109 == codePoint) ||
        (0x2113 == codePoint) ||
        (0x2116 == codePoint) ||
        (0x2121 <= codePoint && codePoint <= 0x2122) ||
        (0x2126 == codePoint) ||
        (0x212B == codePoint) ||
        (0x2153 <= codePoint && codePoint <= 0x2154) ||
        (0x215B <= codePoint && codePoint <= 0x215E) ||
        (0x2160 <= codePoint && codePoint <= 0x216B) ||
        (0x2170 <= codePoint && codePoint <= 0x2179) ||
        (0x2189 == codePoint) ||
        (0x2190 <= codePoint && codePoint <= 0x2199) ||
        (0x21B8 <= codePoint && codePoint <= 0x21B9) ||
        (0x21D2 == codePoint) ||
        (0x21D4 == codePoint) ||
        (0x21E7 == codePoint) ||
        (0x2200 == codePoint) ||
        (0x2202 <= codePoint && codePoint <= 0x2203) ||
        (0x2207 <= codePoint && codePoint <= 0x2208) ||
        (0x220B == codePoint) ||
        (0x220F == codePoint) ||
        (0x2211 == codePoint) ||
        (0x2215 == codePoint) ||
        (0x221A == codePoint) ||
        (0x221D <= codePoint && codePoint <= 0x2220) ||
        (0x2223 == codePoint) ||
        (0x2225 == codePoint) ||
        (0x2227 <= codePoint && codePoint <= 0x222C) ||
        (0x222E == codePoint) ||
        (0x2234 <= codePoint && codePoint <= 0x2237) ||
        (0x223C <= codePoint && codePoint <= 0x223D) ||
        (0x2248 == codePoint) ||
        (0x224C == codePoint) ||
        (0x2252 == codePoint) ||
        (0x2260 <= codePoint && codePoint <= 0x2261) ||
        (0x2264 <= codePoint && codePoint <= 0x2267) ||
        (0x226A <= codePoint && codePoint <= 0x226B) ||
        (0x226E <= codePoint && codePoint <= 0x226F) ||
        (0x2282 <= codePoint && codePoint <= 0x2283) ||
        (0x2286 <= codePoint && codePoint <= 0x2287) ||
        (0x2295 == codePoint) ||
        (0x2299 == codePoint) ||
        (0x22A5 == codePoint) ||
        (0x22BF == codePoint) ||
        (0x2312 == codePoint) ||
        (0x2460 <= codePoint && codePoint <= 0x24E9) ||
        (0x24EB <= codePoint && codePoint <= 0x254B) ||
        (0x2550 <= codePoint && codePoint <= 0x2573) ||
        (0x2580 <= codePoint && codePoint <= 0x258F) ||
        (0x2592 <= codePoint && codePoint <= 0x2595) ||
        (0x25A0 <= codePoint && codePoint <= 0x25A1) ||
        (0x25A3 <= codePoint && codePoint <= 0x25A9) ||
        (0x25B2 <= codePoint && codePoint <= 0x25B3) ||
        (0x25B6 <= codePoint && codePoint <= 0x25B7) ||
        (0x25BC <= codePoint && codePoint <= 0x25BD) ||
        (0x25C0 <= codePoint && codePoint <= 0x25C1) ||
        (0x25C6 <= codePoint && codePoint <= 0x25C8) ||
        (0x25CB == codePoint) ||
        (0x25CE <= codePoint && codePoint <= 0x25D1) ||
        (0x25E2 <= codePoint && codePoint <= 0x25E5) ||
        (0x25EF == codePoint) ||
        (0x2605 <= codePoint && codePoint <= 0x2606) ||
        (0x2609 == codePoint) ||
        (0x260E <= codePoint && codePoint <= 0x260F) ||
        (0x2614 <= codePoint && codePoint <= 0x2615) ||
        (0x261C == codePoint) ||
        (0x261E == codePoint) ||
        (0x2640 == codePoint) ||
        (0x2642 == codePoint) ||
        (0x2660 <= codePoint && codePoint <= 0x2661) ||
        (0x2663 <= codePoint && codePoint <= 0x2665) ||
        (0x2667 <= codePoint && codePoint <= 0x266A) ||
        (0x266C <= codePoint && codePoint <= 0x266D) ||
        (0x266F == codePoint) ||
        (0x269E <= codePoint && codePoint <= 0x269F) ||
        (0x26BE <= codePoint && codePoint <= 0x26BF) ||
        (0x26C4 <= codePoint && codePoint <= 0x26CD) ||
        (0x26CF <= codePoint && codePoint <= 0x26E1) ||
        (0x26E3 == codePoint) ||
        (0x26E8 <= codePoint && codePoint <= 0x26FF) ||
        (0x273D == codePoint) ||
        (0x2757 == codePoint) ||
        (0x2776 <= codePoint && codePoint <= 0x277F) ||
        (0x2B55 <= codePoint && codePoint <= 0x2B59) ||
        (0x3248 <= codePoint && codePoint <= 0x324F) ||
        (0xE000 <= codePoint && codePoint <= 0xF8FF) ||
        (0xFE00 <= codePoint && codePoint <= 0xFE0F) ||
        (0xFFFD == codePoint) ||
        (0x1F100 <= codePoint && codePoint <= 0x1F10A) ||
        (0x1F110 <= codePoint && codePoint <= 0x1F12D) ||
        (0x1F130 <= codePoint && codePoint <= 0x1F169) ||
        (0x1F170 <= codePoint && codePoint <= 0x1F19A) ||
        (0xE0100 <= codePoint && codePoint <= 0xE01EF) ||
        (0xF0000 <= codePoint && codePoint <= 0xFFFFD) ||
        (0x100000 <= codePoint && codePoint <= 0x10FFFD)) {
        return 'A';
    }

    return 'N';
};

export function calculate_char_width(char: string, ambiguous_width: number = 1) {
    const code_point = char.codePointAt(0)!;
    if (code_point <= 0x1F || (code_point >= 0x7F && code_point <= 0x9F)) {
        return 0;
    }
    if (code_point >= 0x300 && code_point <= 0x36F) {
        return 0;
    }
    if (emoji_regax.test(char)) return 2;
    const code = calculate_char_region(char);
    switch (code) {
        case 'F':
        case 'W':
            return 2;
        case 'A':
            return ambiguous_width;
        default:
            return 1;
    }
}

export function calculate_string_width(str: string, ambiguous_width: number = 1) {
    let width = 0;
    const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
    const chars = Array.from(segmenter.segment(str), s => s.segment);
    for (const char of chars) {
        const char_width = calculate_char_width(char, ambiguous_width);
        width += char_width;
    }
    return width;
}

export function split_string_with_width(str: string, ambiguous_width: number = 1) {
    const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(str), s => ({ char: s.segment, width: calculate_char_width(s.segment, ambiguous_width) }));
}

export class Renderer {

    public readonly stream: WriteStream;
    protected readonly buffer: Buffer;
    protected readonly render_callback: (render: Renderer) => void;

    protected scene: Scene | undefined;

    constructor(stream: WriteStream, render_callback: (render: Renderer) => void) {
        this.stream = stream;
        this.buffer = new Buffer();
        this.buffer.resize(this.width, this.height);
        this.render_callback = render_callback;
    }

    get width(): number {
        return this.stream.columns;
    }
    get height(): number {
        return this.stream.rows;
    }

    protected render_queued: boolean = false;
    protected is_rendering: boolean = false;

    public queue_render() {
        if (this.is_rendering) {
            this.render_queued = true;
        }
        if (this.render_queued) return;
        else {
            this.render_queued = true;
            setImmediate(() => {
                this.begin_render(this.width, this.height);
                this.render_callback(this);
                this.end_render();
            });
        }
    }

    private on_changed_listener = () => this.queue_render();
    public set_scene(scene: Scene) {
        if (this.scene === scene) return;
        if (this.scene !== undefined) {
            this.scene.on_changed.disconnect(this.on_changed_listener);
        }
        this.scene = scene;
        this.scene.on_changed.connect(this.on_changed_listener);
    }

    public clear_scene() {
        if (this.scene !== undefined) {
            this.scene.on_changed.disconnect(this.on_changed_listener);
        }
        this.scene = undefined;
    }

    init() {
        this.stream.write('\x1b[?1049h\x1b[?25l\x1b[?1006h');
        this.stream.on('resize', this.on_changed_listener);
    }
    dispose() {
        this.stream.write('\x1b[?1006l\x1b[?1049l\x1b[?25h');
        this.stream.off('resize', this.on_changed_listener);
    }

    private rendered_content: string = '';

    private begin_time: number = 0;

    protected begin_render(width: number, height: number): void {
        this.begin_time = Date.now();
        this.is_rendering = true;
        this.render_queued = false;
        this.buffer.resize(width, height);
        this.rendered_content = '';
        this.mask_stack = [];
    }

    protected mask_stack: Rect[] = [];

    public push_mask(mask: Rect) {
        if (this.mask_stack.length === 0) {
            this.mask_stack.push(mask);
            this.buffer.set_mask(mask);
        }
        else {
            mask = this.mask_stack[this.mask_stack.length - 1].intersect(mask) ?? Rect.of(0, 0, 0, 0);
            this.mask_stack.push(mask);
            this.buffer.set_mask(mask);
        }
    }

    public pop_mask() {
        this.mask_stack.pop();
        if (this.mask_stack.length === 0) {
            this.buffer.set_mask();
        }
        else {
            this.buffer.set_mask(this.mask_stack[this.mask_stack.length - 1]);
        }
    }

    public fill(rect: Rect, bg_color?: Color) {
        this.draw_char(rect.x, rect.y, rect.width, rect.height, undefined, undefined, bg_color === undefined ? undefined : { bg_color }, true);
    }

    public draw_text_style(x: number, y: number, width: number, height: number, text_style?: PixelTextStyle, clear_style?: boolean) {
        this.buffer.set_text_style(x, y, width, height, text_style, clear_style);
    }

    public draw_char(x: number, y: number, width?: number, height?: number, char?: string, span?: number, text_style?: PixelTextStyle, clear_style?: boolean) {
        const span_width = span === undefined ? (char === undefined ? 1 : calculate_char_width(char)) : span;
        this.buffer.set_char(x, y, width, height, char, span_width, text_style, clear_style);
    }

    public draw_string(x: number, y: number, str: string, text_style?: PixelTextStyle, clear_style?: boolean) {
        const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
        const chars = Array.from(segmenter.segment(str), s => s.segment);
        const width = chars.length;
        if (width === 0) return;
        if (width === 1) {
            const char_width = calculate_char_width(chars[0]);
            this.draw_char(x, y, 1, 1, chars[0], char_width, text_style, clear_style);
        }
        else {
            let total_width = 0;
            for (const char of chars) {
                const char_width = calculate_char_width(char);
                if (x + total_width + char_width >= this.width) break;
                this.draw_char(x + total_width, y, 1, 1, char, char_width, text_style, clear_style);
                total_width += char_width;
            }
        }
    }

    public draw_box_border(rect: Rect, border_type: BorderType, text_style?: PixelTextStyle, clear_style?: boolean) {
        const { x, y, width, height } = rect;
        const {
            top_left,
            top,
            top_right,
            right,
            bottom_left,
            bottom,
            bottom_right,
            left,
        } = border_type;
        this.draw_char(x, y, undefined, undefined, top_left, 1, text_style, clear_style);
        this.draw_char(x + width - 1, y, undefined, undefined, top_right, 1, text_style, clear_style);
        this.draw_char(x + width - 1, y + height - 1, undefined, undefined, bottom_right, 1, text_style, clear_style);
        this.draw_char(x, y + height - 1, undefined, undefined, bottom_left, 1, text_style, clear_style);
        this.draw_char(x + 1, y, width - 2, 1, top, 1, text_style, clear_style);
        this.draw_char(x + 1, y + height - 1, width - 2, 1, bottom, 1, text_style, clear_style);
        this.draw_char(x, y + 1, 1, height - 2, left, 1, text_style, clear_style);
        this.draw_char(x + width - 1, y + 1, 1, height - 2, right, 1, text_style, clear_style);
    }

    public draw_scene() {
        if (this.scene === undefined) return;
        this.scene.calculate_layout(this.width, this.height);
        this.scene.draw(this);
    }

    public execute_render(viewport: Rect, target: Rect, clear_screen: boolean, clear_empty: boolean, clear_screen_color?: Color, clear_empty_color?: Color) {

        const render_rect = target.intersect(Rect.of(0, 0, this.width, this.height));

        if (render_rect === undefined) {
            // clear
            if (clear_screen) {
                const width = this.width;
                const clear_str = ' '.repeat(width);
                let str = '';
                for (let i = 0; i < this.height; i++) {
                    str += ANSI.move_to(0, i);
                    str += `${ANSI.reset}${clear_screen_color ? ANSI.bg_rgb(clear_screen_color) : ''}${clear_str}${ANSI.reset}`;
                }
                this.rendered_content += str;
            }
            return;
        }

        const render_offset_x = target.x - render_rect.x;
        const render_offset_y = target.y - render_rect.y;

        const content_rect = Rect.of(
            viewport.x - render_offset_x,
            viewport.y - render_offset_y,
            Math.min(viewport.width + render_offset_x, render_rect.width),
            Math.min(viewport.height + render_offset_y, render_rect.height),
        )

        const has_more_x = content_rect.width < render_rect.width;
        const has_more_y = content_rect.height < render_rect.height;
        const more_top = render_rect.y + content_rect.height;
        const more_bottom = render_rect.y + render_rect.height;
        const more_width = ' '.repeat(render_rect.width - content_rect.width);
        const more_height = ' '.repeat(render_rect.width);

        let str = ANSI.move_to(render_rect.x, render_rect.y);
        let skip_span = 1;
        const clear_empty_str = clear_empty_color ? `${ANSI.reset}${ANSI.bg_rgb(clear_empty_color)}` : '';
        for (const { x, y, pixel, newline, endline } of this.buffer.iterate(content_rect.x, content_rect.y, content_rect.width, content_rect.height)) {
            if (newline) {
                str += ANSI.move_to(
                    render_rect.x + x + render_offset_x - content_rect.x,
                    render_rect.y + y + render_offset_y - content_rect.y,
                );
                // console.log(y, render_rect.y + y + render_offset_y - content_rect.y);
            }
            if (pixel === undefined) {
                str += `${clear_empty_str} `;
                skip_span = 0;
            }
            else {
                const styled_char = pixel.get_styled_text_content();
                const span = pixel.get_span();
                if (skip_span > 1) {
                    skip_span--;
                }
                else {
                    str += styled_char;
                    skip_span = span;
                }
            }
            if (endline) {
                if (has_more_x) str += `${clear_empty_str}${more_width}`;
                str += ANSI.reset;
                skip_span = 1;
            }
        }
        if (has_more_y) {
            for (let i = more_top; i < more_bottom; i++) {
                str += `${ANSI.move_to(render_rect.x, i)}${ANSI.reset}${clear_empty_str}${more_height}${ANSI.reset}`;
            }
        }

        this.rendered_content += str;
    }

    protected async end_render() {
        // log("rendered in ", Date.now() - this.begin_time, "ms");
        await new Promise((resolve) => this.stream.write(this.rendered_content, resolve as any));
        this.is_rendering = false;
        if (this.render_queued) {
            this.render_queued = false;
            this.queue_render();
        }
    }
}
