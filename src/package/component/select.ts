import { InputEvent, KeyInputEvent, MouseButton, MouseInputEvent, ValueInputEvent, WheelInputEvent } from '../input/event.js';
import { Container } from '../node/container.js';
import { Renderer, calculate_string_width } from '../render/renderer.js';
import { BorderStyleType } from '../style/border_style.js';
import { Color } from '../util/color.js';

export interface SelectOption<T = string> {
    name: string;
    value: T;
    description?: string;
    disabled?: boolean;
}

const palette = {
    surface: Color.of(24, 28, 38),
    border: Color.of(98, 110, 136),
    focus: Color.of(92, 200, 255),
    text: Color.of(238, 243, 255),
    muted: Color.of(132, 143, 166),
    selected: Color.of(102, 230, 184),
    highlight: Color.of(38, 70, 96),
    disabled: Color.of(82, 89, 104),
};

/** A persistent list-style select with separate highlighted and committed states. */
export class Select<T = string> extends Container {
    protected _options: SelectOption<T>[] = [];
    protected _selected_index = -1;
    protected _highlighted_index = -1;
    protected view_start = 0;
    protected typeahead = '';
    protected typeahead_at = 0;

    public empty_text = 'No options';
    public typeahead_timeout = 700;
    public color = palette.text;
    public description_color = palette.muted;
    public disabled_color = palette.disabled;
    public selected_color = palette.selected;
    public highlight_bg_color = palette.highlight;
    public normal_border_color = palette.border;
    public focus_border_color = palette.focus;

    constructor() {
        super();
        this.focusable = true;
        this.width = 30;
        this.height = 8;
        this.border = 1;
        this.border_type = BorderStyleType.Round;
        this.bg_color = palette.surface;
        this.on_focused(() => {
            if (!this.is_enabled(this.highlighted_index)) {
                this.set_highlighted_index(this.is_enabled(this.selected_index)
                    ? this.selected_index : this.find_enabled(0, 1));
            }
        });
    }

    public get options(): SelectOption<T>[] { return this._options; }
    public set options(value: SelectOption<T>[] | undefined) {
        this._options = Array.isArray(value) ? [...value] : [];
        if (!this.is_enabled(this._selected_index)) this._selected_index = -1;
        if (!this.is_enabled(this._highlighted_index)) {
            this._highlighted_index = this.is_enabled(this._selected_index)
                ? this._selected_index : this.find_enabled(0, 1);
        }
        this.clamp_view();
        this.get_scene()?.notify_change();
    }

    public get selected_index() { return this._selected_index; }
    public set selected_index(value: number) { this.commit_index(value, false); }
    public get selectedIndex() { return this.selected_index; }
    public set selectedIndex(value: number) { this.selected_index = value; }

    public get highlighted_index() { return this._highlighted_index; }
    public set highlighted_index(value: number) { this.set_highlighted_index(value); }
    public get highlightedIndex() { return this.highlighted_index; }
    public set highlightedIndex(value: number) { this.highlighted_index = value; }

    public get value(): T | undefined { return this.options[this.selected_index]?.value; }
    public set value(value: T | undefined) {
        const index = this.options.findIndex((option) => Object.is(option.value, value));
        this.commit_index(index, false);
    }

    protected is_enabled(index: number) {
        return index >= 0 && index < this.options.length && !this.options[index].disabled;
    }

    protected find_enabled(start: number, direction: 1 | -1, wrap = false) {
        if (this.options.length === 0) return -1;
        let index = Math.max(0, Math.min(start, this.options.length - 1));
        for (let count = 0; count < this.options.length; count++) {
            if (this.is_enabled(index)) return index;
            index += direction;
            if (index < 0 || index >= this.options.length) {
                if (!wrap) break;
                index = direction > 0 ? 0 : this.options.length - 1;
            }
        }
        return -1;
    }

    protected visible_rows() {
        const height = this.get_content_rect().height;
        return Number.isFinite(height) ? Math.max(0, height) : 0;
    }

    protected clamp_view() {
        const rows = this.visible_rows();
        const limit = Math.max(0, this.options.length - rows);
        const current = Number.isFinite(this.view_start) ? this.view_start : 0;
        this.view_start = Math.max(0, Math.min(current, limit));
    }

    protected reveal(index: number) {
        if (index < 0) return;
        const rows = this.visible_rows();
        if (rows <= 0) return;
        if (index < this.view_start) this.view_start = index;
        else if (index >= this.view_start + rows) this.view_start = index - rows + 1;
        this.clamp_view();
    }

    protected set_highlighted_index(index: number, emit = true) {
        if (!this.is_enabled(index) || index === this._highlighted_index) return false;
        this._highlighted_index = index;
        this.reveal(index);
        if (emit) this.dispatchEvent(new ValueInputEvent('input', {
            value: this.options[index].value,
            inputType: 'highlight',
        }));
        this.get_scene()?.notify_change();
        return true;
    }

    protected commit_index(index: number, emit = true) {
        if (index !== -1 && !this.is_enabled(index)) return false;
        const changed = index !== this._selected_index;
        this._selected_index = index;
        if (index >= 0) {
            this._highlighted_index = index;
            this.reveal(index);
        }
        if (changed && emit) this.dispatchEvent(new ValueInputEvent('change', { value: this.value }));
        if (changed) this.get_scene()?.notify_change();
        return changed;
    }

    protected move_highlight(delta: number) {
        if (this.options.length === 0) return false;
        const direction: 1 | -1 = delta >= 0 ? 1 : -1;
        let index = this.highlighted_index;
        if (index < 0) index = direction > 0 ? -1 : this.options.length;
        const steps = Math.max(1, Math.abs(delta));
        let moved = false;
        for (let step = 0; step < steps; step++) {
            const next = this.find_enabled(index + direction, direction);
            if (next < 0) break;
            index = next;
            moved = true;
        }
        return moved ? this.set_highlighted_index(index) : false;
    }

    protected match_typeahead(character: string) {
        const now = Date.now();
        if (now - this.typeahead_at > this.typeahead_timeout) this.typeahead = '';
        this.typeahead_at = now;
        const lower = character.toLocaleLowerCase();
        this.typeahead = this.typeahead.length === 1 && this.typeahead === lower
            ? lower : this.typeahead + lower;
        const start = this.highlighted_index < 0 ? 0 : this.highlighted_index + 1;
        const matches = (option: SelectOption<T>) => !option.disabled &&
            option.name.toLocaleLowerCase().startsWith(this.typeahead);
        let index = this.options.findIndex((option, option_index) => option_index >= start && matches(option));
        if (index < 0) index = this.options.findIndex(matches);
        if (index < 0 && this.typeahead.length > 1) {
            this.typeahead = lower;
            index = this.options.findIndex((option, option_index) => option_index >= start && matches(option));
            if (index < 0) index = this.options.findIndex(matches);
        }
        return index >= 0 && this.set_highlighted_index(index);
    }

    protected option_at(event: MouseInputEvent) {
        const content = this.get_content_rect();
        if (event.clientX < content.x || event.clientX >= content.x + content.width ||
            event.clientY < content.y || event.clientY >= content.y + content.height) return -1;
        return this.view_start + event.clientY - content.y;
    }

    public perform_default_action(event: InputEvent): void {
        if (this.disabled) return;
        if (event instanceof WheelInputEvent) {
            const rows = this.visible_rows();
            const limit = Math.max(0, this.options.length - rows);
            const next = Math.max(0, Math.min(limit, this.view_start + event.deltaY));
            if (next !== this.view_start) {
                this.view_start = next;
                this.get_scene()?.notify_change();
                event.preventDefault();
            }
            return;
        }
        if (event instanceof MouseInputEvent) {
            const index = this.option_at(event);
            if ((event.type === 'mousemove' || event.type === 'mousedown') && this.is_enabled(index)) {
                this.set_highlighted_index(index);
            }
            if (event.type === 'mousedown' && event.button === MouseButton.Primary && this.is_enabled(index)) {
                this.focus();
                this.commit_index(index);
                event.preventDefault();
            }
            return;
        }
        if (!(event instanceof KeyInputEvent) || event.type !== 'keydown') return;
        let handled = false;
        const page = Math.max(1, this.visible_rows() - 1);
        if (event.key === 'ArrowUp') handled = this.move_highlight(event.shift ? -5 : -1);
        else if (event.key === 'ArrowDown') handled = this.move_highlight(event.shift ? 5 : 1);
        else if (event.key === 'PageUp') handled = this.move_highlight(-page);
        else if (event.key === 'PageDown') handled = this.move_highlight(page);
        else if (event.key === 'Home') handled = this.set_highlighted_index(this.find_enabled(0, 1));
        else if (event.key === 'End') handled = this.set_highlighted_index(this.find_enabled(this.options.length - 1, -1));
        else if (event.key === 'Enter' || event.key === ' ') handled = this.commit_index(this.highlighted_index);
        else if (!event.ctrl && !event.alt && !event.meta && calculate_string_width(event.key) > 0) {
            handled = this.match_typeahead(event.key);
        }
        if (handled) event.preventDefault();
    }

    public draw(render: Renderer, force: boolean = false): void {
        const previous_border = this._border_color;
        this._border_color = this.focused ? this.focus_border_color : this.normal_border_color;
        super.draw(render, force);
        this._border_color = previous_border;
        const content = this.get_content_rect();
        if (content.width <= 0 || content.height <= 0) return;
        this.clamp_view();
        render.push_mask(content);
        render.push_opacity(this.opacity);
        if (this.options.length === 0) {
            render.draw_string(content.x + 1, content.y, this.empty_text, { color: this.description_color });
        }
        for (let row = 0; row < content.height; row++) {
            const index = this.view_start + row;
            const option = this.options[index];
            if (option === undefined) break;
            const highlighted = index === this.highlighted_index;
            const selected = index === this.selected_index;
            if (highlighted) {
                for (let x = 0; x < content.width; x++) {
                    render.draw_char(content.x + x, content.y + row, 1, 1, ' ', 1, { bg_color: this.highlight_bg_color });
                }
            }
            const marker = selected ? '◆' : highlighted ? '›' : ' ';
            const color = option.disabled ? this.disabled_color : selected ? this.selected_color : this.color;
            render.draw_string(content.x, content.y + row, `${marker} ${option.name}`, {
                color,
                bg_color: highlighted ? this.highlight_bg_color : undefined,
                bold: highlighted,
            });
            if (option.description && content.width >= 16) {
                const available = Math.max(0, content.width - calculate_string_width(option.description) - 1);
                const x = content.x + Math.max(available, Math.min(content.width - 1, calculate_string_width(`${marker} ${option.name}`) + 1));
                render.draw_string(x, content.y + row, option.description, {
                    color: option.disabled ? this.disabled_color : this.description_color,
                    bg_color: highlighted ? this.highlight_bg_color : undefined,
                });
            }
        }
        render.pop_opacity();
        render.pop_mask();
    }
}
