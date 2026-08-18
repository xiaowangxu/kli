import { FlexDirection } from 'yoga-layout';
import { InputEvent, KeyInputEvent, MouseButton, MouseInputEvent, ValueInputEvent } from '../input/event.js';
import { Container } from '../node/container.js';
import { Renderer, calculate_string_width } from '../render/renderer.js';
import { Color } from '../util/color.js';
import { InputBox } from './controls.js';
import { Select, SelectOption } from './select.js';

const text = Color.of(238, 243, 255);
const muted = Color.of(132, 143, 166);
const accent = Color.of(92, 200, 255);

export interface BreadcrumbItem { id: string; label: string; disabled?: boolean; action?: () => void; }

export class Breadcrumb extends Container {
    public items: BreadcrumbItem[] = [];
    public separator = ' / ';
    public color = muted;
    public active_color = text;
    public perform_default_action(event: InputEvent) {
        if (!(event instanceof MouseInputEvent) || event.type !== 'click') return;
        const rect = this.get_content_rect();
        let x = rect.x;
        for (const item of this.items) {
            const width = calculate_string_width(item.label);
            if (event.clientX >= x && event.clientX < x + width && !item.disabled) {
                item.action?.();
                this.dispatchEvent(new ValueInputEvent('change', { value: item.id }));
                return;
            }
            x += width + calculate_string_width(this.separator);
        }
    }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        let x = rect.x;
        this.items.forEach((item, index) => {
            render.draw_string(x, rect.y, item.label, { color: index === this.items.length - 1 ? this.active_color : item.disabled ? muted : this.color, bold: index === this.items.length - 1 });
            x += calculate_string_width(item.label);
            if (index < this.items.length - 1) { render.draw_string(x, rect.y, this.separator, { color: muted }); x += calculate_string_width(this.separator); }
        });
    }
}

export class Pagination extends Container {
    protected _page = 1;
    public page_count = 1;
    public sibling_count = 1;
    public color = muted;
    public active_color = accent;
    constructor() { super(); this.focusable = true; this.height = 1; this.width = 36; }
    public get page() { return this._page; }
    public set page(value: number) { this.set_page(value, false); }
    protected set_page(value: number, emit = true) {
        const next = Math.max(1, Math.min(Math.max(1, this.page_count), Math.floor(value)));
        if (next === this._page) return false;
        this._page = next;
        if (emit) this.dispatchEvent(new ValueInputEvent('change', { value: next }));
        this.get_scene()?.notify_change();
        return true;
    }
    public perform_default_action(event: InputEvent) {
        if (!(event instanceof KeyInputEvent) || event.type !== 'keydown') return;
        const next = event.key === 'ArrowLeft' || event.key === 'PageUp' ? this.page - 1 :
            event.key === 'ArrowRight' || event.key === 'PageDown' ? this.page + 1 :
                event.key === 'Home' ? 1 : event.key === 'End' ? this.page_count : this.page;
        if (this.set_page(next)) event.preventDefault();
    }
    protected visible_pages() {
        const result = new Set([1, this.page_count]);
        for (let page = this.page - this.sibling_count; page <= this.page + this.sibling_count; page++) if (page >= 1 && page <= this.page_count) result.add(page);
        return [...result].sort((a, b) => a - b);
    }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        let x = rect.x;
        let last = 0;
        for (const page of this.visible_pages()) {
            if (last && page > last + 1) { render.draw_string(x, rect.y, ' … ', { color: muted }); x += 3; }
            const label = ` ${page} `;
            render.draw_string(x, rect.y, label, { color: page === this.page ? this.active_color : this.color, bold: page === this.page });
            x += calculate_string_width(label);
            last = page;
        }
    }
}

export interface StatusSegment { id: string; text: string; color?: Color; align?: 'left' | 'right'; }

export class StatusBar extends Container {
    public segments: StatusSegment[] = [];
    public separator = ' │ ';
    constructor() { super(); this.height = 1; }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        const left = this.segments.filter((segment) => segment.align !== 'right');
        const right = this.segments.filter((segment) => segment.align === 'right');
        let x = rect.x;
        left.forEach((segment, index) => {
            if (index) { render.draw_string(x, rect.y, this.separator, { color: muted }); x += calculate_string_width(this.separator); }
            render.draw_string(x, rect.y, segment.text, { color: segment.color ?? text }); x += calculate_string_width(segment.text);
        });
        const right_text = right.map((segment) => segment.text).join(this.separator);
        let right_x = rect.x + Math.max(0, rect.width - calculate_string_width(right_text));
        right.forEach((segment, index) => {
            if (index) { render.draw_string(right_x, rect.y, this.separator, { color: muted }); right_x += calculate_string_width(this.separator); }
            render.draw_string(right_x, rect.y, segment.text, { color: segment.color ?? text }); right_x += calculate_string_width(segment.text);
        });
    }
}

export class SearchBox extends InputBox {
    constructor() { super(); this.placeholder = 'Search…'; }
    public perform_default_action(event: InputEvent) {
        if (event instanceof KeyInputEvent && event.type === 'keydown' && event.key === 'Escape' && this.value.length > 0) {
            this.value = '';
            this.dispatchEvent(new ValueInputEvent('input', { value: '', inputType: 'deleteByClear' }));
            event.preventDefault();
            return;
        }
        if (event instanceof KeyInputEvent && event.type === 'keydown' && event.key === 'Enter') {
            this.dispatchEvent(new ValueInputEvent('search', { value: this.value }));
        }
        super.perform_default_action(event);
    }
}

export class Combobox<T = string> extends Container {
    public readonly input = new SearchBox();
    public readonly popup = new Select<T>();
    protected _options: SelectOption<T>[] = [];
    public filter_option: (option: SelectOption<T>, query: string) => boolean =
        (option, query) => option.name.toLocaleLowerCase().includes(query.toLocaleLowerCase());

    constructor() {
        super();
        this.flex_direction = FlexDirection.Column;
        this.height = 10;
        this.input.width = '100%';
        this.popup.width = '100%';
        this.popup.flex_grow = 1;
        this.add_child(this.input);
        this.add_child(this.popup);
        this.input.addEventListener<ValueInputEvent<string>>('input', (event) => this.filter(event.value));
        this.input.addEventListener<KeyInputEvent>('keydown', (event) => {
            if (event.key === 'ArrowDown' && this.popup.options.length) { this.popup.focus(); event.preventDefault(); }
        });
        this.popup.addEventListener<ValueInputEvent<T | undefined>>('change', (event) => {
            const option = this.options.find((item) => Object.is(item.value, event.value));
            if (option) this.input.value = option.name;
            this.dispatchEvent(new ValueInputEvent('change', { value: event.value }));
        });
    }
    public get options(): SelectOption<T>[] { return this._options; }
    public set options(value: SelectOption<T>[] | undefined) { this._options = Array.isArray(value) ? [...value] : []; this.filter(this.input.value); }
    public get value() { return this.popup.value; }
    protected filter(query: string) { this.popup.options = this.options.filter((option) => this.filter_option(option, query)); }
}

export class Autocomplete<T = string> extends Combobox<T> { }

export class MultiSelect<T = string> extends Select<T> {
    public readonly selected_values = new Set<T>();
    public toggle_index(index: number) {
        const option = this.options[index];
        if (!option || option.disabled) return false;
        if (this.selected_values.has(option.value)) this.selected_values.delete(option.value);
        else this.selected_values.add(option.value);
        this.dispatchEvent(new ValueInputEvent('change', { value: [...this.selected_values] }));
        this.get_scene()?.notify_change();
        return true;
    }
    public perform_default_action(event: InputEvent) {
        if (event instanceof KeyInputEvent && event.type === 'keydown' && (event.key === ' ' || event.key === 'Enter')) {
            if (this.toggle_index(this.highlighted_index)) event.preventDefault();
            return;
        }
        if (event instanceof MouseInputEvent && event.type === 'mousedown' && event.button === MouseButton.Primary) {
            const index = this.option_at(event);
            if (this.toggle_index(index)) { this.highlighted_index = index; event.preventDefault(); }
            return;
        }
        super.perform_default_action(event);
    }
}
