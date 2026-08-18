import { Display, Overflow, PositionType } from 'yoga-layout';
import { Input } from '../input/input.js';
import type { Clipboard } from '../input/clipboard.js';
import {
    FocusInputEvent,
    ClipboardInputEvent,
    DragDataTransfer,
    DragInputEvent,
    InputEvent,
    InputEventPhase,
    KeyInputEvent,
    MouseButton,
    MouseInputEvent,
    SelectionInputEvent,
    WheelInputEvent,
} from '../input/event.js';
import { LayoutContainer, LayoutLeaf, LayoutNode } from '../layout/layout.js';
import { Container } from '../node/container.js';
import { CursorState, Node } from '../node/node.js';
import { Renderer } from '../render/renderer.js';
import { Position } from '../util/position.js';
import { Rect } from '../util/rect.js';
import { Signal } from '../util/signal.js';
import { TextSelection } from '../input/selection.js';
import { TextContainer } from '../node/container.js';
import { Color } from '../util/color.js';
import { darkTheme, type KliTheme } from '../style/theme.js';

export interface SemanticNode {
    role?: string;
    label?: string;
    description?: string;
    disabled: boolean;
    focused: boolean;
    rect?: { x: number; y: number; width: number; height: number };
    children: SemanticNode[];
}

export class Scene extends LayoutContainer {
    public readonly input: Input;
    public clipboard: Clipboard | undefined;
    public readonly on_changed: Signal<() => void> = new Signal();
    public theme: KliTheme = darkTheme;
    public last_event_type = '';
    public last_event_path: Node[] = [];

    protected readonly screen_size: Position = Position.of(0, 0);
    protected focused_node: Node | undefined;
    protected hovered_path: Node[] = [];
    protected pressed_target: Node | undefined;
    protected pointer_capture: Node | undefined;
    protected text_selection: TextSelection | undefined;
    protected selecting_text = false;
    protected drag_candidate: { source: Node; x: number; y: number } | undefined;
    protected drag_source: Node | undefined;
    protected drag_target: Node | undefined;
    protected drag_data: DragDataTransfer | undefined;
    protected drag_drop_allowed = false;
    public drag_threshold = 2;
    protected readonly focus_scopes: Array<{ root: Node; trap: boolean; restore: Node | undefined }> = [];
    public selection_color = Color.of(238, 243, 255);
    public selection_bg_color = Color.of(32, 68, 96);

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
        // Scene is the terminal viewport, not an auto-sized content container.
        // Pinning both dimensions prevents intrinsic/min-content sizes in a root
        // subtree from making Yoga resolve descendants against a taller surface.
        const viewport_width = Math.max(0, Math.floor(width));
        const viewport_height = Math.max(0, Math.floor(height));
        this.screen_size.x = viewport_width;
        this.screen_size.y = viewport_height;
        this.layout_node.setWidth(viewport_width);
        this.layout_node.setHeight(viewport_height);
        this.layout_node.calculateLayout(viewport_width, viewport_height);
    }

    public get_screen_size() { return Position.of(this.screen_size.x, this.screen_size.y); }
    public get_scene(): Scene { return this; }

    public draw(render: Renderer): void {
        const children = this.children.map((child, index) => ({ child, index }))
            .sort((a, b) => a.child.z_index - b.child.z_index || a.index - b.index);
        for (const { child } of children) {
            if (child.layout_node.getDisplay() === Display.None) continue;
            child.draw(render, true);
        }
    }

    public notify_change() { this.on_changed.trigger(); }

    public dispatch_event(event: InputEvent): boolean;
    public dispatch_event(target: Node, event: InputEvent): boolean;
    public dispatch_event(target_or_event: Node | InputEvent, maybe_event?: InputEvent): boolean {
        const target = target_or_event instanceof InputEvent ? this : target_or_event;
        const event = target_or_event instanceof InputEvent ? target_or_event : maybe_event!;
        if (target !== this && target.get_scene() !== this) return false;
        const path = this.get_event_path(target);
        this.last_event_type = event.type;
        this.last_event_path = [...path];
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
        if (event instanceof KeyInputEvent && event.type === 'keydown' && event.key === 'Escape' && this.drag_source !== undefined) {
            this.finish_drag(undefined, event, true);
            event.preventDefault();
            return;
        }
        if (event instanceof MouseInputEvent) {
            this.trigger_mouse_event(event);
            return;
        }
        const target = this.focused_node ?? this;
        this.dispatch_event(target, event);
    }

    protected trigger_mouse_event(event: MouseInputEvent) {
        let hit_target = this.hit_test(event.clientX, event.clientY) ?? this;
        const trap = this.focus_scopes.at(-1);
        if (trap?.trap && !this.contains_node(trap.root, hit_target)) hit_target = trap.root;
        this.update_hover_path(hit_target, event);

        if (event.type === 'mousedown' && event.button === MouseButton.Primary) {
            const source = this.find_drag_source(hit_target);
            this.drag_candidate = source === undefined ? undefined : {
                source, x: event.clientX, y: event.clientY,
            };
        }
        else if (event.type === 'mousemove' && this.drag_candidate !== undefined && this.drag_source === undefined) {
            const distance = Math.abs(event.clientX - this.drag_candidate.x) + Math.abs(event.clientY - this.drag_candidate.y);
            if (distance >= this.drag_threshold) this.begin_drag(event);
        }

        if (this.drag_source !== undefined) {
            if (event.type === 'mousemove') this.update_drag(hit_target, event);
            else if (event.type === 'mouseup' && event.button === MouseButton.Primary) {
                this.finish_drag(this.drag_drop_allowed ? this.drag_target : undefined, event, false);
                this.pressed_target?._set_active(false);
                this.pressed_target = undefined;
                this.pointer_capture = undefined;
                return;
            }
        }

        const selectable = this.find_selectable_text(hit_target);
        if (event.type === 'mousedown' && event.button === MouseButton.Primary) {
            if (selectable !== undefined && this.drag_candidate === undefined) {
                if (!event.ctrl || this.text_selection === undefined) {
                    this.text_selection = new TextSelection(Position.of(event.clientX, event.clientY));
                }
                this.text_selection.setFocus(event.clientX, event.clientY);
                this.selecting_text = true;
                this.pointer_capture = selectable;
                this.notify_change();
            }
        }
        else if (event.type === 'mousemove' && this.selecting_text && this.text_selection !== undefined) {
            this.text_selection.setFocus(event.clientX, event.clientY);
            this.notify_change();
        }

        const target = this.pointer_capture ?? hit_target;
        if (event.type === 'mousedown') {
            this.pressed_target?._set_active(false);
            this.pressed_target = target;
            target._set_active(true);
        }

        const allowed = this.dispatch_event(target, event);

        if (event.type === 'mousedown' && event.button === MouseButton.Primary &&
            selectable === undefined && allowed && this.text_selection !== undefined) {
            this.clearSelection();
        }

        if (event.type === 'mouseup') {
            if (this.selecting_text && this.text_selection !== undefined) {
                this.text_selection.setFocus(event.clientX, event.clientY);
                this.selecting_text = false;
                this.dispatch_event(this, new SelectionInputEvent(this.text_selection, this.getSelectedText()));
            }
            const pressed = this.pressed_target;
            pressed?._set_active(false);
            this.pressed_target = undefined;
            this.pointer_capture = undefined;
            this.drag_candidate = undefined;

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

    protected find_drag_source(target: Node) {
        let current: Node | undefined = target;
        while (current !== undefined && current !== this) {
            if (current.draggable && !current.disabled) return current;
            current = current.parent;
        }
        return undefined;
    }

    protected find_drop_target(target: Node) {
        let current: Node | undefined = target;
        while (current !== undefined && current !== this) {
            if (current.droppable && !current.disabled && current !== this.drag_source) return current;
            current = current.parent;
        }
        return undefined;
    }

    protected drag_event(type: ConstructorParameters<typeof DragInputEvent>[0], event: MouseInputEvent, target?: Node, cancelled = false) {
        return new DragInputEvent(type, {
            x: event.clientX,
            y: event.clientY,
            button: event.button,
            buttons: event.buttons,
            ctrl: event.ctrl,
            shift: event.shift,
            alt: event.alt,
            meta: event.meta,
            dataTransfer: this.drag_data!,
            source: this.drag_source!,
            dropTarget: target,
            cancelled,
        });
    }

    protected begin_drag(event: MouseInputEvent) {
        if (this.drag_candidate === undefined) return;
        this.drag_source = this.drag_candidate.source;
        this.drag_data = new DragDataTransfer();
        const start = this.drag_event('dragstart', event);
        if (!this.dispatch_event(this.drag_source, start)) {
            this.drag_candidate = undefined;
            this.drag_source = undefined;
            this.drag_data = undefined;
            return;
        }
        this.selecting_text = false;
        this.text_selection = undefined;
        this.pointer_capture = this.drag_source;
        this.notify_change();
    }

    protected update_drag(hit_target: Node, event: MouseInputEvent) {
        const next = this.find_drop_target(hit_target);
        if (next !== this.drag_target) {
            if (this.drag_target !== undefined) this.dispatch_event(this.drag_target, this.drag_event('dragleave', event, this.drag_target));
            this.drag_target = next;
            this.drag_drop_allowed = false;
            if (next !== undefined) this.dispatch_event(next, this.drag_event('dragenter', event, next));
        }
        this.dispatch_event(this.drag_source!, this.drag_event('drag', event, next));
        if (next !== undefined) {
            const over = this.drag_event('dragover', event, next);
            this.drag_drop_allowed = !this.dispatch_event(next, over);
        }
        this.auto_scroll_drag_target(hit_target, event);
    }

    protected auto_scroll_drag_target(target: Node, event: MouseInputEvent) {
        let current: Node | undefined = target;
        while (current !== undefined) {
            if (current instanceof Container && current.layout_node.getOverflow() === Overflow.Scroll) {
                const rect = current.get_content_rect();
                const dx = event.clientX <= rect.x ? -1 : event.clientX >= rect.x + rect.width - 1 ? 1 : 0;
                const dy = event.clientY <= rect.y ? -1 : event.clientY >= rect.y + rect.height - 1 ? 1 : 0;
                if ((dx !== 0 || dy !== 0) && current.scroll_by(dx, dy)) return;
            }
            current = current.parent;
        }
    }

    protected finish_drag(target: Node | undefined, source_event: MouseInputEvent | KeyInputEvent, cancelled: boolean) {
        const source = this.drag_source;
        if (source === undefined || this.drag_data === undefined) return;
        const mouse = source_event instanceof MouseInputEvent ? source_event : new MouseInputEvent('mousemove');
        if (!cancelled && target !== undefined) this.dispatch_event(target, this.drag_event('drop', mouse, target));
        if (this.drag_target !== undefined) this.dispatch_event(this.drag_target, this.drag_event('dragleave', mouse, this.drag_target, cancelled));
        this.dispatch_event(source, this.drag_event('dragend', mouse, target, cancelled));
        this.drag_candidate = undefined;
        this.drag_source = undefined;
        this.drag_target = undefined;
        this.drag_data = undefined;
        this.drag_drop_allowed = false;
        this.pointer_capture = undefined;
        this.notify_change();
    }

    protected find_selectable_text(target: Node): TextContainer | undefined {
        let current: Node | undefined = target;
        while (current !== undefined && current !== this) {
            if (current instanceof TextContainer && current.selectable) return current;
            current = current.parent;
        }
        return undefined;
    }

    public getSelection() { return this.text_selection; }
    public get_selection() { return this.getSelection(); }
    public get hasSelection() { return this.text_selection !== undefined && !this.text_selection.isCollapsed && this.getSelectedText().length > 0; }
    public clearSelection() {
        if (this.text_selection === undefined) return;
        this.text_selection = undefined;
        this.selecting_text = false;
        this.drag_candidate = undefined;
        this.drag_source = undefined;
        this.drag_target = undefined;
        this.drag_data = undefined;
        this.notify_change();
    }
    public clear_selection() { this.clearSelection(); }
    public is_text_cell_selected(x: number, y: number, width: number = 1) {
        return this.text_selection?.intersectsCell(x, y, width) ?? false;
    }
    public getSelectedText() {
        if (this.text_selection === undefined || this.text_selection.isCollapsed) return '';
        const rows: Array<{ x: number; y: number; end: number; text: string }> = [];
        const visit = (node: Node) => {
            if (node instanceof TextContainer && node.selectable) {
                rows.push(...node.get_selected_rows(this.text_selection!));
            }
            for (const child of node.get_children() ?? []) visit(child);
        };
        visit(this);
        rows.sort((a, b) => a.y - b.y || a.x - b.x);
        let result = '';
        let last_y: number | undefined;
        for (const row of rows) {
            if (last_y !== undefined && row.y !== last_y) result += '\n'.repeat(Math.max(1, row.y - last_y));
            result += row.text;
            last_y = row.y;
        }
        return result;
    }
    public get_selected_text() { return this.getSelectedText(); }

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
            if (event.ctrl && event.key.toLowerCase() === 'c' && this.hasSelection) {
                const clipboard_event = new ClipboardInputEvent('copy', this.getSelectedText());
                if (this.dispatch_event(this, clipboard_event)) {
                    void this.clipboard?.writeText(clipboard_event.text);
                }
                event.preventDefault();
                return;
            }
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
        const children = this.children.map((child, index) => ({ child, index }))
            .sort((a, b) => b.child.z_index - a.child.z_index || b.index - a.index);
        for (const { child } of children) {
            const hit = this.hit_test_node(child, x, y, screen);
            if (hit !== undefined) return hit;
        }
        return undefined;
    }

    protected hit_test_node(node: Node, x: number, y: number, clip: Rect): Node | undefined {
        if (node instanceof LayoutContainer && node.layout_node.getDisplay() === Display.None) return undefined;
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
            const ordered = children.map((child, index) => ({ child, index }))
                .sort((a, b) => b.child.z_index - a.child.z_index || b.index - a.index);
            for (const { child } of ordered) {
                const hit = this.hit_test_node(child, x, y, child_clip);
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
        let ancestor = node.parent;
        while (ancestor !== undefined) {
            if (ancestor instanceof Container && ancestor.layout_node.getOverflow() === Overflow.Scroll) {
                ancestor.scroll_child_into_view(node);
            }
            ancestor = ancestor.parent;
        }
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
        if (node instanceof LayoutContainer && node.layout_node.getDisplay() === Display.None) return focusables;
        const children = node.get_children();
        if (children === undefined) return focusables;
        for (const child of children) {
            if (child.focusable && !child.disabled && child.tab_index >= 0) focusables.push(child);
            this.get_all_focusables(child, focusables);
        }
        return focusables;
    }

    protected get_ordered_focusables(): Node[] {
        const active_scope = this.focus_scopes.at(-1);
        const root = active_scope?.trap ? active_scope.root : this;
        const all = this.get_all_focusables(root, []);
        if (root !== this && root.focusable && !root.disabled && root.tab_index >= 0) all.unshift(root);
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

    public contains_node(root: Node, node: Node | undefined) {
        let current = node;
        while (current !== undefined) {
            if (current === root) return true;
            current = current.parent;
        }
        return false;
    }

    public export_semantic_tree(root: Node = this): SemanticNode {
        const layout = root as Node & Partial<LayoutLeaf>;
        const rect = typeof layout.get_rect === 'function' ? layout.get_rect() : undefined;
        return {
            role: root.role,
            label: root.aria_label,
            description: root.aria_description,
            disabled: root.disabled,
            focused: root === this.focused_node,
            rect: rect === undefined ? undefined : { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            children: (root.get_children() ?? []).map((child) => this.export_semantic_tree(child)),
        };
    }
    public exportSemanticTree(root: Node = this) { return this.export_semantic_tree(root); }

    public push_focus_scope(root: Node, trap = true) {
        const existing = this.focus_scopes.findIndex((scope) => scope.root === root);
        if (existing >= 0) this.focus_scopes.splice(existing, 1);
        this.focus_scopes.push({ root, trap, restore: this.focused_node });
        if (trap && !this.contains_node(root, this.focused_node)) {
            const next = this.get_next_focusable(undefined);
            if (next !== undefined) this.focus_node(next);
        }
    }

    public pop_focus_scope(root: Node) {
        const index = this.focus_scopes.findIndex((scope) => scope.root === root);
        if (index < 0) return;
        const [scope] = this.focus_scopes.splice(index, 1);
        if (scope.restore !== undefined && scope.restore.get_scene() === this &&
            scope.restore.focusable && !scope.restore.disabled) this.focus_node(scope.restore);
        else if (this.contains_node(root, this.focused_node)) this.focused_node = undefined;
        this.notify_change();
    }

    public dispose(recusive: boolean) {
        this.focused_node = undefined;
        this.hovered_path = [];
        this.pressed_target = undefined;
        this.pointer_capture = undefined;
        this.text_selection = undefined;
        this.selecting_text = false;
        this.drag_candidate = undefined;
        this.drag_source = undefined;
        this.drag_target = undefined;
        this.drag_data = undefined;
        this.focus_scopes.length = 0;
        this.input.on_input.disconnect(this.on_trigger_input_event);
        super.dispose(recusive);
    }
}
