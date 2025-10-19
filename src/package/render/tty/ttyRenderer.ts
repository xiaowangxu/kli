import { WriteStream } from "node:tty";
import { Renderer, RenderReady } from "../renderer.js";
import { Color } from "../../util/color.js";
import { PixelTextStyle, TTyBuffer } from "./ttyBuffer.js";
import { Rect } from "../../util/rect.js";

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

export type BorderType = {
    top_left: string,
    top: string,
    top_right: string,
    right: string,
    bottom_left: string,
    bottom: string,
    bottom_right: string,
    left: string,
}

export function is_double_width_char(char: string) {
    const code = char.charCodeAt(0);
    return (code >= 0x4e00 && code <= 0x9fff) ||     // 中日韩统一表意文字
        (code >= 0x3000 && code <= 0x303f) ||        // CJK 符号和标点
        (code >= 0xff00 && code <= 0xffef);          // 全角字符
}

export class TTyRenderer implements Renderer {

    protected readonly stream: WriteStream;
    protected readonly buffer: TTyBuffer;
    protected readonly viewport: Rect = new Rect();

    constructor(stream: WriteStream) {
        this.stream = stream;
        this.buffer = new TTyBuffer();
        this.buffer.resize(this.width, this.height);
    }

    get width(): number {
        return this.stream.columns;
    }
    get height(): number {
        return this.stream.rows;
    }

    init(): void | RenderReady {
        this.stream.write('\x1b[?25l');
    }
    dispose(): void | RenderReady {
        this.stream.write('\x1b[?25h');
    }

    private rendered_content: string = '';

    begin_render(width: number, height: number): void {
        this.buffer.resize(width, height);
        this.rendered_content = '';
    }

    set_viewport(viewport: Rect) {
        this.viewport.copy(viewport);
    }

    public fill(x: number, y: number, width: number, height: number, bg_color?: Color) {
        this.draw_char(x, y, width, height, undefined, undefined, bg_color === undefined ? undefined : { bg_color }, true);
    }

    public draw_text_style(x: number, y: number, width: number, height: number, text_style?: PixelTextStyle, clear_style?: boolean) {
        this.buffer.set_text_style(x, y, width, height, text_style, clear_style);
    }

    public draw_char(x: number, y: number, width?: number, height?: number, char?: string, span: number = 1, text_style?: PixelTextStyle, clear_style?: boolean) {
        this.buffer.set_char(x, y, width, height, char, span, text_style, clear_style);
    }

    public draw_string(x: number, y: number, str: string, text_style?: PixelTextStyle, clear_style?: boolean) {
        const chars = [...str];
        const width = chars.length;
        if (width === 0) return;
        if (width === 1) {
            this.draw_char(x, y, 1, 1, chars[0], is_double_width_char(chars[0]) ? 2 : 1, text_style, clear_style);
        }
        else {
            for (let i = 0; i < width && (x + i) < this.width; i++) {
                this.draw_char(x + i, y, 1, 1, chars[i], is_double_width_char(chars[i]) ? 2 : 1, text_style, clear_style);
                if (is_double_width_char(chars[i])) x++;
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
        this.draw_char(x, y, undefined, undefined, top_left, undefined, text_style, clear_style);
        this.draw_char(x + width - 1, y, undefined, undefined, top_right, undefined, text_style, clear_style);
        this.draw_char(x + width - 1, y + height - 1, undefined, undefined, bottom_right, undefined, text_style, clear_style);
        this.draw_char(x, y + height - 1, undefined, undefined, bottom_left, undefined, text_style, clear_style);
        this.draw_char(x + 1, y, width - 2, 1, top, undefined, text_style, clear_style);
        this.draw_char(x + 1, y + height - 1, width - 2, 1, bottom, undefined, text_style, clear_style);
        this.draw_char(x, y + 1, 1, height - 2, left, undefined, text_style, clear_style);
        this.draw_char(x + width - 1, y + 1, 1, height - 2, right, undefined, text_style, clear_style);
    }

    render(target: Rect, clear_screen: boolean, clear_empty: boolean, clear_screen_color?: Color, clear_empty_color?: Color): void | RenderReady {

        const render_rect = target.intersect(Rect.of(0, 0, this.width, this.height));

        if (render_rect === undefined) {
            // clear
            if (clear_screen) {

            }
            return;
        }

        const render_offset_x = target.x - render_rect.x;
        const render_offset_y = target.y - render_rect.y;

        const content_rect = Rect.of(
            this.viewport.x - render_offset_x,
            this.viewport.y - render_offset_y,
            Math.min(this.viewport.width + render_offset_x, render_rect.width),
            Math.min(this.viewport.height + render_offset_y, render_rect.height),
        )

        const has_more_x = content_rect.width < render_rect.width;
        const has_more_y = content_rect.height < render_rect.height;
        const more_top = render_rect.y + content_rect.height;
        const more_bottom = render_rect.y + render_rect.height;
        const more_width = ' '.repeat(render_rect.width - content_rect.width);
        const more_height = ' '.repeat(render_rect.width);

        clear_empty_color ??= Color.of(0, 0, 0);
        let str = ANSI.move_to(render_rect.x, render_rect.y);
        let skip_span = 1;
        for (const { x, y, pixel, newline, endline } of this.buffer.iterate(content_rect.x, content_rect.y, content_rect.width, content_rect.height)) {
            if (newline) {
                str += ANSI.move_to(
                    render_rect.x + x + render_offset_x - content_rect.x,
                    render_rect.y + y + render_offset_y - content_rect.y,
                );
                // console.log(y, render_rect.y + y + render_offset_y - content_rect.y);
            }
            if (pixel === undefined) {
                str += `${ANSI.reset}${ANSI.bg_rgb(clear_empty_color)} `;
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
                if (has_more_x) str += `${ANSI.reset}${ANSI.bg_rgb(clear_empty_color)}${more_width}`;
                str += ANSI.reset;
                skip_span = 1;
            }
        }
        if (has_more_y) {
            for (let i = more_top; i < more_bottom; i++) {
                str += `${ANSI.move_to(render_rect.x, i)}${ANSI.reset}${ANSI.bg_rgb(clear_empty_color)}${more_height}${ANSI.reset}`;
            }
        }

        this.rendered_content += str;
    }

    end_render(): void | RenderReady {
        return new Promise((resolve) => this.stream.write(this.rendered_content, resolve as any));
    }
}