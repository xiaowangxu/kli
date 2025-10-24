import { Renderer } from "../render/renderer.js";
import { Scene } from "../scene/scene.js";
import { TextLayoutStyle, TextStyle } from "../style/text_style.js";
import { Color } from "../util/color.js";
import { TextBreak, TextContainer, TextWrap } from "./container.js";
import { Node, NodeWithChild, NodeWithChildren } from "./node.js";

export class Text extends NodeWithChildren<Text | TextContent | Newline> implements TextStyle, TextLayoutStyle {

    public readonly children: (Text | TextContent | Newline)[] = [];

    protected _color: Color | undefined;
    protected _bg_color: Color | undefined;
    protected _bold: boolean | undefined;
    protected _italic: boolean | undefined;
    protected _underline: boolean | undefined;

    get color() {
        return this._color;
    }
    set color(v: Color | undefined) {
        this._color = v;
        this.get_text_container()?.notify_style_change();
    }
    get bg_color() {
        return this._bg_color;
    }
    set bg_color(v: Color | undefined) {
        this._bg_color = v;
        this.get_text_container()?.notify_style_change();
    }
    get bold() {
        return this._bold;
    }
    set bold(v: boolean | undefined) {
        this._bold = v;
        this.get_text_container()?.notify_style_change();
    }
    get italic() {
        return this._italic;
    }
    set italic(v: boolean | undefined) {
        this._italic = v;
        this.get_text_container()?.notify_style_change();
    }
    get underline() {
        return this._underline;
    }
    set underline(v: boolean | undefined) {
        this._underline = v;
        this.get_text_container()?.notify_style_change();
    }

    protected _text_wrap: TextWrap | undefined;
    protected _text_break: TextBreak | undefined;

    get text_wrap() {
        return this._text_wrap;
    }
    set text_wrap(v: TextWrap | undefined) {
        this._text_wrap = v;
        this.get_text_container()?.notify_layout_change();
    }
    get text_break() {
        return this._text_break;
    }
    set text_break(v: TextBreak | undefined) {
        this._text_break = v;
        this.get_text_container()?.notify_layout_change();
    }

    protected on_child_addeded(node: Text | TextContent | Newline): void {
        this.get_text_container()?.notify_text_change();
    }

    protected on_child_removed(node: Text | TextContent | Newline): void {
        this.get_text_container()?.notify_text_change();
    }

    protected on_child_moved(node: Text | TextContent | Newline, from: number, to: number): void {
        this.get_text_container()?.notify_text_change();
    }

    public get_text_container(): TextContainer | undefined {
        if (this.parent === undefined) return undefined;
        if (this.parent instanceof TextContainer) return this.parent;
        if (this.parent instanceof Text) return this.parent.get_text_container();
        return undefined;
    }

    public get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    public draw(render: Renderer): void {
        throw new Error("Method not implemented.");
    }

    public dispose(recusive: boolean): void {
        if (recusive) {
            for (const c of this.children) {
                c.dispose(true);
            }
        }
    }

}

export class TextContent implements Node {

    public parent: NodeWithChild<Node> | undefined;
    protected _content: string | undefined;

    get content() {
        return this._content;
    }
    set content(v: string | undefined) {
        this._content = v;
        this.get_text_container()?.notify_text_change();
    }

    public get_text_container() {
        if (this.parent === undefined) return undefined;
        return this.parent instanceof Text ? this.parent.get_text_container() : undefined;
    }

    public get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    public draw(render: Renderer): void {
        throw new Error("Method not implemented.");
    }

    public dispose(recusive: boolean): void {

    }

}

export class Newline implements Node {
    public parent: NodeWithChild<Node> | undefined;

    draw(render: Renderer): void {
        throw new Error("Method not implemented.");
    }

    get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    dispose(recusive: boolean): void {

    }
}