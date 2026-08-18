import { InputEvent, InputEventPhase } from "../input/event.js";
import { Renderer } from "../render/renderer.js";
import { Scene } from "../scene/scene.js";
import { Position } from "../util/position.js";
import { Signal } from "../util/signal.js";

export interface CursorState {
    position: Position;
    visible: boolean;
}

export interface InputEventListenerOptions {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
}

export type InputEventListener<T extends InputEvent = InputEvent> = (event: T) => void;

interface RegisteredInputListener {
    callback: InputEventListener;
    capture: boolean;
    once: boolean;
    passive: boolean;
}

export abstract class Node {

    parent: NodeWithChild<Node> | undefined;
    protected _focusable: boolean = false;
    protected _disabled: boolean = false;
    protected _pointer_events: boolean = true;
    protected _tab_index: number = 0;
    protected _hovered: boolean = false;
    protected _active: boolean = false;
    protected _draggable: boolean = false;
    protected _droppable: boolean = false;
    protected _z_index: number = 0;
    public role: string | undefined;
    public aria_label: string | undefined;
    public aria_description: string | undefined;

    protected readonly on_focused_event: Signal<() => void> = new Signal();
    protected readonly on_blured_event: Signal<() => void> = new Signal();
    protected readonly input_listeners = new Map<string, Set<RegisteredInputListener>>();
    protected readonly input_handlers = new Map<string, InputEventListener>();

    public get focusable() {
        return this._focusable;
    }
    public set focusable(v: boolean) {
        if (this._focusable !== v) {
            this._focusable = v;
            if (!this._focusable) {
                this.get_scene()?.blur_node(this);
            }
        }
    }

    public get disabled() { return this._disabled; }
    public set disabled(value: boolean) {
        if (this._disabled === value) return;
        this._disabled = value;
        if (value) this.blur();
        this.get_scene()?.notify_change();
    }

    public get pointer_events() { return this._pointer_events; }
    public set pointer_events(value: boolean) { this._pointer_events = value; }

    public get tab_index() { return this._tab_index; }
    public set tab_index(value: number) { this._tab_index = Math.floor(value); }

    public get hovered() { return this._hovered; }
    public get active() { return this._active; }
    public get draggable() { return this._draggable; }
    public set draggable(value: boolean) { this._draggable = Boolean(value); }
    public get droppable() { return this._droppable; }
    public set droppable(value: boolean) { this._droppable = Boolean(value); }
    public get z_index() { return this._z_index; }
    public set z_index(value: number) {
        const next = Math.floor(value ?? 0);
        if (next === this._z_index) return;
        this._z_index = next;
        this.get_scene()?.notify_change();
    }
    public get zIndex() { return this.z_index; }
    public set zIndex(value: number) { this.z_index = value; }
    public get ariaLabel() { return this.aria_label; }
    public set ariaLabel(value: string | undefined) { this.aria_label = value; }
    public get ariaDescription() { return this.aria_description; }
    public set ariaDescription(value: string | undefined) { this.aria_description = value; }
    public get focused() { return this.get_scene()?.get_focused_node() === this; }

    abstract draw(render: Renderer, force?: boolean): void;

    abstract dispose(recusive: boolean): void;

    get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    public get_children(): Node[] | undefined {
        return undefined;
    }

    abstract traverse_on_enter_scene(scene: Scene): void;
    abstract traverse_on_exit_scene(scene: Scene): void;
    on_enter_scene(scene: Scene): void { }
    on_exit_scene(scene: Scene): void {
        scene.release_captured_pointer(this);
        this._hovered = false;
        this._active = false;
        scene.blur_node(this);
    }

    public get_focus_position(): Position | undefined {
        return undefined;
    }
    public get_cursor_state(): CursorState | undefined {
        const position = this.get_focus_position();
        return position === undefined ? undefined : { position, visible: false };
    }
    public focus(): void {
        this.get_scene()?.focus_node?.(this);
    }
    public blur(): void { 
        this.get_scene()?.blur_node?.(this);
    }

    public on_focused(fn: () => void) {
        this.on_focused_event.connect(fn);
    }
    public off_focused(fn: () => void) {
        this.on_focused_event.disconnect(fn);
    }
    public on_blured(fn: () => void) {
        this.on_blured_event.connect(fn);
    }
    public off_blured(fn: () => void) {
        this.on_blured_event.disconnect(fn);
    }

    trigger_focused(): void {
        this.on_focused_event.trigger();
    }
    trigger_blured(): void {
        this.on_blured_event.trigger();
    }

    public addEventListener<T extends InputEvent = InputEvent>(
        type: string,
        callback: InputEventListener<T>,
        options: boolean | InputEventListenerOptions = {},
    ) {
        const normalized = typeof options === 'boolean' ? { capture: options } : options;
        const listeners = this.input_listeners.get(type) ?? new Set<RegisteredInputListener>();
        const duplicate = [...listeners].some((listener) =>
            listener.callback === callback && listener.capture === (normalized.capture ?? false));
        if (duplicate) return;
        listeners.add({
            callback: callback as InputEventListener,
            capture: normalized.capture ?? false,
            once: normalized.once ?? false,
            passive: normalized.passive ?? false,
        });
        this.input_listeners.set(type, listeners);
    }

    public add_event_listener<T extends InputEvent = InputEvent>(
        type: string,
        callback: InputEventListener<T>,
        options: boolean | InputEventListenerOptions = {},
    ) {
        this.addEventListener(type, callback, options);
    }

    public removeEventListener<T extends InputEvent = InputEvent>(
        type: string,
        callback: InputEventListener<T>,
        options: boolean | Pick<InputEventListenerOptions, 'capture'> = {},
    ) {
        const capture = typeof options === 'boolean' ? options : options.capture ?? false;
        const listeners = this.input_listeners.get(type);
        if (listeners === undefined) return;
        for (const listener of listeners) {
            if (listener.callback === callback && listener.capture === capture) listeners.delete(listener);
        }
        if (listeners.size === 0) this.input_listeners.delete(type);
    }

    public remove_event_listener<T extends InputEvent = InputEvent>(
        type: string,
        callback: InputEventListener<T>,
        options: boolean | Pick<InputEventListenerOptions, 'capture'> = {},
    ) {
        this.removeEventListener(type, callback, options);
    }

    public set_event_handler(type: string, callback: InputEventListener | undefined, capture: boolean = false) {
        const key = capture ? `${type}:capture` : type;
        if (callback === undefined) this.input_handlers.delete(key);
        else this.input_handlers.set(key, callback);
    }

    public dispatchEvent(event: InputEvent): boolean {
        const scene = this.get_scene();
        if (scene === undefined) return false;
        return scene.dispatch_event(this, event);
    }

    public dispatch_event(event: InputEvent): boolean { return this.dispatchEvent(event); }

    public setPointerCapture(_pointerId: number = 1) {
        this.get_scene()?.capture_pointer(this);
    }

    public set_pointer_capture(pointerId: number = 1) { this.setPointerCapture(pointerId); }

    public releasePointerCapture(_pointerId: number = 1) {
        this.get_scene()?.release_captured_pointer(this);
    }

    public release_pointer_capture(pointerId: number = 1) { this.releasePointerCapture(pointerId); }

    public hasPointerCapture(_pointerId: number = 1) {
        return this.get_scene()?.has_captured_pointer(this) ?? false;
    }

    public _invoke_event_listeners(event: InputEvent, capture: boolean, phase: InputEventPhase) {
        const listeners = this.input_listeners.get(event.type);
        if (listeners !== undefined) {
            for (const listener of [...listeners]) {
                if (listener.capture !== capture) continue;
                event._set_dispatch_state(this, phase, listener.passive);
                listener.callback(event);
                if (listener.once) listeners.delete(listener);
                if (event.is_immediate_propagation_stopped()) break;
            }
            if (listeners.size === 0) this.input_listeners.delete(event.type);
        }

        if (!event.is_immediate_propagation_stopped()) {
            const handler = this.input_handlers.get(capture ? `${event.type}:capture` : event.type);
            if (handler !== undefined) {
                event._set_dispatch_state(this, phase, false);
                handler(event);
            }
        }
        event._set_passive_listener(false);
    }

    /** Legacy direct delivery hook. Prefer addEventListener/dispatchEvent. */
    public on_input_event(event: InputEvent): void {
        this._invoke_event_listeners(event, false, event.eventPhase || InputEventPhase.AtTarget);
    }

    public perform_default_action(_event: InputEvent): void { }

    public _set_hovered(value: boolean) {
        if (this._hovered === value) return;
        this._hovered = value;
        this.get_scene()?.notify_change();
    }

    public _set_active(value: boolean) {
        if (this._active === value) return;
        this._active = value;
        this.get_scene()?.notify_change();
    }

    protected dispose_events() {
        this.input_listeners.clear();
        this.input_handlers.clear();
        this.on_focused_event.clear();
        this.on_blured_event.clear();
    }

}

export interface NodeWithChild<Child extends Node> extends Node {
    remove_child(node: Child, will_exit_scene?: boolean): Child | undefined;
    get_next_sibling(node: Child): Child | undefined;
}

export abstract class NodeWithChildren<Children extends Node = Node> extends Node implements NodeWithChild<Children> {

    public readonly children: Children[] = [];

    get_children(): Children[] {
        return this.children;
    }

    public get_child_index(node: Children) {
        return this.children.indexOf(node);
    }

    public get_child(index: number) {
        return this.children[index];
    }

    public get_next_sibling(node: Children): Children | undefined {
        const index = this.get_child_index(node);
        if (index < 0) return undefined;
        return this.children[index + 1];
    }

    public add_child(node: Children): void {
        if (node as any === this) return;
        if (node.parent === this) return;

        const previous_scene = node.get_scene();
        const next_scene = this.get_scene();
        if (previous_scene !== next_scene && previous_scene !== undefined) {
            node.traverse_on_exit_scene(previous_scene);
        }
        if (node.parent !== undefined) node.parent.remove_child(node, false);
        node.parent = this;
        this.children.push(node);
        this.on_child_addeded(node);
        if (previous_scene !== next_scene && next_scene !== undefined) {
            node.traverse_on_enter_scene(next_scene);
        }
    }

    protected abstract on_child_addeded(node: Children): void;

    public get_children_count() {
        return this.children.length;
    }

    public remove_child(node: Children, will_exit_scene: boolean = true): Children | undefined {
        if (node.parent !== this) return undefined;
        const index = this.children.indexOf(node);
        if (index < 0) return undefined;
        const scene = this.get_scene();
        if (will_exit_scene && scene !== undefined) {
            node.traverse_on_exit_scene(scene);
        }
        node.parent = undefined;
        this.children.splice(index, 1);
        this.on_child_removed(node);
        return node;
    }

    protected abstract on_child_removed(node: Children): void;

    public move_child(node: Children, to: number | Children): boolean {
        if (node.parent !== this) return false;
        const index = this.children.indexOf(node);
        if (index < 0) return false;
        if (typeof to === 'number') {
            if (to < 0) return false;
            this.children.splice(index, 1);
            this.children.splice(to, 0, node);
            this.on_child_moved(node, index, to);
            return true;
        }
        else {
            const toIndex = this.children.indexOf(to);
            if (toIndex < 0) return false;
            this.children.splice(index, 1);
            // 如果 node 原本在 to 前面,删除后 to 的索引会减1
            const newIndex = index < toIndex ? toIndex - 1 : toIndex;
            this.children.splice(newIndex, 0, node);
            this.on_child_moved(node, index, newIndex);
            return true;
        }
    }

    protected abstract on_child_moved(node: Children, from: number, to: number): void;

    public get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    traverse_on_enter_scene(scene: Scene): void {
        this.on_enter_scene(scene);
        for (const child of this.children) {
            child.traverse_on_enter_scene(scene);
        }
    }

    traverse_on_exit_scene(scene: Scene): void {
        for (const child of this.children) {
            child.traverse_on_exit_scene(scene);
        }
        this.on_exit_scene(scene);
    }

    public abstract draw(render: Renderer): void;

    public abstract dispose(recusive: boolean): void;

}
