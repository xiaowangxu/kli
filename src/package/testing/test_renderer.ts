import { PassThrough, Writable } from 'node:stream';
import { Input } from '../input/input.js';
import { KeyInputEvent, MouseButton, MouseInputEvent, PasteInputEvent, WheelInputEvent } from '../input/event.js';
import type { Node } from '../node/node.js';
import { Renderer } from '../render/renderer.js';
import { Scene } from '../scene/scene.js';
import { Rect } from '../util/rect.js';

class TestTerminal extends Writable {
    public output = '';
    constructor(public columns: number, public rows: number) { super(); }
    _write(chunk: Buffer | string, _encoding: BufferEncoding, done: (error?: Error | null) => void) {
        this.output += chunk.toString();
        done();
    }
}

class ImmediateRenderer extends Renderer {
    public async render_now() {
        this.begin_render(this.width, this.height);
        this.draw_scene();
        const screen = Rect.of(0, 0, this.width, this.height);
        this.execute_render(screen, screen, false, false);
        await this.end_render();
    }
}

export class MockKeyboard {
    constructor(protected readonly scene: Scene) { }
    key(key: string, init: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean; repeat?: boolean } = {}) {
        this.scene.trigger_input_event(new KeyInputEvent('keydown', { key, ...init }));
    }
    paste(text: string) { this.scene.trigger_input_event(new PasteInputEvent({ text })); }
}

export class MockMouse {
    constructor(protected readonly scene: Scene) { }
    down(x: number, y: number, button: MouseButton = MouseButton.Primary) { this.scene.trigger_input_event(new MouseInputEvent('mousedown', { x, y, button, buttons: 1 })); }
    move(x: number, y: number, buttons = 0) { this.scene.trigger_input_event(new MouseInputEvent('mousemove', { x, y, buttons })); }
    up(x: number, y: number, button: MouseButton = MouseButton.Primary) { this.scene.trigger_input_event(new MouseInputEvent('mouseup', { x, y, button })); }
    click(x: number, y: number, button: MouseButton = MouseButton.Primary) { this.down(x, y, button); this.up(x, y, button); }
    wheel(x: number, y: number, deltaY: number, deltaX = 0) { this.scene.trigger_input_event(new WheelInputEvent({ x, y, deltaX, deltaY })); }
}

export class TestRenderer {
    public readonly input_stream = new PassThrough();
    public readonly input: Input;
    public readonly scene: Scene;
    public readonly terminal: TestTerminal;
    public readonly renderer: ImmediateRenderer;
    public readonly keyboard: MockKeyboard;
    public readonly mouse: MockMouse;

    constructor(public width = 80, public height = 24) {
        (this.input_stream as any).isTTY = false;
        this.input = new Input(this.input_stream as any, { exitOnCtrlC: false });
        this.scene = new Scene(this.input);
        this.terminal = new TestTerminal(width, height);
        this.renderer = new ImmediateRenderer(this.terminal as any, () => undefined, {
            alternateScreen: false, mouse: false, bracketedPaste: false,
        });
        this.renderer.set_scene(this.scene);
        this.keyboard = new MockKeyboard(this.scene);
        this.mouse = new MockMouse(this.scene);
    }

    public mount(node: Node & any) { this.scene.add_child(node); this.scene.calculate_layout(this.width, this.height); return node; }
    public resize(width: number, height: number) { this.width = this.terminal.columns = width; this.height = this.terminal.rows = height; this.scene.calculate_layout(width, height); }
    public async render() { this.scene.calculate_layout(this.width, this.height); await this.renderer.render_now(); return this.text(); }
    public text() {
        const rows: string[] = [];
        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width;) {
                const pixel = this.renderer.frame_buffer.peek_pixel(x, y);
                row += pixel?.text ?? ' ';
                x += Math.max(1, pixel?.get_span() ?? 1);
            }
            rows.push(row.trimEnd());
        }
        return rows.join('\n').trimEnd();
    }
    public ansi() { return this.terminal.output; }
    public dispose() { this.renderer.clear_scene(); this.scene.dispose(true); this.input_stream.destroy(); }
}
