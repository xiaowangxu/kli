import { createRenderer } from '@vue/runtime-core'
import { Container, TextContainer } from '../node/container.js';
import { Newline, Text, TextContent } from '../node/text.js';

type KliNode = Container | TextContainer | Text | TextContent | Newline;

const { render, createApp } = createRenderer<KliNode, KliNode>({
    createElement: function (type: string): KliNode {
        switch (type) {
            case 'box':
                return new Container();
            case 'newline':
                return new Newline();
            case 'text-box':
                return new TextContainer();
            case 'text':
                return new Text();
            case 'span':
                return new TextContent();
            default:
                throw new Error(`unknown element type <${type} />`);
        }
    },
    createText: function (text: string): KliNode {
        const text_content = new TextContent();
        text_content.content = text;
        return text_content;
    },
    createComment: function (text: string): KliNode {
        throw new Error('comment not supported in kli');
    },

    patchProp: function (el: KliNode, key: string, prevValue: any, nextValue: any): void {
        if (key in el) {
            (el as any)[key] = nextValue;
        }
    },
    parentNode: function (node: KliNode): KliNode | null {
        return node.parent ?? null;
    },

    insert: function (el: KliNode, parent: KliNode, anchor?: KliNode | null | undefined): void {
        if (parent instanceof Container) {
            if (el instanceof Container || el instanceof TextContainer) {
                const index = anchor ? parent.get_child_index(anchor as any) : undefined;
                parent.add_child(el, index);
            }
            else {
                throw new Error('<box /> can only have children of <box /> / <text-box />');
            }
        }
        else if (parent instanceof TextContainer) {
            if (el instanceof Text) {
                parent.set_text(el);
            }
            else {
                throw new Error('<text-box /> can only have one child of <text />');
            }
        }
        else if (parent instanceof Text) {
            if (el instanceof Text || el instanceof TextContent || el instanceof Newline) {
                const index = anchor ? parent.get_child_index(anchor) : undefined;
                parent.add_child(el, index);
            }
            else {
                throw new Error('<text /> can only have children of <text /> / <span /> / <newline />');
            }
        }
        else if (parent instanceof TextContent) {
            throw new Error('<span /> cannot has children');
        }
        else if (parent instanceof Newline) {
            throw new Error('<newline /> cannot has children');
        }
    },
    remove: function (el: KliNode): void {
        if (el.parent !== undefined) {
            if (el.parent.remove_child(el)) {
                el.dispose(true);
            }
        }
    },

    setText: function (node: KliNode, str: string): void {
        if (node instanceof TextContent) {
            node.content = str;
        }
        else {
            throw new Error('set text only works in <span />');
        }
    },
    setElementText: function (node: KliNode, str: string): void {
        if (node instanceof TextContainer) {
            node.clear_text()?.dispose(true);
            const text = new Text();
            const content = new TextContent();
            text.add_child(content);
            content.content = str;
            node.set_text(text);
        }
        else if (node instanceof Text) {
            while (node.get_children_count() > 0) {
                node.remove_child(node.get_child(0))?.dispose(true);
            }
            const content = new TextContent();
            content.content = str;
            node.add_child(content);
        }
        else {
            throw new Error('set text only works in <text-box /> / <text />');
        }
    },
    nextSibling: function (node: KliNode): KliNode | null {
        const parent = node.parent;
        if (parent === undefined) return null;
        if (parent instanceof Container) {
            return parent.get_next_sibling(node as any) ?? null;
        }
        else if (parent instanceof TextContainer) {
            return parent.get_next_sibling(node as any) ?? null;
        }
        else if (parent instanceof Text) {
            return parent.get_next_sibling(node) ?? null;
        }
        else if (parent instanceof TextContent) {
            return null;
        }
        else if (parent instanceof Newline) {
            return null;
        }
        return null;
    }
});

export { render, createApp };
