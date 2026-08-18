import { Color } from '../util/color.js';
import { Rect } from '../util/rect.js';
import { ANSI } from './renderer.js';

export type PixelTextStyle = {
    color?: Color;
    bg_color?: Color;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
};

export enum BlendFactor {
    Zero = 'zero',
    One = 'one',
    SrcColor = 'src-color',
    OneMinusSrcColor = 'one-minus-src-color',
    DstColor = 'dst-color',
    OneMinusDstColor = 'one-minus-dst-color',
    SrcAlpha = 'src-alpha',
    OneMinusSrcAlpha = 'one-minus-src-alpha',
    DstAlpha = 'dst-alpha',
    OneMinusDstAlpha = 'one-minus-dst-alpha',
    ConstantColor = 'constant-color',
    OneMinusConstantColor = 'one-minus-constant-color',
    ConstantAlpha = 'constant-alpha',
    OneMinusConstantAlpha = 'one-minus-constant-alpha',
    SrcAlphaSaturate = 'src-alpha-saturate',
}

export enum BlendEquation {
    Add = 'add',
    Subtract = 'subtract',
    ReverseSubtract = 'reverse-subtract',
    Min = 'min',
    Max = 'max',
}

export interface BlendState {
    enabled: boolean;
    sourceOver: boolean;
    srcRGB: BlendFactor;
    dstRGB: BlendFactor;
    srcAlpha: BlendFactor;
    dstAlpha: BlendFactor;
    equationRGB: BlendEquation;
    equationAlpha: BlendEquation;
    constant: Color;
}

function copy_color(color: Color | undefined): Color | undefined {
    return color === undefined ? undefined : Color.of(color.r, color.g, color.b, color.a);
}

function with_opacity(color: Color | undefined, opacity: number): Color | undefined {
    if (color === undefined) return undefined;
    return Color.of(color.r, color.g, color.b, Math.round(color.a * opacity));
}

function transparent() { return Color.of(0, 0, 0, 0); }

/** Straight-alpha source-over blending, matching OpenTUI's cell compositor. */
export function blend_source_over(source: Color, destination: Color): Color {
    const sourceAlpha = source.a / 255;
    const destinationAlpha = destination.a / 255;
    if (sourceAlpha <= 0) return copy_color(destination)!;
    if (sourceAlpha >= 1) return Color.of(source.r, source.g, source.b, 255);

    const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
    if (outputAlpha <= 0) return transparent();
    const channel = (sourceValue: number, destinationValue: number) => Math.round(
        (sourceValue * sourceAlpha + destinationValue * destinationAlpha * (1 - sourceAlpha)) / outputAlpha,
    );
    return Color.of(
        channel(source.r, destination.r),
        channel(source.g, destination.g),
        channel(source.b, destination.b),
        Math.round(outputAlpha * 255),
    );
}

function factor_value(
    factor: BlendFactor,
    source: number[],
    destination: number[],
    constant: number[],
    channel: number,
): number {
    switch (factor) {
        case BlendFactor.Zero: return 0;
        case BlendFactor.One: return 1;
        case BlendFactor.SrcColor: return source[channel];
        case BlendFactor.OneMinusSrcColor: return 1 - source[channel];
        case BlendFactor.DstColor: return destination[channel];
        case BlendFactor.OneMinusDstColor: return 1 - destination[channel];
        case BlendFactor.SrcAlpha: return source[3];
        case BlendFactor.OneMinusSrcAlpha: return 1 - source[3];
        case BlendFactor.DstAlpha: return destination[3];
        case BlendFactor.OneMinusDstAlpha: return 1 - destination[3];
        case BlendFactor.ConstantColor: return constant[channel];
        case BlendFactor.OneMinusConstantColor: return 1 - constant[channel];
        case BlendFactor.ConstantAlpha: return constant[3];
        case BlendFactor.OneMinusConstantAlpha: return 1 - constant[3];
        case BlendFactor.SrcAlphaSaturate: return channel === 3 ? 1 : Math.min(source[3], 1 - destination[3]);
    }
}

function apply_equation(equation: BlendEquation, source: number, destination: number): number {
    switch (equation) {
        case BlendEquation.Add: return source + destination;
        case BlendEquation.Subtract: return source - destination;
        case BlendEquation.ReverseSubtract: return destination - source;
        case BlendEquation.Min: return Math.min(source, destination);
        case BlendEquation.Max: return Math.max(source, destination);
    }
}

function blend_custom(sourceColor: Color, destinationColor: Color, state: BlendState): Color {
    const source = [sourceColor.r, sourceColor.g, sourceColor.b, sourceColor.a].map((value) => value / 255);
    const destination = [destinationColor.r, destinationColor.g, destinationColor.b, destinationColor.a]
        .map((value) => value / 255);
    const constant = [state.constant.r, state.constant.g, state.constant.b, state.constant.a]
        .map((value) => value / 255);
    const output = [0, 0, 0, 0];
    for (let channel = 0; channel < 4; channel++) {
        const alpha = channel === 3;
        const equation = alpha ? state.equationAlpha : state.equationRGB;
        if (equation === BlendEquation.Min || equation === BlendEquation.Max) {
            // WebGL ignores blend factors for MIN/MAX equations.
            output[channel] = apply_equation(equation, source[channel], destination[channel]);
        }
        else {
            const sourceFactor = factor_value(alpha ? state.srcAlpha : state.srcRGB, source, destination, constant, channel);
            const destinationFactor = factor_value(alpha ? state.dstAlpha : state.dstRGB, source, destination, constant, channel);
            output[channel] = Math.max(0, Math.min(1, apply_equation(
                equation,
                source[channel] * sourceFactor,
                destination[channel] * destinationFactor,
            )));
        }
    }
    return Color.of(...output.map((value) => Math.round(value * 255)) as [number, number, number, number]);
}

export class BufferPixel {
    protected color: Color | undefined;
    protected bg_color: Color | undefined;
    protected bold = false;
    protected italic = false;
    protected underline = false;
    protected span = 1;
    protected content: string | undefined;

    public get foreground() { return this.color; }
    public get background() { return this.bg_color; }
    public get text() { return this.content; }
    public get is_bold() { return this.bold; }
    public get is_italic() { return this.italic; }
    public get is_underline() { return this.underline; }
    public get is_empty() {
        return this.content === undefined && this.color === undefined && this.bg_color === undefined &&
            !this.bold && !this.italic && !this.underline;
    }
    public get isEmpty() { return this.is_empty; }

    public reset() {
        this.color = undefined;
        this.bg_color = undefined;
        this.bold = false;
        this.italic = false;
        this.underline = false;
        this.span = 1;
        this.content = undefined;
    }

    public copy(pixel: BufferPixel) {
        this.color = copy_color(pixel.color);
        this.bg_color = copy_color(pixel.bg_color);
        this.bold = pixel.bold;
        this.italic = pixel.italic;
        this.underline = pixel.underline;
        this.span = pixel.span;
        this.content = pixel.content;
        return this;
    }

    public clone() { return new BufferPixel().copy(this); }

    public equals(pixel: BufferPixel | undefined) {
        if (pixel === undefined) return false;
        const same_color = (a: Color | undefined, b: Color | undefined) =>
            a === b || (a !== undefined && b !== undefined &&
                a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a);
        return same_color(this.color, pixel.color) &&
            same_color(this.bg_color, pixel.bg_color) &&
            this.bold === pixel.bold && this.italic === pixel.italic &&
            this.underline === pixel.underline && this.span === pixel.span &&
            this.content === pixel.content;
    }

    public set_color(color?: Color) { this.color = copy_color(color); }
    public set_bg_color(color?: Color) { this.bg_color = copy_color(color); }
    public set_bold(value?: boolean) { this.bold = value ?? false; }
    public set_italic(value?: boolean) { this.italic = value ?? false; }
    public set_underline(value?: boolean) { this.underline = value ?? false; }

    public set_content(char?: string, span?: number) {
        this.content = char === undefined || char.length === 0 ? undefined : char;
        this.span = Math.max(1, span ?? 1);
    }

    public get_span() { return this.span; }

    public get_styled_text_content(override_char?: string, backdrop: Color = Color.of(0, 0, 0)) {
        let background = this.bg_color;
        if (background !== undefined && background.a < 255) background = blend_source_over(background, backdrop);
        let foreground = this.color;
        if (foreground !== undefined && foreground.a < 255) {
            foreground = blend_source_over(foreground, background ?? backdrop);
        }
        return `${ANSI.reset}${foreground ? ANSI.rgb(foreground) : ANSI.none}${background ? ANSI.bg_rgb(background) : ANSI.none}` +
            `${this.bold ? ANSI.bold : ANSI.none}${this.italic ? ANSI.italic : ANSI.none}` +
            `${this.underline ? ANSI.underline : ANSI.none}${override_char ?? this.get_unstyled_text_content()}${ANSI.reset}`;
    }

    public get_unstyled_text_content() { return this.content ?? ' '; }
}

/** A terminal-cell framebuffer with WebGL-like blend, scissor, and opacity state. */
export class FrameBuffer {
    protected readonly pixels: BufferPixel[][] = [];
    protected _width = 0;
    protected _height = 0;
    protected readonly mask: Rect = Rect.of(0, 0, 0, 0);
    protected readonly scissor_stack: Rect[] = [];
    protected readonly opacity_stack: number[] = [1];
    protected clear_color_value: Color = transparent();
    protected blend_state: BlendState = {
        enabled: true,
        sourceOver: true,
        srcRGB: BlendFactor.SrcAlpha,
        dstRGB: BlendFactor.OneMinusSrcAlpha,
        srcAlpha: BlendFactor.One,
        dstAlpha: BlendFactor.OneMinusSrcAlpha,
        equationRGB: BlendEquation.Add,
        equationAlpha: BlendEquation.Add,
        constant: Color.of(0, 0, 0, 0),
    };

    public constructor(width: number = 0, height: number = 0) { this.resize(width, height); }
    public get width() { return this._width; }
    public get height() { return this._height; }

    public resize(width: number, height: number) {
        width = Math.max(0, Math.floor(width));
        height = Math.max(0, Math.floor(height));
        if (this._height > height) this.pixels.splice(height, this._height - height);
        else if (this._height < height) {
            for (let row = this._height; row < height; row++) {
                this.pixels.push(Array.from({ length: this._width }, () => new BufferPixel()));
            }
        }
        for (const row of this.pixels) {
            if (row.length > width) row.splice(width, row.length - width);
            else while (row.length < width) row.push(new BufferPixel());
        }
        this._width = width;
        this._height = height;
        this.set_mask();
    }

    public copy_from(source: FrameBuffer) {
        this.resize(source.width, source.height);
        for (let y = 0; y < source.height; y++) {
            for (let x = 0; x < source.width; x++) {
                this.pixels[y][x].copy(source.pixels[y][x]);
            }
        }
        this.clear_color_value = copy_color(source.clear_color_value)!;
        return this;
    }
    public copyFrom(source: FrameBuffer) { return this.copy_from(source); }

    /** Read-only access for render diffing without allocating a clone. */
    public peek_pixel(x: number, y: number): BufferPixel | undefined {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return undefined;
        return this.pixels[y][x];
    }
    public peekPixel(x: number, y: number) { return this.peek_pixel(x, y); }

    public clear_color(color: Color) { this.clear_color_value = copy_color(color)!; }
    public clearColor(color: Color) { this.clear_color(color); }

    public clear(color: Color = this.clear_color_value) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.inside_mask(x, y)) continue;
                const pixel = this.pixels[y][x];
                pixel.reset();
                if (color.a > 0) pixel.set_bg_color(color);
            }
        }
    }

    public enable_blend() { this.blend_state.enabled = true; }
    public enableBlend() { this.enable_blend(); }
    public disable_blend() { this.blend_state.enabled = false; }
    public disableBlend() { this.disable_blend(); }

    public blend_func(source: BlendFactor, destination: BlendFactor) {
        this.blend_func_separate(source, destination, source, destination);
    }
    public blendFunc(source: BlendFactor, destination: BlendFactor) { this.blend_func(source, destination); }

    public blend_func_separate(srcRGB: BlendFactor, dstRGB: BlendFactor, srcAlpha: BlendFactor, dstAlpha: BlendFactor) {
        Object.assign(this.blend_state, { srcRGB, dstRGB, srcAlpha, dstAlpha, sourceOver: false });
    }
    public blendFuncSeparate(srcRGB: BlendFactor, dstRGB: BlendFactor, srcAlpha: BlendFactor, dstAlpha: BlendFactor) {
        this.blend_func_separate(srcRGB, dstRGB, srcAlpha, dstAlpha);
    }

    public blend_equation(equation: BlendEquation) { this.blend_equation_separate(equation, equation); }
    public blendEquation(equation: BlendEquation) { this.blend_equation(equation); }
    public blend_equation_separate(equationRGB: BlendEquation, equationAlpha: BlendEquation) {
        Object.assign(this.blend_state, { equationRGB, equationAlpha, sourceOver: false });
    }
    public blendEquationSeparate(equationRGB: BlendEquation, equationAlpha: BlendEquation) {
        this.blend_equation_separate(equationRGB, equationAlpha);
    }

    public blend_color(color: Color) { this.blend_state.constant = copy_color(color)!; }
    public blendColor(color: Color) { this.blend_color(color); }
    public use_source_over() { this.blend_state.sourceOver = true; }
    public useSourceOver() { this.use_source_over(); }

    public push_opacity(opacity: number) {
        const current = this.opacity_stack[this.opacity_stack.length - 1] ?? 1;
        this.opacity_stack.push(current * Math.max(0, Math.min(1, opacity)));
    }
    public pushOpacity(opacity: number) { this.push_opacity(opacity); }
    public pop_opacity() { if (this.opacity_stack.length > 1) this.opacity_stack.pop(); }
    public popOpacity() { this.pop_opacity(); }
    public get_current_opacity() { return this.opacity_stack[this.opacity_stack.length - 1] ?? 1; }
    public getCurrentOpacity() { return this.get_current_opacity(); }

    public set_mask(mask?: Rect) {
        const bounds = Rect.of(0, 0, this.width, this.height);
        this.mask.copy(mask === undefined ? bounds : bounds.intersect(mask) ?? Rect.of(0, 0, 0, 0));
    }

    public push_scissor_rect(rect: Rect) {
        const current = this.scissor_stack[this.scissor_stack.length - 1] ?? Rect.of(0, 0, this.width, this.height);
        const next = current.intersect(rect) ?? Rect.of(0, 0, 0, 0);
        this.scissor_stack.push(next);
        this.set_mask(next);
    }
    public pushScissorRect(x: number, y: number, width: number, height: number) {
        this.push_scissor_rect(Rect.of(x, y, width, height));
    }
    public pop_scissor_rect() {
        this.scissor_stack.pop();
        this.set_mask(this.scissor_stack[this.scissor_stack.length - 1]);
    }
    public popScissorRect() { this.pop_scissor_rect(); }

    protected inside_mask(x: number, y: number) {
        return x >= this.mask.x && y >= this.mask.y && x < this.mask.x + this.mask.width && y < this.mask.y + this.mask.height;
    }

    protected set_pixel_text_style(pixel: BufferPixel, style?: PixelTextStyle, clear_style?: boolean) {
        if (clear_style || style?.color !== undefined) pixel.set_color(style?.color);
        if (clear_style || style?.bg_color !== undefined) pixel.set_bg_color(style?.bg_color);
        if (clear_style || style?.bold !== undefined) pixel.set_bold(style?.bold);
        if (clear_style || style?.italic !== undefined) pixel.set_italic(style?.italic);
        if (clear_style || style?.underline !== undefined) pixel.set_underline(style?.underline);
    }

    protected blend_color_value(source: Color, destination: Color) {
        if (!this.blend_state.enabled) return copy_color(source)!;
        return this.blend_state.sourceOver
            ? blend_source_over(source, destination)
            : blend_custom(source, destination, this.blend_state);
    }

    protected composite_pixel(destination: BufferPixel, source: BufferPixel) {
        const opacity = this.get_current_opacity();
        if (opacity <= 0) return;
        const sourceBackground = with_opacity(source.background, opacity);
        const sourceForeground = with_opacity(source.foreground, opacity);

        if (sourceBackground !== undefined && sourceBackground.a > 0) {
            const destinationBackground = destination.background ?? transparent();
            destination.set_bg_color(this.blend_color_value(sourceBackground, destinationBackground));
        }

        const source_has_content = source.text !== undefined;
        const opaque_background = sourceBackground !== undefined && sourceBackground.a >= 255;
        if (source_has_content || opaque_background) {
            destination.set_content(source.text, source.get_span());
            destination.set_bold(source.is_bold);
            destination.set_italic(source.is_italic);
            destination.set_underline(source.is_underline);
            if (sourceForeground !== undefined) {
                destination.set_color(this.blend_color_value(
                    sourceForeground,
                    destination.foreground ?? destination.background ?? transparent(),
                ));
            }
            else destination.set_color(undefined);
        }
        else if (sourceBackground !== undefined && sourceBackground.a > 0 && destination.foreground !== undefined) {
            destination.set_color(this.blend_color_value(sourceBackground, destination.foreground));
        }
    }

    public set_text_style(x: number, y: number, width: number, height: number, style?: PixelTextStyle, clear_style?: boolean) {
        for (let column = 0; column < width; column++) {
            for (let row = 0; row < height; row++) {
                const px = x + column;
                const py = y + row;
                if (!this.inside_mask(px, py) || px < 0 || py < 0 || px >= this.width || py >= this.height) continue;
                const destination = this.pixels[py][px];
                if (clear_style) {
                    const content = destination.text;
                    const span = destination.get_span();
                    destination.reset();
                    destination.set_content(content, span);
                }
                const opacity = this.get_current_opacity();
                if (style?.bg_color !== undefined) {
                    const background = with_opacity(style.bg_color, opacity)!;
                    destination.set_bg_color(this.blend_color_value(background, destination.background ?? transparent()));
                }
                if (style?.color !== undefined) {
                    const foreground = with_opacity(style.color, opacity)!;
                    destination.set_color(this.blend_color_value(
                        foreground,
                        destination.foreground ?? destination.background ?? transparent(),
                    ));
                }
                if (style?.bold !== undefined) destination.set_bold(style.bold);
                if (style?.italic !== undefined) destination.set_italic(style.italic);
                if (style?.underline !== undefined) destination.set_underline(style.underline);
            }
        }
    }

    public set_char(
        x: number,
        y: number,
        width: number = 1,
        height: number = 1,
        char?: string,
        span?: number,
        style?: PixelTextStyle,
        clear_style?: boolean,
    ) {
        for (let column = 0; column < width; column++) {
            for (let row = 0; row < height; row++) {
                const px = x + column;
                const py = y + row;
                if (!this.inside_mask(px, py) || px < 0 || py < 0 || px >= this.width || py >= this.height) continue;
                const source = new BufferPixel();
                source.set_content(char, span);
                this.set_pixel_text_style(source, style, clear_style);
                this.composite_pixel(this.pixels[py][px], source);
            }
        }
    }

    public draw_frame_buffer(
        destX: number,
        destY: number,
        source: FrameBuffer,
        sourceX: number = 0,
        sourceY: number = 0,
        sourceWidth: number = source.width - sourceX,
        sourceHeight: number = source.height - sourceY,
    ) {
        for (let row = 0; row < sourceHeight; row++) {
            for (let column = 0; column < sourceWidth; column++) {
                const sx = sourceX + column;
                const sy = sourceY + row;
                const dx = destX + column;
                const dy = destY + row;
                if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) continue;
                if (!this.inside_mask(dx, dy) || dx < 0 || dy < 0 || dx >= this.width || dy >= this.height) continue;
                this.composite_pixel(this.pixels[dy][dx], source.pixels[sy][sx]);
            }
        }
    }
    public drawFrameBuffer(destX: number, destY: number, source: FrameBuffer, sourceX?: number, sourceY?: number, sourceWidth?: number, sourceHeight?: number) {
        this.draw_frame_buffer(destX, destY, source, sourceX, sourceY, sourceWidth, sourceHeight);
    }

    public read_pixel(x: number, y: number): BufferPixel | undefined {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return undefined;
        return this.pixels[y][x].clone();
    }
    public readPixel(x: number, y: number) { return this.read_pixel(x, y); }

    public *iterate(x: number, y: number, width: number, height: number) {
        for (let row = 0; row < height && y + row < this._height; row++) {
            let newline = true;
            for (let column = 0; column < width && x + column < this._width; column++) {
                const next = column + 1;
                const outside = x + column < 0 || y + row < 0;
                yield {
                    outside,
                    x: x + column,
                    y: y + row,
                    pixel: outside ? undefined : this.pixels[y + row][x + column],
                    newline,
                    endline: !(next < width && x + next < this._width),
                };
                newline = false;
            }
        }
    }

    public toString() {
        return this.pixels.map((row) => row.map((pixel) => pixel.get_styled_text_content()).join('') + ANSI.reset).join('\n');
    }
}

/** Compatibility name retained for the original renderer API. */
export class Buffer extends FrameBuffer { }
