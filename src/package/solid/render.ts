import { createRenderer } from 'solid-js/universal';
import { Container, TextContainer } from '../node/container.js';
import { Newline, Text, TextContent } from '../node/text.js';
import { LayoutLeaf, LayoutNode } from '../layout/layout.js';
import { Node, NodeWithChildren } from '../node/node.js';
import { Scene } from '../scene/scene.js';
import { Input } from '../input/input.js';
import { Renderer } from '../render/renderer.js';
import { Rect } from '../util/rect.js';
import { JSXElement } from 'solid-js';
import { log } from '../util/logger.js';
import { Button, Checkbox, InputBox } from '../component/controls.js';
import { FrameBufferView } from '../component/frame_buffer_view.js';

function input_event_property(name: string): { type: string, capture: boolean } | undefined {
    if (!name.startsWith('on_')) return undefined;
    let event_name = name.slice(3);
    const capture = event_name.endsWith('_capture');
    if (capture) event_name = event_name.slice(0, -'_capture'.length);
    if (event_name === 'focused') event_name = 'focus';
    if (event_name === 'blured') event_name = 'blur';
    return { type: event_name.replaceAll('_', ''), capture };
}

export type KliNode = Node | NodeWithChildren<Node | (Node & (LayoutLeaf | LayoutNode))>;

const {
    render: default_render,
    effect,
    memo,
    createComponent,
    createElement,
    createTextNode,
    insertNode,
    insert,
    spread,
    setProp,
    mergeProps,
} =
    createRenderer<any>({
        createElement: function (tag: string): KliNode {
            switch (tag) {
                case 'box': return new Container();
                case 'text-box': return new TextContainer();
                case 'text': return new Text();
                case 'br': return new Newline();
                case 'button': return new Button();
                case 'checkbox': return new Checkbox();
                case 'input-box': return new InputBox();
                case 'frame-buffer': return new FrameBufferView();
                default: throw new Error(`unknown tag <${tag} />`);
            }
        },
        createTextNode: function (value: string): KliNode {
            const content = new TextContent();
            content.content = value;
            return content;
        },
        replaceText: function (textNode: KliNode, value: string): void {
            if (textNode instanceof TextContent) {
                textNode.content = value;
            }
        },
        isTextNode: function (node: KliNode): boolean {
            return node instanceof TextContent;
        },
        setProperty: function <T>(node: KliNode, name: string, value: T, prev?: T | undefined): void {
            const event_property = input_event_property(name);
            if (event_property !== undefined) {
                node.set_event_handler(
                    event_property.type,
                    typeof value === 'function' ? value as any : undefined,
                    event_property.capture,
                );
            }
            else if (name in node) {
                (node as any)[name] = value;
            }
        },
        insertNode: function (parent: KliNode, node: KliNode, anchor?: KliNode | undefined): void {
            if (parent instanceof NodeWithChildren) {
                if (parent !== node.parent) {
                    parent.add_child(node);
                }
                if (anchor !== undefined) {
                    parent.move_child(node, anchor);
                }
            }
            else {
                throw new Error(`cannnot insert child under this tag`);
            }
        },
        removeNode: function (parent: KliNode, node: KliNode): void {
            if (parent instanceof NodeWithChildren) {
                if (parent.remove_child(node)) {
                    node.dispose(true);
                }
            }
        },
        getParentNode: function (node: KliNode): KliNode | undefined {
            return node.parent;
        },
        getFirstChild: function (node: KliNode): KliNode | undefined {
            if (node instanceof NodeWithChildren) {
                return node.get_child(0);
            }
            return;
        },
        getNextSibling: function (node: KliNode): KliNode | undefined {
            if (node.parent === undefined) return;
            const parent = node.parent;
            return parent.get_next_sibling(node);
        }
    });

function render(code: () => JSXElement) {
    const input = new Input(process.stdin);
    const scene = new Scene(input);
    const renderer = new Renderer(process.stdout, (render) => {
        render.draw_scene();
        render.execute_render(Rect.of(0, 0, render.width, render.height), Rect.of(0, 0, render.width, render.height), false, false);
    });
    renderer.set_scene(scene);
    renderer.init();
    input.init();
    process.on('exit', () => {
        renderer.dispose();
        input.dispose();
    });
    default_render(code, scene);
    return { scene, renderer, input };
}

export {
    render,
    effect,
    memo,
    createComponent,
    createElement,
    createTextNode,
    insertNode,
    insert,
    spread,
    setProp,
    mergeProps,
};
