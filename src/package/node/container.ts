import Yoga, { Overflow, MeasureMode as YogaMeasureMode, Node as YogaNode } from "yoga-layout";
import { LayoutContainer, LayoutLeaf } from "../layout/layout.js";
import { NodeWithChildren } from "./node.js";
import { Newline, Text, TextContent } from "./text.js";
import DefaultLayoutConfig from "../layout/config.js";
import { Renderer, split_string_with_width } from "../render/renderer.js";
import { Color } from "../util/color.js";
import { BorderStyle, BorderType } from "../style/border_style.js";
import { Scene } from "../scene/scene.js";
import { Rect } from "../util/rect.js";
import { Position } from "../util/position.js";
import { BoxStyle } from "../style/box_style.js";
import { execute_shader, Shader } from "../style/shader.js";
import { merge_text_styles, TextLayoutStyle, TextStyle } from "../style/text_style.js";
import { log } from "../util/logger.js";

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

        // render.draw_string(rect.x + 2, rect.y, ` 😊 ${this.get_content_rect().width}x${this.get_content_rect().height} `);
        // render.draw_char(rect.x + 2, rect.y, 1, 1, `👩🏾‍👧🏼‍👦🏿`);

        if (this.layout_node.getOverflow() !== Overflow.Visible) render.push_mask(this.get_content_rect());
        for (const child of this.children) {
            child.draw(render, true);
        }
        if (this.layout_node.getOverflow() !== Overflow.Visible) render.pop_mask();
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
}
export enum TextBreak {
    All = 0,
    KeepAll = 1,
    Word = 2,
}

type TextContainerSpan = { content?: string, override?: string, x: number, y: number, width: number, text_wrap?: TextWrap, text_break?: TextBreak, text_style?: Partial<TextStyle>, newline: boolean };
export enum CollectInlineSpansResult {
    AppendBreak,
    AppendNotBreak,
    NotAppendBreak,
    NotAppendNotBreak,
}
type CollectInlineSpans = (content: string, width: number, will_overflow: boolean) => CollectInlineSpansResult;

export class TextContainer extends NodeWithChildren<Text | Newline> implements LayoutLeaf, TextLayoutStyle {

    public readonly layout_node: YogaNode = Yoga.Node.createWithConfig(DefaultLayoutConfig);

    protected _text_wrap: TextWrap = TextWrap.Wrap;
    protected _text_break: TextBreak = TextBreak.Word;
    protected _mask: boolean = false;

    get text_wrap(): TextWrap {
        return this._text_wrap;
    }
    set text_wrap(v: TextWrap | undefined) {
        this._text_wrap = v ?? TextWrap.Wrap;
        this.notify_layout_change();
    }
    get text_break(): TextBreak {
        return this._text_break;
    }
    set text_break(v: TextBreak | undefined) {
        this._text_break = v ?? TextBreak.Word;
        this.notify_layout_change();
    }
    get mask(): boolean {
        return this._mask;
    }
    set mask(v: boolean) {
        this._mask = v;
        this.get_scene()?.notify_change();
    }

    public readonly children: (Text | Newline)[] = [];

    protected on_child_addeded(node: Text | Newline): void {
        this.notify_text_change();
    }

    protected on_child_removed(node: Text | Newline): void {
        this.notify_text_change();
    }

    protected on_child_moved(node: Text | Newline, from: number, to: number): void {
        this.notify_text_change();
    }

    public text_spans: TextContainerSpan[] = [];

    constructor() {
        super();
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
                const { width: _wrapped_width, height: wrapped_height } = this.wrap_text_spans(width);
                measured_width = width;
                measured_height = wrapped_height;
            }
            else if (width_mode === Yoga.MEASURE_MODE_AT_MOST) {
                // 最大宽度：在此范围内自适应
                const { width: wrapped_width, height: wrapped_height } = this.wrap_text_spans(width);
                measured_width = wrapped_width;
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
            else {
                measured_height = measured_height;
            }

            return {
                width: measured_width,
                height: measured_height
            };
        });
    }

    public notify_layout_change() {
        this.layout_node.markDirty();
        this.get_scene()?.notify_change();
    }

    public notify_text_change() {
        this.update_text_spans();
        this.notify_layout_change();
    }

    public notify_style_change() {
        this.update_text_spans();
        this.get_scene()?.notify_change();
    }

    protected push_text_spans(text: Text, base_style: Partial<TextStyle>, text_wrap: TextWrap | undefined, text_break: TextBreak | undefined, target: TextContainerSpan[]) {
        for (const child of text.children) {
            if (child instanceof Text) {
                this.push_text_spans(child, merge_text_styles(base_style, child), child.text_wrap ?? text_wrap, child.text_break ?? text_break, target);
            }
            else if (child instanceof TextContent) {
                if (child.content !== undefined) {
                    const lines = child.content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const chars = split_string_with_width(lines[i]);
                        chars.forEach(({ char, width }) => {
                            target.push({
                                content: char,
                                width: width,
                                text_wrap: text.text_wrap ?? text_wrap,
                                text_break: text.text_break ?? text_break,
                                text_style: base_style,
                                newline: false,
                                x: -1,
                                y: -1,
                            });
                        });
                        if (i < lines.length - 1) {
                            target.push({
                                width: 1,
                                newline: true,
                                x: -1,
                                y: -1,
                            });
                        }
                    }
                }
            }
            else {
                target.push({
                    width: 1,
                    newline: true,
                    x: -1,
                    y: -1,
                });
            }
        }
    }

    protected not_wrapped: boolean = true;

    protected update_text_spans() {
        this.not_wrapped = true;
        this.text_spans = [];
        for (const text of this.children) {
            if (text instanceof Text) {
                this.push_text_spans(text, {
                    color: text.color,
                    bg_color: text.bg_color,
                    bold: text.bold,
                    italic: text.italic,
                    underline: text.underline,
                }, text.text_wrap, text.text_break, this.text_spans);
            }
            else {
                this.text_spans.push({
                    width: 1,
                    newline: true,
                    x: -1,
                    y: -1,
                });
            }
        }
    }

    public wrap_text_spans(max_width: number, max_height: number = Infinity, non_fit_char: string = '*') {
        this.not_wrapped = false;

        for (const span of this.text_spans) {
            span.override = undefined;
        }

        const text_spans_count = this.text_spans.length;

        let result_width = 0;
        let result_height = 0;
        let current_width = 0;
        let soft_newline = false;

        let index = 0;

        function new_line(soft: boolean) {
            result_height++;
            result_width = Math.max(result_width, current_width);
            current_width = 0;
            soft_newline = soft;
        }

        const peek_span = (offset: number = 0) => {
            return this.text_spans[index + offset];
        }

        const collect_inline_span: CollectInlineSpans[] = [
            // [TextBreak.All] 
            (content, width, will_overflow) => {
                return will_overflow ? CollectInlineSpansResult.NotAppendBreak : CollectInlineSpansResult.AppendBreak;
            },
            // [TextBreak.KeepAll]
            (content, width, will_overflow) => {
                return will_overflow ? CollectInlineSpansResult.NotAppendNotBreak : CollectInlineSpansResult.AppendNotBreak;
            },
            // [TextBreak.Word]
            (content, width, will_overflow) => {
                return will_overflow ? (
                    content === ' ' || content === '-' ?
                        CollectInlineSpansResult.AppendBreak :
                        (
                            width > 1 ?
                                CollectInlineSpansResult.NotAppendBreak :
                                CollectInlineSpansResult.NotAppendNotBreak
                        )
                ) : (
                    content === ' ' || content === '-' || width > 1 ?
                        CollectInlineSpansResult.AppendBreak :
                        CollectInlineSpansResult.AppendNotBreak
                );
            },
        ];
        const stop_inline_hidden: (((content: string) => boolean) | undefined)[] = [
            // [TextBreak.All] 
            undefined,
            // [TextBreak.KeepAll]
            undefined,
            // [TextBreak.Word]
            (content) => {
                return content === ' ' || content === '-';
            },
        ];

        while (index < text_spans_count) {

            while (true) {

                let current_inline_x = 0;
                let current_max_inline_x = 0;

                let current_span_width = 0;
                let current_index_offset = 0;
                let current_has_content = false;
                let last_text_break = undefined;
                while (true) {
                    const span = peek_span(current_index_offset);
                    if (span === undefined) {
                        current_max_inline_x = current_index_offset;
                        break;
                    }
                    const { content, newline, width, text_break = this.text_break } = span;
                    if (width > 0) {
                        result_height = Math.max(result_height, 1);
                    }
                    if (newline) {
                        current_max_inline_x = current_index_offset;
                        current_has_content = current_index_offset > 0;
                        break;
                    }
                    if (last_text_break === undefined) {
                        last_text_break = text_break;
                    }
                    else if (last_text_break !== text_break) {
                        current_max_inline_x = current_index_offset;
                        current_has_content = true;
                        last_text_break = text_break;
                    }
                    else if (content !== undefined) {
                        const append_will_overflow = current_inline_x + current_span_width + width > max_width;
                        const append = collect_inline_span[text_break](content, width, append_will_overflow);
                        let finish_inline = false;
                        switch (append) {
                            case CollectInlineSpansResult.AppendBreak: {
                                current_index_offset++;
                                current_max_inline_x = current_index_offset;
                                current_has_content = true;
                                break;
                            }
                            case CollectInlineSpansResult.AppendNotBreak: {
                                current_index_offset++;
                                break;
                            }
                            case CollectInlineSpansResult.NotAppendNotBreak: {
                                finish_inline = true;
                                break;
                            }
                            case CollectInlineSpansResult.NotAppendBreak: {
                                current_max_inline_x = current_index_offset;
                                finish_inline = true;
                                break;
                            }
                        }
                        if (finish_inline) break;
                        current_span_width += width;
                    }
                }

                // append span
                if (current_max_inline_x > 0) {
                    current_has_content = true;
                    soft_newline = false;
                    for (let i = 0; i < current_max_inline_x; i++) {
                        const span = this.text_spans[index++];
                        span.x = current_inline_x;
                        span.y = result_height - 1;
                        current_inline_x += span.width;
                    }
                    result_width = Math.max(result_width, current_inline_x);
                }
                // deal with line remain
                const inline_remain = current_index_offset - current_max_inline_x
                let force_text_wrap: TextWrap | undefined;
                if (inline_remain > 0 && (last_text_break === TextBreak.KeepAll || !current_has_content)) {
                    soft_newline = false;
                    for (let i = 0; i < inline_remain; i++) {
                        const span = this.text_spans[index++];
                        span.x = current_inline_x;
                        span.y = result_height - 1;
                        if (i === inline_remain - 1) {
                            span.override = '…';
                        }
                        current_inline_x += span.width;
                    }
                    result_width = Math.max(result_width, current_inline_x);
                    force_text_wrap = TextWrap.NoWrap;
                }
                if (inline_remain <= 0 && !current_has_content) {
                    soft_newline = false;
                    force_text_wrap = TextWrap.NoWrap;
                }

                // deal with remain
                let still_same_line = true;
                while (true) {
                    const span = peek_span();
                    if (span === undefined) {
                        still_same_line = false;
                        break;
                    }
                    const { content, newline, text_wrap, text_break = this.text_break } = span;
                    if (newline) {
                        new_line(false);
                        still_same_line = false;
                        index++;
                        break;
                    }
                    if (last_text_break !== undefined && last_text_break !== text_break) {
                        new_line(true);
                        still_same_line = false;
                        break;
                    }
                    let modified_text_wrap = force_text_wrap ?? text_wrap ?? this.text_wrap;
                    if (content !== undefined && (stop_inline_hidden[text_break]?.(content) ?? false)) {
                        new_line(true);
                        still_same_line = false;
                        span.x = -1;
                        span.y = -1;
                        index++;
                        break;
                    }
                    else if (modified_text_wrap === TextWrap.NoWrap) {
                        span.x = -1;
                        span.y = -1;
                        index++;
                    }
                    else {
                        new_line(true);
                        still_same_line = false;
                        break;
                    }
                }

                if (!still_same_line) break;
            }

        }

        return {
            width: result_width,
            height: soft_newline ? result_height - 1 : result_height,
        };
    }

    private last_content_width = -1;
    private last_content_height = -1;
    public draw(render: Renderer): void {
        const content_rect = this.get_content_rect();
        if (this.mask) render.push_mask(content_rect);
        if (this.not_wrapped || this.last_content_width !== content_rect.width || this.last_content_height !== content_rect.height) {
            this.last_content_width = content_rect.width;
            this.last_content_height = content_rect.height;
            this.wrap_text_spans(this.last_content_width, Infinity);
        }
        for (const span of this.text_spans) {
            const { content, override, x, y, text_style } = span;
            if (x < 0 || y < 0) continue;
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
            for (const c of this.children) {
                c.dispose(true);
            }
        }
        this.layout_node.unsetMeasureFunc();
        this.layout_node.free();
    }

}