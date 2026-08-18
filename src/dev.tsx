import { createSignal, Index } from 'solid-js';
import { Align, FlexDirection, Overflow, PositionType } from 'yoga-layout';
import { BlendFactor, FrameBuffer } from './package/render/buffer.js';
import { InputEvent, InputEventPhase, MouseInputEvent, ValueInputEvent, WheelInputEvent } from './package/input/event.js';
import { TextBreak, TextWrap } from './package/node/container.js';
import { render } from './package/solid/render.js';
import { BorderStyleType } from './package/style/border_style.js';
import { Color } from './package/util/color.js';

const C = {
    canvas: Color.of(8, 11, 18), panel: Color.of(16, 21, 31), panel2: Color.of(23, 30, 43),
    line: Color.of(59, 73, 98), cyan: Color.of(74, 211, 255), violet: Color.of(170, 126, 255),
    coral: Color.of(255, 112, 122), amber: Color.of(255, 194, 92), green: Color.of(108, 224, 167),
    text: Color.of(232, 239, 251), muted: Color.of(132, 148, 174),
};

function makeBlendDemo() {
    const result = new FrameBuffer(38, 6);
    for (let y = 0; y < result.height; y++) for (let x = 0; x < result.width; x++) {
        result.set_char(x, y, 1, 1, undefined, 1, { bg_color: Color.of(10 + x * 2, 28 + y * 4, 74 + x * 2) });
    }
    const alpha = new FrameBuffer(19, 4);
    for (let y = 0; y < alpha.height; y++) for (let x = 0; x < alpha.width; x++) {
        alpha.set_char(x, y, 1, 1, undefined, 1, { bg_color: Color.of(255, 48, 92, 132) });
    }
    ' SOURCE-OVER '.split('').forEach((char, x) =>
        alpha.set_char(x + 2, 1, 1, 1, char, 1, { color: Color.of(255, 255, 255) }));
    result.drawFrameBuffer(2, 1, alpha);

    const additive = new FrameBuffer(14, 3);
    for (let y = 0; y < additive.height; y++) for (let x = 0; x < additive.width; x++) {
        additive.set_char(x, y, 1, 1, undefined, 1, { bg_color: Color.of(20, 190, 116, 150) });
    }
    ' ADD '.split('').forEach((char, x) =>
        additive.set_char(x + 4, 1, 1, 1, char, 1, { color: Color.of(255, 255, 255) }));
    result.blendFunc(BlendFactor.One, BlendFactor.One);
    result.drawFrameBuffer(20, 2, additive);
    result.useSourceOver();
    return result;
}

const blendDemo = makeBlendDemo();

function SectionTitle(props: { index: string; title: string; color: Color }) {
    return <text-box>
        <text color={props.color} bold>{props.index}</text><text color={C.muted}>  /  </text>
        <text color={C.text} bold>{props.title}</text>
    </text-box>;
}

function EventLab() {
    const [logs, setLogs] = createSignal<string[]>(['Move the mouse into the target, then click.']);
    const [pointer, setPointer] = createSignal('—');
    const [hovered, setHovered] = createSignal(false);
    const [stop, setStop] = createSignal(false);
    const phase_names: Record<number, string> = {
        [InputEventPhase.Capturing]: 'capture', [InputEventPhase.AtTarget]: 'target',
        [InputEventPhase.Bubbling]: 'bubble',
    };
    const phase = (event: InputEvent) => phase_names[event.eventPhase] ?? 'none';
    const push = (label: string, event: InputEvent) =>
        setLogs((items) => [`${label.padEnd(13)} ${phase(event)}`, ...items].slice(0, 7));

    return <box flex_grow={1} flex_shrink={1} min_width={35} padding={1}
        flex_direction={FlexDirection.Column} bg_color={C.panel} border={1}
        border_type={BorderStyleType.Round} border_color={C.line}
        on_click_capture={(event) => push('panel', event)} on_click={(event) => push('panel', event)}>
        <SectionTitle index="01" title="DOM-LIKE EVENT PIPELINE" color={C.cyan}/>
        <text-box><text color={C.muted}>
            Capture → target → bubble. Toggle stop, then click.
        </text></text-box>
        <box height={4} flex_shrink={0} border={1} border_type={BorderStyleType.Round}
            border_color={hovered() ? C.cyan : C.line} bg_color={hovered() ? Color.of(17, 48, 62) : C.panel2}
            on_mouseenter={() => setHovered(true)} on_mouseleave={() => setHovered(false)}
            on_mousemove={(event: MouseInputEvent) => setPointer(`${event.clientX}, ${event.clientY}`)}
            on_click_capture={(event) => push('outer box', event)} on_click={(event) => push('outer box', event)}>
            <box width={'100%'} height={'100%'} align_items={Align.Center} padding_horizontal={2}
                bg_color={Color.of(52, 107, 132, 112)} on_click_capture={(event) => push('target', event)}
                on_click={(event) => { push('target', event); if (stop()) event.stopPropagation(); }}>
                <text-box>
                    <text color={C.text} bold>{hovered() ? '● POINTER INSIDE' : '○ INTERACTIVE TARGET'}</text><br/>
                    <text color={C.muted}>screen x,y  </text><text color={C.cyan}>{pointer()}</text>
                </text-box>
            </box>
        </box>
        <checkbox label="stopPropagation" checked={stop()} width={25}
            on_change={(event: ValueInputEvent<boolean>) => setStop(event.value)}/>
        <box flex_grow={1} min_height={3} bg_color={Color.of(10, 14, 22)} overflow={Overflow.Scroll} focusable
            on_wheel={(event: WheelInputEvent) => push(`wheel ${event.deltaY}`, event)}>
            <text-box><text color={C.amber} bold>EVENT TRACE</text><br/>
                <Index each={logs()}>{(line) => <><text color={C.muted}>{line()}</text><br/></>}</Index>
            </text-box>
        </box>
    </box>;
}

function ControlsLab() {
    const [draft, setDraft] = createSignal('Kli');
    const [submits, setSubmits] = createSignal(0);
    const [prevent, setPrevent] = createSignal(false);
    const [guarded, setGuarded] = createSignal(false);
    return <box height={17} flex_grow={0} flex_shrink={0} padding={1}
        flex_direction={FlexDirection.Column} bg_color={C.panel} border={1}
        border_type={BorderStyleType.Round} border_color={C.line}>
        <SectionTitle index="02" title="NATIVE CONTROLS + CARET" color={C.violet}/>
        <text-box><text color={C.muted}>Tab/click the editor. Drag-select Unicode graphemes.</text></text-box>
        <input-box value={draft()} placeholder="Type English, 中文 or emoji…" width={'100%'}
            on_input={(event) => setDraft((event as ValueInputEvent<string>).value)}/>
        <box height={3} flex_shrink={0} flex_direction={FlexDirection.Row} gap={1}>
            <button label={`Submit · ${submits()}`} width={14} on_click={() => setSubmits((value) => value + 1)}/>
            <checkbox label="prevent default" checked={prevent()} flex_grow={1}
                on_change={(event: ValueInputEvent<boolean>) => setPrevent(event.value)}/>
        </box>
        <checkbox label={`guarded value: ${guarded() ? 'ON' : 'OFF'}`} checked={guarded()} width={'100%'}
            on_click={(event) => { if (prevent()) event.preventDefault(); }}
            on_change={(event: ValueInputEvent<boolean>) => setGuarded(event.value)}/>
        <text-box><text color={C.muted}>value  </text><text color={C.green}>{draft()}</text></text-box>
    </box>;
}

function GraphicsLab() {
    const [wheel, setWheel] = createSignal('wheel idle');
    return <box height={17} flex_grow={0} flex_shrink={0} padding={1}
        flex_direction={FlexDirection.Column} bg_color={C.panel} border={1}
        border_type={BorderStyleType.Round} border_color={C.line}>
        <SectionTitle index="03" title="FRAMEBUFFER + ALPHA" color={C.coral}/>
        <text-box><text color={C.muted}>Offscreen · source-over · additive · opacity</text></text-box>
        <frame-buffer source={blendDemo} width={'100%'} height={6} flex_shrink={0}/>
        <box height={3} flex_shrink={0} position={PositionType.Relative} bg_color={Color.of(26, 62, 150)}>
            <box position={PositionType.Absolute} left={3} top={0} width={23} height={3} padding_horizontal={1}
                opacity={0.72} bg_color={Color.of(255, 65, 98, 180)}>
                <text-box><text color={C.text} bold>subtree opacity 0.72</text></text-box>
            </box>
        </box>
        <box height={2} flex_shrink={0} overflow={Overflow.Scroll} focusable
            on_wheel={(event: WheelInputEvent) => setWheel(`wheel Δy ${event.deltaY}`)}>
            <text-box><text color={C.amber} bold>04 / {wheel()}</text><br/>
                <Index each={Array.from({ length: 8 }, (_, i) => i + 1)}>{(row) => <>
                    <text color={C.muted}>scroll row {row()}</text><br/>
                </>}</Index>
            </text-box>
        </box>
    </box>;
}

function App() {
    return <box position={PositionType.Absolute} top={0} left={0} right={0} bottom={0} padding={1} gap={1}
        flex_direction={FlexDirection.Column} bg_color={C.canvas}>
        <box height={1} flex_shrink={0} padding_horizontal={1} align_items={Align.Center} bg_color={C.panel2}>
            <text-box><text color={C.cyan} bold>KLI</text><text color={C.muted}>  /  INTERACTION & COMPOSITING LAB</text>
                <text color={C.green}>   LIVE</text></text-box>
        </box>
        <box flex_grow={1} flex_shrink={1} gap={1} flex_direction={FlexDirection.Row}>
            <EventLab/>
            <box flex_grow={1} flex_shrink={1} min_width={37} overflow={Overflow.Scroll}
                focusable flex_direction={FlexDirection.Column} gap={1}>
                <ControlsLab/><GraphicsLab/>
            </box>
        </box>
        <text-box><text color={C.muted} text_wrap={TextWrap.NoWrap} text_break={TextBreak.KeepAll}>
            Tab / Shift+Tab focus · arrows edit · wheel scroll · mouse click & drag · Ctrl+C quit
        </text></text-box>
    </box>;
}

render(App);
