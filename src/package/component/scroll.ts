import { Overflow } from 'yoga-layout';
import { InputEvent, KeyInputEvent, MouseButton, MouseInputEvent, ValueInputEvent, WheelInputEvent } from '../input/event.js';
import { Container } from '../node/container.js';
import type { Node } from '../node/node.js';
import { Renderer } from '../render/renderer.js';
import { Color } from '../util/color.js';
import { Signal } from '../util/signal.js';

export type ScrollbarOrientation = 'vertical' | 'horizontal';
export type StickyScrollEdge = 'top' | 'bottom' | 'left' | 'right';

/** Scroll container with independent axes, sticky edges, nested chaining, and focus reveal. */
export class ScrollBox extends Container {
    public scroll_x = false;
    public scroll_y = true;
    public sticky_scroll = false;
    public sticky_start: StickyScrollEdge = 'bottom';
    public readonly on_scroll = new Signal<(position: { x: number; y: number }) => void>();
    protected sticky_active = true;
    protected syncing_sticky = false;

    constructor() {
        super();
        this.focusable = true;
        this.overflow = Overflow.Scroll;
    }

    public scroll_to(x: number, y: number): boolean {
        const position = this.get_scroll_position();
        const next_x = this.scroll_x ? x : position.x;
        const next_y = this.scroll_y ? y : position.y;
        const changed = super.scroll_to(next_x, next_y);
        if (!changed) return false;
        const next = this.get_scroll_position();
        if (this.sticky_scroll && !this.syncing_sticky) {
            const limit = this.get_scroll_limit();
            this.sticky_active = this.sticky_start === 'top' ? next.y === 0 :
                this.sticky_start === 'bottom' ? next.y === limit.y :
                    this.sticky_start === 'left' ? next.x === 0 : next.x === limit.x;
        }
        this.on_scroll.trigger({ x: next.x, y: next.y });
        this.dispatchEvent(new ValueInputEvent('scroll', { value: { x: next.x, y: next.y } }));
        return true;
    }

    public scroll_child_into_view(node: Node): boolean {
        return super.scroll_child_into_view(node);
    }

    protected sync_sticky_position() {
        if (!this.sticky_scroll || !this.sticky_active) return;
        const limit = this.get_scroll_limit();
        const position = this.get_scroll_position();
        this.syncing_sticky = true;
        if (this.sticky_start === 'top') this.scroll_to(position.x, 0);
        else if (this.sticky_start === 'bottom') this.scroll_to(position.x, limit.y);
        else if (this.sticky_start === 'left') this.scroll_to(0, position.y);
        else this.scroll_to(limit.x, position.y);
        this.syncing_sticky = false;
    }

    public perform_default_action(event: InputEvent): void {
        if (event instanceof WheelInputEvent) {
            let x = event.deltaX;
            let y = event.deltaY;
            if (event.shift && x === 0) [x, y] = [y, 0];
            if (this.scroll_by(x, y)) event.preventDefault();
        }
    }

    public draw(render: Renderer, force: boolean = false): void {
        this.sync_sticky_position();
        super.draw(render, force);
    }

    public dispose(recusive: boolean): void {
        this.on_scroll.clear();
        super.dispose(recusive);
    }
}

/** Standalone keyboard- and pointer-operable scrollbar. */
export class ScrollBar extends Container {
    protected _orientation: ScrollbarOrientation = 'vertical';
    protected _scroll_size = 0;
    protected _viewport_size = 0;
    protected _scroll_position = 0;
    protected _target: ScrollBox | undefined;
    protected dragging = false;
    protected drag_offset = 0;

    public show_arrows = false;
    public scroll_step = 1;
    public track_color = Color.of(45, 52, 68);
    public thumb_color = Color.of(98, 110, 136);
    public active_thumb_color = Color.of(92, 200, 255);
    public arrow_color = Color.of(180, 190, 210);

    constructor() {
        super();
        this.focusable = true;
        this.width = 1;
        this.height = 10;
    }

    public get orientation() { return this._orientation; }
    public set orientation(value: ScrollbarOrientation) {
        this._orientation = value;
        this.get_scene()?.notify_change();
    }
    public get scroll_size() { return this._scroll_size; }
    public set scroll_size(value: number) { this._scroll_size = Math.max(0, Math.floor(value)); this.clamp_position(); }
    public get viewport_size() { return this._viewport_size; }
    public set viewport_size(value: number) { this._viewport_size = Math.max(0, Math.floor(value)); this.clamp_position(); }
    public get scroll_position() { return this._scroll_position; }
    public set scroll_position(value: number) { this.set_position(value, false); }
    public get target() { return this._target; }
    public set target(value: ScrollBox | undefined) {
        if (this._target === value) return;
        if (this._target !== undefined) this._target.on_scroll.disconnect(this.on_target_scroll);
        this._target = value;
        if (value !== undefined) value.on_scroll.connect(this.on_target_scroll);
        this.sync_from_target();
    }

    protected readonly on_target_scroll = () => {
        this.sync_from_target();
        this.get_scene()?.notify_change();
    };

    protected sync_from_target() {
        if (this.target === undefined) return;
        const viewport = this.target.get_content_rect();
        const position = this.target.get_scroll_position();
        if (this.orientation === 'vertical') {
            this._scroll_size = this.target.scroll_height;
            this._viewport_size = Number.isFinite(viewport.height) ? viewport.height : 0;
            this._scroll_position = position.y;
        }
        else {
            this._scroll_size = this.target.scroll_width;
            this._viewport_size = Number.isFinite(viewport.width) ? viewport.width : 0;
            this._scroll_position = position.x;
        }
        this.clamp_position();
    }

    protected get limit() { return Math.max(0, this.scroll_size - this.viewport_size); }
    protected clamp_position() { this._scroll_position = Math.max(0, Math.min(this._scroll_position, this.limit)); }

    protected set_position(value: number, emit: boolean = true) {
        const next = Math.max(0, Math.min(Math.floor(value), this.limit));
        if (next === this._scroll_position) return false;
        this._scroll_position = next;
        if (this.target !== undefined) {
            const position = this.target.get_scroll_position();
            if (this.orientation === 'vertical') this.target.scroll_to(position.x, next);
            else this.target.scroll_to(next, position.y);
        }
        if (emit) this.dispatchEvent(new ValueInputEvent('change', { value: next }));
        this.get_scene()?.notify_change();
        return true;
    }

    public scroll_by(value: number) { return this.set_position(this.scroll_position + value); }

    protected geometry() {
        const rect = this.get_content_rect();
        const length = this.orientation === 'vertical' ? rect.height : rect.width;
        const arrow = this.show_arrows && length >= 3 ? 1 : 0;
        const track_start = arrow;
        const track_length = Math.max(0, length - arrow * 2);
        const thumb_length = this.scroll_size <= 0 ? track_length :
            Math.max(1, Math.min(track_length, Math.round(track_length * this.viewport_size / this.scroll_size)));
        const travel = Math.max(0, track_length - thumb_length);
        const thumb_start = track_start + (this.limit <= 0 ? 0 : Math.round(travel * this.scroll_position / this.limit));
        return { rect, length, arrow, track_start, track_length, thumb_length, travel, thumb_start };
    }

    protected axis_position(event: MouseInputEvent) {
        const rect = this.get_content_rect();
        return this.orientation === 'vertical' ? event.clientY - rect.y : event.clientX - rect.x;
    }

    public perform_default_action(event: InputEvent): void {
        if (event instanceof KeyInputEvent && event.type === 'keydown') {
            let handled = false;
            if ((this.orientation === 'vertical' && event.key === 'ArrowUp') ||
                (this.orientation === 'horizontal' && event.key === 'ArrowLeft')) handled = this.scroll_by(-this.scroll_step);
            else if ((this.orientation === 'vertical' && event.key === 'ArrowDown') ||
                (this.orientation === 'horizontal' && event.key === 'ArrowRight')) handled = this.scroll_by(this.scroll_step);
            else if (event.key === 'PageUp') handled = this.scroll_by(-Math.max(1, this.viewport_size - 1));
            else if (event.key === 'PageDown') handled = this.scroll_by(Math.max(1, this.viewport_size - 1));
            else if (event.key === 'Home') handled = this.set_position(0);
            else if (event.key === 'End') handled = this.set_position(this.limit);
            if (handled) event.preventDefault();
            return;
        }
        if (!(event instanceof MouseInputEvent) || event.button !== MouseButton.Primary) return;
        const geometry = this.geometry();
        const axis = this.axis_position(event);
        if (event.type === 'mousedown') {
            if (geometry.arrow > 0 && axis === 0) this.scroll_by(-this.scroll_step);
            else if (geometry.arrow > 0 && axis === geometry.length - 1) this.scroll_by(this.scroll_step);
            else if (axis >= geometry.thumb_start && axis < geometry.thumb_start + geometry.thumb_length) {
                this.dragging = true;
                this.drag_offset = axis - geometry.thumb_start;
                this.setPointerCapture();
            }
            else if (axis < geometry.thumb_start) this.scroll_by(-Math.max(1, this.viewport_size));
            else this.scroll_by(Math.max(1, this.viewport_size));
            event.preventDefault();
        }
        else if (event.type === 'mousemove' && this.dragging && (event.buttons & 1) !== 0) {
            const track_position = axis - geometry.track_start - this.drag_offset;
            const position = geometry.travel <= 0 ? 0 : Math.round(this.limit * track_position / geometry.travel);
            this.set_position(position);
            event.preventDefault();
        }
        else if (event.type === 'mouseup' && this.dragging) {
            this.dragging = false;
            this.releasePointerCapture();
            event.preventDefault();
        }
    }

    public draw(render: Renderer, force: boolean = false): void {
        this.sync_from_target();
        super.draw(render, force);
        const geometry = this.geometry();
        const active = this.dragging || this.focused;
        for (let index = 0; index < geometry.length; index++) {
            const is_thumb = index >= geometry.thumb_start && index < geometry.thumb_start + geometry.thumb_length;
            const is_arrow = geometry.arrow > 0 && (index === 0 || index === geometry.length - 1);
            const char = is_arrow
                ? this.orientation === 'vertical' ? (index === 0 ? '▲' : '▼') : (index === 0 ? '◀' : '▶')
                : is_thumb ? '█' : '░';
            const color = is_arrow ? this.arrow_color : is_thumb ? (active ? this.active_thumb_color : this.thumb_color) : this.track_color;
            const x = geometry.rect.x + (this.orientation === 'horizontal' ? index : 0);
            const y = geometry.rect.y + (this.orientation === 'vertical' ? index : 0);
            render.draw_char(x, y, 1, 1, char, 1, { color });
        }
    }

    public dispose(recusive: boolean): void {
        if (this.target !== undefined) this.target.on_scroll.disconnect(this.on_target_scroll);
        super.dispose(recusive);
    }
}
