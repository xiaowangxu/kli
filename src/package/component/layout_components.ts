import { Display, FlexDirection } from 'yoga-layout';
import { InputEvent, KeyInputEvent, MouseButton, MouseInputEvent, ValueInputEvent } from '../input/event.js';
import { Container, TextContainer } from '../node/container.js';
import type { Node } from '../node/node.js';
import { Renderer } from '../render/renderer.js';
import { Color } from '../util/color.js';

export type SplitOrientation = 'horizontal' | 'vertical';

/** Two-pane resizable layout. The first two children are treated as panes. */
export class SplitPane extends Container {
    protected _orientation: SplitOrientation = 'horizontal';
    protected _split = 24;
    protected resizing = false;
    public min_split = 8;
    public max_split = Number.POSITIVE_INFINITY;
    public resize_step = 1;
    public separator_color = Color.of(59, 73, 98);
    public active_separator_color = Color.of(92, 200, 255);

    constructor() {
        super();
        this.focusable = true;
        this.gap = 1;
        this.sync_orientation();
    }

    public get orientation() { return this._orientation; }
    public set orientation(value: SplitOrientation) { this._orientation = value; this.sync_orientation(); }
    public get split() { return this._split; }
    public set split(value: number) { this.set_split(value, false); }

    protected sync_orientation() {
        this.flex_direction = this.orientation === 'horizontal' ? FlexDirection.Row : FlexDirection.Column;
        this.get_scene()?.notify_change();
    }

    protected set_split(value: number, emit = true) {
        const next = Math.max(this.min_split, Math.min(this.max_split, Math.floor(value)));
        if (next === this._split) return false;
        this._split = next;
        this.sync_panes();
        if (emit) this.dispatchEvent(new ValueInputEvent('change', { value: next }));
        this.get_scene()?.notify_change();
        return true;
    }

    protected sync_panes() {
        const first = this.children[0] as any;
        const second = this.children[1] as any;
        if (first) {
            first.flex_grow = 0;
            first.flex_shrink = 0;
            if (this.orientation === 'horizontal') first.width = this.split;
            else first.height = this.split;
        }
        if (second) { second.flex_grow = 1; second.flex_shrink = 1; }
    }

    protected on_child_addeded(node: Container | TextContainer): void {
        super.on_child_addeded(node);
        this.sync_panes();
    }

    protected separator_position() {
        const first = this.children[0]?.get_rect();
        return first === undefined ? -1 : this.orientation === 'horizontal' ? first.x + first.width : first.y + first.height;
    }

    public perform_default_action(event: InputEvent): void {
        if (event instanceof KeyInputEvent && event.type === 'keydown') {
            const negative = this.orientation === 'horizontal' ? event.key === 'ArrowLeft' : event.key === 'ArrowUp';
            const positive = this.orientation === 'horizontal' ? event.key === 'ArrowRight' : event.key === 'ArrowDown';
            if ((negative || positive) && this.set_split(this.split + (positive ? this.resize_step : -this.resize_step))) event.preventDefault();
            return;
        }
        if (!(event instanceof MouseInputEvent)) return;
        const axis = this.orientation === 'horizontal' ? event.clientX : event.clientY;
        if (event.type === 'mousedown' && event.button === MouseButton.Primary && Math.abs(axis - this.separator_position()) <= 1) {
            this.resizing = true;
            this.setPointerCapture();
            event.preventDefault();
        }
        else if (event.type === 'mousemove' && this.resizing && (event.buttons & 1) !== 0) {
            const rect = this.get_content_rect();
            this.set_split(axis - (this.orientation === 'horizontal' ? rect.x : rect.y));
            event.preventDefault();
        }
        else if (event.type === 'mouseup' && this.resizing) {
            this.resizing = false;
            this.releasePointerCapture();
            event.preventDefault();
        }
    }

    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        const position = this.separator_position();
        const color = this.resizing || this.focused ? this.active_separator_color : this.separator_color;
        if (this.orientation === 'horizontal') {
            for (let y = rect.y; y < rect.y + rect.height; y++) render.draw_char(position, y, 1, 1, '│', 1, { color });
        }
        else for (let x = rect.x; x < rect.x + rect.width; x++) render.draw_char(x, position, 1, 1, '─', 1, { color });
    }
}

/** Container whose width or height can be dragged from its trailing edge. */
export class Resizable extends Container {
    public resize_axis: 'x' | 'y' | 'both' = 'x';
    public min_width_value = 4;
    public min_height_value = 2;
    public max_width_value = Number.POSITIVE_INFINITY;
    public max_height_value = Number.POSITIVE_INFINITY;
    protected resizing = false;

    constructor() { super(); this.focusable = true; }
    protected resize_to(x: number, y: number) {
        const rect = this.get_rect();
        if (this.resize_axis !== 'y') this.width = Math.max(this.min_width_value, Math.min(this.max_width_value, x - rect.x + 1));
        if (this.resize_axis !== 'x') this.height = Math.max(this.min_height_value, Math.min(this.max_height_value, y - rect.y + 1));
        this.dispatchEvent(new ValueInputEvent('change', { value: { width: this.get_rect().width, height: this.get_rect().height } }));
    }
    public perform_default_action(event: InputEvent) {
        if (event instanceof KeyInputEvent && event.alt && event.type === 'keydown') {
            const rect = this.get_rect();
            const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
            const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
            if (dx || dy) { this.resize_to(rect.x + rect.width - 1 + dx, rect.y + rect.height - 1 + dy); event.preventDefault(); }
            return;
        }
        if (!(event instanceof MouseInputEvent)) return;
        const rect = this.get_rect();
        const on_edge = (this.resize_axis !== 'y' && event.clientX >= rect.x + rect.width - 1) ||
            (this.resize_axis !== 'x' && event.clientY >= rect.y + rect.height - 1);
        if (event.type === 'mousedown' && event.button === MouseButton.Primary && on_edge) { this.resizing = true; this.setPointerCapture(); event.preventDefault(); }
        else if (event.type === 'mousemove' && this.resizing && (event.buttons & 1) !== 0) { this.resize_to(event.clientX, event.clientY); event.preventDefault(); }
        else if (event.type === 'mouseup' && this.resizing) { this.resizing = false; this.releasePointerCapture(); event.preventDefault(); }
    }
}

/** Header + content region that can collapse without unmounting its children. */
export class Collapsible extends Container {
    public readonly content = new Container();
    protected _open = true;
    public title = 'Section';
    public title_color = Color.of(238, 243, 255);

    constructor() {
        super();
        this.focusable = true;
        this.flex_direction = FlexDirection.Column;
        this.padding_top = 1;
        super.add_child(this.content);
    }

    public add_child(node: Node & any): void {
        if (node === this.content) super.add_child(node);
        else this.content.add_child(node);
    }
    public get open() { return this._open; }
    public set open(value: boolean) {
        const next = Boolean(value);
        if (next === this._open) return;
        this._open = next;
        this.content.display = next ? Display.Flex : Display.None;
        this.dispatchEvent(new ValueInputEvent('change', { value: next }));
        this.get_scene()?.notify_change();
    }
    public toggle() { this.open = !this.open; }
    public perform_default_action(event: InputEvent) {
        if (event instanceof KeyInputEvent && event.type === 'keydown' && (event.key === 'Enter' || event.key === ' ')) { this.toggle(); event.preventDefault(); }
        if (event instanceof MouseInputEvent && event.type === 'click') this.toggle();
    }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_rect();
        render.draw_string(rect.x, rect.y, `${this.open ? '▾' : '▸'} ${this.title}`, { color: this.title_color, bold: this.focused });
    }
}

export class Accordion extends Container {
    public exclusive = true;
    constructor() {
        super();
        this.flex_direction = FlexDirection.Column;
        this.addEventListener<ValueInputEvent<boolean>>('change', (event) => {
            if (!this.exclusive || event.value !== true || !(event.target instanceof Collapsible)) return;
            for (const child of this.children) if (child instanceof Collapsible && child !== event.target) child.open = false;
        });
    }
}
