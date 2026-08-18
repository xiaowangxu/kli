import { Display, PositionType } from 'yoga-layout';
import { InputEvent, KeyInputEvent, KeyboardDragDirection, KeyboardDragInputEvent } from '../input/event.js';
import { Container } from '../node/container.js';
import type { Node } from '../node/node.js';
import type { Scene } from '../scene/scene.js';
import { BorderStyleType } from '../style/border_style.js';
import { Color } from '../util/color.js';

export type FocusGroupOrientation = 'horizontal' | 'vertical' | 'both';

/** Stable z-ordered absolute container for overlays placed at a scene-level JSX position. */
export class Layer extends Container {
    constructor() {
        super();
        this.position = PositionType.Absolute;
        this.z_index = 100;
    }
}

/** Roving-focus group with directional navigation and Alt+Arrow reorder parity. */
export class FocusGroup extends Container {
    public orientation: FocusGroupOrientation = 'both';
    public wrap_focus = true;

    constructor() {
        super();
        this.addEventListener<KeyInputEvent>('keydown', (event) => this.handle_group_key(event));
        this.addEventListener('focusin', (event) => {
            if (event.target !== undefined && event.target !== this) this.sync_roving(event.target);
        });
    }

    protected focusables(node: Node = this, result: Node[] = []) {
        for (const child of node.get_children() ?? []) {
            if (child.focusable && !child.disabled) result.push(child);
            this.focusables(child, result);
        }
        return result;
    }

    protected sync_roving(active: Node) {
        for (const node of this.focusables()) node.tab_index = node === active ? 0 : -1;
    }

    public reset_roving_focus(index = 0) {
        const nodes = this.focusables();
        const active = nodes[Math.max(0, Math.min(index, nodes.length - 1))];
        if (active !== undefined) this.sync_roving(active);
    }

    protected handle_group_key(event: KeyInputEvent) {
        if (event.type !== 'keydown' || !(event.target instanceof Object)) return;
        const directions: Record<string, KeyboardDragDirection> = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        };
        const direction = directions[event.key];
        if (event.alt && direction !== undefined && event.target instanceof Object) {
            const source = event.target as Node;
            if (source.draggable && source.dispatchEvent(new KeyboardDragInputEvent(source, direction))) {
                event.preventDefault();
            }
            return;
        }
        const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
        const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
        if ((horizontal && this.orientation === 'vertical') || (vertical && this.orientation === 'horizontal')) return;
        const nodes = this.focusables();
        if (nodes.length === 0) return;
        let index = nodes.indexOf(event.target as Node);
        if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = nodes.length - 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') index--;
        else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') index++;
        else return;
        if (this.wrap_focus) index = (index + nodes.length) % nodes.length;
        else index = Math.max(0, Math.min(index, nodes.length - 1));
        const next = nodes[index];
        if (next !== undefined) {
            this.sync_roving(next);
            next.focus();
            event.preventDefault();
        }
    }
}

/** Modal layer with focus trapping, Escape cancellation, and focus restoration. */
export class Modal extends Layer {
    protected _open = false;
    public close_on_escape = true;
    public trap_focus = true;
    public panel_color = Color.of(18, 22, 31);
    public border_color_normal = Color.of(92, 200, 255);

    constructor() {
        super();
        this.z_index = 1000;
        this.width = '60%';
        this.height = 14;
        this.left = '20%';
        this.top = 2;
        this.padding = 1;
        this.border = 1;
        this.border_type = BorderStyleType.Round;
        this.bg_color = this.panel_color;
        this.border_color = this.border_color_normal;
        this.display = Display.None;
        this.addEventListener<KeyInputEvent>('keydown', (event) => {
            if (this.open && this.close_on_escape && event.key === 'Escape') {
                const cancel = new InputEvent('cancel', { bubbles: true, cancelable: true });
                if (this.dispatchEvent(cancel)) this.open = false;
                event.preventDefault();
            }
        });
    }

    public get open() { return this._open; }
    public set open(value: boolean) {
        const next = Boolean(value);
        if (next === this._open) return;
        this._open = next;
        this.display = next ? Display.Flex : Display.None;
        const scene = this.get_scene();
        if (scene !== undefined) {
            if (next) scene.push_focus_scope(this, this.trap_focus);
            else {
                scene.pop_focus_scope(this);
                this.dispatchEvent(new InputEvent('close', { bubbles: true, cancelable: false }));
            }
        }
    }

    public show() { this.open = true; }
    public close() { this.open = false; }

    public on_enter_scene(scene: Scene): void {
        super.on_enter_scene(scene);
        if (this.open) scene.push_focus_scope(this, this.trap_focus);
    }

    public on_exit_scene(scene: Scene): void {
        if (this.open) scene.pop_focus_scope(this);
        super.on_exit_scene(scene);
    }
}

export class Dialog extends Modal { }
