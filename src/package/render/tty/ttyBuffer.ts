import { Color } from "../../util/color.js";
import { Rect } from "../../util/rect.js";
import { ANSI } from "./ttyRenderer.js";

export class TTyBufferPixel {

    public color: Color | undefined;
    public bg_color: Color | undefined;
    public bold: boolean = false;
    public italic: boolean = false;
    public underline: boolean = false;

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

    public set_content(char?: string) {
        this.content = (char === undefined || char.length === 0) ? undefined : char;
    }

    public get_unstyled_text_content() {
        return `${ANSI.reset}${this.color ? ANSI.rgb(this.color) : ANSI.none}${this.bg_color ? ANSI.bg_rgb(this.bg_color) : ANSI.none}${this.bold ? ANSI.bold : ANSI.none}${this.italic ? ANSI.italic : ANSI.none}${this.underline ? ANSI.underline : ANSI.none}${this.content ?? ' '}${ANSI.reset}`;
    }
}

export type PixelTextStyle = {
    color?: Color;
    bg_color?: Color;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export class TTyBuffer {

    private readonly pixels: TTyBufferPixel[][] = [];

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
                    row.push(new TTyBufferPixel());
                }
                this.pixels.push(row);
            }
        }
        if (this._width > width) {
            for (let i = 0; i < height; i++) {
                this.pixels[i].splice(width, this._width - width);
            }
        }
        else if (this._width < width) {
            for (let i = 0; i < this._height; i++) {
                for (let x = 0; x < width - this._width; x++) {
                    this.pixels[i].push(new TTyBufferPixel());
                }
            }
        }
        this._width = width;
        this._height = height;
    }

    protected set_pixel_text_style(pixel: TTyBufferPixel, text_style?: PixelTextStyle, clear_style?: boolean) {
        if (clear_style || text_style?.color !== undefined) pixel.set_color(text_style?.color);
        if (clear_style || text_style?.bg_color !== undefined) pixel.set_bg_color(text_style?.bg_color);
        if (clear_style || text_style?.bold !== undefined) pixel.set_bold(text_style?.bold);
        if (clear_style || text_style?.italic !== undefined) pixel.set_italic(text_style?.italic);
        if (clear_style || text_style?.underline !== undefined) pixel.set_underline(text_style?.underline);
    }

    public set_text_style(x: number, y: number, width: number, height: number, text_style?: PixelTextStyle, clear_style?: boolean) {
        for (let i = 0; i < width && (x + i) < this._width; i++) {
            for (let j = 0; j < height && (y + j) < this._height; j++) {
                const pixel = this.pixels[y + j][x + i];
                this.set_pixel_text_style(pixel, text_style, clear_style);
            }
        }
    }

    public set_char(x: number, y: number, width?: number, height?: number, char?: string, text_style?: PixelTextStyle, clear_style?: boolean) {
        const set_style = clear_style || text_style !== undefined;
        if (width === undefined && height === undefined || width === 1 && height === 1) {
            const pixel = this.pixels[y][x];
            pixel.set_content(char);
            if (set_style) {
                this.set_pixel_text_style(pixel, text_style, clear_style);
            }
        }
        else {
            width ??= 1;
            height ??= 1;
            for (let i = 0; i < width && (x + i) < this._width; i++) {
                for (let j = 0; j < height && (y + j) < this._height; j++) {
                    const pixel = this.pixels[y + j][x + i];
                    pixel.set_content(char);
                    if (set_style) {
                        this.set_pixel_text_style(pixel, text_style, clear_style);
                    }
                }
            }
        }
    }

    public set_string(x: number, y: number, str: string, text_style?: PixelTextStyle, clear_style?: boolean) {
        const set_style = clear_style || text_style !== undefined;
        const chars = [...str];
        const width = chars.length;
        if (width === 0) return;
        if (width === 1) {
            const pixel = this.pixels[y][x];
            pixel.set_content(chars[0]);
            if (set_style) {
                this.set_pixel_text_style(pixel, clear_style ? undefined : text_style);
            }
        }
        else {
            for (let i = 0; i < width && (x + i) < this._width; i++) {
                const pixel = this.pixels[y][x + i];
                pixel.set_content(chars[i]);
                if (set_style) {
                    this.set_pixel_text_style(pixel, clear_style ? undefined : text_style);
                }
            }
        }
    }

    public *iterate(x: number, y: number, width: number, height: number) {
        // const rect = Rect.of(0, 0, this._width, this._height).intersect(Rect.of(x, y, width, height));
        // if (rect === undefined) return;
        // x = rect.x;
        // y = rect.y;
        // width = rect.width;
        // height = rect.height;
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
        return this.pixels.map(row => row.map(p => p.get_unstyled_text_content()).join('') + ANSI.reset).join('\n');
    }

}