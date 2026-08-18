import { emitKeypressEvents, type Key } from 'node:readline';
import { PassThrough } from 'node:stream';
import { ReadStream } from 'node:tty';
import { Signal } from '../util/signal.js';
import {
    InputEvent,
    KeyInputEvent,
    MouseButton,
    MouseInputEvent,
    WheelInputEvent,
} from './event.js';

const named_keys: Record<string, string> = {
    backspace: 'Backspace',
    delete: 'Delete',
    down: 'ArrowDown',
    end: 'End',
    escape: 'Escape',
    home: 'Home',
    insert: 'Insert',
    left: 'ArrowLeft',
    pagedown: 'PageDown',
    pageup: 'PageUp',
    return: 'Enter',
    right: 'ArrowRight',
    space: ' ',
    tab: 'Tab',
    up: 'ArrowUp',
};

function normalize_key(sequence: string | undefined, key: Key): string {
    if (key.name !== undefined && key.name in named_keys) return named_keys[key.name];
    if (sequence !== undefined && !sequence.startsWith('\x1b') && !key.ctrl && !key.meta) return sequence;
    return key.name ?? sequence ?? '';
}

function button_mask(button: number): number {
    if (button === MouseButton.Primary) return 1;
    if (button === MouseButton.Secondary) return 2;
    if (button === MouseButton.Auxiliary) return 4;
    return 0;
}

/** Decodes terminal keypresses and SGR mouse protocol packets into Kli events. */
export class Input {
    public readonly stream: ReadStream;
    public readonly on_input = new Signal<(event: InputEvent) => void>();

    protected initialized = false;
    protected pending = '';
    protected pending_timer: NodeJS.Timeout | undefined;
    protected buttons = 0;
    protected last_mouse_x = 0;
    protected last_mouse_y = 0;
    protected previous_raw_mode = false;

    private readonly keyboard_stream = new PassThrough();

    constructor(stream: ReadStream) {
        this.stream = stream;
        this.keyboard_stream.setEncoding('utf8');
        emitKeypressEvents(this.keyboard_stream);
    }

    public init() {
        if (this.initialized) return;
        this.initialized = true;
        this.keyboard_stream.on('keypress', this._handle_keypress);
        this.stream.on('data', this._handle_data);
        if (this.stream.isTTY) {
            this.previous_raw_mode = this.stream.isRaw;
            this.stream.setRawMode(true);
        }
        this.stream.resume();
        this.stream.setEncoding('utf8');
    }

    public dispose() {
        if (!this.initialized) return;
        this.initialized = false;
        if (this.pending_timer !== undefined) clearTimeout(this.pending_timer);
        this.flush_pending();
        if (this.stream.isTTY) this.stream.setRawMode(this.previous_raw_mode);
        this.stream.off('data', this._handle_data);
        this.keyboard_stream.off('keypress', this._handle_keypress);
        this.on_input.clear();
    }

    private _handle_data = (data: string | Buffer) => this.handle_data(data.toString());

    protected handle_data(chunk: string) {
        if (this.pending_timer !== undefined) {
            clearTimeout(this.pending_timer);
            this.pending_timer = undefined;
        }
        this.pending += chunk;
        this.process_pending();
    }

    protected process_pending() {
        const mouse_prefix = '\x1b[<';
        while (this.pending.length > 0) {
            const mouse_index = this.pending.indexOf(mouse_prefix);
            if (mouse_index > 0) {
                this.keyboard_stream.write(this.pending.slice(0, mouse_index));
                this.pending = this.pending.slice(mouse_index);
                continue;
            }

            if (mouse_index === 0) {
                const match = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(this.pending);
                if (match !== null) {
                    this.pending = this.pending.slice(match[0].length);
                    this.handle_mouse_packet(Number(match[1]), Number(match[2]) - 1, Number(match[3]) - 1, match[4]);
                    continue;
                }
                if (/^\x1b\[<[0-9;]*$/.test(this.pending)) {
                    this.schedule_pending_flush();
                    return;
                }
                this.keyboard_stream.write(this.pending[0]);
                this.pending = this.pending.slice(1);
                continue;
            }

            let held_suffix = '';
            for (let length = Math.min(mouse_prefix.length - 1, this.pending.length); length > 0; length--) {
                const suffix = this.pending.slice(-length);
                if (mouse_prefix.startsWith(suffix)) {
                    held_suffix = suffix;
                    break;
                }
            }
            const keyboard_content = this.pending.slice(0, this.pending.length - held_suffix.length);
            if (keyboard_content.length > 0) this.keyboard_stream.write(keyboard_content);
            this.pending = held_suffix;
            if (this.pending.length > 0) this.schedule_pending_flush();
            return;
        }
    }

    protected schedule_pending_flush() {
        this.pending_timer = setTimeout(() => {
            this.pending_timer = undefined;
            this.flush_pending();
        }, 25);
    }

    protected flush_pending() {
        if (this.pending.length === 0) return;
        this.keyboard_stream.write(this.pending);
        this.pending = '';
    }

    private _handle_keypress = (sequence: string | undefined, key: Key) => this.handle_keypress(sequence, key);

    protected handle_keypress(sequence: string | undefined, key: Key) {
        const event = new KeyInputEvent('keydown', {
            key: normalize_key(sequence, key),
            code: key.name ?? '',
            pressed: true,
            repeat: false,
            ctrl: key.ctrl === true,
            shift: key.shift === true,
            alt: key.meta === true,
        });
        this.on_input.trigger(event);

        if (key.ctrl && key.name === 'c' && !event.defaultPrevented) process.exit(0);
    }

    protected handle_mouse_packet(encoded: number, x: number, y: number, terminator: string) {
        const shift = (encoded & 4) !== 0;
        const alt = (encoded & 8) !== 0;
        const ctrl = (encoded & 16) !== 0;
        const motion = (encoded & 32) !== 0;
        const wheel = (encoded & 64) !== 0;
        const raw_button = encoded & 3;
        const movementX = x - this.last_mouse_x;
        const movementY = y - this.last_mouse_y;
        this.last_mouse_x = x;
        this.last_mouse_y = y;

        const common = { x, y, movementX, movementY, shift, alt, ctrl };
        if (wheel) {
            const horizontal = raw_button >= 2;
            const direction = raw_button % 2 === 0 ? -1 : 1;
            this.on_input.trigger(new WheelInputEvent({
                ...common,
                buttons: this.buttons,
                deltaX: horizontal ? direction : 0,
                deltaY: horizontal ? 0 : direction,
            }));
            return;
        }

        const button = raw_button <= 2 ? raw_button : MouseButton.None;
        if (motion) {
            if (button !== MouseButton.None) this.buttons |= button_mask(button);
            this.on_input.trigger(new MouseInputEvent('mousemove', {
                ...common,
                button,
                buttons: this.buttons,
                cancelable: false,
            }));
            return;
        }

        const released = terminator === 'm' || raw_button === 3;
        if (released) {
            if (button === MouseButton.None) this.buttons = 0;
            else this.buttons &= ~button_mask(button);
            this.on_input.trigger(new MouseInputEvent('mouseup', {
                ...common,
                button,
                buttons: this.buttons,
            }));
            return;
        }

        this.buttons |= button_mask(button);
        this.on_input.trigger(new MouseInputEvent('mousedown', {
            ...common,
            button,
            buttons: this.buttons,
        }));
    }
}
