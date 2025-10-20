import Yoga, { MeasureMode as YogaMeasureMode, Node as YogaNode } from "yoga-layout";
import { LayoutContainer, LayoutLeaf } from "../layout/layout.js";
import { Node, NodeWithChild, NodeWithChildren } from "./node.js";
import { Text, TextContent } from "./text.js";
import DefaultLayoutConfig from "../layout/config.js";
import { calculate_char_width, emoji_regax, Renderer } from "../render/renderer.js";
import { Color } from "../util/color.js";
import { BorderStyle, BorderType } from "../style/border_style.js";
import { Scene } from "../scene/scene.js";
import { Rect } from "../util/rect.js";
import { Position } from "../util/position.js";
import { BoxStyle } from "../style/box_style.js";
import { execute_shader, Shader } from "../style/shader.js";
import { merge_text_styles, TextStyle } from "../style/text_style.js";

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

    private count: number = 0;
    public draw(render: Renderer): void {
        const left = this.layout_node.getComputedBorder(Yoga.EDGE_LEFT);
        const top = this.layout_node.getComputedBorder(Yoga.EDGE_TOP);
        const right = this.layout_node.getComputedBorder(Yoga.EDGE_RIGHT);
        const bottom = this.layout_node.getComputedBorder(Yoga.EDGE_BOTTOM);
        const rect = this.get_rect();
        const bg_rect = Rect.of(rect.x + left, rect.y + top, rect.width - left - right, rect.height - top - bottom);

        if (this.bg_color !== undefined) render.fill(bg_rect, this.bg_color);

        if (this.bg_shader !== undefined) {
            execute_shader(this.bg_shader, bg_rect, (x, y, color) => {
                render.draw_char(x, y, 1, 1, color?.content, 1, color, false);
            });
        };

        if (this.border_type !== undefined) render.draw_box_border(rect, this.border_type, { color: this.border_color }, false);

        render.draw_string(rect.x + 2, rect.y, ` ${this.offset.x}x${this.offset.y} c: ${this.count++} `);

        if (this._overflow === Overflow.Hidden) render.push_mask(this.get_content_rect());
        for (const child of this.children) {
            child.draw(render);
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

type TextContainerSpan = { content?: string, text_style?: Partial<TextStyle>, newline: boolean };

export class TextContainer implements NodeWithChild<Text>, LayoutLeaf {

    public readonly layout_node: YogaNode = Yoga.Node.createWithConfig(DefaultLayoutConfig);

    parent: NodeWithChild<Node> | undefined;
    public text: Text | undefined;

    protected text_spans: TextContainerSpan[] = [];

    constructor() {
        this.layout_node.setMeasureFunc((width: number, width_mode: YogaMeasureMode, height: number, height_mode: YogaMeasureMode) => {

            let measured_width = 0;
            let measured_height = 0;

            // 根据宽度模式处理
            if (width_mode === Yoga.MEASURE_MODE_EXACTLY) {
                // 精确宽度：按此宽度换行
                measured_width = width;
                measured_height = 2;
            }
            else if (width_mode === Yoga.MEASURE_MODE_AT_MOST) {
                // 最大宽度：在此范围内自适应
                measured_width = 2;
                measured_height = 2;
            }
            else {
                // 无约束：单行显示
                const lines = this.text_spans.map(s => s.content).join('').split('\n');
                measured_width = lines.reduce((max, str) => Math.max(max, TextContainer.calculate_string_width(str)), 0);
                measured_height = lines.length;
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

    public notify_text_change() {
        this.update_text_spans();
        this.layout_node.markDirty();
        this.get_scene()?.notify_change();
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
                        target.push({
                            content: lines[i],
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
            this.notify_text_change();
            return true;
        }
        return false;
    }

    public remove_child(node: Text): boolean {
        if (node.parent === this && this.text === node) {
            this.text = undefined;
            node.parent = undefined;
            return true;
        }
        return false;
    }

    public get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    public draw(render: Renderer): void {
        const content_rect = this.get_content_rect();
        render.push_mask(content_rect);

        let x = content_rect.x;
        let y = content_rect.y;
        for (const span of this.text_spans) {
            const { content, text_style, newline } = span;
            if (content !== undefined) {
                const width = render.draw_string(x, y, content, text_style, false);
                x += width;
            }
            if (newline) {
                y += 1;
                x = content_rect.x;
            }
        }

        render.pop_mask();
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
        const left = this.layout_node.getComputedBorder(Yoga.EDGE_LEFT) + this.layout_node.getComputedPadding(Yoga.EDGE_LEFT);
        const top = this.layout_node.getComputedBorder(Yoga.EDGE_TOP) + this.layout_node.getComputedPadding(Yoga.EDGE_TOP);
        const right = this.layout_node.getComputedBorder(Yoga.EDGE_RIGHT) + this.layout_node.getComputedPadding(Yoga.EDGE_RIGHT);
        const bottom = this.layout_node.getComputedBorder(Yoga.EDGE_BOTTOM) + this.layout_node.getComputedPadding(Yoga.EDGE_BOTTOM);
        if (this.parent === undefined || !(this.parent instanceof LayoutContainer)) {
            return Rect.of(
                this.layout_node.getComputedLeft() + left,
                this.layout_node.getComputedTop() + top,
                this.layout_node.getComputedWidth() - left - right,
                this.layout_node.getComputedHeight() - top - bottom,
            );
        }
        else {
            const { x, y } = this.parent.get_rect();
            const { x: offset_x, y: offset_y } = this.parent.get_inner_offset();
            return Rect.of(
                x + this.layout_node.getComputedLeft() + left + offset_x,
                y + this.layout_node.getComputedTop() + top + offset_y,
                this.layout_node.getComputedWidth() - left - right,
                this.layout_node.getComputedHeight() - top - bottom,
            );
        }
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

    public static calculate_string_width(str: string, ambiguous_width: number = 1) {
        if (str.length === 0) return 0;

        str = str.replace(emoji_regax(), '  ');

        let width = 0;

        for (const char of str) {
            const code_point = char.codePointAt(0)!;
            // Ignore control characters
            if (code_point <= 0x1F || (code_point >= 0x7F && code_point <= 0x9F)) {
                continue;
            }
            // Ignore combining characters
            if (code_point >= 0x300 && code_point <= 0x36F) {
                continue;
            }
            width += calculate_char_width(char);
        }
        return width;
    }
}