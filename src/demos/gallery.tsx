import { createMemo, createSignal, For, onCleanup, onMount } from 'solid-js';
import { Align, Display, FlexDirection, Overflow, PositionType, Wrap } from 'yoga-layout';
import type { CommandPalette, Menu } from '../package/component/menu.js';
import type { ScrollBar, ScrollBox } from '../package/component/scroll.js';
import type { ToastHost } from '../package/component/extra_controls.js';
import type { Tree } from '../package/component/virtual_list.js';
import { DragInputEvent, InputEvent, KeyboardDragInputEvent, KeyInputEvent, MouseInputEvent, PasteInputEvent, ValueInputEvent } from '../package/input/event.js';
import type { YogaValueAuto } from '../package/layout/layout.js';
import { render } from '../package/solid/render.js';
import { BorderStyleType } from '../package/style/border_style.js';
import { Color } from '../package/util/color.js';
import { demoCatalog } from './catalog.js';

const C = {
    canvas:Color.of(16, 21, 31), panel: Color.of(16, 21, 31), raised: Color.of(23, 30, 43),
    inset: Color.of(12, 17, 26), border: Color.of(59, 73, 98), text: Color.of(232, 239, 251),
    muted: Color.of(132, 148, 174), cyan: Color.of(74, 211, 255), green: Color.of(108, 224, 167),
    amber: Color.of(255, 194, 92), coral: Color.of(255, 112, 122), violet: Color.of(170, 126, 255),
};

const rows = Array.from({ length: 10_000 }, (_, index) => ({
    id: index + 1,
    name: `Virtual record ${String(index + 1).padStart(5, '0')}`,
    state: ['ready', 'queued', 'running'][index % 3],
}));

function Panel(props: { title: string; tone?: Color; children?: unknown; flex_grow?: number; width?: YogaValueAuto; height?: YogaValueAuto }) {
    return <box flex_grow={props.flex_grow ?? 1} width={props.width} height={props.height} min_width={22} min_height={5}
        padding={1} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}
        bg_color={C.raised} border={1} border_type={BorderStyleType.Round} border_color={C.border}>
        <text-box flex_shrink={0}><text color={props.tone ?? C.amber} bold>{props.title}</text></text-box>
        {props.children as any}
    </box>;
}

function TreeSample() {
    let tree!: Tree;
    onMount(() => tree.setTree([
        { id: 'src', label: 'src', expanded: true, children: [
            { id: 'components', label: 'components', expanded: true, children: [
                { id: 'select', label: 'select.ts' }, { id: 'scroll', label: 'scroll.ts' },
            ] },
            { id: 'renderer', label: 'renderer.ts' },
        ] },
        { id: 'tests', label: 'tests', children: [{ id: 'core', label: 'core.test.mjs' }] },
    ]));
    return <tree ref={tree} width={'100%'} flex_grow={1}/>;
}

function Gallery() {
    const [demoId, setDemoId] = createSignal('D01');
    const [layoutSplit, setLayoutSplit] = createSignal(55);
    const [layoutGap, setLayoutGap] = createSignal(1);
    const [protocol, setProtocol] = createSignal<string[]>(['Waiting for keyboard, mouse or paste input…']);
    const [inputValue, setInputValue] = createSignal('KLI 中文 👩‍💻 1️⃣');
    const [textareaValue, setTextareaValue] = createSignal('Line one\n中文与 emoji 👩‍💻\nTry selection, paste and Ctrl+Z.');
    const [enabled, setEnabled] = createSignal(true);
    const [progress, setProgress] = createSignal(42);
    const [selectValue, setSelectValue] = createSignal('alpha');
    const [cards, setCards] = createSignal([
        { id: 'A-01', lane: 'BACKLOG' }, { id: 'A-02', lane: 'BACKLOG' },
        { id: 'B-01', lane: 'DONE' },
    ]);
    const [dragMessage, setDragMessage] = createSignal('Drag a card between columns · Escape cancels');
    const [dialogOpen, setDialogOpen] = createSignal(false);
    const [page, setPage] = createSignal(8);
    const [tick, setTick] = createSignal(0);
    let verticalScroll!: ScrollBox;
    let horizontalScroll!: ScrollBox;
    let verticalBar!: ScrollBar;
    let horizontalBar!: ScrollBar;
    let palette!: CommandPalette;
    let menu!: Menu;
    let toast!: ToastHost;

    const active = createMemo(() => demoCatalog.find((demo) => demo.id === demoId()) ?? demoCatalog[0]);
    const pushProtocol = (line: string) => setProtocol((items) => [line, ...items].slice(0, 8));
    const inspect = (event: InputEvent) => {
        if (demoId() !== 'D02') return;
        if (event instanceof KeyInputEvent) {
            pushProtocol(`${event.type.padEnd(8)} key=${JSON.stringify(event.key)} ctrl=${event.ctrl} shift=${event.shift} raw=${JSON.stringify(event.raw)}`);
        }
        else if (event instanceof PasteInputEvent) {
            pushProtocol(`paste     ${event.bytes.length} bytes ${event.encoding} ${JSON.stringify(event.text.slice(0, 36))}`);
        }
    };
    const inspectMouse = (event: MouseInputEvent) => {
        if (demoId() === 'D02') pushProtocol(`${event.type.padEnd(8)} x=${event.clientX} y=${event.clientY} button=${event.button} buttons=${event.buttons}`);
    };
    const moveCard = (id: string, lane: string) => {
        setCards((items) => items.map((item) => item.id === id ? { ...item, lane } : item));
        setDragMessage(`${id} moved to ${lane}`);
    };
    const dropCard = (lane: string, event: DragInputEvent) => {
        const id = event.dataTransfer.getData('application/x-kli-card');
        if (id) moveCard(id, lane);
    };

    const timer = setInterval(() => {
        if (demoId() !== 'D12') return;
        setTick((value) => value + 1);
        setProgress((value) => (value + 3) % 101);
    }, 500);
    onCleanup(() => clearInterval(timer));

    return <box width={'100%'} height={'100%'} min_width={0} min_height={0} flex_shrink={1}
        padding={0} gap={0} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden} bg_color={C.canvas}
        on_keydown_capture={inspect} on_keyup_capture={inspect} on_paste_capture={inspect} on_mousedown_capture={inspectMouse}>
        <box height={3} flex_shrink={0} padding_horizontal={1} align_items={Align.Center} flex_direction={FlexDirection.Row} bg_color={C.raised}
            border={1} border_type={BorderStyleType.Round} border_color={C.border}>
            <text-box flex_grow={1}><text color={C.cyan} bold>KLI INTERACTION LAB</text>
                <text color={C.muted}>  component + interaction regression gallery</text></text-box>
            <text-box><text color={C.green}> 12 LIVE DEMOS</text></text-box>
        </box>

        <split-pane flex_grow={1} flex_shrink={1} flex_basis={0} min_height={0} overflow={Overflow.Hidden}
            split={38} min_split={32} max_split={50}>
            <box min_width={28} min_height={0} padding={1} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}
                bg_color={C.panel} border={1} border_type={BorderStyleType.Round} border_color={C.border}>
                <text-box flex_shrink={0}><text color={C.amber} bold>DEMO INDEX</text><br/>
                    <text color={C.muted}>Choose a contract to inspect</text></text-box>
                <select flex_grow={1} flex_shrink={1} flex_basis={0} min_height={0} width={'100%'} options={demoCatalog.map((demo) => ({
                    name: `${demo.id} ${demo.title}`, value: demo.id, description: demo.priority,
                }))} value={demoId()} on_change={(event: ValueInputEvent<string>) => setDemoId(event.value)}/>
                <text-box flex_shrink={0}><text color={C.muted}>↑↓ navigate  Enter commit</text><br/>
                    <text color={C.cyan}>Tab</text><text color={C.muted}> enters the active demo</text></text-box>
            </box>

            <box flex_grow={1} flex_shrink={1} min_width={42} min_height={0} padding={1} gap={1} flex_direction={FlexDirection.Column}
                overflow={Overflow.Hidden} bg_color={C.panel} border={1} border_type={BorderStyleType.Round} border_color={C.border}>
                <box height={5} flex_shrink={0} padding_horizontal={1} flex_direction={FlexDirection.Column} justify_content={1} bg_color={C.inset}>
                    <text-box><text color={C.cyan} bold>{active().id} / {active().title}</text><text color={C.muted}>  {active().priority}</text><br/>
                        <text color={C.text}>{active().summary}</text><br/>
                        <text color={C.green}>PASS  {active().acceptance}</text></text-box>
                </box>

                <box flex_grow={1} flex_shrink={1} flex_basis={0} min_height={0} overflow={Overflow.Hidden}>
                    <box display={demoId() === 'D01' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}>
                                <box height={7} flex_shrink={0} gap={1} flex_direction={FlexDirection.Row}>
                                    <Panel title={`PRIMARY WIDTH · ${layoutSplit()}%`}><slider width={'100%'} min={25} max={75} value={layoutSplit()}
                                        on_change={(event: ValueInputEvent<number>) => setLayoutSplit(event.value)}/></Panel>
                                    <Panel title={`GAP · ${layoutGap()} CELL`}><slider width={'100%'} min={0} max={4} value={layoutGap()}
                                        on_change={(event: ValueInputEvent<number>) => setLayoutGap(event.value)}/></Panel>
                                </box>
                                <box flex_grow={1} min_height={7} gap={layoutGap()} flex_direction={FlexDirection.Row} overflow={Overflow.Hidden}>
                                    <box width={`${layoutSplit()}%`} min_width={12} padding={1} bg_color={C.raised} border={1} border_color={C.cyan}>
                                        <text-box><text color={C.cyan} bold>FLEX A</text><br/><text color={C.muted}>percentage width</text><br/>
                                            <text color={C.text}>Resize the terminal and watch integer cells remain sealed.</text></text-box>
                                    </box>
                                    <box flex_grow={1} min_width={10} padding={1} bg_color={C.inset} border={1} border_color={C.violet}>
                                        <text-box><text color={C.violet} bold>FLEX B</text><br/><text color={C.muted}>remainder owner</text></text-box>
                                    </box>
                                </box>
                    </box>

                    <box display={demoId() === 'D02' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}>
                                <Panel title="LIVE INPUT TARGET" height={10} flex_grow={0}>
                                    <input-box width={'100%'} disabled={!enabled()} value={inputValue()} on_input={(event) => { setInputValue((event as ValueInputEvent<string>).value); }}/>
                                    <text-box><text color={C.muted}>Type, paste, use modifiers, focus the terminal, or move the mouse.</text></text-box>
                                </Panel>
                                <Panel title="NORMALIZED EVENT STREAM" tone={C.coral}>
                                    <scrollbox flex_grow={1} scroll_y sticky_scroll sticky_start="top" padding_horizontal={1} bg_color={C.inset}>
                                        <text-box><For each={protocol()}>{(line) => <><text color={C.text}>{line}</text><br/></>}</For></text-box>
                                    </scrollbox>
                                </Panel>
                    </box>

                    <box display={demoId() === 'D03' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}>
                                <Panel title="CROSS-NODE SELECTION" tone={C.green}>
                                    <text-box selectable flex_grow={1}><text color={C.text}>Drag from one styled node into the next:</text><br/><br/>
                                        <text color={C.cyan} bold>English · 中文</text><text color={C.text}> · </text>
                                        <text color={C.amber}>👩‍💻 · 1️⃣</text><text color={C.text}> · é · 🇨🇳</text><br/>
                                        <text color={C.muted}>The highlight must stay contiguous across every 1/2-cell grapheme.</text><br/><br/>
                                        <text color={C.green}>Ctrl+C copies the normalized Unicode text.</text></text-box>
                                </Panel>
                                <box height={7} flex_shrink={0} gap={1} flex_direction={FlexDirection.Row}>
                                    <Panel title="HOST CLIPBOARD"><text-box><text color={C.muted}>Local terminal → native clipboard</text></text-box></Panel>
                                    <Panel title="REMOTE POLICY"><text-box><text color={C.muted}>SSH → OSC52 without mutating remote host</text></text-box></Panel>
                                </box>
                    </box>

                    <box display={demoId() === 'D04' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Row} flex_wrap={Wrap.Wrap} overflow={Overflow.Hidden}>
                                <Panel title="SINGLE LINE / GRAPHEME EDITOR" width={'48%'}>
                                    <input-box width={'100%'} value={inputValue()} on_input={(event) => { setInputValue((event as ValueInputEvent<string>).value); }}/>
                                    <text-box><text color={C.muted}>Ctrl+←/→ words · Shift selects · Ctrl+Z/Y history</text></text-box>
                                    <checkbox label="Editing enabled" checked={enabled()} on_change={(event: ValueInputEvent<boolean>) => setEnabled(event.value)}/>
                                    <text-box><text color={C.green}>VALUE  </text><text color={C.text}>{inputValue()}</text></text-box>
                                </Panel>
                                <Panel title="MULTILINE / WORD WRAP" width={'48%'}>
                                    <textarea width={'100%'} flex_grow={1} disabled={!enabled()} value={textareaValue()}
                                        on_input={(event) => { setTextareaValue((event as ValueInputEvent<string>).value); }}/>
                                    <text-box><text color={C.muted}>Wheel scroll · Home/End · paste multiple lines</text></text-box>
                                </Panel>
                    </box>

                    <box display={demoId() === 'D05' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Row} flex_wrap={Wrap.Wrap} overflow={Overflow.Hidden}>
                                <Panel title="DESCRIPTIONS + DISABLED" width={'48%'}>
                                    <select width={'100%'} flex_grow={1} value={selectValue()} options={[
                                        { name: 'Alpha', value: 'alpha', description: 'ready' },
                                        { name: 'Bravo', value: 'bravo', disabled: true, description: 'disabled' },
                                        { name: 'Charlie', value: 'charlie', description: 'type c' },
                                        { name: 'Delta', value: 'delta', description: 'available' },
                                    ]} on_change={(event: ValueInputEvent<string>) => setSelectValue(event.value)}/>
                                    <text-box><text color={C.green}>COMMITTED  {selectValue()}</text></text-box>
                                </Panel>
                                <Panel title="TYPEAHEAD / 1,000 OPTIONS" width={'48%'}>
                                    <select width={'100%'} flex_grow={1} options={Array.from({ length: 1000 }, (_, index) => ({
                                        name: `Option ${String(index + 1).padStart(4, '0')}`, value: index, description: index % 2 ? 'odd' : 'even',
                                    }))}/>
                                    <text-box><text color={C.muted}>EMPTY STATE</text></text-box>
                                    <select width={'100%'} height={3} options={[]} empty_text="No matching options"/>
                                </Panel>
                    </box>

                    <box display={demoId() === 'D06' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}>
                                <Panel title="VERTICAL + NESTED WHEEL CHAIN">
                                    <scrollbox flex_grow={1} scroll_y padding={1} bg_color={C.inset} border={1} border_color={C.border}>
                                        <text-box>{Array.from({ length: 8 }, (_, index) => `Outer row ${String(index + 1).padStart(2, '0')} · wheel / PageUp / PageDown\n`).join('')}</text-box>
                                        <scrollbox height={5} flex_shrink={0} scroll_y padding={1} bg_color={C.raised} border={1} border_color={C.violet}>
                                            <text-box>{Array.from({ length: 16 }, (_, index) => `Nested row ${String(index + 1).padStart(2, '0')}\n`).join('')}</text-box>
                                        </scrollbox>
                                        <text-box>{Array.from({ length: 12 }, (_, index) => `Outer tail ${String(index + 1).padStart(2, '0')}\n`).join('')}</text-box>
                                    </scrollbox>
                                </Panel>
                                <Panel title="HORIZONTAL / SHIFT+WHEEL" height={8} flex_grow={0}>
                                    <scrollbox flex_grow={1} scroll_x scroll_y={false} padding={1} bg_color={C.inset}>
                                        <text-box width={150}><text color={C.text}>START ── long horizontal canvas ── 中文 ── 👩‍💻 ── 1️⃣ ── column 080 ── column 120 ── END</text></text-box>
                                    </scrollbox>
                                </Panel>
                    </box>

                    <box display={demoId() === 'D07' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}>
                                <box flex_grow={1} min_height={7} flex_direction={FlexDirection.Row}>
                                    <scrollbox ref={verticalScroll} flex_grow={1} scroll_y padding={1} bg_color={C.inset}
                                        border={1} border_color={C.border}>
                                        <text-box>{Array.from({ length: 40 }, (_, index) => `Synchronized row ${String(index + 1).padStart(2, '0')}\n`).join('')}</text-box>
                                    </scrollbox>
                                    <scrollbar ref={verticalBar} target={verticalScroll} height={'100%'} show_arrows/>
                                </box>
                                <box height={6} flex_shrink={0} flex_direction={FlexDirection.Column}>
                                    <scrollbox ref={horizontalScroll} flex_grow={1} scroll_x scroll_y={false} padding={1} bg_color={C.inset}>
                                        <text-box width={180}>◀ horizontal viewport · drag the thumb · click the track · use arrows · synchronized position · END ▶</text-box>
                                    </scrollbox>
                                    <scrollbar ref={horizontalBar} target={horizontalScroll} orientation="horizontal" width={'100%'} height={1} show_arrows/>
                                </box>
                    </box>

                    <box display={demoId() === 'D08' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}>
                                <text-box flex_shrink={0}><text color={C.green}>{dragMessage()}</text></text-box>
                                <focus-group flex_grow={1} min_height={8} gap={1} orientation="horizontal" flex_direction={FlexDirection.Row} overflow={Overflow.Hidden}>
                                    <For each={['BACKLOG', 'DONE']}>{(lane) =>
                                        <box flex_grow={1} min_width={22} padding={1} gap={1} flex_direction={FlexDirection.Column} droppable
                                            bg_color={C.raised} border={1} border_type={BorderStyleType.Round} border_color={lane === 'DONE' ? C.green : C.amber}
                                            on_dragover={(event: DragInputEvent) => event.preventDefault()} on_drop={(event: DragInputEvent) => dropCard(lane, event)}>
                                            <text-box flex_shrink={0}><text color={lane === 'DONE' ? C.green : C.amber} bold>{lane}</text></text-box>
                                            <For each={cards().filter((card) => card.lane === lane)}>{(card) =>
                                                <button width={'100%'} height={3} flex_shrink={0} label={`${card.id}  drag me`} draggable droppable
                                                    on_dragstart={(event: DragInputEvent) => event.dataTransfer.setData('application/x-kli-card', card.id)}
                                                    on_dragover={(event: DragInputEvent) => event.preventDefault()}
                                                    on_drop={(event: DragInputEvent) => dropCard(lane, event)}
                                                    on_dragreorder={(event: KeyboardDragInputEvent) => moveCard(card.id,
                                                        event.direction === 'left' ? 'BACKLOG' : event.direction === 'right' ? 'DONE' : lane)}/>
                                            }</For>
                                        </box>
                                    }</For>
                                </focus-group>
                    </box>

                    <box display={demoId() === 'D09' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}>
                                <Panel title="FOCUS RESTORATION + OVERLAYS">
                                    <text-box><text color={C.text}>Open an overlay, navigate only with the keyboard, then close it.</text><br/>
                                        <text color={C.muted}>Focus must stay trapped and return to the trigger.</text></text-box>
                                    <box gap={1} flex_direction={FlexDirection.Row} flex_wrap={Wrap.Wrap}>
                                        <button label="Open modal" on_click={() => setDialogOpen(true)}/>
                                        <button label="Open menu" on_click={() => menu.openAt(56, 10)}/>
                                        <button label="Ctrl+P palette" on_click={() => palette.show()}/>
                                        <button label="Push toast" on_click={() => toast.push({ id: String(Date.now()), message: 'Overlay event delivered', tone: 'success' })}/>
                                    </box>
                                </Panel>
                                <text-box><text color={C.amber}>Escape</text><text color={C.muted}> closes · Tab cycles · outside click closes menus</text></text-box>
                    </box>

                    <box display={demoId() === 'D10' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Row} flex_wrap={Wrap.Wrap} overflow={Overflow.Hidden}>
                                <Panel title="10,000 ROW VIRTUAL LIST" width={'34%'}>
                                    <virtual-list flex_grow={1} width={'100%'} items={rows} render_item={(row: typeof rows[number]) => `#${String(row.id).padStart(5, '0')} ${row.name}`}/>
                                </Panel>
                                <Panel title="VIRTUAL TABLE" width={'36%'}>
                                    <table flex_grow={1} width={'100%'} items={rows} columns={[
                                        { key: 'id', title: 'ID', width: 6, value: (row: typeof rows[number]) => row.id },
                                        { key: 'name', title: 'NAME', width: 18, value: (row: typeof rows[number]) => row.name },
                                        { key: 'state', title: 'STATE', width: 8, value: (row: typeof rows[number]) => row.state },
                                    ]}/>
                                </Panel>
                                <Panel title="EXPANDABLE TREE" width={'24%'}><TreeSample/></Panel>
                    </box>

                    <scrollbox display={demoId() === 'D11' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} scroll_y padding={1} bg_color={C.inset}>
                                <box width={'100%'} gap={1} flex_direction={FlexDirection.Column}>
                                    <box gap={1} flex_direction={FlexDirection.Row} flex_wrap={Wrap.Wrap}>
                                        <button label="Primary"/><button label="Disabled" disabled/>
                                        <checkbox label="Checkbox" checked={enabled()} on_change={(event: ValueInputEvent<boolean>) => setEnabled(event.value)}/>
                                        <switch label="Switch" checked={enabled()} on_change={(event: ValueInputEvent<boolean>) => setEnabled(event.value)}/>
                                    </box>
                                    <tabs width={'100%'} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'events', label: 'Events', badge: 3 }, { id: 'disabled', label: 'Disabled', disabled: true }]}/>
                                    <slider width={'100%'} value={progress()} on_change={(event: ValueInputEvent<number>) => setProgress(event.value)}/>
                                    <progress width={'100%'} value={progress()}/>
                                    <pagination page_count={24} page={page()} on_change={(event: ValueInputEvent<number>) => setPage(event.value)}/>
                                    <box height={8} gap={1} flex_direction={FlexDirection.Row}>
                                        <markdown flex_grow={1} markdown={'# Markdown\n- semantic rows\n- keyboard scroll\n> content component'}/>
                                        <diff flex_grow={1} items={[
                                            { kind: 'equal', old_line: 1, new_line: 1, text: 'const mode = "stable"' },
                                            { kind: 'delete', old_line: 2, text: 'dirtyDraw = false' },
                                            { kind: 'insert', new_line: 2, text: 'dirtyDraw = true' },
                                        ]}/>
                                    </box>
                                </box>
                    </scrollbox>

                    <box display={demoId() === 'D12' ? Display.Flex : Display.None}
                        width={'100%'} height={'100%'} gap={1} flex_direction={FlexDirection.Column} overflow={Overflow.Hidden}>
                                <box height={9} flex_shrink={0} gap={1} flex_direction={FlexDirection.Row}>
                                    <Panel title="FRAME CHURN"><text-box><text color={C.text}>tick {tick()}</text><br/><text color={C.muted}>Only this small region changes.</text></text-box></Panel>
                                    <Panel title="DIRTY REGION"><progress width={'100%'} value={progress()}/><spinner label="async activity" frame={tick()}/></Panel>
                                </box>
                                <Panel title="RENDERER STRESS GRID" tone={C.coral}>
                                    <text-box><For each={Array.from({ length: 9 }, (_, index) => index)}>{(row) => <>
                                        <text color={row === tick() % 9 ? C.cyan : C.muted}>{Array.from({ length: 8 }, (_, column) =>
                                            `${row === tick() % 9 && column === tick() % 8 ? '◆' : '·'} cell-${row}${column}  `).join('')}</text><br/>
                                    </>}</For></text-box>
                                </Panel>
                                <debug-overlay position={PositionType.Relative} width={'100%'} height={4} flex_shrink={0}
                                    top={'auto'} right={'auto'} bottom={'auto'} left={'auto'}/>
                    </box>
                </box>

                <status-bar flex_shrink={0} segments={[
                    { id: 'demo', text: active().id, color: C.cyan },
                    { id: 'focus', text: 'Tab / Shift+Tab', color: C.muted },
                    { id: 'interaction', text: 'Wheel · drag · typeahead', align: 'right', color: C.amber },
                ]}/>
            </box>
        </split-pane>

        <dialog open={dialogOpen() && demoId() === 'D09'} on_close={() => setDialogOpen(false)} flex_direction={FlexDirection.Column} gap={1}>
            <text-box><text color={C.cyan} bold>FOCUS-TRAPPED DIALOG</text><br/>
                <text color={C.text}>Tab stays inside. Escape closes and restores focus.</text></text-box>
            <input-box width={'100%'} value="Modal editor 中文 👩‍💻"/>
            <button label="Close dialog" on_click={() => setDialogOpen(false)}/>
        </dialog>
        <command-palette ref={palette} commands={[
            { id: 'layout', name: 'Open layout demo', shortcut: 'D01', action: () => setDemoId('D01') },
            { id: 'selection', name: 'Open selection demo', shortcut: 'D03', action: () => setDemoId('D03') },
            { id: 'benchmark', name: 'Open renderer benchmark', shortcut: 'D12', action: () => setDemoId('D12') },
        ]}/>
        <menu ref={menu} items={[
            { name: 'Open selection demo', value: 'selection', shortcut: 'D03', action: () => setDemoId('D03') },
            { name: 'Open benchmark', value: 'benchmark', shortcut: 'D12', action: () => setDemoId('D12') },
            { name: 'More', value: 'more', submenu: [
                { name: 'Show toast', value: 'toast', action: () => toast.push({ id: String(Date.now()), message: 'Nested menu action', tone: 'info' }) },
            ] },
        ]}/>
        <toast-host ref={toast}/>
    </box>;
}

render(Gallery, { synchronizedOutput: true, focusReporting: true, dirtyDraw: true });
