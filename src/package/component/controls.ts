import { KeyInputEvent, MouseButton, MouseInputEvent, ValueInputEvent } from '../input/event.js';
import { Container } from '../node/container.js';
import { CursorState } from '../node/node.js';
import { Renderer, calculate_string_width, split_string_with_width } from '../render/renderer.js';
import { BorderStyleType } from '../style/border_style.js';
import { Color } from '../util/color.js';
import { Position } from '../util/position.js';

const palette = {
    surface: Color.of(24, 28, 38),
    surfaceHover: Color.of(36, 43, 58),
    surfaceActive: Color.of(50, 59, 78),
    border: Color.of(98, 110, 136),
    focus: Color.of(92, 200, 255),
    text: Color.of(238, 243, 255),
    muted: Color.of(132, 143, 166),
    disabled: Color.of(82, 89, 104),
    selection: Color.of(32, 68, 96),
};

/** A focusable terminal button with mouse and keyboard activation. */
export class Button extends Container {
    protected _label = 'Button';
    public color: Color = palette.text;
    public disabled_color: Color = palette.muted;
    public normal_bg_color: Color = palette.surface;
    public hover_bg_color: Color = palette.surfaceHover;
    public active_bg_color: Color = palette.surfaceActive;
    public normal_border_color: Color = palette.border;
    public focus_border_color: Color = palette.focus;

    constructor() {
        super();
        this.focusable = true;
        this.width = 14;
        this.height = 3;
        this.border = 1;
        this.padding_horizontal = 1;
        this.border_type = BorderStyleType.Round;
    }

    public get label(): string { return this._label; }
    public set label(value: string | undefined) {
        const next = value ?? '';
        if (next === this._label) return;
        this._label = next;
        this.get_scene()?.notify_change();
    }

    public perform_default_action(event: KeyInputEvent | MouseInputEvent): void {
        if (this.disabled) return;
        if (event instanceof KeyInputEvent && event.type === 'keydown' &&
            (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            this.dispatchEvent(new MouseInputEvent('click', { detail: 1 }));
        }
    }

    public draw(render: Renderer, force: boolean = false): void {
        const previous_bg = this._bg_color;
        const previous_border = this._border_color;
        this._bg_color = this.disabled
            ? Color.of(this.normal_bg_color.r, this.normal_bg_color.g, this.normal_bg_color.b, 128)
            : this.active ? this.active_bg_color : this.hovered ? this.hover_bg_color : this.normal_bg_color;
        this._border_color = this.focused ? this.focus_border_color : this.normal_border_color;
        super.draw(render, force);
        this._bg_color = previous_bg;
        this._border_color = previous_border;

        const content = this.get_content_rect();
        const label_width = calculate_string_width(this.label);
        const x = content.x + Math.max(0, Math.floor((content.width - label_width) / 2));
        const y = content.y + Math.max(0, Math.floor((content.height - 1) / 2));
        render.push_mask(content);
        render.push_opacity(this.opacity);
        render.draw_string(x, y, this.label, {
            color: this.disabled ? this.disabled_color : this.color,
            bold: this.focused,
        });
        render.pop_opacity();
        render.pop_mask();
    }
}

/** Button-compatible boolean control which emits `change` after a successful click. */
export class Checkbox extends Button {
    protected _checked = false;

    constructor() {
        super();
        this.label = 'Checkbox';
        this.width = 18;
    }

    public get checked() { return this._checked; }
    public set checked(value: boolean) {
        const next = Boolean(value);
        if (next === this._checked) return;
        this._checked = next;
        this.get_scene()?.notify_change();
    }

    public perform_default_action(event: KeyInputEvent | MouseInputEvent): void {
        super.perform_default_action(event);
        if (!this.disabled && event instanceof MouseInputEvent && event.type === 'click') {
            this.checked = !this.checked;
            this.dispatchEvent(new ValueInputEvent('change', { value: this.checked }));
        }
    }

    public draw(render: Renderer, force: boolean = false): void {
        const label = this._label;
        this._label = `${this.checked ? '[✓]' : '[ ]'} ${label}`;
        super.draw(render, force);
        this._label = label;
    }
}

/** Single-line editor integrated with Kli focus, events, mouse selection, and terminal cursor output. */
export class InputBox extends Container {
    protected _value = '';
    protected _placeholder = '';
    protected committed_value = '';
    protected caret = 0;
    protected selection_anchor = 0;
    protected view_start = 0;
    protected dragging = false;

    public read_only = false;
    public password = false;
    public max_length: number | undefined;
    public color: Color = palette.text;
    public placeholder_color: Color = palette.muted;
    public selection_color: Color = palette.text;
    public selection_bg_color: Color = palette.selection;
    public normal_border_color: Color = palette.border;
    public focus_border_color: Color = palette.focus;

    constructor() {
        super();
        this.focusable = true;
        this.width = 28;
        this.height = 3;
        this.border = 1;
        this.padding_horizontal = 1;
        this.border_type = BorderStyleType.Round;
        this.bg_color = palette.surface;

        this.on_focused(() => {
            this.committed_value = this.value;
            this.get_scene()?.notify_change();
        });
        this.on_blured(() => {
            this.dragging = false;
            if (this.value !== this.committed_value) {
                this.committed_value = this.value;
                this.dispatchEvent(new ValueInputEvent('change', { value: this.value }));
            }
        });
    }

    public get value(): string { return this._value; }
    public set value(value: string | undefined) {
        const next = value ?? '';
        if (next === this._value) return;
        this._value = next;
        const length = this.graphemes().length;
        if (!this.focused) {
            this.caret = length;
            this.selection_anchor = length;
        }
        else {
            this.caret = Math.min(this.caret, length);
            this.selection_anchor = Math.min(this.selection_anchor, length);
        }
        this.get_scene()?.notify_change();
    }

    public get placeholder(): string { return this._placeholder; }
    public set placeholder(value: string | undefined) {
        const next = value ?? '';
        if (next === this._placeholder) return;
        this._placeholder = next;
        this.get_scene()?.notify_change();
    }

    public get selection_start() { return Math.min(this.caret, this.selection_anchor); }
    public get selection_end() { return Math.max(this.caret, this.selection_anchor); }

    public set_selection_range(start: number, end: number = start) {
        const length = this.graphemes().length;
        this.selection_anchor = Math.max(0, Math.min(length, Math.floor(start)));
        this.caret = Math.max(0, Math.min(length, Math.floor(end)));
        this.get_scene()?.notify_change();
    }
    public setSelectionRange(start: number, end: number = start) { this.set_selection_range(start, end); }

    protected graphemes(value: string = this.value) {
        return split_string_with_width(value);
    }

    protected update_caret_from_mouse(event: MouseInputEvent, extend: boolean) {
        const chars = this.graphemes();
        const content = this.get_content_rect();
        const local = Math.max(0, event.clientX - content.x);
        let cells = 0;
        let index = this.view_start;
        for (; index < chars.length; index++) {
            const midpoint = cells + chars[index].width / 2;
            if (local < midpoint) break;
            cells += chars[index].width;
            if (local < cells) { index++; break; }
        }
        this.caret = index;
        if (!extend) this.selection_anchor = this.caret;
        this.get_scene()?.notify_change();
    }

    protected replace_selection(data: string, input_type: string) {
        if (this.read_only || this.disabled) return;
        const current = this.graphemes();
        const inserted = this.graphemes(data);
        const start = this.selection_start;
        const end = this.selection_end;
        const allowed = this.max_length === undefined
            ? inserted
            : inserted.slice(0, Math.max(0, this.max_length - (current.length - (end - start))));
        const next = [...current.slice(0, start), ...allowed, ...current.slice(end)].map((item) => item.char).join('');
        const before = new ValueInputEvent('beforeinput', { value: next, data, inputType: input_type });
        if (!this.dispatchEvent(before)) return;
        this._value = next;
        this.caret = start + allowed.length;
        this.selection_anchor = this.caret;
        this.get_scene()?.notify_change();
        this.dispatchEvent(new ValueInputEvent('input', { value: this.value, data, inputType: input_type }));
    }

    protected delete_backward() {
        if (this.selection_start !== this.selection_end) return this.replace_selection('', 'deleteContentBackward');
        if (this.caret <= 0) return;
        this.selection_anchor = this.caret - 1;
        this.replace_selection('', 'deleteContentBackward');
    }

    protected delete_forward() {
        if (this.selection_start !== this.selection_end) return this.replace_selection('', 'deleteContentForward');
        if (this.caret >= this.graphemes().length) return;
        this.selection_anchor = this.caret + 1;
        this.replace_selection('', 'deleteContentForward');
    }

    public perform_default_action(event: KeyInputEvent | MouseInputEvent): void {
        if (this.disabled) return;
        if (event instanceof MouseInputEvent) {
            if (event.type === 'mousedown' && event.button === MouseButton.Primary) {
                this.update_caret_from_mouse(event, event.shift);
                this.dragging = true;
                this.setPointerCapture();
            }
            else if (event.type === 'mousemove' && this.dragging && (event.buttons & 1) !== 0) {
                this.update_caret_from_mouse(event, true);
            }
            else if (event.type === 'mouseup') {
                this.dragging = false;
                this.releasePointerCapture();
            }
            return;
        }

        if (event.type !== 'keydown') return;
        const length = this.graphemes().length;
        switch (event.key) {
            case 'ArrowLeft':
                this.caret = event.ctrl ? 0 : Math.max(0, this.caret - 1);
                if (!event.shift) this.selection_anchor = this.caret;
                break;
            case 'ArrowRight':
                this.caret = event.ctrl ? length : Math.min(length, this.caret + 1);
                if (!event.shift) this.selection_anchor = this.caret;
                break;
            case 'Home':
                this.caret = 0;
                if (!event.shift) this.selection_anchor = this.caret;
                break;
            case 'End':
                this.caret = length;
                if (!event.shift) this.selection_anchor = this.caret;
                break;
            case 'Backspace': this.delete_backward(); break;
            case 'Delete': this.delete_forward(); break;
            case 'Enter':
                if (this.value !== this.committed_value) {
                    this.committed_value = this.value;
                    this.dispatchEvent(new ValueInputEvent('change', { value: this.value }));
                }
                break;
            default:
                if (event.ctrl && event.key.toLowerCase() === 'a') {
                    this.selection_anchor = 0;
                    this.caret = length;
                }
                else if (!event.ctrl && !event.alt && !event.meta && event.key.length > 0 &&
                    !event.key.startsWith('Arrow') && event.key !== 'Tab' && event.key !== 'Escape') {
                    this.replace_selection(event.key, 'insertText');
                }
                else return;
        }
        event.preventDefault();
        this.get_scene()?.notify_change();
    }

    protected ensure_caret_visible(width: number, chars: ReturnType<InputBox['graphemes']>) {
        this.view_start = Math.min(this.view_start, this.caret);
        const width_between = (start: number, end: number) =>
            chars.slice(start, end).reduce((sum, item) => sum + item.width, 0);
        while (this.view_start < this.caret && width_between(this.view_start, this.caret) >= width) {
            this.view_start++;
        }
        while (this.view_start > 0 && width_between(this.view_start - 1, this.caret) < width) {
            this.view_start--;
        }
    }

    public get_cursor_state(): CursorState | undefined {
        if (!this.focused || this.disabled) return undefined;
        const content = this.get_content_rect();
        const chars = this.graphemes();
        this.ensure_caret_visible(Math.max(1, content.width), chars);
        const x = content.x + chars.slice(this.view_start, this.caret).reduce((sum, item) => sum + item.width, 0);
        return { position: Position.of(Math.min(content.x + Math.max(0, content.width - 1), x), content.y), visible: true };
    }

    public draw(render: Renderer, force: boolean = false): void {
        const previous_border = this._border_color;
        this._border_color = this.focused ? this.focus_border_color : this.normal_border_color;
        super.draw(render, force);
        this._border_color = previous_border;

        const content = this.get_content_rect();
        if (content.width <= 0 || content.height <= 0) return;
        const chars = this.graphemes(this.password ? '•'.repeat(this.graphemes().length) : this.value);
        this.ensure_caret_visible(content.width, chars);
        render.push_mask(content);
        render.push_opacity(this.opacity);
        if (chars.length === 0 && this.placeholder.length > 0) {
            render.draw_string(content.x, content.y, this.placeholder, { color: this.placeholder_color });
        }
        else {
            let x = content.x;
            for (let index = this.view_start; index < chars.length && x < content.x + content.width; index++) {
                const char = chars[index];
                if (x + char.width > content.x + content.width) break;
                const selected = index >= this.selection_start && index < this.selection_end;
                render.draw_char(x, content.y, 1, 1, char.char, char.width, {
                    color: selected ? this.selection_color : this.color,
                    bg_color: selected ? this.selection_bg_color : undefined,
                });
                x += char.width;
            }
        }
        render.pop_opacity();
        render.pop_mask();
    }
}
