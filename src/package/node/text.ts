import { Renderer } from "../render/renderer.js";
import { Scene } from "../scene/scene.js";
import { TextStyle } from "../style/text_style.js";
import { Color } from "../util/color.js";
import { TextContainer } from "./container.js";
import { Node, NodeWithChild, NodeWithChildren } from "./node.js";

export class Text extends NodeWithChildren<Text | TextContent> implements TextStyle {

    public readonly children: (Text | TextContent)[] = [];

    public color: Color | undefined;
    public bg_color: Color | undefined;
    public bold: boolean | undefined;
    public italic: boolean | undefined;
    public underline: boolean | undefined;

    public get_unstyled_text_content(): string {
        return this.children.map(c => c.get_unstyled_text_content()).join('');
    }

    protected on_child_addeded(node: Text | TextContent): void {
    }

    protected on_child_removed(node: Text | TextContent): void {
    }

    protected on_child_moved(node: Text | TextContent, from: number, to: number): void {
    }

    public get_text_container() {
        if (this.parent === undefined) return undefined;
        return this.parent instanceof TextContainer ? this.parent : undefined;
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

export class TextContent implements Node, TextStyle {

    public parent: NodeWithChild<Node> | undefined;
    protected _content: string | undefined;

    public color: Color | undefined;
    public bg_color: Color | undefined;
    public bold: boolean | undefined;
    public italic: boolean | undefined;
    public underline: boolean | undefined;

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

    public get_unstyled_text_content() {
        return this.content ?? '';
    }

    public dispose(): void {

    }

}