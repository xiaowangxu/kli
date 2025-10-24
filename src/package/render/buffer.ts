import { Color } from "../util/color.js";
import { log } from "../util/logger.js";
import { Rect } from "../util/rect.js";
import { ANSI } from "./renderer.js";

export class BufferPixel {

    protected color: Color | undefined;
    protected bg_color: Color | undefined;
    protected bold: boolean = false;
    protected italic: boolean = false;
    protected underline: boolean = false;
    protected span: number = 0;

    private content?: string;

    public set_color(color?: Color) {
        if (color === undefined) {
            this.color = undefined;
        }
        else {
            if (this.color === undefined) {
                this.color = new Color();
            }
            this.color.copy(color);
        }
    }

    public set_bg_color(color?: Color) {
        if (color === undefined) {
            this.bg_color = undefined;
        }
        else {
            if (this.bg_color === undefined) {
                this.bg_color = new Color();
            }
            this.bg_color.copy(color);
        }
    }

    public set_bold(v?: boolean) {
        this.bold = v ?? false;
    }

    public set_italic(v?: boolean) {
        this.italic = v ?? false;
    }

    public set_underline(v?: boolean) {
        this.underline = v ?? false;
    }

    public set_content(char?: string, span?: number) {
        this.content = (char === undefined || char.length === 0) ? undefined : char;
        this.span = Math.max(1, span ?? 1);
    }

    public get_span() {
        return this.span;
    }

    public get_styled_text_content(override_char?: string) {
        return `${ANSI.reset}${this.color ? ANSI.rgb(this.color) : ANSI.none}${this.bg_color ? ANSI.bg_rgb(this.bg_color) : ANSI.none}${this.bold ? ANSI.bold : ANSI.none}${this.italic ? ANSI.italic : ANSI.none}${this.underline ? ANSI.underline : ANSI.none}${override_char ?? this.get_unstyled_text_content()}${ANSI.reset}`;
    }

    public get_unstyled_text_content() {
        return this.content ?? ' ';
    }
}

export type PixelTextStyle = {
    color?: Color;
    bg_color?: Color;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export class Buffer {

    private readonly pixels: BufferPixel[][] = [];

    private _width: number = 0;
    private _height: number = 0;

    get width() { return this._width; }
    get height() { return this._height; }

    public resize(width: number, height: number) {
        width = Math.max(0, Math.floor(width));
        height = Math.max(0, Math.floor(height));
        if (this._height > height) {
            this.pixels.splice(height, this._height - height);
        }
        else if (this._height < height) {
            for (let i = 0; i < height - this._height; i++) {
                const row = [];
                for (let x = 0; x < width; x++) {
                    row.push(new BufferPixel());
                }
                this.pixels.push(row);
            }
        }
        const last_height = Math.min(height, this._height);
        this._height = height;
        if (this._width > width) {
            for (let i = 0; i < last_height; i++) {
                this.pixels[i].splice(width, this._width - width);
            }
        }
        else if (this._width < width) {
            for (let i = 0; i < last_height; i++) {
                for (let x = 0; x < width - this._width; x++) {
                    this.pixels[i].push(new BufferPixel());
                }
            }
        }
        this._width = width;
        this.mask.x = 0;
        this.mask.y = 0;
        this.mask.width = width;
        this.mask.height = height;
    }

    protected set_pixel_text_style(pixel: BufferPixel, text_style?: PixelTextStyle, clear_style?: boolean) {
        if (clear_style || text_style?.color !== undefined) pixel.set_color(text_style?.color);
        if (clear_style || text_style?.bg_color !== undefined) pixel.set_bg_color(text_style?.bg_color);
        if (clear_style || text_style?.bold !== undefined) pixel.set_bold(text_style?.bold);
        if (clear_style || text_style?.italic !== undefined) pixel.set_italic(text_style?.italic);
        if (clear_style || text_style?.underline !== undefined) pixel.set_underline(text_style?.underline);
    }

    protected readonly mask: Rect = Rect.of(0, 0, 0, 0);

    public set_mask(mask?: Rect) {
        if (mask === undefined) {
            this.mask.x = 0;
            this.mask.y = 0;
            this.mask.width = this.width;
            this.mask.height = this.height;
        }
        else {
            this.mask.copy(Rect.of(0, 0, this.width, this.height).intersect(mask) ?? Rect.of(0, 0, 0, 0));
        }
    }

    public set_text_style(x: number, y: number, width: number, height: number, text_style?: PixelTextStyle, clear_style?: boolean) {
        for (let i = 0; i < width; i++) {
            if ((x + i) < this.mask.x) continue;
            if ((x + i) >= this.mask.x + this.mask.width) break;
            for (let j = 0; j < height; j++) {
                if ((y + j) < this.mask.y) continue;
                if ((y + j) >= this.mask.y + this.mask.height) break;
                const pixel = this.pixels[y + j][x + i];
                this.set_pixel_text_style(pixel, text_style, clear_style);
            }
        }
    }

    public set_char(x: number, y: number, width?: number, height?: number, char?: string, span?: number, text_style?: PixelTextStyle, clear_style?: boolean) {
        const set_style = clear_style || text_style !== undefined;
        width ??= 1;
        height ??= 1;
        for (let i = 0; i < width; i++) {
            if ((x + i) < this.mask.x) continue;
            if ((x + i) >= this.mask.x + this.mask.width) break;
            for (let j = 0; j < height; j++) {
                if ((y + j) < this.mask.y) continue;
                if ((y + j) >= this.mask.y + this.mask.height) break;
                const pixel = this.pixels[y + j][x + i];
                pixel.set_content(char, span);
                if (set_style) {
                    this.set_pixel_text_style(pixel, text_style, clear_style);
                }
            }
        }
    }

    public *iterate(x: number, y: number, width: number, height: number) {
        for (let j = 0; j < height && (y + j) < this._height; j++) {
            let newline = true;
            for (let i = 0; i < width && (x + i) < this._width; i++) {
                const next = i + 1;
                if (x + i < 0 || y + j < 0) {
                    yield { outside: true, x: x + i, y: y + j, pixel: undefined, newline, endline: !(next < width && (x + next) < this._width) };
                }
                else {
                    const pixel = this.pixels[y + j][x + i];
                    yield { outside: false, x: x + i, y: y + j, pixel: pixel, newline, endline: !(next < width && (x + next) < this._width) };
                }
                newline = false;
            }
        }
    }

    public toString() {
        return this.pixels.map(row => row.map(p => p.get_styled_text_content()).join('') + ANSI.reset).join('\n');
    }

}