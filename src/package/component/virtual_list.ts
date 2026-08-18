import { InputEvent, KeyInputEvent, MouseButton, MouseInputEvent, ValueInputEvent } from '../input/event.js';
import { Renderer } from '../render/renderer.js';
import { Color } from '../util/color.js';
import { Position } from '../util/position.js';
import { ScrollBox } from './scroll.js';

export interface VirtualListRange {
    start: number;
    end: number;
}

/** Fixed-row virtualized list that only formats and draws the visible slice. */
export class VirtualList<T = string> extends ScrollBox {
    protected _items: T[] = [];
    protected _selected_index = -1;
    public item_height = 1;
    public estimated_item_width = 0;
    public overscan = 1;
    public empty_text = 'No items';
    public render_item: (item: T, index: number) => string = (item) => String(item);
    public color = Color.of(238, 243, 255);
    public selected_color = Color.of(102, 230, 184);
    public selected_bg_color = Color.of(38, 70, 96);
    public muted_color = Color.of(132, 143, 166);
    public last_rendered_range: VirtualListRange = { start: 0, end: 0 };

    constructor() {
        super();
        this.scroll_y = true;
        this.scroll_x = false;
        this.focusable = true;
    }

    public get items(): T[] { return this._items; }
    public set items(value: T[] | undefined) {
        this._items = Array.isArray(value) ? [...value] : [];
        if (this._selected_index >= this._items.length) this._selected_index = -1;
        this.scroll_to(this.scroll_left, this.scroll_top);
        this.get_scene()?.notify_change();
    }

    public get selected_index() { return this._selected_index; }
    public set selected_index(value: number) { this.select_index(value, false); }
    public get selectedIndex() { return this.selected_index; }
    public set selectedIndex(value: number) { this.selected_index = value; }
    public get value() { return this.items[this.selected_index]; }

    public get_scroll_limit(): Position {
        const viewport = this.get_content_rect();
        return Position.of(
            Math.max(0, this.estimated_item_width - viewport.width),
            Math.max(0, this.items.length * Math.max(1, this.item_height) - viewport.height),
        );
    }

    public get_visible_range(): VirtualListRange {
        const height = Math.max(1, this.item_height);
        const viewport = this.get_content_rect();
        const first = Math.floor(this.scroll_top / height);
        const visible = Math.ceil(viewport.height / height) + 1;
        return {
            start: Math.max(0, first - this.overscan),
            end: Math.min(this.items.length, first + visible + this.overscan),
        };
    }
    public getVisibleRange() { return this.get_visible_range(); }

    public scroll_index_into_view(index: number) {
        if (index < 0 || index >= this.items.length) return false;
        const viewport = this.get_content_rect();
        const top = index * Math.max(1, this.item_height);
        const bottom = top + Math.max(1, this.item_height);
        if (top < this.scroll_top) return this.scroll_to(this.scroll_left, top);
        if (bottom > this.scroll_top + viewport.height) {
            return this.scroll_to(this.scroll_left, bottom - viewport.height);
        }
        return false;
    }
    public scrollIndexIntoView(index: number) { return this.scroll_index_into_view(index); }

    protected select_index(index: number, emit = true) {
        const next = this.items.length === 0 ? -1 : Math.max(0, Math.min(Math.floor(index), this.items.length - 1));
        if (next === this._selected_index) return false;
        this._selected_index = next;
        this.scroll_index_into_view(next);
        if (emit) this.dispatchEvent(new ValueInputEvent('change', { value: this.value }));
        this.get_scene()?.notify_change();
        return true;
    }

    public perform_default_action(event: InputEvent): void {
        if (event instanceof KeyInputEvent && event.type === 'keydown') {
            let handled = false;
            const page = Math.max(1, Math.floor(this.get_content_rect().height / Math.max(1, this.item_height)) - 1);
            if (event.key === 'ArrowUp') handled = this.select_index(this.selected_index < 0 ? 0 : this.selected_index - 1);
            else if (event.key === 'ArrowDown') handled = this.select_index(this.selected_index < 0 ? 0 : this.selected_index + 1);
            else if (event.key === 'PageUp') handled = this.select_index(this.selected_index - page);
            else if (event.key === 'PageDown') handled = this.select_index(this.selected_index < 0 ? page : this.selected_index + page);
            else if (event.key === 'Home') handled = this.select_index(0);
            else if (event.key === 'End') handled = this.select_index(this.items.length - 1);
            if (handled) event.preventDefault();
            return;
        }
        if (event instanceof MouseInputEvent && event.type === 'mousedown' && event.button === MouseButton.Primary) {
            const content = this.get_content_rect();
            if (event.clientY >= content.y && event.clientY < content.y + content.height) {
                const index = Math.floor((event.clientY - content.y + this.scroll_top) / Math.max(1, this.item_height));
                if (index < this.items.length && this.select_index(index)) event.preventDefault();
            }
            return;
        }
        super.perform_default_action(event);
    }

    public draw(render: Renderer, force: boolean = false): void {
        super.draw(render, force);
        const content = this.get_content_rect();
        const height = Math.max(1, this.item_height);
        const range = this.get_visible_range();
        this.last_rendered_range = range;
        render.push_mask(content);
        render.push_opacity(this.opacity);
        if (this.items.length === 0) render.draw_string(content.x, content.y, this.empty_text, { color: this.muted_color });
        for (let index = range.start; index < range.end; index++) {
            const y = content.y + index * height - this.scroll_top;
            if (y + height <= content.y || y >= content.y + content.height) continue;
            const selected = index === this.selected_index;
            if (selected) {
                for (let row = 0; row < height; row++) {
                    for (let x = 0; x < content.width; x++) {
                        render.draw_char(content.x + x, y + row, 1, 1, ' ', 1, { bg_color: this.selected_bg_color });
                    }
                }
            }
            render.draw_string(content.x - this.scroll_left, y, this.render_item(this.items[index], index), {
                color: selected ? this.selected_color : this.color,
                bg_color: selected ? this.selected_bg_color : undefined,
                bold: selected,
            });
        }
        render.pop_opacity();
        render.pop_mask();
    }
}

export class List<T = string> extends VirtualList<T> { }

export interface TableColumn<T> {
    key: string;
    title: string;
    width: number;
    value: (row: T, index: number) => unknown;
}

/** Virtualized fixed-column table. */
export class Table<T = Record<string, unknown>> extends VirtualList<T> {
    public columns: TableColumn<T>[] = [];
    public column_gap = 1;

    constructor() {
        super();
        this.render_item = (row, index) => this.columns.map((column) => {
            const value = String(column.value(row, index) ?? '');
            return value.length > column.width ? `${value.slice(0, Math.max(0, column.width - 1))}…` : value.padEnd(column.width);
        }).join(' '.repeat(this.column_gap));
    }

    public get header() {
        return this.columns.map((column) => column.title.slice(0, column.width).padEnd(column.width))
            .join(' '.repeat(this.column_gap));
    }
}

export interface TreeItem<T = unknown> {
    id: string;
    label: string;
    value?: T;
    expanded?: boolean;
    children?: TreeItem<T>[];
}

/** Flattened virtual tree with expand/collapse support. */
export class Tree<T = unknown> extends VirtualList<{ item: TreeItem<T>; depth: number }> {
    protected roots: TreeItem<T>[] = [];

    constructor() {
        super();
        this.render_item = ({ item, depth }) => `${'  '.repeat(depth)}${item.children?.length ? (item.expanded ? '▾' : '▸') : ' '} ${item.label}`;
    }

    public set_tree(items: TreeItem<T>[]) {
        this.roots = items;
        this.rebuild();
    }
    public setTree(items: TreeItem<T>[]) { this.set_tree(items); }

    protected rebuild() {
        const flat: Array<{ item: TreeItem<T>; depth: number }> = [];
        const visit = (items: TreeItem<T>[], depth: number) => {
            for (const item of items) {
                flat.push({ item, depth });
                if (item.expanded && item.children) visit(item.children, depth + 1);
            }
        };
        visit(this.roots, 0);
        this.items = flat;
    }

    public toggle(index = this.selected_index) {
        const row = this.items[index];
        if (!row?.item.children?.length) return false;
        row.item.expanded = !row.item.expanded;
        const id = row.item.id;
        this.rebuild();
        this.selected_index = this.items.findIndex((candidate) => candidate.item.id === id);
        return true;
    }

    public perform_default_action(event: InputEvent): void {
        if (event instanceof KeyInputEvent && event.type === 'keydown' &&
            (event.key === 'Enter' || event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
            const row = this.items[this.selected_index];
            if (row?.item.children?.length) {
                const should_expand = event.key !== 'ArrowLeft';
                if (row.item.expanded !== should_expand || event.key === 'Enter') this.toggle();
                event.preventDefault();
                return;
            }
        }
        super.perform_default_action(event);
    }
}
