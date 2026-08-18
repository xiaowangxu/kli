import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import test from 'node:test';

import {
    BlendFactor,
    Checkbox,
    Color,
    Container,
    FlexDirection,
    FrameBuffer,
    Input,
    InputBox,
    InputEvent,
    InputEventPhase,
    KeyInputEvent,
    MouseButton,
    MouseInputEvent,
    Overflow,
    Rect,
    Renderer,
    Scene,
} from '../dist/index.mjs';

function createInput() {
    const stream = new PassThrough();
    stream.isTTY = false;
    return { input: new Input(stream), stream };
}

test('flex rounding keeps integer gaps while distributing remainder cells', () => {
    for (let width = 80; width <= 85; width++) {
        const { input } = createInput();
        const scene = new Scene(input);
        scene.flex_direction = FlexDirection.Row;
        scene.gap = 1;

        const children = Array.from({ length: 3 }, () => {
            const child = new Container();
            child.flex_basis = 0;
            child.flex_grow = 1;
            scene.add_child(child);
            return child;
        });

        scene.calculate_layout(width, 5);
        const rects = children.map((child) => child.get_rect());
        const gaps = rects.slice(1).map((rect, index) => (
            rect.x - (rects[index].x + rects[index].width)
        ));

        assert.deepEqual(gaps, [1, 1], `terminal width ${width}`);
        assert.equal(
            rects.reduce((total, rect) => total + rect.width, 0) + gaps[0] + gaps[1],
            width,
            `terminal width ${width}`,
        );
        scene.dispose(true);
    }
});

test('nodes can be removed and receive the correct scene lifecycle', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const parent = new Container();

    class LifecycleContainer extends Container {
        entered = 0;
        exited = 0;

        on_enter_scene() {
            this.entered++;
        }

        on_exit_scene(scene) {
            this.exited++;
            super.on_exit_scene(scene);
        }
    }

    const child = new LifecycleContainer();
    scene.add_child(parent);
    parent.add_child(child);

    assert.equal(child.entered, 1);
    assert.equal(parent.remove_child(child), child);
    assert.equal(child.exited, 1);
    assert.equal(child.parent, undefined);

    scene.dispose(true);
});

test('terminal key sequences become normalized input events', () => {
    const { input, stream } = createInput();
    const events = [];
    input.on_input.connect((event) => events.push(event));
    input.init();

    stream.write('\t');
    stream.write('\x1b[B');

    assert.equal(events.length, 2);
    assert.equal(events[0].key, 'Tab');
    assert.equal(events[0].keycode, 'tab');
    assert.equal(events[1].key, 'ArrowDown');
    assert.equal(events[1].keycode, 'down');

    input.dispose();
    stream.destroy();
});

test('Tab and Shift+Tab move focus through focusable nodes', () => {
    const { input, stream } = createInput();
    const scene = new Scene(input);
    const first = new Container();
    const second = new Container();
    first.focusable = true;
    second.focusable = true;
    scene.add_child(first);
    scene.add_child(second);
    input.init();

    stream.write('\t');
    assert.equal(scene.get_focused_node(), first);
    stream.write('\t');
    assert.equal(scene.get_focused_node(), second);
    stream.write('\x1b[Z');
    assert.equal(scene.get_focused_node(), first);

    input.dispose();
    stream.destroy();
    scene.dispose(true);
});

test('focused scroll containers respond to navigation keys', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const viewport = new Container();
    const content = new Container();
    viewport.width = 10;
    viewport.height = 5;
    viewport.overflow = Overflow.Scroll;
    viewport.focusable = true;
    content.width = 10;
    content.height = 20;
    viewport.add_child(content);
    scene.add_child(viewport);
    scene.calculate_layout(10, 5);
    viewport.focus();

    scene.trigger_input_event(new KeyInputEvent().set_Key('PageDown', 'pagedown', true, false));
    assert.equal(viewport.get_scroll_position().x, 0);
    assert.equal(viewport.get_scroll_position().y, 4);

    scene.trigger_input_event(new KeyInputEvent().set_Key('End', 'end', true, false));
    assert.equal(viewport.get_scroll_position().y, 15);

    scene.dispose(true);
});

test('events capture, target, and bubble in DOM order', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const outer = new Container();
    const target = new Container();
    scene.add_child(outer);
    outer.add_child(target);

    const calls = [];
    const record = (name) => (event) => calls.push([name, event.eventPhase, event.currentTarget]);
    scene.addEventListener('probe', record('scene capture'), true);
    outer.addEventListener('probe', record('outer capture'), true);
    target.addEventListener('probe', record('target capture'), true);
    target.addEventListener('probe', record('target'));
    outer.addEventListener('probe', record('outer'));
    scene.addEventListener('probe', record('scene'));

    const event = new InputEvent('probe');
    assert.equal(target.dispatchEvent(event), true);
    assert.deepEqual(calls.map(([name]) => name), [
        'scene capture', 'outer capture', 'target capture', 'target', 'outer', 'scene',
    ]);
    assert.deepEqual(calls.map(([, phase]) => phase), [
        InputEventPhase.Capturing,
        InputEventPhase.Capturing,
        InputEventPhase.AtTarget,
        InputEventPhase.AtTarget,
        InputEventPhase.Bubbling,
        InputEventPhase.Bubbling,
    ]);
    assert.equal(event.target, target);
    assert.deepEqual(event.composedPath(), [target, outer, scene]);
    scene.dispose(true);
});

test('stopImmediatePropagation and preventDefault control delivery and widget defaults', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const checkbox = new Checkbox();
    scene.add_child(checkbox);

    const calls = [];
    checkbox.addEventListener('probe', (event) => {
        calls.push('first');
        event.stopImmediatePropagation();
    });
    checkbox.addEventListener('probe', () => calls.push('second'));
    checkbox.dispatchEvent(new InputEvent('probe'));
    assert.deepEqual(calls, ['first']);

    const prevent = (event) => event.preventDefault();
    checkbox.addEventListener('click', prevent);
    assert.equal(checkbox.dispatchEvent(new MouseInputEvent('click')), false);
    assert.equal(checkbox.checked, false);
    checkbox.removeEventListener('click', prevent);
    assert.equal(checkbox.dispatchEvent(new MouseInputEvent('click')), true);
    assert.equal(checkbox.checked, true);
    scene.dispose(true);
});

test('SGR mouse packets expose zero-based position, buttons, movement, and wheel delta', () => {
    const { input, stream } = createInput();
    const events = [];
    input.on_input.connect((event) => events.push(event));
    input.init();

    stream.write('\x1b[<0;4;3M');
    stream.write('\x1b[<32;5;3M');
    stream.write('\x1b[<0;5;3m');
    stream.write('\x1b[<65;5;3M');

    assert.deepEqual(events.map((event) => event.type), ['mousedown', 'mousemove', 'mouseup', 'wheel']);
    assert.equal(events[0].clientX, 3);
    assert.equal(events[0].clientY, 2);
    assert.equal(events[0].button, MouseButton.Primary);
    assert.equal(events[0].buttons, 1);
    assert.equal(events[1].movementX, 1);
    assert.equal(events[2].buttons, 0);
    assert.equal(events[3].deltaY, 3);

    input.dispose();
    stream.destroy();
});

test('hit testing, click synthesis, focus, and pointer capture work together', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const target = new Container();
    target.width = 8;
    target.height = 3;
    target.focusable = true;
    scene.add_child(target);
    scene.calculate_layout(20, 10);

    const calls = [];
    target.addEventListener('mousedown', () => target.setPointerCapture());
    target.addEventListener('mousemove', () => calls.push('captured move'));
    target.addEventListener('click', () => calls.push('click'));

    scene.trigger_input_event(new MouseInputEvent('mousedown', { x: 1, y: 1, button: 0, buttons: 1 }));
    assert.equal(scene.get_focused_node(), target);
    assert.equal(target.hasPointerCapture(), true);
    scene.trigger_input_event(new MouseInputEvent('mousemove', { x: 15, y: 8, button: 0, buttons: 1 }));
    scene.trigger_input_event(new MouseInputEvent('mouseup', { x: 1, y: 1, button: 0, buttons: 0 }));
    assert.deepEqual(calls, ['captured move', 'click']);
    assert.equal(target.hasPointerCapture(), false);
    scene.dispose(true);
});

test('input box edits graphemes, supports selection, cancellation, and cursor state', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const editor = new InputBox();
    scene.add_child(editor);
    scene.calculate_layout(40, 6);
    editor.focus();

    scene.trigger_input_event(new KeyInputEvent('keydown', { key: '你' }));
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: '🙂' }));
    assert.equal(editor.value, '你🙂');
    assert.equal(editor.selection_start, 2);

    editor.addEventListener('beforeinput', (event) => {
        if (event.data === 'x') event.preventDefault();
    });
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'x' }));
    assert.equal(editor.value, '你🙂');

    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'a', ctrl: true }));
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'K' }));
    assert.equal(editor.value, 'K');
    assert.equal(editor.get_cursor_state().visible, true);
    assert.equal(editor.get_cursor_state().position.x, editor.get_content_rect().x + 1);
    scene.dispose(true);
});

test('framebuffer performs source-over alpha, opacity, scissor, and cropped blits', () => {
    const blue = Color.of(0, 0, 255);
    const red = Color.of(255, 0, 0);
    const buffer = new FrameBuffer(3, 1);
    buffer.clear(blue);
    buffer.set_char(0, 0, 1, 1, undefined, 1, { bg_color: Color.of(255, 0, 0, 128) });
    const blended = buffer.readPixel(0, 0).background;
    assert.deepEqual([blended.r, blended.g, blended.b, blended.a], [128, 0, 127, 255]);

    const source = new FrameBuffer(2, 1);
    source.set_char(0, 0, 1, 1, 'A', 1, { color: Color.of(255, 255, 255), bg_color: red });
    source.set_char(1, 0, 1, 1, 'B', 1, { color: Color.of(255, 255, 255), bg_color: red });
    buffer.pushOpacity(0.5);
    buffer.pushScissorRect(1, 0, 1, 1);
    buffer.drawFrameBuffer(0, 0, source);
    buffer.popScissorRect();
    buffer.popOpacity();
    assert.equal(buffer.readPixel(0, 0).text, undefined);
    assert.equal(buffer.readPixel(1, 0).text, 'B');
    assert.deepEqual(
        [buffer.readPixel(1, 0).background.r, buffer.readPixel(1, 0).background.b],
        [128, 127],
    );

    buffer.blendFunc(BlendFactor.One, BlendFactor.Zero);
    buffer.set_char(2, 0, 1, 1, 'X', 1, { bg_color: Color.of(8, 9, 10, 100) });
    assert.deepEqual(
        [buffer.readPixel(2, 0).background.r, buffer.readPixel(2, 0).background.g,
            buffer.readPixel(2, 0).background.b, buffer.readPixel(2, 0).background.a],
        [8, 9, 10, 100],
    );
});

test('renderer hides the cursor while drawing and restores the focused input caret', async () => {
    class TerminalStream extends Writable {
        columns = 20;
        rows = 5;
        output = '';
        _write(chunk, _encoding, done) {
            this.output += chunk.toString();
            done();
        }
    }

    const { input } = createInput();
    const scene = new Scene(input);
    const editor = new InputBox();
    editor.width = 12;
    editor.value = 'abc';
    scene.add_child(editor);
    editor.focus();

    const stream = new TerminalStream();
    const renderer = new Renderer(stream, (active) => {
        active.draw_scene();
        active.execute_render(Rect.of(0, 0, active.width, active.height), Rect.of(0, 0, active.width, active.height), false, false);
    });
    renderer.set_scene(scene);
    renderer.queue_render();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    assert.match(stream.output, /\x1b\[\?25l/);
    assert.match(stream.output, /\x1b\[2;6H\x1b\[\?25h$/);
    renderer.clear_scene();
    scene.dispose(true);
});
