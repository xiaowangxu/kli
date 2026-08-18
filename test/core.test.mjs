import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import test from 'node:test';

import {
    BlendFactor,
    Button,
    Checkbox,
    CommandPalette,
    Clipboard,
    Color,
    Container,
    Display,
    EditBuffer,
    FlexDirection,
    FrameBuffer,
    FocusGroup,
    Input,
    InputBox,
    InputEvent,
    InputEventPhase,
    KeyInputEvent,
    MouseButton,
    MouseInputEvent,
    MemoryClipboardBackend,
    Modal,
    Overflow,
    PasteInputEvent,
    Position,
    Rect,
    Renderer,
    Scene,
    ScrollBar,
    ScrollBox,
    Select,
    Slider,
    SplitPane,
    Tabs,
    TextArea,
    Text,
    TextContainer,
    TextContent,
    TextSelection,
    TestRenderer,
    ValueInputEvent,
    VirtualList,
    calculate_string_width,
    decode_terminal_text,
    get_text_layout,
} from '../dist/index.mjs';

test('ScrollBox exposes two-axis metrics and ScrollBar stays synchronized', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    scene.flex_direction = FlexDirection.Row;
    const viewport = new ScrollBox();
    viewport.scroll_x = true;
    viewport.scroll_y = true;
    viewport.width = 10;
    viewport.height = 5;
    viewport.flex_shrink = 0;
    const content = new Container();
    content.width = 30;
    content.height = 20;
    content.flex_shrink = 0;
    viewport.add_child(content);

    const bar = new ScrollBar();
    bar.height = 5;
    scene.add_child(viewport);
    scene.add_child(bar);
    scene.calculate_layout(11, 5);
    bar.target = viewport;

    assert.equal(viewport.scroll_width, 30);
    assert.equal(viewport.scroll_height, 20);
    assert.equal(viewport.scroll_to(7, 8), true);
    assert.deepEqual([viewport.scroll_left, viewport.scroll_top], [7, 8]);
    assert.deepEqual([bar.scroll_size, bar.viewport_size, bar.scroll_position], [20, 5, 8]);

    bar.focus();
    scene.trigger_input_event(new KeyInputEvent().set_Key('End', 'end', true, false));
    assert.equal(bar.scroll_position, 15);
    assert.equal(viewport.scroll_top, 15);
    scene.trigger_input_event(new KeyInputEvent().set_Key('Home', 'home', true, false));
    assert.equal(viewport.scroll_top, 0);

    scene.dispose(true);
});

test('ScrollBox honors disabled axes and keeps sticky logs at the bottom', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const viewport = new ScrollBox();
    viewport.width = 8;
    viewport.height = 4;
    viewport.scroll_x = false;
    viewport.scroll_y = true;
    viewport.sticky_scroll = true;
    viewport.sticky_start = 'bottom';
    const content = new Container();
    content.width = 20;
    content.height = 12;
    content.flex_shrink = 0;
    viewport.add_child(content);
    scene.add_child(viewport);
    scene.calculate_layout(8, 4);

    viewport.sync_sticky_position();
    assert.deepEqual([viewport.scroll_left, viewport.scroll_top], [0, 8]);
    assert.equal(viewport.scroll_to(9, 3), true);
    assert.deepEqual([viewport.scroll_left, viewport.scroll_top], [0, 3]);

    scene.dispose(true);
});

test('Select separates highlight from commit, skips disabled items, and typeaheads', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const select = new Select();
    select.options = [
        { name: 'Alpha', value: 'a' },
        { name: 'Blocked', value: 'b', disabled: true },
        { name: 'Charlie', value: 'c' },
        { name: 'Delta', value: 'd' },
    ];
    scene.add_child(select);
    scene.calculate_layout(30, 8);
    select.focus();

    assert.equal(select.highlighted_index, 0);
    assert.equal(select.selected_index, -1);
    scene.trigger_input_event(new KeyInputEvent().set_Key('ArrowDown', 'down', true, false));
    assert.equal(select.highlighted_index, 2);
    assert.equal(select.selected_index, -1);
    scene.trigger_input_event(new KeyInputEvent().set_Key('Enter', 'enter', true, false));
    assert.equal(select.value, 'c');

    scene.trigger_input_event(new KeyInputEvent().set_Key('d', 'd', true, false));
    assert.equal(select.highlighted_index, 3);
    assert.equal(select.value, 'c');
    scene.trigger_input_event(new KeyInputEvent().set_Key('Enter', 'enter', true, false));
    assert.equal(select.value, 'd');

    select.options = [];
    assert.equal(select.highlighted_index, -1);
    assert.equal(select.selected_index, -1);
    scene.dispose(true);
});

test('drag and drop dispatches DOM-style lifecycle events and supports cancellation', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    scene.flex_direction = FlexDirection.Row;
    const source = new Container();
    source.width = 5;
    source.height = 3;
    source.flex_shrink = 0;
    source.draggable = true;
    const target = new Container();
    target.width = 5;
    target.height = 3;
    target.flex_shrink = 0;
    target.droppable = true;
    scene.add_child(source);
    scene.add_child(target);
    scene.calculate_layout(10, 3);

    const calls = [];
    source.addEventListener('dragstart', (event) => {
        calls.push('start');
        event.dataTransfer.setData('text/plain', 'card-1');
    });
    source.addEventListener('dragend', (event) => calls.push(event.cancelled ? 'cancel' : 'end'));
    target.addEventListener('dragenter', () => calls.push('enter'));
    target.addEventListener('dragover', (event) => event.preventDefault());
    target.addEventListener('drop', (event) => calls.push(`drop:${event.dataTransfer.getData('text/plain')}`));

    scene.trigger_input_event(new MouseInputEvent('mousedown', { x: 1, y: 1, button: MouseButton.Primary, buttons: 1 }));
    scene.trigger_input_event(new MouseInputEvent('mousemove', { x: 6, y: 1, buttons: 1 }));
    scene.trigger_input_event(new MouseInputEvent('mouseup', { x: 6, y: 1, button: MouseButton.Primary }));
    assert.deepEqual(calls.slice(0, 4), ['start', 'enter', 'drop:card-1', 'end']);

    scene.trigger_input_event(new MouseInputEvent('mousedown', { x: 1, y: 1, button: MouseButton.Primary, buttons: 1 }));
    scene.trigger_input_event(new MouseInputEvent('mousemove', { x: 4, y: 1, buttons: 1 }));
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'Escape' }));
    assert.equal(calls.at(-1), 'cancel');
    scene.dispose(true);
});

test('focus groups provide roving navigation and keyboard-equivalent reordering', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const group = new FocusGroup();
    group.orientation = 'horizontal';
    const first = new Button();
    const second = new Button();
    first.draggable = true;
    group.add_child(first);
    group.add_child(second);
    scene.add_child(group);
    scene.calculate_layout(30, 5);
    first.focus();

    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'ArrowRight' }));
    assert.equal(scene.get_focused_node(), second);
    let direction;
    first.addEventListener('dragreorder', (event) => { direction = event.direction; });
    first.focus();
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'ArrowRight', alt: true }));
    assert.equal(direction, 'right');
    assert.equal(scene.get_focused_node(), first);
    scene.dispose(true);
});

test('modal focus is trapped and restored after Escape', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const background = new Button();
    const modal = new Modal();
    const confirm = new Button();
    const cancel = new Button();
    modal.add_child(confirm);
    modal.add_child(cancel);
    scene.add_child(background);
    scene.add_child(modal);
    scene.calculate_layout(80, 24);
    background.focus();
    modal.open = true;

    assert.equal(scene.get_focused_node(), confirm);
    scene.trigger_input_event(new KeyInputEvent().set_Key('Tab', 'tab', true, false));
    assert.equal(scene.get_focused_node(), cancel);
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'Escape' }));
    assert.equal(modal.open, false);
    assert.equal(scene.get_focused_node(), background);
    scene.dispose(true);
});

test('command palette opens globally and filters commands', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const base = new Button();
    const palette = new CommandPalette();
    palette.commands = [
        { id: 'open', name: 'Open file', keywords: ['document'] },
        { id: 'close', name: 'Close tab' },
    ];
    scene.add_child(base);
    scene.add_child(palette);
    scene.calculate_layout(80, 24);
    base.focus();

    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'p', ctrl: true }));
    assert.equal(palette.open, true);
    assert.equal(scene.get_focused_node(), palette.search);
    palette.search.value = 'document';
    palette.search.dispatchEvent(new ValueInputEvent('input', { value: 'document' }));
    assert.equal(palette.results.options.length, 1);
    assert.equal(palette.results.options[0].value, 'open');
    scene.dispose(true);
});

test('VirtualList keeps 10,000 rows virtual and scrolls selections into view', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const list = new VirtualList();
    list.width = 40;
    list.height = 10;
    list.items = Array.from({ length: 10_000 }, (_, index) => `Row ${index}`);
    scene.add_child(list);
    scene.calculate_layout(40, 10);

    assert.equal(list.scroll_height, 10_000);
    list.selected_index = 9_999;
    const range = list.get_visible_range();
    assert.equal(range.end, 10_000);
    assert.ok(range.end - range.start <= 13);
    assert.equal(list.scroll_top, 9_990);

    list.focus();
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'Home' }));
    assert.equal(list.selected_index, 0);
    assert.equal(list.scroll_top, 0);
    scene.dispose(true);
});

test('slider and tabs expose consistent keyboard state changes', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const slider = new Slider();
    slider.min = 0;
    slider.max = 10;
    slider.step = 2;
    const tabs = new Tabs();
    tabs.tabs = [
        { id: 'one', label: 'One' },
        { id: 'two', label: 'Two', disabled: true },
        { id: 'three', label: 'Three' },
    ];
    scene.add_child(slider);
    scene.add_child(tabs);
    scene.calculate_layout(50, 4);

    slider.focus();
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'ArrowRight' }));
    assert.equal(slider.value, 2);
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'End' }));
    assert.equal(slider.value, 10);

    tabs.focus();
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'ArrowRight' }));
    assert.equal(tabs.value, 'three');
    scene.dispose(true);
});

test('SplitPane resizes by keyboard and preserves two-pane layout', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const split = new SplitPane();
    split.width = 40;
    split.height = 8;
    split.split = 12;
    const first = new Container();
    const second = new Container();
    split.add_child(first);
    split.add_child(second);
    scene.add_child(split);
    scene.calculate_layout(40, 8);
    split.focus();
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'ArrowRight' }));
    scene.calculate_layout(40, 8);
    assert.equal(split.split, 13);
    assert.equal(first.get_rect().width, 13);
    assert.equal(second.get_rect().width, 26);
    scene.dispose(true);
});

test('TestRenderer provides text snapshots, mock input, and semantic trees', async () => {
    const harness = new TestRenderer(24, 5);
    const button = new Button();
    button.label = 'Run';
    button.role = 'button';
    button.ariaLabel = 'Run task';
    harness.mount(button);
    const frame = await harness.render();
    assert.match(frame, /Run/);
    const semantic = harness.scene.exportSemanticTree();
    assert.equal(semantic.children[0].role, 'button');
    assert.equal(semantic.children[0].label, 'Run task');
    harness.mouse.click(2, 1);
    assert.equal(harness.scene.get_focused_node(), button);
    harness.dispose();
});

test('dirty drawing is the default and paints empty cells with the theme canvas', async () => {
    const harness = new TestRenderer(8, 3);
    await harness.render();

    assert.equal(harness.renderer.dirtyDraw, true);
    assert.match(harness.ansi(), /\x1b\[48;2;8;11;18m/);

    harness.renderer.dirtyDraw = false;
    assert.equal(harness.renderer.dirty_draw, false);
    harness.dispose();
});

test('display none excludes an entire subtree from drawing, hit testing, and focus order', async () => {
    const harness = new TestRenderer(30, 6);
    const root = new Container();
    root.flex_direction = FlexDirection.Column;
    const hidden = new Container();
    hidden.display = Display.None;
    const hiddenButton = new Button();
    hiddenButton.label = 'HIDDEN ACTION';
    hidden.add_child(hiddenButton);
    const visibleButton = new Button();
    visibleButton.label = 'Visible';
    root.add_child(hidden);
    root.add_child(visibleButton);
    harness.mount(root);

    const frame = await harness.render();
    assert.doesNotMatch(frame, /HIDDEN ACTION/);
    assert.equal(harness.scene.get_next_focusable(), visibleButton);
    assert.notEqual(harness.scene.hit_test(0, 0), hiddenButton);
    harness.dispose();
});

function createInput(options) {
    const stream = new PassThrough();
    stream.isTTY = false;
    return { input: new Input(stream, options), stream };
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

test('Scene and a shrinkable root stay pinned to the terminal viewport', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const root = new Container();
    root.width = '100%';
    root.height = '100%';
    root.min_height = 0;
    root.flex_direction = FlexDirection.Column;
    root.overflow = Overflow.Hidden;

    const header = new Container();
    header.height = 3;
    header.flex_shrink = 0;
    const body = new Container();
    body.flex_grow = 1;
    body.flex_shrink = 1;
    body.flex_basis = 0;
    body.min_height = 0;
    body.overflow = Overflow.Hidden;
    const oversizedContent = new Container();
    oversizedContent.min_height = 100;
    body.add_child(oversizedContent);
    root.add_child(header);
    root.add_child(body);
    scene.add_child(root);

    scene.calculate_layout(80.9, 24.9);

    assert.deepEqual(scene.get_screen_size(), Position.of(80, 24));
    assert.deepEqual(scene.get_rect(), Rect.of(0, 0, 80, 24));
    assert.deepEqual(root.get_rect(), Rect.of(0, 0, 80, 24));
    assert.equal(body.get_rect().y + body.get_rect().height, 24);
    scene.dispose(true);
});

test('mounted layout property changes request a new frame', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const child = new Container();
    scene.add_child(child);

    let changes = 0;
    scene.on_changed.connect(() => changes++);
    child.width = 20;
    child.padding = 2;
    child.flex_grow = 1;

    assert.equal(changes, 3);
    scene.dispose(true);
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

test('bracketed paste is emitted once even when protocol packets are split', () => {
    const { input, stream } = createInput();
    const events = [];
    input.on_input.connect((event) => events.push(event));
    input.init();

    stream.write('\x1b[20');
    stream.write('0~first line\n中文🙂\x1b[20');
    stream.write('1~');

    assert.equal(events.length, 1);
    assert.equal(events[0] instanceof PasteInputEvent, true);
    assert.equal(events[0].text, 'first line\n中文🙂');

    input.dispose();
    stream.destroy();
});

test('stdin preserves split UTF-8 and decodes bracketed paste from a Windows code page', () => {
    const { input, stream } = createInput({ pasteEncoding: 'gb18030' });
    const events = [];
    input.on_input.connect((event) => events.push(event));
    input.init();

    const typed = Buffer.from('中🙂', 'utf8');
    for (const byte of typed) stream.write(Buffer.from([byte]));

    const gbk = Buffer.from([0xc4, 0xe3, 0xba, 0xc3]); // 你好 in CP936/GBK.
    stream.write(Buffer.from('\x1b[20'));
    stream.write(Buffer.concat([Buffer.from('0~'), gbk.subarray(0, 1)]));
    stream.write(Buffer.concat([gbk.subarray(1), Buffer.from('\x1b[201~')]));

    const keys = events.filter((event) => event instanceof KeyInputEvent).map((event) => event.key).join('');
    const paste = events.find((event) => event instanceof PasteInputEvent);
    assert.equal(keys, '中🙂');
    assert.equal(paste.text, '你好');
    assert.equal(paste.encoding, 'gb18030');
    assert.deepEqual([...paste.bytes], [...gbk]);

    input.dispose();
    stream.destroy();
});

test('Kitty CSI-u preserves raw packets, modifiers, repeat/release, and terminal focus', () => {
    const { input, stream } = createInput({ keyboardProtocol: 'kitty', focusReporting: true });
    const events = [];
    input.on_input.connect((event) => events.push(event));
    input.init();

    stream.write('\x1b[97;6:2u');
    stream.write('\x1b[97;1:3u');
    stream.write('\x1b[I\x1b[O');
    stream.write('\x1b]10;rgb:ffff/ffff/ffff\x07');

    assert.deepEqual(events.map((event) => event.type), ['keydown', 'keyup', 'terminalfocus', 'terminalblur', 'terminalcolor']);
    assert.equal(events[0].key, 'a');
    assert.equal(events[0].ctrl, true);
    assert.equal(events[0].shift, true);
    assert.equal(events[0].repeat, true);
    assert.equal(events[0].raw, '\x1b[97;6:2u');
    assert.equal(events[1].pressed, false);
    assert.equal(events[4].slot, 'foreground');
    input.dispose();
    stream.destroy();
});

test('grapheme width handles keycaps, ZWJ emoji, combining marks, and ambiguous width', () => {
    assert.equal(calculate_string_width('1️⃣'), 2);
    assert.equal(calculate_string_width('👩‍💻'), 2);
    assert.equal(calculate_string_width('e\u0301'), 1);
    assert.equal(calculate_string_width('\u0301'), 0);
    assert.equal(calculate_string_width('·', 2), 2);
});

test('text layout shares grapheme, cell, wrapping, and selection boundaries', () => {
    const value = 'A👩🏽‍💻e\u0301🇨🇳1️⃣中文 hello world';
    const layout = get_text_layout(value);
    assert.equal(get_text_layout(value), layout);
    assert.deepEqual(layout.cells.slice(0, 7).map((cell) => [cell.char, cell.width]), [
        ['A', 1], ['👩🏽‍💻', 2], ['e\u0301', 1], ['🇨🇳', 2], ['1️⃣', 2], ['中', 2], ['文', 2],
    ]);
    assert.equal(layout.slice(1, 5), '👩🏽‍💻e\u0301🇨🇳1️⃣');
    assert.equal(layout.indexAtColumn(2, 'backward'), 1);
    assert.equal(layout.indexAtColumn(2, 'forward'), 2);

    const wrapped = layout.wrap(8, 'word');
    assert.equal(layout.wrap(8, 'word'), wrapped);
    assert.equal(wrapped.entries.map((entry) => entry.char).join(''), value);
    assert.ok(wrapped.lines.every((line) => line.width <= 8));

    const decoded = decode_terminal_text(Buffer.from([0xc4, 0xe3, 0xba, 0xc3]), 'gb18030');
    assert.deepEqual(decoded, { text: '你好', encoding: 'gb18030' });
});

test('clipboard policies avoid the server host during remote sessions', async () => {
    const host = new MemoryClipboardBackend();
    const terminal = new MemoryClipboardBackend();
    const local = new Clipboard({ host, terminal, remote: false });
    const localResult = await local.writeText('local');
    assert.equal(localResult.host.status, 'written');
    assert.equal(localResult.terminal.status, 'not-attempted');
    assert.equal(host.text, 'local');

    const remote = new Clipboard({ host, terminal, remote: true });
    const remoteResult = await remote.writeText('remote');
    assert.equal(remoteResult.host.status, 'not-attempted');
    assert.equal(remoteResult.terminal.status, 'written');
    assert.equal(terminal.text, 'remote');
});

test('edit buffer tracks grapheme selections, word boundaries, and undo history', () => {
    const buffer = new EditBuffer('hello 中文🙂');
    buffer.caret = buffer.length;
    buffer.anchor = buffer.caret;
    assert.equal(buffer.wordBoundaryBackward(), 8);
    assert.equal(buffer.wordBoundaryBackward(8), 6);
    buffer.setSelectionRange(6, buffer.length);
    buffer.replaceSelection('Kli');
    assert.equal(buffer.value, 'hello Kli');
    assert.equal(buffer.undo(), true);
    assert.equal(buffer.value, 'hello 中文🙂');
    assert.equal(buffer.redo(), true);
    assert.equal(buffer.value, 'hello Kli');
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
    assert.equal(events[3].deltaY, 1);

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

test('scene text selection spans terminal cells and copies through the clipboard', async () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const backend = new MemoryClipboardBackend();
    scene.clipboard = new Clipboard({ host: backend, remote: false });
    const textBox = new TextContainer();
    const text = new Text();
    const content = new TextContent();
    content.content = 'hello 中文🙂';
    text.add_child(content);
    textBox.add_child(text);
    scene.add_child(textBox);
    scene.calculate_layout(30, 4);

    scene.trigger_input_event(new MouseInputEvent('mousedown', { x: 0, y: 0, button: 0, buttons: 1 }));
    scene.trigger_input_event(new MouseInputEvent('mousemove', { x: 7, y: 0, button: 0, buttons: 1 }));
    scene.trigger_input_event(new MouseInputEvent('mouseup', { x: 7, y: 0, button: 0, buttons: 0 }));
    assert.equal(scene.getSelectedText(), 'hello 中');

    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'c', ctrl: true }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(backend.text, 'hello 中');

    const wideSelection = new TextSelection(Position.of(7, 0), Position.of(8, 0));
    assert.equal(textBox.get_selected_rows(wideSelection)[0].text, '中文');
    const collapsed = new TextSelection(Position.of(6, 0));
    assert.deepEqual(textBox.get_selected_rows(collapsed), []);

    scene.clearSelection();
    assert.equal(scene.hasSelection, false);
    scene.dispose(true);
});

test('input box edits graphemes, supports selection, clipboard, cancellation, and cursor state', async () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const editor = new InputBox();
    const clipboardBackend = new MemoryClipboardBackend();
    scene.clipboard = new Clipboard({ host: clipboardBackend, remote: false });
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

    scene.trigger_input_event(new PasteInputEvent({ text: '粘贴\n内容' }));
    assert.equal(editor.value, '你🙂粘贴 内容');

    editor.setSelectionRange(0, 2);
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'c', ctrl: true }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(clipboardBackend.text, '你🙂');
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'x', ctrl: true }));
    assert.equal(editor.value, '粘贴 内容');
    clipboardBackend.text = '复制';
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'v', ctrl: true }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(editor.value, '复制粘贴 内容');

    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'a', ctrl: true }));
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'K' }));
    assert.equal(editor.value, 'K');
    assert.equal(editor.get_cursor_state().visible, true);
    assert.equal(editor.get_cursor_state().position.x, editor.get_content_rect().x + 1);
    scene.dispose(true);
});

test('textarea edits multiple lines, navigates visually, and supports history', () => {
    const { input } = createInput();
    const scene = new Scene(input);
    const editor = new TextArea();
    editor.width = 14;
    editor.height = 7;
    scene.add_child(editor);
    scene.calculate_layout(20, 8);
    editor.focus();

    scene.trigger_input_event(new PasteInputEvent({ text: 'first\n中文🙂' }));
    assert.equal(editor.value, 'first\n中文🙂');
    assert.ok(editor.get_cursor_state().position.y > editor.get_content_rect().y);

    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'ArrowUp' }));
    const upperSelection = editor.selection_end;
    assert.ok(upperSelection <= 5);
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'ArrowDown' }));
    assert.ok(editor.selection_end > upperSelection);

    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'z', ctrl: true }));
    assert.equal(editor.value, '');
    scene.trigger_input_event(new KeyInputEvent('keydown', { key: 'y', ctrl: true }));
    assert.equal(editor.value, 'first\n中文🙂');
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

test('dirty drawing re-anchors cells after wide graphemes and contains background runs', async () => {
    class TerminalStream extends Writable {
        columns = 30;
        rows = 2;
        output = '';
        _write(chunk, _encoding, done) {
            this.output += chunk.toString();
            done();
        }
    }

    const { input } = createInput();
    const scene = new Scene(input);
    const stream = new TerminalStream();
    const highlight = Color.of(38, 70, 96);
    const renderer = new Renderer(stream, (active) => {
        active.draw_string(0, 0, '👩‍💻');
        active.draw_char(20, 0, 5, 1, ' ', 1, { bg_color: highlight });
        const screen = Rect.of(0, 0, active.width, active.height);
        active.execute_render(screen, screen, false, false);
    }, { alternateScreen: false, mouse: false, bracketedPaste: false, dirtyDraw: true });
    renderer.set_scene(scene);
    renderer.init();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    assert.match(stream.output, /👩‍💻\x1b\[0m\x1b\[1;3H/);
    assert.match(stream.output, /\x1b\[1;1H\x1b\[0m  \x1b\[0m\x1b\[1;1H/);
    assert.match(stream.output, /\x1b\[1;21H\x1b\[0m\x1b\[48;2;38;70;96m \x1b\[0m/);
    assert.match(stream.output, /\x1b\[1;26H\x1b\[0m\x1b\[48;2;8;11;18m \x1b\[0m/);

    renderer.dispose();
    renderer.clear_scene();
    scene.dispose(true);
});

test('renderer protects the bottom-right cell from terminal autowrap scrolling', async () => {
    class TerminalStream extends Writable {
        columns = 3;
        rows = 2;
        output = '';
        _write(chunk, _encoding, done) {
            this.output += chunk.toString();
            done();
        }
    }

    const { input } = createInput();
    const scene = new Scene(input);
    const stream = new TerminalStream();
    const renderer = new Renderer(stream, (active) => {
        active.draw_char(2, 1, 1, 1, 'X');
        const screen = Rect.of(0, 0, active.width, active.height);
        active.execute_render(screen, screen, false, false);
    }, { alternateScreen: false, mouse: false, bracketedPaste: false, dirtyDraw: true });
    renderer.set_scene(scene);
    renderer.init();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    const wrapOff = stream.output.indexOf('\x1b[?7l');
    const bottomRight = stream.output.indexOf('\x1b[2;3H');
    const wrapOn = stream.output.lastIndexOf('\x1b[?7h');
    assert.ok(wrapOff >= 0 && bottomRight > wrapOff && wrapOn > bottomRight);
    assert.doesNotMatch(stream.output.slice(wrapOff, wrapOn), /[\r\n]/);

    renderer.dispose();
    renderer.clear_scene();
    scene.dispose(true);
});

test('dirty drawing prefills the complete selected span for terminal-width-ambiguous graphemes', async () => {
    class TerminalStream extends Writable {
        columns = 12;
        rows = 1;
        output = '';
        _write(chunk, _encoding, done) {
            this.output += chunk.toString();
            done();
        }
    }

    const { input } = createInput();
    const scene = new Scene(input);
    const stream = new TerminalStream();
    const selection = Color.of(32, 68, 96);
    const renderer = new Renderer(stream, (active) => {
        active.draw_string(2, 0, '1️⃣', { bg_color: selection });
        const screen = Rect.of(0, 0, active.width, active.height);
        active.execute_render(screen, screen, false, false);
    }, { alternateScreen: false, mouse: false, bracketedPaste: false, dirtyDraw: true });
    renderer.set_scene(scene);
    renderer.init();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    // Paint both logical cells before writing the grapheme. This remains correct
    // whether the host terminal itself decides that the keycap is width 1 or 2.
    assert.match(stream.output, /\x1b\[1;3H\x1b\[0m\x1b\[48;2;32;68;96m  \x1b\[0m\x1b\[1;3H/);
    assert.match(stream.output, /1️⃣\x1b\[0m/);

    renderer.dispose();
    renderer.clear_scene();
    scene.dispose(true);
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
    }, { synchronizedOutput: true, focusReporting: true, keyboardProtocol: 'kitty', dirtyDraw: true });
    renderer.set_scene(scene);
    renderer.init();
    assert.equal(renderer.copyToClipboardOSC52('Kli'), true);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    assert.match(stream.output, /\x1b\[\?25l/);
    assert.match(stream.output, /\x1b\[\?2004h/);
    assert.match(stream.output, /\x1b\[\?1004h/);
    assert.match(stream.output, /\x1b\[>31u/);
    assert.match(stream.output, /\x1b\[\?2026h/);
    assert.match(stream.output, /\x1b\]52;c;S2xp\x07/);
    assert.match(stream.output, /\x1b\[\?7h\x1b\[2;6H\x1b\[\?25h\x1b\[\?2026l$/);
    const firstFrameLength = stream.output.length;
    scene.notify_change();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    const unchangedFrame = stream.output.slice(firstFrameLength);
    assert.ok(unchangedFrame.length < firstFrameLength / 4);
    assert.doesNotMatch(unchangedFrame, /abc/);
    renderer.dispose();
    assert.match(stream.output, /\x1b\[\?2004l/);
    assert.match(stream.output, /\x1b\[\?1004l/);
    assert.match(stream.output, /\x1b\[<u/);
    renderer.clear_scene();
    scene.dispose(true);
});
