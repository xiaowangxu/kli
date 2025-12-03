import { PositionType } from "yoga-layout";
import { LayoutContainer, LayoutLeaf, LayoutNode } from "../layout/layout.js";
import { Node } from "../node/node.js";
import { Renderer } from "../render/renderer.js";
import { Position } from "../util/position.js";
import { Signal } from "../util/signal.js";
import { log } from "../util/logger.js";
import { InputEvent } from "../input/event.js";
import { Input } from "../input/input.js";

export class Scene extends LayoutContainer {

    public readonly input: Input;
    public readonly on_changed: Signal<() => void> = new Signal();

    protected readonly screen_size: Position = Position.of(0, 0);

    private readonly on_trigger_input_event = (data: InputEvent) => this.trigger_input_event(data);
    
    constructor(input: Input) {
        super();
        this.input = input;
        this.input.on_input.connect(this.on_trigger_input_event);
        this.layout_node.setPositionType(PositionType.Relative);
    }

    protected on_child_addeded(node: Node & (LayoutLeaf | LayoutNode)): void {
        super.on_child_addeded(node);
        this.notify_change();
    }
    protected on_child_removed(node: Node & (LayoutLeaf | LayoutNode)): void {
        super.on_child_removed(node);
        this.notify_change();
    }
    protected on_child_moved(node: Node & (LayoutLeaf | LayoutNode), from: number, to: number): void {
        super.on_child_moved(node, from, to);
        this.notify_change();
    }

    public calculate_layout(width: number, height: number) {
        this.screen_size.x = width;
        this.screen_size.y = height;
        this.layout_node.calculateLayout(width, height);
    }

    public get_screen_size() {
        return Position.of(this.screen_size.x, this.screen_size.y);
    }

    public get_scene(): Scene {
        return this;
    }

    public draw(render: Renderer): void {
        for (const child of this.children) {
            child.draw(render, true);
        }
    }

    public notify_change() {
        this.on_changed.trigger();
    }

    public trigger_input_event(event: InputEvent) {
        if (event.is_propagation_stopped()) return;
        for (const child of this.get_children()) {
            this.propagate_input_event_down(child, event);
            if (event.is_propagation_stopped()) return;
        }
    }

    private propagate_input_event_down(node: Node, event: InputEvent) {
        if (event.is_propagation_stopped()) return;
        node.on_input_event(event);
        const children = node.get_children();
        if (children === undefined) return;
        for (const child of children) {
            this.propagate_input_event_down(child, event);
            if (event.is_propagation_stopped()) return;
        }
    }

    private propagate_input_event_up(node: Node, event: InputEvent) {
        if (event.is_propagation_stopped()) return;
        node.on_input_event(event);
        let parent = node.parent;
        while (parent !== undefined) {
            if (parent instanceof Scene) break;
            parent.on_input_event(event);
            if (event.is_propagation_stopped()) return;
            parent = parent.parent;
        }
    }

    protected focused_node: Node | undefined = undefined;

    public get_focus_position(): Position | undefined {
        if (this.focused_node === undefined) return undefined;
        return this.focused_node?.get_focus_position?.();
    }

    public focus_node(node: Node): void {
        if (node.focusable && this.focused_node !== node) {
            if (this.focused_node !== undefined) {
                this.focused_node.trigger_blured();
            }
            this.focused_node = node;
            if (this.focus_node !== undefined) {
                this.focused_node.trigger_focused();
            }
        }
    }

    public blur_node(node: Node): void {
        if (this.focused_node === node && this.focused_node !== undefined) {
            const node = this.focused_node;
            this.focused_node = undefined;
            node.trigger_blured();
        }
    }

    protected get_all_focusables(node: Node, focusables: Node[]) {
        const children = node.get_children();
        if (children === undefined) return focusables;
        for (const child of children) {
            if (child.focusable) focusables.push(child);
            this.get_all_focusables(child, focusables);
        }
        return focusables;
    }
    public get_next_focusable(anchor: Node | undefined = this.focused_node): Node | undefined {
        const focusables = this.get_all_focusables(this, []);
        if (focusables.length <= 0) return undefined;
        if (anchor === undefined) return focusables[0];
        const index = focusables.indexOf(anchor);
        if (index < 0) return focusables[0];
        return focusables[(index + 1) % focusables.length];
    }

    public get_prev_focusable(anchor: Node | undefined = this.focused_node): Node | undefined {
        const focusables = this.get_all_focusables(this, []);
        if (focusables.length <= 0) return undefined;
        if (anchor === undefined) return focusables[0];
        const index = focusables.indexOf(anchor);
        if (index < 0) return focusables[0];
        return focusables[(index - 1 + focusables.length) % focusables.length];
    }

    public dispose(recusive: boolean) {
        this.focused_node = undefined;
        this.input.on_input.disconnect(this.on_trigger_input_event);
        super.dispose(recusive);
    }

}