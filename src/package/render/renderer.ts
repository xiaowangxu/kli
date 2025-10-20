import { WriteStream } from "node:tty";
import { Color } from "../util/color.js";
import { PixelTextStyle, Buffer } from "./buffer.js";
import { Rect } from "../util/rect.js";
import { Scene } from "../scene/scene.js";
import { BorderType } from "../style/border_style.js";
import { sleep } from "../util/common.js";

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

export function is_double_width_char(char: string) {
    const code = char.charCodeAt(0);
    return (code >= 0x4e00 && code <= 0x9fff) ||     // 中日韩统一表意文字
        (code >= 0x3000 && code <= 0x303f) ||        // CJK 符号和标点
        (code >= 0xff00 && code <= 0xffef);          // 全角字符
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

    protected begin_render(width: number, height: number): void {
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
        await new Promise((resolve) => this.stream.write(this.rendered_content, resolve as any));
        this.is_rendering = false;
        if (this.render_queued) {
            this.render_queued = false;
            this.queue_render();
        }
    }
}