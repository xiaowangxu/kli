import { createRenderer } from 'solid-js/universal';
import { Container, TextContainer } from '../node/container.js';
import { Newline, Text, TextContent } from '../node/text.js';
import { LayoutLeaf, LayoutNode } from '../layout/layout.js';
import { Node, NodeWithChildren } from '../node/node.js';
import { Scene } from '../scene/scene.js';
import { Input } from '../input/input.js';
import { Clipboard, HostClipboardBackend, Osc52ClipboardBackend } from '../input/clipboard.js';
import { Renderer, type RendererOptions } from '../render/renderer.js';
import { Rect } from '../util/rect.js';
import { JSXElement } from 'solid-js';
import { log } from '../util/logger.js';
import { Button, Checkbox, InputBox } from '../component/controls.js';
import { TextArea } from '../component/textarea.js';
import { ScrollBar, ScrollBox } from '../component/scroll.js';
import { Select } from '../component/select.js';
import { Dialog, FocusGroup, Layer, Modal } from '../component/overlay.js';
import { CommandPalette, Menu } from '../component/menu.js';
import { List, Table, Tree, VirtualList } from '../component/virtual_list.js';
import { FormField, Label, Progress, RadioGroup, Slider, Spinner, Switch, Tabs, ToastHost } from '../component/extra_controls.js';
import { Accordion, Collapsible, Resizable, SplitPane } from '../component/layout_components.js';
import { Autocomplete, Breadcrumb, Combobox, MultiSelect, Pagination, SearchBox, StatusBar } from '../component/navigation.js';
import { CodeView, DescriptionList, DiffView, LineNumber, MarkdownView, TreeSelect } from '../component/content.js';
import { DebugOverlay } from '../component/debug.js';
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
    use,
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
                case 'textarea': return new TextArea();
                case 'scrollbox': return new ScrollBox();
                case 'scrollbar': return new ScrollBar();
                case 'select': return new Select();
                case 'layer': return new Layer();
                case 'focus-group': return new FocusGroup();
                case 'modal': return new Modal();
                case 'dialog': return new Dialog();
                case 'menu': return new Menu();
                case 'command-palette': return new CommandPalette();
                case 'virtual-list': return new VirtualList();
                case 'list': return new List();
                case 'table': return new Table();
                case 'tree': return new Tree();
                case 'switch': return new Switch();
                case 'radio-group': return new RadioGroup();
                case 'slider': return new Slider();
                case 'progress': return new Progress();
                case 'spinner': return new Spinner();
                case 'label': return new Label();
                case 'form-field': return new FormField();
                case 'tabs': return new Tabs();
                case 'toast-host': return new ToastHost();
                case 'split-pane': return new SplitPane();
                case 'resizable': return new Resizable();
                case 'collapsible': return new Collapsible();
                case 'accordion': return new Accordion();
                case 'breadcrumb': return new Breadcrumb();
                case 'pagination': return new Pagination();
                case 'status-bar': return new StatusBar();
                case 'search-box': return new SearchBox();
                case 'autocomplete': return new Autocomplete();
                case 'combobox': return new Combobox();
                case 'multi-select': return new MultiSelect();
                case 'description-list': return new DescriptionList();
                case 'code': return new CodeView();
                case 'line-number': return new LineNumber();
                case 'diff': return new DiffView();
                case 'markdown': return new MarkdownView();
                case 'tree-select': return new TreeSelect();
                case 'debug-overlay': return new DebugOverlay();
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

export interface RenderHandle {
    scene: Scene;
    renderer: Renderer;
    input: Input;
    dispose(): void;
}

export interface RenderOptions extends RendererOptions {
    exitOnCtrlC?: boolean;
    pasteEncoding?: string | 'auto';
}

function render(code: () => JSXElement, options: RenderOptions = {}): RenderHandle {
    const input = new Input(process.stdin, {
        exitOnCtrlC: options.exitOnCtrlC,
        keyboardProtocol: options.keyboardProtocol,
        focusReporting: options.focusReporting,
        pasteEncoding: options.pasteEncoding,
    });
    const scene = new Scene(input);
    const renderer = new Renderer(process.stdout, (render) => {
        render.draw_scene();
        const screen = Rect.of(0, 0, render.width, render.height);
        render.execute_render(screen, screen, false, false);
    }, options);
    renderer.set_scene(scene);
    scene.clipboard = new Clipboard({
        host: new HostClipboardBackend(),
        terminal: new Osc52ClipboardBackend((text) => renderer.copy_to_clipboard_osc52(text)),
    });
    renderer.init();
    input.init();
    const dispose_tree = default_render(code, scene);
    let disposed = false;

    const dispose = () => {
        if (disposed) return;
        disposed = true;
        process.off('exit', dispose);
        process.off('SIGINT', on_sigint);
        process.off('SIGTERM', on_sigterm);
        input.dispose();
        renderer.clear_scene();
        dispose_tree();
        scene.dispose(false);
        renderer.dispose();
    };
    const exit_from_signal = (code: number) => {
        dispose();
        process.exit(code);
    };
    const on_sigint = () => exit_from_signal(130);
    const on_sigterm = () => exit_from_signal(143);

    process.once('exit', dispose);
    process.once('SIGINT', on_sigint);
    process.once('SIGTERM', on_sigterm);
    return { scene, renderer, input, dispose };
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
    use,
};
