import type { Node } from '../node/node.js';
import type { TextSelection } from './selection.js';

export enum InputEventPhase {
    None = 0,
    Capturing = 1,
    AtTarget = 2,
    Bubbling = 3,
}

export interface InputEventInit {
    bubbles?: boolean;
    cancelable?: boolean;
}

/** DOM-inspired event for Kli's capture, target, and bubble phases. */
export class InputEvent {
    public static readonly NONE = InputEventPhase.None;
    public static readonly CAPTURING_PHASE = InputEventPhase.Capturing;
    public static readonly AT_TARGET = InputEventPhase.AtTarget;
    public static readonly BUBBLING_PHASE = InputEventPhase.Bubbling;

    public readonly type: string;
    public readonly bubbles: boolean;
    public readonly cancelable: boolean;
    public readonly timeStamp: number = Date.now();

    public target: Node | undefined;
    public currentTarget: Node | undefined;
    public eventPhase: InputEventPhase = InputEventPhase.None;

    protected default_prevented = false;
    protected propagation_stopped = false;
    protected immediate_propagation_stopped = false;
    protected passive_listener = false;
    protected dispatching = false;
    protected path: Node[] = [];

    constructor(type: string = 'input', init: InputEventInit = {}) {
        this.type = type;
        this.bubbles = init.bubbles ?? true;
        this.cancelable = init.cancelable ?? true;
    }

    public get defaultPrevented() { return this.default_prevented; }
    public get srcElement() { return this.target; }
    public get returnValue() { return !this.default_prevented; }
    public set returnValue(value: boolean) { if (!value) this.preventDefault(); }
    public get cancelBubble() { return this.propagation_stopped; }
    public set cancelBubble(value: boolean) { if (value) this.stopPropagation(); }

    public stopPropagation() { this.propagation_stopped = true; }
    public stop_propagation() { this.stopPropagation(); }

    public stopImmediatePropagation() {
        this.immediate_propagation_stopped = true;
        this.propagation_stopped = true;
    }
    public stop_immediate_propagation() { this.stopImmediatePropagation(); }

    public preventDefault() {
        if (this.cancelable && !this.passive_listener) this.default_prevented = true;
    }
    public prevent_default() { this.preventDefault(); }

    public is_default_prevented() { return this.defaultPrevented; }
    public is_propagation_stopped() { return this.propagation_stopped; }
    public is_immediate_propagation_stopped() { return this.immediate_propagation_stopped; }
    public composedPath(): Node[] { return [...this.path]; }

    public match(event: InputEvent, _with_pressed: boolean = false): boolean {
        return event.type === this.type;
    }

    public _begin_dispatch(target: Node, path: Node[]) {
        if (this.dispatching) throw new Error(`Cannot redispatch ${this.type} while it is being dispatched`);
        this.dispatching = true;
        this.target = target;
        this.path = [...path];
    }

    public _set_dispatch_state(currentTarget: Node, phase: InputEventPhase, passive: boolean = false) {
        this.currentTarget = currentTarget;
        this.eventPhase = phase;
        this.passive_listener = passive;
    }

    public _set_passive_listener(passive: boolean) { this.passive_listener = passive; }

    public _finish_dispatch() {
        this.currentTarget = undefined;
        this.eventPhase = InputEventPhase.None;
        this.passive_listener = false;
        this.dispatching = false;
    }
}

export interface ComposeInputEventInit extends InputEventInit {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
}

export class ComposeInputEvent extends InputEvent {
    public ctrl = false;
    public shift = false;
    public alt = false;
    public meta = false;

    constructor(type: string = 'input', init: ComposeInputEventInit = {}) {
        super(type, init);
        this.set_Compose(init.ctrl, init.shift, init.alt, init.meta);
    }

    public get ctrlKey() { return this.ctrl; }
    public get shiftKey() { return this.shift; }
    public get altKey() { return this.alt; }
    public get metaKey() { return this.meta; }

    public set_Compose(ctrl: boolean = false, shift: boolean = false, alt: boolean = false, meta: boolean = false) {
        this.ctrl = ctrl;
        this.shift = shift;
        this.alt = alt;
        this.meta = meta;
        return this;
    }

    public match(event: InputEvent, with_pressed: boolean = false): boolean {
        return event instanceof ComposeInputEvent && super.match(event, with_pressed) &&
            event.ctrl === this.ctrl && event.shift === this.shift &&
            event.alt === this.alt && event.meta === this.meta;
    }
}

export interface KeyInputEventInit extends ComposeInputEventInit {
    key?: string;
    code?: string;
    pressed?: boolean;
    repeat?: boolean;
    raw?: string;
}

export class KeyInputEvent extends ComposeInputEvent {
    static readonly #empty_key = '';

    public key = KeyInputEvent.#empty_key;
    public code = KeyInputEvent.#empty_key;
    public pressed = false;
    public repeat = false;
    public raw = '';

    constructor(type: string = 'keydown', init: KeyInputEventInit = {}) {
        super(type, init);
        this.key = init.key ?? KeyInputEvent.#empty_key;
        this.code = init.code ?? KeyInputEvent.#empty_key;
        this.pressed = init.pressed ?? type !== 'keyup';
        this.repeat = init.repeat ?? false;
        this.raw = init.raw ?? '';
    }

    public get keycode() { return this.code; }
    public set keycode(value: string) { this.code = value; }
    public get echo() { return this.repeat; }
    public set echo(value: boolean) { this.repeat = value; }

    public set_Key(key: string, keycode: string, pressed: boolean, echo: boolean) {
        this.key = key;
        this.code = keycode;
        this.pressed = pressed;
        this.repeat = echo;
        return this;
    }

    public match(event: InputEvent, with_pressed: boolean = false): boolean {
        return event instanceof KeyInputEvent &&
            (this.type === 'input' || event.type === this.type) &&
            (this.key === KeyInputEvent.#empty_key || event.key === this.key) &&
            (this.code === KeyInputEvent.#empty_key || event.code === this.code) &&
            (!with_pressed || event.pressed === this.pressed) &&
            (!this.repeat || event.repeat) &&
            event.ctrl === this.ctrl && event.shift === this.shift &&
            event.alt === this.alt && event.meta === this.meta;
    }
}

export interface PasteInputEventInit extends InputEventInit {
    text?: string;
    raw?: string;
    bytes?: Uint8Array;
    encoding?: string;
}

/** A complete bracketed-paste payload, kept separate from individual key presses. */
export class PasteInputEvent extends InputEvent {
    public readonly text: string;
    public readonly data: string;
    public readonly raw: string;
    public readonly bytes: Uint8Array;
    public readonly encoding: string;

    constructor(init: PasteInputEventInit = {}) {
        super('paste', init);
        this.text = init.text ?? '';
        this.data = this.text;
        this.raw = init.raw ?? this.text;
        this.bytes = init.bytes?.slice() ?? new TextEncoder().encode(this.text);
        this.encoding = init.encoding ?? 'utf-8';
    }
}

export class ClipboardInputEvent extends InputEvent {
    public text: string;

    constructor(type: 'copy' | 'cut', text: string) {
        super(type, { bubbles: true, cancelable: true });
        this.text = text;
    }
}

export class SelectionInputEvent extends InputEvent {
    public readonly selection: TextSelection;
    public readonly text: string;

    constructor(selection: TextSelection, text: string) {
        super('selection', { bubbles: false, cancelable: false });
        this.selection = selection;
        this.text = text;
    }
}

export enum MouseButton {
    None = -1,
    Primary = 0,
    Auxiliary = 1,
    Secondary = 2,
}

export interface MouseInputEventInit extends ComposeInputEventInit {
    x?: number;
    y?: number;
    movementX?: number;
    movementY?: number;
    button?: MouseButton | number;
    buttons?: number;
    detail?: number;
    relatedTarget?: Node;
}

export class MouseInputEvent extends ComposeInputEvent {
    public clientX = 0;
    public clientY = 0;
    public screenX = 0;
    public screenY = 0;
    public movementX = 0;
    public movementY = 0;
    public button: number = MouseButton.None;
    public buttons = 0;
    public detail = 0;
    public relatedTarget: Node | undefined;
    public offsetX = 0;
    public offsetY = 0;
    public readonly pointerId = 1;
    public readonly pointerType = 'mouse';
    public readonly isPrimary = true;

    constructor(type: string, init: MouseInputEventInit = {}) {
        super(type, init);
        this.clientX = Math.floor(init.x ?? 0);
        this.clientY = Math.floor(init.y ?? 0);
        this.screenX = this.clientX;
        this.screenY = this.clientY;
        this.movementX = Math.floor(init.movementX ?? 0);
        this.movementY = Math.floor(init.movementY ?? 0);
        this.button = init.button ?? MouseButton.None;
        this.buttons = init.buttons ?? 0;
        this.detail = init.detail ?? 0;
        this.relatedTarget = init.relatedTarget;
    }

    public get x() { return this.clientX; }
    public get y() { return this.clientY; }
    public get pageX() { return this.clientX; }
    public get pageY() { return this.clientY; }

    public _begin_dispatch(target: Node, path: Node[]) {
        super._begin_dispatch(target, path);
        const rect = (target as Node & { get_rect?: () => { x: number; y: number } }).get_rect?.();
        this.offsetX = this.clientX - (rect?.x ?? 0);
        this.offsetY = this.clientY - (rect?.y ?? 0);
    }
}

/** Minimal DOM-like payload shared by drag sources and drop targets. */
export class DragDataTransfer {
    protected readonly values = new Map<string, string>();
    public effectAllowed = 'all';
    public dropEffect = 'move';

    public setData(type: string, value: string) { this.values.set(type, value); }
    public getData(type: string) { return this.values.get(type) ?? ''; }
    public clearData(type?: string) {
        if (type === undefined) this.values.clear();
        else this.values.delete(type);
    }
    public get types() { return [...this.values.keys()]; }
}

export interface DragInputEventInit extends MouseInputEventInit {
    dataTransfer: DragDataTransfer;
    source: Node;
    dropTarget?: Node;
    cancelled?: boolean;
}

export class DragInputEvent extends MouseInputEvent {
    public readonly dataTransfer: DragDataTransfer;
    public readonly source: Node;
    public readonly dropTarget: Node | undefined;
    public readonly cancelled: boolean;

    constructor(type: 'dragstart' | 'drag' | 'dragenter' | 'dragover' | 'dragleave' | 'drop' | 'dragend', init: DragInputEventInit) {
        super(type, init);
        this.dataTransfer = init.dataTransfer;
        this.source = init.source;
        this.dropTarget = init.dropTarget;
        this.cancelled = init.cancelled ?? false;
    }
}

export type KeyboardDragDirection = 'up' | 'down' | 'left' | 'right';

/** Keyboard-equivalent reordering request, normally produced by Alt+Arrow. */
export class KeyboardDragInputEvent extends InputEvent {
    public readonly source: Node;
    public readonly direction: KeyboardDragDirection;

    constructor(source: Node, direction: KeyboardDragDirection) {
        super('dragreorder', { bubbles: true, cancelable: true });
        this.source = source;
        this.direction = direction;
    }
}

export interface WheelInputEventInit extends MouseInputEventInit {
    deltaX?: number;
    deltaY?: number;
}

export class WheelInputEvent extends MouseInputEvent {
    public static readonly DOM_DELTA_PIXEL = 0;
    public static readonly DOM_DELTA_LINE = 1;
    public static readonly DOM_DELTA_PAGE = 2;
    public deltaX = 0;
    public deltaY = 0;
    public readonly deltaMode = WheelInputEvent.DOM_DELTA_LINE;

    constructor(init: WheelInputEventInit = {}) {
        super('wheel', init);
        this.deltaX = init.deltaX ?? 0;
        this.deltaY = init.deltaY ?? 0;
    }
}

export class FocusInputEvent extends InputEvent {
    public readonly relatedTarget: Node | undefined;

    constructor(type: 'focus' | 'blur' | 'focusin' | 'focusout', relatedTarget?: Node) {
        super(type, { bubbles: type === 'focusin' || type === 'focusout', cancelable: false });
        this.relatedTarget = relatedTarget;
    }
}

export class TerminalFocusInputEvent extends InputEvent {
    public readonly focused: boolean;
    public readonly raw: string;
    constructor(focused: boolean, raw: string) {
        super(focused ? 'terminalfocus' : 'terminalblur', { bubbles: false, cancelable: false });
        this.focused = focused;
        this.raw = raw;
    }
}

export class TerminalColorInputEvent extends InputEvent {
    public readonly slot: 'foreground' | 'background';
    public readonly value: string;
    public readonly raw: string;
    constructor(slot: 'foreground' | 'background', value: string, raw: string) {
        super('terminalcolor', { bubbles: false, cancelable: false });
        this.slot = slot;
        this.value = value;
        this.raw = raw;
    }
}

export interface ValueInputEventInit<T> extends InputEventInit {
    value: T;
    data?: string;
    inputType?: string;
}

export class ValueInputEvent<T = string> extends InputEvent {
    public readonly value: T;
    public readonly data: string | undefined;
    public readonly inputType: string | undefined;

    constructor(type: string, init: ValueInputEventInit<T>) {
        super(type, {
            bubbles: init.bubbles ?? true,
            cancelable: init.cancelable ?? type === 'beforeinput',
        });
        this.value = init.value;
        this.data = init.data;
        this.inputType = init.inputType;
    }
}

// Compatibility with the original alpha API. New code should use WheelInputEvent.
export enum MouseWheel { WheelUp, WheelDown }

export class MouseWheelInputEvent extends ComposeInputEvent {
    public button: MouseWheel = MouseWheel.WheelUp;

    constructor() { super('wheel'); }
    public set_Button(button: MouseWheel) { this.button = button; return this; }
    public match(event: InputEvent, with_pressed: boolean = false): boolean {
        return event instanceof MouseWheelInputEvent && event.button === this.button && super.match(event, with_pressed);
    }
}
