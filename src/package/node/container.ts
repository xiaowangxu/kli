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

type TextContainerSpan = { content?: string, override?: string, x: number, y: number, width: number, text_wrap?: TextWrap, text_style?: Partial<TextStyle>, newline: boolean };

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
                        const chars = split_string_with_width(lines[i]);
                        chars.forEach(({ char, width }) => {
                            target.push({
                                content: char,
                                width: width,
                                text_wrap: text.text_wrap,
                                text_style: style,
                                newline: false,
                                x: 0,
                                y: 0,
                            });
                        });
                        if (i < lines.length - 1) {
                            target.push({
                                width: 1,
                                newline: true,
                                x: 0,
                                y: 0,
                            });
                        }
                    }
                }
            }
            else {
                target.push({
                    width: 1,
                    newline: true,
                    x: 0,
                    y: 0,
                });
            }
        }
    }

    protected update_text_spans() {
        this.text_spans = [];
        if (this.text === undefined) return;
        this.push_text_spans(this.text, {}, this.text_spans);
    }

    protected wrap_text_spans(max_width: number, max_height: number = Infinity, non_fit_char: string = '*') {
        if (max_width <= 0 || max_height <= 0) {
            return {
                width: 0,
                height: 0,
            };
        }

        let result_width = 0;
        let result_height = 0;
        let current_width = 0;
        let soft_newline = false;

        function new_line(soft: boolean) {
            result_height++;
            result_width = Math.max(result_width, current_width);
            current_width = 0;
            soft_newline = soft;
        }

        function push_inline(span: TextContainerSpan, auto_soft_newline: boolean) {
            soft_newline = false;
            span.x = current_width;
            span.y = result_height - 1;
            current_width += span.width;
            if (auto_soft_newline && current_width >= max_width) {
                new_line(true);
            }
        }

        const spans = [...this.text_spans];

        function peek_span(index: number = 0) {
            return spans[index];
        }

        function pop_span() {
            return spans.shift();
        }

        while (spans.length > 0) {
            const span = peek_span();
            const { content, width, text_wrap, newline } = span;
            const wrap = text_wrap ?? this.text_wrap;
            if (width > 0) result_height = Math.max(result_height, 1);
            else {
                pop_span();
                continue;
            }
            if (!newline) {
                if (content === undefined) continue;

                if (wrap === TextWrap.Wrap) {
                    if (current_width + width <= max_width) {
                        pop_span();
                        push_inline(span, true);
                    }
                    else new_line(true);
                }
                else if (wrap === TextWrap.NoWrap) {
                    if (current_width + width <= max_width) {
                        pop_span();
                        push_inline(span, false);
                    }
                    else {
                        while (!(peek_span()?.newline ?? true)) pop_span();
                    }
                }
                else if (wrap === TextWrap.WrapWord) {
                    let index = 0;
                    let word_width = 0;
                    let found = false;
                    while (true) {
                        const span = peek_span(index);
                        if (span === undefined) break;
                        if (span.newline) {
                            found = true;
                            break;
                        }
                        word_width += span.width;
                        if (current_width + word_width > max_width) {
                            new_line(true);
                            found = false;
                            break;
                        }
                        if (span.content === ' ' || span.content === '-') {
                            found = true;
                            break;
                        }
                        index++;
                    }
                    if (found) {
                        for (let i = 0; i <= index; i++) {
                            const span = pop_span()!;
                            if (span.newline) {
                                new_line(false);
                            }
                            else {
                                push_inline(span, false);
                            }
                        }
                    }
                    else {
                        
                    }
                }
            }
            else {
                pop_span();
                new_line(false);
            }
        }
        return {
            width: result_width,
            height: soft_newline ? result_height - 1 : result_height,
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
    public draw(render: Renderer): void {
        const content_rect = this.get_content_rect();
        if (this.mask) render.push_mask(content_rect);
        if (this.last_content_width !== content_rect.width || this.last_content_height !== content_rect.height) {
            this.last_content_width = content_rect.width;
            this.last_content_height = content_rect.height;
            this.wrap_text_spans(this.last_content_width, Infinity);
        }
        for (const span of this.text_spans) {
            const { content, override, x, y, text_style } = span;
            if (override === undefined && content === undefined) continue;
            render.draw_string(content_rect.x + x, content_rect.y + y, (override ?? content)!, text_style, false);
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