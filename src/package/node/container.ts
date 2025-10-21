import Yoga, { MeasureMode as YogaMeasureMode, Node as YogaNode } from "yoga-layout";
import { LayoutContainer, LayoutLeaf } from "../layout/layout.js";
import { Node, NodeWithChild, NodeWithChildren } from "./node.js";
import { Text, TextContent } from "./text.js";
import DefaultLayoutConfig from "../layout/config.js";
import { calculate_char_width, calculate_string_width, emoji_regax, Renderer, split_string_with_width } from "../render/renderer.js";
import { Color } from "../util/color.js";
import { BorderStyle, BorderType } from "../style/border_style.js";
import { Scene } from "../scene/scene.js";
import { Rect } from "../util/rect.js";
import { Position } from "../util/position.js";
import { BoxStyle } from "../style/box_style.js";
import { execute_shader, Shader } from "../style/shader.js";
import { merge_text_styles, TextStyle } from "../style/text_style.js";
import { log } from "../util/logger.js";

export enum Overflow {
    Visible,
    Hidden,
}

export class Container extends LayoutContainer<Container | TextContainer> implements BorderStyle, BoxStyle {

    protected _border_color: Color | undefined;
    protected _border_type: BorderType | undefined;
    protected _bg_color: Color | undefined;
    protected _bg_shader: Shader | undefined;
    public readonly offset: Position = Position.of(0, 0);

    get border_color(): Color | undefined {
        return this._border_color;
    }
    set border_color(v: Color | undefined) {
        this._border_color = v;
        this.get_scene()?.notify_change();
    }
    get border_type(): BorderType | undefined {
        return this._border_type;
    }
    set border_type(v: BorderType | undefined) {
        this._border_type = v;
        this.get_scene()?.notify_change();
    }
    get bg_color() {
        return this._bg_color;
    }
    set bg_color(v: Color | undefined) {
        this._bg_color = v;
        this.get_scene()?.notify_change();
    }
    get bg_shader() {
        return this._bg_shader;
    }
    set bg_shader(v: Shader | undefined) {
        this._bg_shader = v;
        this.get_scene()?.notify_change();
    }

    public readonly children: (Container | TextContainer)[] = [];

    protected _overflow: Overflow = Overflow.Visible;

    set overflow(v: Overflow) {
        this._overflow = v;
    }

    public get_unstyled_text_content(): string {
        return this.children.map(c => c.get_unstyled_text_content()).join('\n');
    }

    public get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    public draw(render: Renderer, force: boolean = false): void {
        if (!force && !this.layout_node.hasNewLayout()) {
            return;
        }
        this.layout_node.markLayoutSeen();

        const rect = this.get_rect();
        if (this.bg_color === undefined) render.fill(rect);

        const left = this.layout_node.getComputedBorder(Yoga.EDGE_LEFT);
        const top = this.layout_node.getComputedBorder(Yoga.EDGE_TOP);
        const right = this.layout_node.getComputedBorder(Yoga.EDGE_RIGHT);
        const bottom = this.layout_node.getComputedBorder(Yoga.EDGE_BOTTOM);
        const bg_rect = Rect.of(rect.x + left, rect.y + top, rect.width - left - right, rect.height - top - bottom);

        if (this.bg_color !== undefined) render.fill(bg_rect, this.bg_color);

        if (this.bg_shader !== undefined) {
            execute_shader(this.bg_shader, bg_rect, (x, y, color) => {
                render.draw_char(x, y, 1, 1, color?.content, 1, color, false);
            });
        };

        if (this.border_type !== undefined) render.draw_box_border(rect, this.border_type, { color: this.border_color }, false);

        render.draw_string(rect.x + 2, rect.y, ` 😊 ${this.offset.x}x${this.offset.y} `);
        // render.draw_char(rect.x + 2, rect.y, 1, 1, `👩🏾‍👧🏼‍👦🏿`);

        if (this._overflow === Overflow.Hidden) render.push_mask(this.get_content_rect());
        for (const child of this.children) {
            child.draw(render, true);
        }
        if (this._overflow === Overflow.Hidden) render.pop_mask();
    }

    public get_inner_offset(): Position {
        return this.offset;
    }

    public dispose(recusive: boolean): void {
        super.dispose(recusive);
    }

}

export enum TextWrap {
    Wrap,
    NoWrap,
    WrapWord,
}

type TextContainerSpan = { content?: string, width: number, text_wrap?: TextWrap, text_style?: Partial<TextStyle>, newline: boolean, single?: boolean };
type WrappedTextContainerSpan = { content: string, x: number, y: number, width: number, text_style?: Partial<TextStyle> };

export class TextContainer implements NodeWithChild<Text>, LayoutLeaf {

    public readonly layout_node: YogaNode = Yoga.Node.createWithConfig(DefaultLayoutConfig);
    
    protected _text_wrap: TextWrap = TextWrap.Wrap;
    protected _mask: boolean = false;

    get text_wrap(): TextWrap {
        return this._text_wrap;
    }
    set text_wrap(v: TextWrap | undefined) {
        this._text_wrap = v ?? TextWrap.Wrap;
        this.notify_layout_change();
    }
    get mask(): boolean {
        return this._mask;
    }
    set mask(v: boolean) {
        this._mask = v;
        this.get_scene()?.notify_change();
    }

    parent: NodeWithChild<Node> | undefined;
    public text: Text | undefined;

    protected text_spans: TextContainerSpan[] = [];

    constructor() {
        this.layout_node.setMeasureFunc((width: number, width_mode: YogaMeasureMode, height: number, height_mode: YogaMeasureMode) => {

            width = Math.floor(width);
            height = Math.floor(height);

            if (width === 0 || height === 0) {
                return {
                    width: 0,
                    height: 0,
                };
            }

            let measured_width = 0;
            let measured_height = 0;

            // 根据宽度模式处理
            if (width_mode === Yoga.MEASURE_MODE_EXACTLY) {
                // 精确宽度：按此宽度换行
                const { width: wrapped_width, height: wrapped_height } = this.wrap_text_spans(width);
                measured_width = wrapped_width;
                measured_height = wrapped_height;
            }
            else if (width_mode === Yoga.MEASURE_MODE_AT_MOST) {
                // 最大宽度：在此范围内自适应
                const { width: _wrapped_width, height: wrapped_height } = this.wrap_text_spans(width);
                measured_width = width;
                measured_height = wrapped_height;
            }
            else {
                // 无约束：单行显示
                const { width: wrapped_width, height: wrapped_height } = this.wrap_text_spans(Infinity);
                measured_width = wrapped_width;
                measured_height = wrapped_height;
            }

            // 根据高度模式处理
            if (height_mode === Yoga.MEASURE_MODE_EXACTLY) {
                measured_height = height;
            }
            else if (height_mode === Yoga.MEASURE_MODE_AT_MOST) {
                measured_height = Math.min(measured_height, height);
            }

            return {
                width: measured_width,
                height: measured_height
            };
        });
    }

    get_unstyled_text_content(): string {
        return this.text?.get_unstyled_text_content?.() ?? '';
    }

    public notify_layout_change() {
        this.layout_node.markDirty();
        this.get_scene()?.notify_change();
    }

    public notify_text_change() {
        this.update_text_spans();
        this.notify_layout_change();
    }

    protected push_text_spans(text: Text, base_style: Partial<TextStyle>, target: TextContainerSpan[]) {
        for (const child of text.children) {
            if (child instanceof Text) {
                this.push_text_spans(child, merge_text_styles(base_style, child), target);
            }
            else if (child instanceof TextContent) {
                if (child.content !== undefined) {
                    const style = merge_text_styles(base_style, child);
                    const lines = child.content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const width = calculate_string_width(lines[i]);
                        target.push({
                            content: lines[i],
                            width: width,
                            text_wrap: text.text_wrap,
                            text_style: style,
                            newline: i < lines.length - 1,
                        });
                    }
                }
            }
            else {
                if (target[0] === undefined || target[target.length - 1].newline) {
                    target.push({
                        content: undefined,
                        width: 0,
                        text_wrap: TextWrap.NoWrap,
                        text_style: undefined,
                        newline: true,
                    });
                }
                else {
                    target[target.length - 1].newline = true;
                }
            }
        }
    }

    protected update_text_spans() {
        this.text_spans = [];
        if (this.text === undefined) return;
        this.push_text_spans(this.text, {}, this.text_spans);
    }

    protected wrap_text_spans(max_width: number, max_height: number = Infinity, measure_only: boolean = true, non_fit_char: string = '*') {
        if (max_width <= 0 || max_height <= 0) {
            return {
                width: 0,
                height: 0,
                spans: undefined,
            };
        }
        let wrapped_spans: WrappedTextContainerSpan[] | undefined = undefined;
        if (!measure_only) wrapped_spans = [];
        let result_width = 0;
        let result_height = 0;
        let current_width = 0;
        const spans = [...this.text_spans];
        while (spans.length > 0) {
            const { content, width: length, text_wrap, text_style, newline, single = false } = spans.shift()!;
            const wrap = text_wrap ?? this.text_wrap;
            if (content !== undefined) {
                result_height = Math.max(1, result_height);
                if (single && length > max_width) {
                    !measure_only ? wrapped_spans!.push({
                        content: non_fit_char,
                        x: current_width,
                        y: result_height - 1,
                        width: 1,
                        text_style,
                    }) : undefined;
                    current_width += 1;
                    if (spans.length === 0 || result_height >= max_height) break;
                    result_height++;
                    result_width = Math.max(result_width, current_width);
                    current_width = 0;
                    continue;
                }
                else if (single && current_width + length > max_width) {
                    result_height++;
                    if (result_height >= max_height) break;
                    result_width = Math.max(result_width, current_width);
                    current_width = 0;
                    !measure_only ? wrapped_spans!.push({
                        content,
                        x: current_width,
                        y: result_height - 1,
                        width: length,
                        text_style,
                    }) : undefined;
                    current_width += length;
                    continue;
                }
                else if (current_width + length <= max_width) {
                    !measure_only ? wrapped_spans!.push({
                        content,
                        x: current_width,
                        y: result_height - 1,
                        width: length,
                        text_style,
                    }) : undefined;
                    current_width += length;
                }
                else if (wrap === TextWrap.NoWrap || wrap === TextWrap.Wrap) {
                    // break all
                    let str = '';
                    let wrapped = false;
                    const chars = split_string_with_width(content);
                    let unwrapped_width = 0;
                    while (chars.length > 0) {
                        let { char, width } = chars[0];
                        if (current_width + unwrapped_width + width <= max_width) {
                            chars.shift();
                            str += char;
                            unwrapped_width += width;
                            wrapped = true;
                        }
                        else {
                            break;
                        }
                    }
                    if (wrapped) {
                        !measure_only ? wrapped_spans!.push({
                            content: str,
                            x: current_width,
                            y: result_height - 1,
                            width: unwrapped_width,
                            text_style,
                        }) : undefined;
                        current_width += unwrapped_width;
                        result_width = Math.max(result_width, current_width);
                    }
                    if (this.text_wrap === TextWrap.NoWrap) break;
                    if (text_wrap === TextWrap.NoWrap) {
                        if (spans.length === 0 || result_height >= max_height) break;
                        result_height++;
                        current_width = 0;
                        continue;
                    }
                    // wrap line
                    if (chars.length > 0) {
                        if (result_height >= max_height) break;
                        chars.reverse().forEach(({ char, width }, index) => {
                            spans.unshift({
                                content: char,
                                width,
                                text_wrap,
                                text_style,
                                newline: index === 0 ? newline : false,
                                single: true,
                            });
                        });
                        result_height++;
                        current_width = 0;
                        continue;
                    }
                }
                else if (wrap === TextWrap.WrapWord) {
                    const spans = split_string_with_width(content);
                    
                }
            }
            if (newline) {
                if (result_height >= max_height) break;
                result_height++;
                result_width = Math.max(result_width, current_width);
                current_width = 0;
            }
        }
        return {
            width: result_width,
            height: result_height,
            spans: wrapped_spans,
        };
    }

    public set_text(text: Text) {
        if (text.parent !== undefined) {
            if (text.parent === this) return;
            text.parent.remove_child(text);
        }
        text.parent = this;
        this.text = text;
        this.notify_text_change();
    }

    public clear_text(): boolean {
        if (this.text === undefined) return false;
        if (this.remove_child(this.text)) {
            return true;
        }
        return false;
    }

    public remove_child(node: Text): boolean {
        if (node.parent === this && this.text === node) {
            this.text = undefined;
            node.parent = undefined;
            this.notify_text_change();
            return true;
        }
        return false;
    }

    public get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    private last_content_width = -1;
    private last_content_height = -1;
    private last_spans: WrappedTextContainerSpan[] | undefined = undefined
    public draw(render: Renderer): void {
        const content_rect = this.get_content_rect();
        if (this.mask) render.push_mask(content_rect);
        if (this.last_content_width !== content_rect.width || this.last_content_height !== content_rect.height) {
            this.last_content_width = content_rect.width;
            this.last_content_height = content_rect.height;
            this.last_spans = this.wrap_text_spans(this.last_content_width, Infinity, false).spans;
        }
        if (this.last_spans !== undefined) {
            for (const span of this.last_spans) {
                const { content, x, y, text_style } = span;
                render.draw_string(content_rect.x + x, content_rect.y + y, content, text_style, false);
            }
        }
        if (this.mask) render.pop_mask();
    }

    public get_rect(): Rect {
        if (this.parent === undefined || !(this.parent instanceof LayoutContainer)) {
            return Rect.of(
                this.layout_node.getComputedLeft(),
                this.layout_node.getComputedTop(),
                this.layout_node.getComputedWidth(),
                this.layout_node.getComputedHeight(),
            );
        }
        else {
            const { x, y } = this.parent.get_rect();
            const { x: offset_x, y: offset_y } = this.parent.get_inner_offset();
            return Rect.of(
                x + this.layout_node.getComputedLeft() + offset_x,
                y + this.layout_node.getComputedTop() + offset_y,
                this.layout_node.getComputedWidth(),
                this.layout_node.getComputedHeight(),
            );
        }
    }

    public get_content_rect(): Rect {
        return this.get_rect();
    }

    public get_inner_offset(): Position {
        return Position.of(0, 0);
    }

    public dispose(recusive: boolean): void {
        if (recusive) {
            this.text?.dispose(true);
        }
        this.layout_node.unsetMeasureFunc();
        this.layout_node.free();
    }

}