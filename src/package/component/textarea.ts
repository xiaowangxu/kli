import { ClipboardInputEvent, InputEvent, KeyInputEvent, MouseButton, MouseInputEvent, PasteInputEvent, ValueInputEvent } from '../input/event.js';
import { EditBuffer, type EditBufferReplacement } from '../input/edit_buffer.js';
import { Container } from '../node/container.js';
import type { CursorState } from '../node/node.js';
import { Renderer } from '../render/renderer.js';
import { BorderStyleType } from '../style/border_style.js';
import { Color } from '../util/color.js';
import { Position } from '../util/position.js';
import type { TextWrapMode, VisualTextLayout } from '../text/text_layout.js';

const colors = {
    surface: Color.of(24, 28, 38),
    border: Color.of(98, 110, 136),
    focus: Color.of(92, 200, 255),
    text: Color.of(238, 243, 255),
    muted: Color.of(132, 143, 166),
    selection: Color.of(32, 68, 96),
};

/** Multi-line grapheme editor with wrapping, selection, history, clipboard, and viewport scrolling. */
export class TextArea extends Container {
    protected readonly edit_buffer = new EditBuffer();
    protected _placeholder = '';
    protected committed_value = '';
    protected scroll_x = 0;
    protected scroll_y = 0;
    protected dragging = false;
    protected preferred_column: number | undefined;

    public read_only = false;
    public max_length: number | undefined;
    public wrap_mode: TextWrapMode = 'word';
    public accepts_tab = false;
    public color = colors.text;
    public placeholder_color = colors.muted;
    public selection_color = colors.text;
    public selection_bg_color = colors.selection;
    public normal_border_color = colors.border;
    public focus_border_color = colors.focus;

    constructor() {
        super();
        this.focusable = true;
        this.width = 40;
        this.height = 8;
        this.border = 1;
        this.padding = 1;
        this.border_type = BorderStyleType.Round;
        this.bg_color = colors.surface;
        this.on_focused(() => { this.committed_value = this.value; });
        this.on_blured(() => {
            this.dragging = false;
            if (this.value !== this.committed_value) {
                this.committed_value = this.value;
                this.dispatchEvent(new ValueInputEvent('change', { value: this.value }));
            }
        });
    }

    public get value(): string { return this.edit_buffer.value; }
    public set value(value: string | undefined) {
        const next = value ?? '';
        if (next === this.value) return;
        this.edit_buffer.setValue(next, this.focused);
        this.get_scene()?.notify_change();
    }
    public get placeholder(): string { return this._placeholder; }
    public set placeholder(value: string | undefined) {
        this._placeholder = value ?? '';
        this.get_scene()?.notify_change();
    }
    public get selection_start() { return this.edit_buffer.selectionStart; }
    public get selection_end() { return this.edit_buffer.selectionEnd; }
    public get selected_text() { return this.edit_buffer.selectedText; }
    public get scroll_left() { return this.scroll_x; }
    public get scroll_top() { return this.scroll_y; }
    public setSelectionRange(start: number, end: number = start) {
        this.edit_buffer.setSelectionRange(start, end);
        this.get_scene()?.notify_change();
    }
    public set_selection_range(start: number, end: number = start) { this.setSelectionRange(start, end); }

    protected visual_layout(viewport_width: number): VisualTextLayout {
        return this.edit_buffer.visualLayout(viewport_width, this.wrap_mode);
    }

    protected replace_selection(data: string, input_type: string) {
        if (this.read_only || this.disabled) return false;
        const replacement = this.edit_buffer.previewReplacement(data.replace(/\r\n?/g, '\n'), this.max_length);
        const before = new ValueInputEvent('beforeinput', {
            value: replacement.value,
            data: replacement.data,
            inputType: input_type,
        });
        if (!this.dispatchEvent(before)) return false;
        this.apply_replacement(replacement, input_type);
        return true;
    }

    protected apply_replacement(replacement: EditBufferReplacement, input_type: string) {
        this.edit_buffer.applyReplacement(replacement);
        this.preferred_column = undefined;
        this.get_scene()?.notify_change();
        this.dispatchEvent(new ValueInputEvent('input', {
            value: this.value,
            data: replacement.data,
            inputType: input_type,
        }));
    }

    protected move_to(index: number, extend: boolean) {
        this.edit_buffer.caret = index;
        if (!extend) this.edit_buffer.anchor = this.edit_buffer.caret;
        this.get_scene()?.notify_change();
    }

    protected move_vertical(direction: -1 | 1, extend: boolean) {
        const content = this.get_content_rect();
        const layout = this.visual_layout(content.width);
        const current = layout.positions[this.edit_buffer.caret] ?? { x: 0, y: 0 };
        const target_y = Math.max(0, Math.min(layout.height - 1, current.y + direction));
        const column = this.preferred_column ?? current.x;
        this.preferred_column = column;
        const line = layout.lines[target_y];
        if (line === undefined) return;
        let best = line.start;
        let distance = Number.POSITIVE_INFINITY;
        const soft_continuation = !line.hardBreak && layout.lines[target_y + 1]?.start === line.end;
        const position_end = soft_continuation ? Math.max(line.start, line.end - 1) : line.end;
        for (let index = line.start; index <= position_end; index++) {
            const position = layout.positions[index];
            if (position.y !== target_y) continue;
            const next_distance = Math.abs(position.x - column);
            if (next_distance < distance || (next_distance === distance && position.x <= column)) {
                best = index;
                distance = next_distance;
            }
        }
        this.move_to(best, extend);
    }

    protected delete_range(start: number, end: number, input_type: string) {
        this.edit_buffer.setSelectionRange(start, end);
        this.replace_selection('', input_type);
    }

    protected update_caret_from_mouse(event: MouseInputEvent, extend: boolean) {
        const content = this.get_content_rect();
        const target_x = Math.max(0, event.clientX - content.x + this.scroll_x);
        const target_y = Math.max(0, event.clientY - content.y + this.scroll_y);
        const layout = this.visual_layout(content.width);
        const line_index = Math.max(0, Math.min(layout.lines.length - 1, target_y));
        const line = layout.lines[line_index];
        if (line === undefined) return;
        let best = line.start;
        let distance = Number.POSITIVE_INFINITY;
        const soft_continuation = !line.hardBreak && layout.lines[line_index + 1]?.start === line.end;
        const position_end = soft_continuation ? Math.max(line.start, line.end - 1) : line.end;
        for (let index = line.start; index <= position_end; index++) {
            const position = layout.positions[index];
            const next_distance = Math.abs(position.x - target_x);
            if (next_distance < distance) {
                best = index;
                distance = next_distance;
            }
        }
        this.edit_buffer.caret = best;
        if (!extend) this.edit_buffer.anchor = best;
        this.preferred_column = undefined;
        this.get_scene()?.notify_change();
    }

    protected handle_clipboard_shortcut(event: KeyInputEvent, shortcut: string) {
        if (shortcut === 'c' || shortcut === 'x') {
            if (!this.edit_buffer.hasSelection) return false;
            event.preventDefault();
            const clipboard_event = new ClipboardInputEvent(shortcut === 'c' ? 'copy' : 'cut', this.selected_text);
            if (!this.dispatchEvent(clipboard_event)) return true;
            void this.get_scene()?.clipboard?.writeText(clipboard_event.text);
            if (shortcut === 'x' && !this.read_only) this.replace_selection('', 'deleteByCut');
            return true;
        }
        if (shortcut === 'v') {
            const scene = this.get_scene();
            if (this.read_only || scene?.clipboard === undefined) return false;
            event.preventDefault();
            void scene.clipboard.readText().then((text) => {
                if (text !== undefined && this.get_scene() === scene) this.dispatchEvent(new PasteInputEvent({ text }));
            });
            return true;
        }
        return false;
    }

    public perform_default_action(event: InputEvent): void {
        if (this.disabled) return;
        if (event instanceof PasteInputEvent) {
            this.replace_selection(event.text, 'insertFromPaste');
            event.preventDefault();
            return;
        }
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
        if (!(event instanceof KeyInputEvent) || event.type !== 'keydown') return;
        const shortcut = event.key.toLowerCase();
        if (event.ctrl && this.handle_clipboard_shortcut(event, shortcut)) return;
        if (event.ctrl && (shortcut === 'y' || (shortcut === 'z' && event.shift))) {
            if (this.edit_buffer.redo()) this.after_history(event, 'historyRedo');
            return;
        }
        if (event.ctrl && shortcut === 'z') {
            if (this.edit_buffer.undo()) this.after_history(event, 'historyUndo');
            return;
        }
        if (event.ctrl && shortcut === 'a') {
            this.edit_buffer.selectAll();
            event.preventDefault();
            this.get_scene()?.notify_change();
            return;
        }

        const caret = this.edit_buffer.caret;
        const length = this.edit_buffer.length;
        switch (event.key) {
            case 'ArrowLeft':
                this.preferred_column = undefined;
                this.move_to(event.ctrl ? this.edit_buffer.wordBoundaryBackward() : Math.max(0, caret - 1), event.shift);
                break;
            case 'ArrowRight':
                this.preferred_column = undefined;
                this.move_to(event.ctrl ? this.edit_buffer.wordBoundaryForward() : Math.min(length, caret + 1), event.shift);
                break;
            case 'ArrowUp': this.move_vertical(-1, event.shift); break;
            case 'ArrowDown': this.move_vertical(1, event.shift); break;
            case 'Home':
                this.preferred_column = undefined;
                this.move_to(event.ctrl ? 0 : this.edit_buffer.lineStart(), event.shift);
                break;
            case 'End':
                this.preferred_column = undefined;
                this.move_to(event.ctrl ? length : this.edit_buffer.lineEnd(), event.shift);
                break;
            case 'Backspace': {
                if (this.edit_buffer.hasSelection) this.replace_selection('', 'deleteContentBackward');
                else if (caret > 0) this.delete_range(event.ctrl ? this.edit_buffer.wordBoundaryBackward() : caret - 1, caret, 'deleteContentBackward');
                break;
            }
            case 'Delete': {
                if (this.edit_buffer.hasSelection) this.replace_selection('', 'deleteContentForward');
                else if (caret < length) this.delete_range(caret, event.ctrl ? this.edit_buffer.wordBoundaryForward() : caret + 1, 'deleteContentForward');
                break;
            }
            case 'Enter': this.replace_selection('\n', 'insertLineBreak'); break;
            case 'Tab':
                if (!this.accepts_tab) return;
                this.replace_selection('\t', 'insertText');
                break;
            default:
                if (!event.ctrl && !event.alt && !event.meta && event.key.length > 0 &&
                    !event.key.startsWith('Arrow') && event.key !== 'Escape') {
                    this.replace_selection(event.key, 'insertText');
                }
                else return;
        }
        event.preventDefault();
        this.ensure_caret_visible();
    }

    protected after_history(event: KeyInputEvent, input_type: string) {
        event.preventDefault();
        this.preferred_column = undefined;
        this.get_scene()?.notify_change();
        this.dispatchEvent(new ValueInputEvent('input', { value: this.value, inputType: input_type }));
    }

    protected ensure_caret_visible() {
        const content = this.get_content_rect();
        if (content.width <= 0 || content.height <= 0) return;
        const layout = this.visual_layout(content.width);
        const caret = layout.positions[this.edit_buffer.caret] ?? { x: 0, y: 0 };
        if (caret.y < this.scroll_y) this.scroll_y = caret.y;
        else if (caret.y >= this.scroll_y + content.height) this.scroll_y = caret.y - content.height + 1;
        if (caret.x < this.scroll_x) this.scroll_x = caret.x;
        else if (caret.x >= this.scroll_x + content.width) this.scroll_x = caret.x - content.width + 1;
        this.scroll_y = Math.max(0, Math.min(this.scroll_y, Math.max(0, layout.height - content.height)));
        this.scroll_x = this.wrap_mode === 'none'
            ? Math.max(0, Math.min(this.scroll_x, Math.max(0, layout.width - content.width)))
            : 0;
    }

    public get_cursor_state(): CursorState | undefined {
        if (!this.focused || this.disabled) return undefined;
        this.ensure_caret_visible();
        const content = this.get_content_rect();
        const layout = this.visual_layout(content.width);
        const caret = layout.positions[this.edit_buffer.caret] ?? { x: 0, y: 0 };
        return {
            position: Position.of(content.x + caret.x - this.scroll_x, content.y + caret.y - this.scroll_y),
            visible: true,
        };
    }

    public draw(render: Renderer, force: boolean = false): void {
        const previous_border = this._border_color;
        this._border_color = this.focused ? this.focus_border_color : this.normal_border_color;
        super.draw(render, force);
        this._border_color = previous_border;

        const content = this.get_content_rect();
        if (content.width <= 0 || content.height <= 0) return;
        this.ensure_caret_visible();
        const layout = this.visual_layout(content.width);
        render.push_mask(content);
        render.push_opacity(this.opacity);
        if (layout.entries.length === 0 && this.placeholder.length > 0) {
            render.draw_string(content.x, content.y, this.placeholder, { color: this.placeholder_color });
        }
        else {
            for (const entry of layout.entries) {
                const x = content.x + entry.x - this.scroll_x;
                const y = content.y + entry.y - this.scroll_y;
                if (x + entry.width <= content.x || x >= content.x + content.width ||
                    y < content.y || y >= content.y + content.height) continue;
                const selected = entry.index >= this.selection_start && entry.index < this.selection_end;
                render.draw_char(x, y, 1, 1, entry.char, entry.width, {
                    color: selected ? this.selection_color : this.color,
                    bg_color: selected ? this.selection_bg_color : undefined,
                });
            }
        }
        render.pop_opacity();
        render.pop_mask();
    }
}

export { TextArea as Textarea };
