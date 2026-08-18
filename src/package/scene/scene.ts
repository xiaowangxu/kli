import { Overflow, PositionType } from 'yoga-layout';
import { Input } from '../input/input.js';
import {
    FocusInputEvent,
    InputEvent,
    InputEventPhase,
    KeyInputEvent,
    MouseButton,
    MouseInputEvent,
    WheelInputEvent,
} from '../input/event.js';
import { LayoutContainer, LayoutLeaf, LayoutNode } from '../layout/layout.js';
import { Container } from '../node/container.js';
import { CursorState, Node } from '../node/node.js';
import { Renderer } from '../render/renderer.js';
import { Position } from '../util/position.js';
import { Rect } from '../util/rect.js';
import { Signal } from '../util/signal.js';

export class Scene extends LayoutContainer {
    public readonly input: Input;
    public readonly on_changed: Signal<() => void> = new Signal();

    protected readonly screen_size: Position = Position.of(0, 0);
    protected focused_node: Node | undefined;
    protected hovered_path: Node[] = [];
    protected pressed_target: Node | undefined;
    protected pointer_capture: Node | undefined;

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

    public get_screen_size() { return Position.of(this.screen_size.x, this.screen_size.y); }
    public get_scene(): Scene { return this; }

    public draw(render: Renderer): void {
        for (const child of this.children) child.draw(render, true);
    }

    public notify_change() { this.on_changed.trigger(); }

    public dispatch_event(event: InputEvent): boolean;
    public dispatch_event(target: Node, event: InputEvent): boolean;
    public dispatch_event(target_or_event: Node | InputEvent, maybe_event?: InputEvent): boolean {
        const target = target_or_event instanceof InputEvent ? this : target_or_event;
        const event = target_or_event instanceof InputEvent ? target_or_event : maybe_event!;
        if (target !== this && target.get_scene() !== this) return false;
        const path = this.get_event_path(target);
        event._begin_dispatch(target, path);

        try {
            // Capture: Scene -> target parent.
            for (let index = path.length - 1; index >= 1; index--) {
                path[index]._invoke_event_listeners(event, true, InputEventPhase.Capturing);
                if (event.is_propagation_stopped()) break;
            }

            // At target, capture listeners precede regular listeners.
            if (!event.is_propagation_stopped() || path.length === 1) {
                target._invoke_event_listeners(event, true, InputEventPhase.AtTarget);
                if (!event.is_immediate_propagation_stopped()) {
                    target._invoke_event_listeners(event, false, InputEventPhase.AtTarget);
                }
            }

            // Bubble: target parent -> Scene.
            if (event.bubbles && !event.is_propagation_stopped()) {
                for (let index = 1; index < path.length; index++) {
                    path[index]._invoke_event_listeners(event, false, InputEventPhase.Bubbling);
                    if (event.is_propagation_stopped()) break;
                }
            }
        }
        finally {
            event._finish_dispatch();
        }

        if (!event.defaultPrevented) this.perform_event_default(target, event);
        return !event.defaultPrevented;
    }

    protected get_event_path(target: Node): Node[] {
        const path: Node[] = [target];
        let current = target.parent;
        while (current !== undefined) {
            path.push(current);
            if (current === this) break;
            current = current.parent;
        }
        if (path[path.length - 1] !== this) path.push(this);
        return path;
    }

    public trigger_input_event(event: InputEvent) {
        if (event instanceof MouseInputEvent) {
            this.trigger_mouse_event(event);
            return;
        }
        const target = this.focused_node ?? this;
        this.dispatch_event(target, event);
    }

    protected trigger_mouse_event(event: MouseInputEvent) {
        const hit_target = this.hit_test(event.clientX, event.clientY) ?? this;
        this.update_hover_path(hit_target, event);

        const target = this.pointer_capture ?? hit_target;
        if (event.type === 'mousedown') {
            this.pressed_target?._set_active(false);
            this.pressed_target = target;
            target._set_active(true);
        }

        this.dispatch_event(target, event);

        if (event.type === 'mouseup') {
            const pressed = this.pressed_target;
            pressed?._set_active(false);
            this.pressed_target = undefined;
            this.pointer_capture = undefined;

            if (pressed !== undefined && pressed === hit_target && event.button === MouseButton.Primary) {
                this.dispatch_event(hit_target, new MouseInputEvent('click', {
                    x: event.clientX,
                    y: event.clientY,
                    button: event.button,
                    buttons: event.buttons,
                    detail: 1,
                    ctrl: event.ctrl,
                    shift: event.shift,
                    alt: event.alt,
                    meta: event.meta,
                }));
            }
            else if (pressed !== undefined && pressed === hit_target && event.button === MouseButton.Secondary) {
                this.dispatch_event(hit_target, new MouseInputEvent('contextmenu', {
                    x: event.clientX,
                    y: event.clientY,
                    button: event.button,
                    buttons: event.buttons,
                    detail: 1,
                    ctrl: event.ctrl,
                    shift: event.shift,
                    alt: event.alt,
                    meta: event.meta,
                }));
            }
        }
    }

    protected update_hover_path(next_target: Node, source: MouseInputEvent) {
        const next_path = this.get_event_path(next_target);
        const previous_target = this.hovered_path[0];
        if (previous_target === next_target) return;

        const next_set = new Set(next_path);
        const previous_set = new Set(this.hovered_path);

        if (previous_target !== undefined) {
            this.dispatch_event(previous_target, new MouseInputEvent('mouseout', {
                x: source.clientX, y: source.clientY, buttons: source.buttons,
                relatedTarget: next_target, bubbles: true,
            }));
        }
        for (const node of this.hovered_path) {
            if (next_set.has(node)) continue;
            node._set_hovered(false);
            this.dispatch_event(node, new MouseInputEvent('mouseleave', {
                x: source.clientX, y: source.clientY, buttons: source.buttons,
                relatedTarget: next_target, bubbles: false, cancelable: false,
            }));
        }

        for (const node of [...next_path].reverse()) {
            if (previous_set.has(node)) continue;
            node._set_hovered(true);
            this.dispatch_event(node, new MouseInputEvent('mouseenter', {
                x: source.clientX, y: source.clientY, buttons: source.buttons,
                relatedTarget: previous_target, bubbles: false, cancelable: false,
            }));
        }
        this.dispatch_event(next_target, new MouseInputEvent('mouseover', {
            x: source.clientX, y: source.clientY, buttons: source.buttons,
            relatedTarget: previous_target, bubbles: true,
        }));
        this.hovered_path = next_path;
    }

    protected perform_event_default(target: Node, event: InputEvent) {
        target.perform_default_action(event);
        if (event.defaultPrevented) return;

        if (event instanceof KeyInputEvent && event.type === 'keydown') {
            if (event.key === 'Tab') {
                const next = event.shift ? this.get_prev_focusable() : this.get_next_focusable();
                next?.focus();
                event.preventDefault();
                return;
            }
            if (this.perform_keyboard_scroll(target, event)) event.preventDefault();
            return;
        }

        if (event instanceof WheelInputEvent) {
            if (this.scroll_nearest(target, event.deltaX, event.deltaY)) event.preventDefault();
            return;
        }

        if (event instanceof MouseInputEvent && event.type === 'mousedown' && event.button === MouseButton.Primary) {
            let current: Node | undefined = target;
            while (current !== undefined && current !== this) {
                if (current.focusable && !current.disabled) {
                    this.focus_node(current);
                    return;
                }
                current = current.parent;
            }
            if (this.focused_node !== undefined) this.blur_node(this.focused_node);
        }
    }

    protected perform_keyboard_scroll(target: Node, event: KeyInputEvent): boolean {
        let current: Node | undefined = target;
        while (current !== undefined) {
            if (current instanceof Container && current.layout_node.getOverflow() === Overflow.Scroll) {
                const viewport = current.get_content_rect();
                const position = current.get_scroll_position();
                switch (event.key) {
                    case 'ArrowUp': if (current.scroll_by(0, -1)) return true; break;
                    case 'ArrowDown': if (current.scroll_by(0, 1)) return true; break;
                    case 'ArrowLeft': if (current.scroll_by(-1, 0)) return true; break;
                    case 'ArrowRight': if (current.scroll_by(1, 0)) return true; break;
                    case 'PageUp': if (current.scroll_by(0, -Math.max(1, viewport.height - 1))) return true; break;
                    case 'PageDown': if (current.scroll_by(0, Math.max(1, viewport.height - 1))) return true; break;
                    case 'Home': if (current.scroll_to(position.x, 0)) return true; break;
                    case 'End': if (current.scroll_to(position.x, Number.POSITIVE_INFINITY)) return true; break;
                }
            }
            current = current.parent;
        }
        return false;
    }

    protected scroll_nearest(target: Node, deltaX: number, deltaY: number): boolean {
        let current: Node | undefined = target;
        while (current !== undefined) {
            if (current instanceof Container && current.layout_node.getOverflow() === Overflow.Scroll) {
                if (current.scroll_by(deltaX, deltaY)) return true;
            }
            current = current.parent;
        }
        return false;
    }

    public hit_test(x: number, y: number): Node | undefined {
        const screen = Rect.of(0, 0, this.screen_size.x, this.screen_size.y);
        if (!this.point_in_rect(x, y, screen)) return undefined;
        for (let index = this.children.length - 1; index >= 0; index--) {
            const hit = this.hit_test_node(this.children[index], x, y, screen);
            if (hit !== undefined) return hit;
        }
        return undefined;
    }

    protected hit_test_node(node: Node, x: number, y: number, clip: Rect): Node | undefined {
        if (!this.point_in_rect(x, y, clip)) return undefined;
        const layout = node as Node & Partial<LayoutLeaf>;
        const rect = typeof layout.get_rect === 'function' ? layout.get_rect() : undefined;
        const container = node instanceof LayoutContainer ? node : undefined;

        let child_clip = clip;
        if (container !== undefined && container.layout_node.getOverflow() !== Overflow.Visible) {
            child_clip = clip.intersect(container.get_content_rect()) ?? Rect.of(0, 0, 0, 0);
        }

        const children = node.get_children();
        if (children !== undefined) {
            for (let index = children.length - 1; index >= 0; index--) {
                const hit = this.hit_test_node(children[index], x, y, child_clip);
                if (hit !== undefined) return hit;
            }
        }

        if (node.pointer_events && rect !== undefined && this.point_in_rect(x, y, rect)) return node;
        return undefined;
    }

    protected point_in_rect(x: number, y: number, rect: Rect) {
        return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
    }

    public get_focus_position(): Position | undefined { return this.focused_node?.get_focus_position(); }
    public get_cursor_state(): CursorState | undefined { return this.focused_node?.get_cursor_state(); }

    public focus_node(node: Node): void {
        if (!node.focusable || node.disabled || node.get_scene() !== this || this.focused_node === node) return;
        const previous = this.focused_node;
        this.focused_node = node;
        if (previous !== undefined) {
            this.dispatch_event(previous, new FocusInputEvent('blur', node));
            this.dispatch_event(previous, new FocusInputEvent('focusout', node));
            previous.trigger_blured();
        }
        node.trigger_focused();
        this.dispatch_event(node, new FocusInputEvent('focus', previous));
        this.dispatch_event(node, new FocusInputEvent('focusin', previous));
        this.notify_change();
    }

    public get_focused_node(): Node | undefined { return this.focused_node; }

    public blur_node(node: Node): void {
        if (this.focused_node !== node) return;
        this.focused_node = undefined;
        this.dispatch_event(node, new FocusInputEvent('blur'));
        this.dispatch_event(node, new FocusInputEvent('focusout'));
        node.trigger_blured();
        this.notify_change();
    }

    protected get_all_focusables(node: Node, focusables: Node[]) {
        const children = node.get_children();
        if (children === undefined) return focusables;
        for (const child of children) {
            if (child.focusable && !child.disabled && child.tab_index >= 0) focusables.push(child);
            this.get_all_focusables(child, focusables);
        }
        return focusables;
    }

    protected get_ordered_focusables(): Node[] {
        const all = this.get_all_focusables(this, []);
        const positive = all.filter((node) => node.tab_index > 0).sort((a, b) => a.tab_index - b.tab_index);
        return [...positive, ...all.filter((node) => node.tab_index === 0)];
    }

    public get_next_focusable(anchor: Node | undefined = this.focused_node): Node | undefined {
        const focusables = this.get_ordered_focusables();
        if (focusables.length === 0) return undefined;
        if (anchor === undefined) return focusables[0];
        const index = focusables.indexOf(anchor);
        return index < 0 ? focusables[0] : focusables[(index + 1) % focusables.length];
    }

    public get_prev_focusable(anchor: Node | undefined = this.focused_node): Node | undefined {
        const focusables = this.get_ordered_focusables();
        if (focusables.length === 0) return undefined;
        if (anchor === undefined) return focusables[focusables.length - 1];
        const index = focusables.indexOf(anchor);
        return index < 0 ? focusables[0] : focusables[(index - 1 + focusables.length) % focusables.length];
    }

    public capture_pointer(node: Node) {
        if (node.get_scene() === this) this.pointer_capture = node;
    }

    public release_captured_pointer(node: Node) {
        if (this.pointer_capture === node) this.pointer_capture = undefined;
    }

    public has_captured_pointer(node: Node) { return this.pointer_capture === node; }

    public dispose(recusive: boolean) {
        this.focused_node = undefined;
        this.hovered_path = [];
        this.pressed_target = undefined;
        this.pointer_capture = undefined;
        this.input.on_input.disconnect(this.on_trigger_input_event);
        super.dispose(recusive);
    }
}
