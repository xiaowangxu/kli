import { TextStyle } from "../style/text_style.js";
import { Color } from "../util/color.js";
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
    public readonly content: string;

    public color: Color | undefined;
    public bg_color: Color | undefined;
    public bold: boolean | undefined;
    public italic: boolean | undefined;
    public underline: boolean | undefined;

    constructor(content: string) {
        this.content = content;
    }

    public get_unstyled_text_content() {
        return this.content;
    }

    public dispose(): void {

    }

}