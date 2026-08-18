import { Display, FlexDirection, PositionType } from 'yoga-layout';
import { InputEvent, KeyInputEvent, MouseInputEvent, ValueInputEvent } from '../input/event.js';
import type { Scene } from '../scene/scene.js';
import { InputBox } from './controls.js';
import { Layer, Modal } from './overlay.js';
import { Select, SelectOption } from './select.js';

export interface MenuItem extends SelectOption<string> {
    shortcut?: string;
    action?: () => void;
    submenu?: MenuItem[];
}

/** Context/popup menu with outside-click closing, keyboard navigation, and submenus. */
export class Menu extends Select<string> {
    protected _open = false;
    protected _items: MenuItem[] = [];
    protected readonly menu_stack: MenuItem[][] = [];

    constructor() {
        super();
        this.position = PositionType.Absolute;
        this.z_index = 1100;
        this.width = 32;
        this.display = Display.None;
        this.addEventListener<ValueInputEvent<string>>('change', (event) => {
            const item = this.items.find((candidate) => Object.is(candidate.value, event.value));
            if (item?.submenu?.length) this.enter_submenu(item.submenu);
            else if (item !== undefined) {
                item.action?.();
                this.open = false;
            }
        });
    }

    public get items(): MenuItem[] { return this._items; }
    public set items(value: MenuItem[] | undefined) {
        this._items = Array.isArray(value) ? [...value] : [];
        this.options = this._items.map((item) => ({
            ...item,
            description: item.submenu?.length ? `${item.shortcut ?? ''} ›`.trim() : item.shortcut,
        }));
        this.height = Math.max(3, Math.min(12, this._items.length + 2));
    }

    public get open() { return this._open; }
    public set open(value: boolean) {
        const next = Boolean(value);
        if (next === this._open) return;
        this._open = next;
        this.display = next ? Display.Flex : Display.None;
        const scene = this.get_scene();
        if (scene !== undefined) {
            if (next) {
                scene.push_focus_scope(this, true);
                this.focus();
            }
            else {
                scene.pop_focus_scope(this);
                this.menu_stack.length = 0;
                this.dispatchEvent(new InputEvent('close', { cancelable: false }));
            }
        }
    }

    public open_at(x: number, y: number) {
        this.left = Math.max(0, Math.floor(x));
        this.top = Math.max(0, Math.floor(y));
        this.open = true;
    }
    public openAt(x: number, y: number) { this.open_at(x, y); }

    protected enter_submenu(items: MenuItem[]) {
        this.menu_stack.push(this.items);
        this.items = items;
        this.selected_index = -1;
        this.highlighted_index = 0;
    }

    protected leave_submenu() {
        const previous = this.menu_stack.pop();
        if (previous === undefined) return false;
        this.items = previous;
        return true;
    }

    protected readonly on_scene_mouse = (event: MouseInputEvent) => {
        if (!this.open) return;
        const rect = this.get_rect();
        if (event.clientX < rect.x || event.clientX >= rect.x + rect.width ||
            event.clientY < rect.y || event.clientY >= rect.y + rect.height) this.open = false;
    };

    public perform_default_action(event: InputEvent): void {
        if (event instanceof KeyInputEvent && event.type === 'keydown') {
            if (event.key === 'Escape') {
                this.open = false;
                event.preventDefault();
                return;
            }
            if (event.key === 'ArrowLeft' && this.leave_submenu()) {
                event.preventDefault();
                return;
            }
            if (event.key === 'ArrowRight') {
                const item = this.items[this.highlighted_index];
                if (item?.submenu?.length) {
                    this.enter_submenu(item.submenu);
                    event.preventDefault();
                    return;
                }
            }
        }
        super.perform_default_action(event);
    }

    public on_enter_scene(scene: Scene): void {
        super.on_enter_scene(scene);
        scene.addEventListener('mousedown', this.on_scene_mouse, true);
        if (this.open) scene.push_focus_scope(this, true);
    }

    public on_exit_scene(scene: Scene): void {
        scene.removeEventListener('mousedown', this.on_scene_mouse, true);
        if (this.open) scene.pop_focus_scope(this);
        super.on_exit_scene(scene);
    }
}

export interface CommandItem {
    id: string;
    name: string;
    description?: string;
    shortcut?: string;
    keywords?: string[];
    disabled?: boolean;
    action?: () => void;
}

/** Searchable command palette activated with Ctrl+P. */
export class CommandPalette extends Modal {
    public readonly search = new InputBox();
    public readonly results = new Select<string>();
    protected _commands: CommandItem[] = [];

    constructor() {
        super();
        this.z_index = 1200;
        this.height = 16;
        this.flex_direction = FlexDirection.Column;
        this.gap = 1;
        this.search.width = '100%';
        this.search.placeholder = 'Search commands…';
        this.search.flex_shrink = 0;
        this.results.width = '100%';
        this.results.flex_grow = 1;
        this.results.height = 'auto';
        this.add_child(this.search);
        this.add_child(this.results);

        this.search.addEventListener<ValueInputEvent<string>>('input', (event) => this.filter(event.value));
        this.results.addEventListener<ValueInputEvent<string | undefined>>('change', (event) => {
            const command = this.commands.find((item) => item.id === event.value);
            if (command !== undefined && !command.disabled) {
                command.action?.();
                this.open = false;
            }
        });
    }

    public get commands(): CommandItem[] { return this._commands; }
    public set commands(value: CommandItem[] | undefined) {
        this._commands = Array.isArray(value) ? [...value] : [];
        this.filter(this.search.value);
    }

    protected filter(query: string) {
        const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
        const matches = this.commands.filter((command) => {
            const haystack = [command.name, command.description, ...(command.keywords ?? [])]
                .filter(Boolean).join(' ').toLocaleLowerCase();
            return terms.every((term) => haystack.includes(term));
        });
        this.results.options = matches.map((command) => ({
            name: command.name,
            value: command.id,
            description: command.shortcut ?? command.description,
            disabled: command.disabled,
        }));
    }

    public show() {
        this.search.value = '';
        this.filter('');
        super.show();
        this.search.focus();
    }

    protected readonly on_scene_key = (event: KeyInputEvent) => {
        if (event.type === 'keydown' && event.ctrl && event.key.toLocaleLowerCase() === 'p') {
            if (this.open) this.close();
            else this.show();
            event.preventDefault();
        }
    };

    public on_enter_scene(scene: Scene): void {
        super.on_enter_scene(scene);
        scene.addEventListener('keydown', this.on_scene_key, true);
    }

    public on_exit_scene(scene: Scene): void {
        scene.removeEventListener('keydown', this.on_scene_key, true);
        super.on_exit_scene(scene);
    }
}
