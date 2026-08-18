import { emitKeypressEvents, type Key } from 'node:readline';
import { Buffer } from 'node:buffer';
import { PassThrough } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { ReadStream } from 'node:tty';
import { Signal } from '../util/signal.js';
import {
    InputEvent,
    KeyInputEvent,
    MouseButton,
    MouseInputEvent,
    PasteInputEvent,
    WheelInputEvent,
    TerminalFocusInputEvent,
    TerminalColorInputEvent,
} from './event.js';
import { decode_terminal_text } from './text_encoding.js';

export interface InputOptions {
    exitOnCtrlC?: boolean;
    keyboardProtocol?: 'legacy' | 'csi-u' | 'kitty';
    focusReporting?: boolean;
    /** Decoder used only when bracketed-paste bytes are not valid UTF-8. */
    pasteEncoding?: string | 'auto';
}

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
    protected bracketed_paste = false;
    protected paste_buffer = '';
    protected raw_pending = Buffer.alloc(0);
    protected raw_bracketed_paste = false;
    protected raw_paste_parts: Buffer[] = [];
    protected readonly keyboard_decoder = new StringDecoder('utf8');
    public readonly exit_on_ctrl_c: boolean;
    public readonly keyboard_protocol: 'legacy' | 'csi-u' | 'kitty';
    public readonly focus_reporting: boolean;
    public readonly paste_encoding: string | 'auto';

    private readonly keyboard_stream = new PassThrough();

    constructor(stream: ReadStream, options: InputOptions = {}) {
        this.stream = stream;
        this.exit_on_ctrl_c = options.exitOnCtrlC ?? true;
        this.keyboard_protocol = options.keyboardProtocol ?? 'legacy';
        this.focus_reporting = options.focusReporting ?? false;
        this.paste_encoding = options.pasteEncoding ?? 'auto';
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
    }

    public dispose() {
        if (!this.initialized) return;
        this.initialized = false;
        if (this.pending_timer !== undefined) clearTimeout(this.pending_timer);
        this.flush_raw_pending();
        if (this.stream.isTTY) this.stream.setRawMode(this.previous_raw_mode);
        this.stream.off('data', this._handle_data);
        this.keyboard_stream.off('keypress', this._handle_keypress);
        this.on_input.clear();
    }

    private _handle_data = (data: string | Buffer) => {
        const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
        this.raw_pending = this.raw_pending.length === 0 ? Buffer.from(bytes) : Buffer.concat([this.raw_pending, bytes]);
        this.process_raw_pending();
    };

    protected raw_suffix_length(value: Buffer, marker: Buffer) {
        for (let length = Math.min(value.length, marker.length - 1); length > 0; length--) {
            if (value.subarray(value.length - length).equals(marker.subarray(0, length))) return length;
        }
        return 0;
    }

    protected forward_keyboard_bytes(bytes: Uint8Array) {
        if (bytes.length === 0) return;
        const decoded = this.keyboard_decoder.write(Buffer.from(bytes));
        if (decoded.length > 0) this.handle_data(decoded);
    }

    protected emit_raw_paste() {
        const bytes = Buffer.concat(this.raw_paste_parts);
        this.raw_paste_parts = [];
        this.raw_bracketed_paste = false;
        const decoded = decode_terminal_text(bytes, this.paste_encoding);
        this.on_input.trigger(new PasteInputEvent({
            text: decoded.text,
            raw: `\x1b[200~${decoded.text}\x1b[201~`,
            bytes,
            encoding: decoded.encoding,
        }));
    }

    protected process_raw_pending() {
        const paste_start = Buffer.from('\x1b[200~');
        const paste_end = Buffer.from('\x1b[201~');
        while (this.raw_pending.length > 0) {
            if (this.raw_bracketed_paste) {
                const end = this.raw_pending.indexOf(paste_end);
                if (end >= 0) {
                    if (end > 0) this.raw_paste_parts.push(Buffer.from(this.raw_pending.subarray(0, end)));
                    this.raw_pending = this.raw_pending.subarray(end + paste_end.length);
                    this.emit_raw_paste();
                    continue;
                }
                const held = this.raw_suffix_length(this.raw_pending, paste_end);
                const body_end = this.raw_pending.length - held;
                if (body_end > 0) this.raw_paste_parts.push(Buffer.from(this.raw_pending.subarray(0, body_end)));
                this.raw_pending = Buffer.from(this.raw_pending.subarray(body_end));
                return;
            }

            const start = this.raw_pending.indexOf(paste_start);
            if (start >= 0) {
                this.forward_keyboard_bytes(this.raw_pending.subarray(0, start));
                this.raw_pending = this.raw_pending.subarray(start + paste_start.length);
                this.raw_bracketed_paste = true;
                this.raw_paste_parts = [];
                continue;
            }
            const held = this.raw_suffix_length(this.raw_pending, paste_start);
            const keyboard_end = this.raw_pending.length - held;
            this.forward_keyboard_bytes(this.raw_pending.subarray(0, keyboard_end));
            this.raw_pending = Buffer.from(this.raw_pending.subarray(keyboard_end));
            return;
        }
    }

    protected flush_raw_pending() {
        if (this.raw_bracketed_paste) {
            if (this.raw_pending.length > 0) this.raw_paste_parts.push(Buffer.from(this.raw_pending));
            this.raw_pending = Buffer.alloc(0);
            this.emit_raw_paste();
        }
        else {
            this.forward_keyboard_bytes(this.raw_pending);
            this.raw_pending = Buffer.alloc(0);
        }
        const tail = this.keyboard_decoder.end();
        if (tail.length > 0) this.handle_data(tail);
        this.flush_pending();
    }

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
        const paste_start = '\x1b[200~';
        const paste_end = '\x1b[201~';
        while (this.pending.length > 0) {
            if (this.bracketed_paste) {
                const end_index = this.pending.indexOf(paste_end);
                if (end_index >= 0) {
                    this.paste_buffer += this.pending.slice(0, end_index);
                    this.pending = this.pending.slice(end_index + paste_end.length);
                    const text = this.paste_buffer;
                    this.paste_buffer = '';
                    this.bracketed_paste = false;
                    this.on_input.trigger(new PasteInputEvent({ text, raw: `${paste_start}${text}${paste_end}` }));
                    continue;
                }

                const held = this.get_held_protocol_suffix(this.pending, [paste_end]);
                this.paste_buffer += this.pending.slice(0, this.pending.length - held.length);
                this.pending = held;
                if (held.length > 0) this.schedule_pending_flush();
                return;
            }

            const mouse_index = this.pending.indexOf(mouse_prefix);
            const paste_index = this.pending.indexOf(paste_start);
            const protocol_indexes = [mouse_index, paste_index].filter((index) => index >= 0);
            const protocol_index = protocol_indexes.length > 0 ? Math.min(...protocol_indexes) : -1;
            if (protocol_index > 0) {
                this.keyboard_stream.write(this.pending.slice(0, protocol_index));
                this.pending = this.pending.slice(protocol_index);
                continue;
            }

            if (this.pending.startsWith(paste_start)) {
                this.pending = this.pending.slice(paste_start.length);
                this.bracketed_paste = true;
                this.paste_buffer = '';
                continue;
            }

            if (this.pending.startsWith(mouse_prefix)) {
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

            if (this.focus_reporting && (this.pending.startsWith('\x1b[I') || this.pending.startsWith('\x1b[O'))) {
                const raw = this.pending.slice(0, 3);
                this.pending = this.pending.slice(3);
                this.on_input.trigger(new TerminalFocusInputEvent(raw === '\x1b[I', raw));
                continue;
            }

            if (this.pending.startsWith('\x1b]10;') || this.pending.startsWith('\x1b]11;')) {
                const match = /^\x1b\](10|11);([^\x07\x1b]*)(?:\x07|\x1b\\)/.exec(this.pending);
                if (match !== null) {
                    this.pending = this.pending.slice(match[0].length);
                    this.on_input.trigger(new TerminalColorInputEvent(match[1] === '10' ? 'foreground' : 'background', match[2], match[0]));
                    continue;
                }
                this.schedule_pending_flush();
                return;
            }

            if (this.keyboard_protocol !== 'legacy' && this.pending.startsWith('\x1b[')) {
                const match = /^\x1b\[(\d+)(?:;(\d+)(?::([123]))?)?u/.exec(this.pending);
                if (match !== null) {
                    this.pending = this.pending.slice(match[0].length);
                    this.handle_csi_u(Number(match[1]), Number(match[2] ?? 1), Number(match[3] ?? 1), match[0]);
                    continue;
                }
                if (/^\x1b\[\d+(?:;\d+(?::[123]?)?)?$/.test(this.pending)) {
                    this.schedule_pending_flush();
                    return;
                }
            }

            const held_suffix = this.get_held_protocol_suffix(this.pending, [mouse_prefix, paste_start]);
            const keyboard_content = this.pending.slice(0, this.pending.length - held_suffix.length);
            if (keyboard_content.length > 0) this.keyboard_stream.write(keyboard_content);
            this.pending = held_suffix;
            if (this.pending.length > 0) this.schedule_pending_flush();
            return;
        }
    }

    protected get_held_protocol_suffix(value: string, prefixes: string[]) {
        const longest = Math.max(...prefixes.map((prefix) => prefix.length));
        for (let length = Math.min(longest - 1, value.length); length > 0; length--) {
            const suffix = value.slice(-length);
            if (prefixes.some((prefix) => prefix.startsWith(suffix))) return suffix;
        }
        return '';
    }

    protected schedule_pending_flush() {
        this.pending_timer = setTimeout(() => {
            this.pending_timer = undefined;
            this.flush_pending();
        }, 25);
    }

    protected flush_pending() {
        if (this.bracketed_paste) {
            const text = this.paste_buffer + this.pending;
            this.paste_buffer = '';
            this.pending = '';
            this.bracketed_paste = false;
            if (text.length > 0) this.on_input.trigger(new PasteInputEvent({ text }));
            return;
        }
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
            raw: sequence ?? '',
        });
        this.on_input.trigger(event);

        if (this.exit_on_ctrl_c && key.ctrl && key.name === 'c' && !event.defaultPrevented) process.exit(0);
    }

    protected handle_csi_u(codepoint: number, encoded_modifiers: number, event_type: number, raw: string) {
        const modifiers = Math.max(0, encoded_modifiers - 1);
        const named: Record<number, string> = { 9: 'Tab', 13: 'Enter', 27: 'Escape', 32: ' ', 127: 'Backspace' };
        const key = named[codepoint] ?? String.fromCodePoint(codepoint);
        this.on_input.trigger(new KeyInputEvent(event_type === 3 ? 'keyup' : 'keydown', {
            key,
            code: `U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`,
            pressed: event_type !== 3,
            repeat: event_type === 2,
            shift: (modifiers & 1) !== 0,
            alt: (modifiers & 2) !== 0,
            ctrl: (modifiers & 4) !== 0,
            meta: (modifiers & 8) !== 0,
            raw,
        }));
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
