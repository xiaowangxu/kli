import { FlexDirection } from 'yoga-layout';
import { InputEvent, KeyInputEvent, MouseButton, MouseInputEvent, ValueInputEvent } from '../input/event.js';
import { Container, TextContainer } from '../node/container.js';
import type { Node } from '../node/node.js';
import { Renderer, calculate_string_width } from '../render/renderer.js';
import { BorderStyleType } from '../style/border_style.js';
import { Color } from '../util/color.js';
import { Button, Checkbox } from './controls.js';
import { Layer } from './overlay.js';
import { Select, SelectOption } from './select.js';

const colors = {
    text: Color.of(238, 243, 255), muted: Color.of(132, 143, 166),
    accent: Color.of(92, 200, 255), success: Color.of(102, 230, 184),
    warning: Color.of(255, 190, 72), error: Color.of(255, 100, 115),
    track: Color.of(45, 52, 68), fill: Color.of(92, 200, 255),
};

export class Switch extends Checkbox {
    constructor() {
        super();
        this.label = 'Switch';
    }

    public draw(render: Renderer, force = false) {
        const label = this._label;
        this._label = `${this.checked ? '● ON ' : '○ OFF'}  ${label}`;
        Button.prototype.draw.call(this, render, force);
        this._label = label;
    }
}

export class RadioGroup<T = string> extends Select<T> {
    public set choices(value: SelectOption<T>[] | undefined) { this.options = value; }
    public get choices() { return this.options; }
}

export class Slider extends Container {
    protected _value = 0;
    public min = 0;
    public max = 100;
    public step = 1;
    public show_value = true;
    public track_color = colors.track;
    public fill_color = colors.fill;
    public value_color = colors.text;

    constructor() {
        super();
        this.focusable = true;
        this.width = 24;
        this.height = 1;
    }

    public get value() { return this._value; }
    public set value(value: number) { this.set_value(value, false); }

    protected set_value(value: number, emit = true) {
        const step = Math.max(Number.EPSILON, Math.abs(this.step));
        const next = Math.max(this.min, Math.min(this.max, Math.round((value - this.min) / step) * step + this.min));
        if (Object.is(next, this._value)) return false;
        this._value = next;
        if (emit) this.dispatchEvent(new ValueInputEvent('change', { value: next }));
        this.get_scene()?.notify_change();
        return true;
    }

    protected value_from_mouse(event: MouseInputEvent) {
        const rect = this.get_content_rect();
        const label_width = this.show_value ? String(this.value).length + 1 : 0;
        const width = Math.max(1, rect.width - label_width);
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.x) / Math.max(1, width - 1)));
        return this.min + ratio * (this.max - this.min);
    }

    public perform_default_action(event: InputEvent): void {
        if (this.disabled) return;
        if (event instanceof KeyInputEvent && event.type === 'keydown') {
            let handled = false;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') handled = this.set_value(this.value - this.step);
            else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') handled = this.set_value(this.value + this.step);
            else if (event.key === 'PageDown') handled = this.set_value(this.value - this.step * 10);
            else if (event.key === 'PageUp') handled = this.set_value(this.value + this.step * 10);
            else if (event.key === 'Home') handled = this.set_value(this.min);
            else if (event.key === 'End') handled = this.set_value(this.max);
            if (handled) event.preventDefault();
        }
        else if (event instanceof MouseInputEvent && event.button === MouseButton.Primary &&
            (event.type === 'mousedown' || (event.type === 'mousemove' && (event.buttons & 1) !== 0))) {
            this.set_value(this.value_from_mouse(event));
            if (event.type === 'mousedown') this.setPointerCapture();
            event.preventDefault();
        }
        else if (event instanceof MouseInputEvent && event.type === 'mouseup') this.releasePointerCapture();
    }

    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        const label = this.show_value ? ` ${this.value}` : '';
        const width = Math.max(1, rect.width - calculate_string_width(label));
        const ratio = this.max === this.min ? 0 : (this.value - this.min) / (this.max - this.min);
        const filled = Math.max(0, Math.min(width, Math.round(width * ratio)));
        for (let index = 0; index < width; index++) {
            render.draw_char(rect.x + index, rect.y, 1, 1, index < filled ? '━' : '─', 1, {
                color: index < filled ? this.fill_color : this.track_color,
                bold: this.focused,
            });
        }
        if (label) render.draw_string(rect.x + width, rect.y, label, { color: this.value_color });
    }
}

export class Progress extends Container {
    public min = 0;
    public max = 100;
    public value = 0;
    public show_label = true;
    public track_color = colors.track;
    public fill_color = colors.success;

    constructor() {
        super();
        this.width = 24;
        this.height = 1;
    }

    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        const ratio = this.max === this.min ? 0 : Math.max(0, Math.min(1, (this.value - this.min) / (this.max - this.min)));
        const label = this.show_label ? ` ${Math.round(ratio * 100)}%` : '';
        const width = Math.max(0, rect.width - calculate_string_width(label));
        const filled = Math.round(width * ratio);
        for (let index = 0; index < width; index++) {
            render.draw_char(rect.x + index, rect.y, 1, 1, '█', 1, { color: index < filled ? this.fill_color : this.track_color });
        }
        if (label) render.draw_string(rect.x + width, rect.y, label, { color: colors.text });
    }
}

export class Spinner extends Container {
    public frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    public frame = 0;
    public label = '';
    public color = colors.accent;

    constructor() { super(); this.width = 20; this.height = 1; }
    public tick() { this.frame = (this.frame + 1) % Math.max(1, this.frames.length); this.get_scene()?.notify_change(); }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        render.draw_string(rect.x, rect.y, `${this.frames[this.frame % Math.max(1, this.frames.length)] ?? ''} ${this.label}`, { color: this.color });
    }
}

export class Label extends Container {
    public label = '';
    public for_node: Node | undefined;
    public color = colors.text;
    constructor() { super(); this.height = 1; }
    public perform_default_action(event: InputEvent) {
        if (event instanceof MouseInputEvent && event.type === 'click') this.for_node?.focus();
    }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        render.draw_string(rect.x, rect.y, this.label, { color: this.color });
    }
}

export class FormField extends Container {
    public label = '';
    public description = '';
    public error = '';
    constructor() {
        super();
        this.flex_direction = FlexDirection.Column;
        this.padding_top = 1;
        this.padding_bottom = 1;
    }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        if (this.label) render.draw_string(rect.x, rect.y - 1, this.label, { color: this.error ? colors.error : colors.text, bold: true });
        const help = this.error || this.description;
        if (help) render.draw_string(rect.x, rect.y + rect.height, help, { color: this.error ? colors.error : colors.muted });
    }
}

export interface TabItem { id: string; label: string; disabled?: boolean; badge?: string | number; }

export class Tabs extends Container {
    protected _tabs: TabItem[] = [];
    protected _selected_index = -1;
    protected view_start = 0;
    public color = colors.muted;
    public selected_color = colors.accent;

    constructor() { super(); this.focusable = true; this.height = 1; this.width = 50; }
    public get tabs(): TabItem[] { return this._tabs; }
    public set tabs(value: TabItem[] | undefined) {
        this._tabs = Array.isArray(value) ? [...value] : [];
        if (this._selected_index < 0 && this._tabs.length) this._selected_index = this.find_enabled(0, 1);
        if (this._selected_index >= this._tabs.length) this._selected_index = this.find_enabled(this._tabs.length - 1, -1);
        this.get_scene()?.notify_change();
    }
    public get selected_index() { return this._selected_index; }
    public set selected_index(value: number) { this.select(value, false); }
    public get value() { return this.tabs[this.selected_index]?.id; }
    protected find_enabled(start: number, direction: 1 | -1) {
        for (let index = start; index >= 0 && index < this.tabs.length; index += direction) if (!this.tabs[index].disabled) return index;
        return -1;
    }
    protected select(index: number, emit = true) {
        if (index < 0 || index >= this.tabs.length || this.tabs[index].disabled || index === this._selected_index) return false;
        this._selected_index = index;
        if (index < this.view_start) this.view_start = index;
        if (emit) this.dispatchEvent(new ValueInputEvent('change', { value: this.value }));
        this.get_scene()?.notify_change();
        return true;
    }
    protected tab_at(x: number) {
        const rect = this.get_content_rect();
        let cursor = rect.x;
        for (let index = this.view_start; index < this.tabs.length; index++) {
            const tab = this.tabs[index];
            const width = calculate_string_width(` ${tab.label}${tab.badge === undefined ? '' : ` ${tab.badge}`} `);
            if (x >= cursor && x < cursor + width) return index;
            cursor += width + 1;
            if (cursor >= rect.x + rect.width) break;
        }
        return -1;
    }
    public perform_default_action(event: InputEvent) {
        if (event instanceof MouseInputEvent && event.type === 'mousedown' && event.button === MouseButton.Primary) {
            const index = this.tab_at(event.clientX);
            if (this.select(index)) event.preventDefault();
            return;
        }
        if (!(event instanceof KeyInputEvent) || event.type !== 'keydown') return;
        const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
        let next = -1;
        if (direction) next = this.find_enabled(this.selected_index + direction, direction as 1 | -1);
        else if (event.key === 'Home') next = this.find_enabled(0, 1);
        else if (event.key === 'End') next = this.find_enabled(this.tabs.length - 1, -1);
        else if (event.ctrl && event.key === 'Tab') next = this.find_enabled(this.selected_index + (event.shift ? -1 : 1), event.shift ? -1 : 1);
        if (next >= 0 && this.select(next)) event.preventDefault();
    }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        let x = rect.x;
        for (let index = this.view_start; index < this.tabs.length; index++) {
            const tab = this.tabs[index];
            const label = ` ${tab.label}${tab.badge === undefined ? '' : ` ${tab.badge}`} `;
            const width = calculate_string_width(label);
            if (x + width > rect.x + rect.width) break;
            render.draw_string(x, rect.y, label, { color: index === this.selected_index ? this.selected_color : tab.disabled ? colors.track : this.color, bold: index === this.selected_index });
            x += width + 1;
        }
    }
}

export type ToastTone = 'info' | 'success' | 'warning' | 'error';
export interface ToastMessage { id: string; message: string; tone?: ToastTone; duration?: number; }

export class ToastHost extends Layer {
    public messages: ToastMessage[] = [];
    protected readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
    constructor() { super(); this.z_index = 2000; this.right = 1; this.top = 1; this.width = 38; this.pointer_events = false; }
    public push(message: ToastMessage) {
        this.messages = [...this.messages.filter((item) => item.id !== message.id), message];
        const previous = this.timers.get(message.id);
        if (previous) clearTimeout(previous);
        if ((message.duration ?? 3000) > 0) this.timers.set(message.id, setTimeout(() => this.dismiss(message.id), message.duration ?? 3000));
        this.height = Math.max(1, this.messages.length * 2);
        this.get_scene()?.notify_change();
    }
    public dismiss(id: string) {
        this.messages = this.messages.filter((message) => message.id !== id);
        const timer = this.timers.get(id);
        if (timer) clearTimeout(timer);
        this.timers.delete(id);
        this.get_scene()?.notify_change();
    }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        const tone = (value: ToastTone = 'info') => value === 'error' ? colors.error : value === 'warning' ? colors.warning : value === 'success' ? colors.success : colors.accent;
        this.messages.forEach((message, index) => render.draw_string(rect.x, rect.y + index * 2, `▌ ${message.message}`, { color: tone(message.tone), bold: true }));
    }
    public dispose(recusive: boolean) {
        for (const timer of this.timers.values()) clearTimeout(timer);
        this.timers.clear();
        super.dispose(recusive);
    }
}
