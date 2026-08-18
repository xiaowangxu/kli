import { createMemo, createSignal, For, onCleanup } from 'solid-js';
import { Align, FlexDirection, PositionType, Wrap } from 'yoga-layout';
import { DragInputEvent, MouseInputEvent, ValueInputEvent } from '../package/input/event.js';
import { Menu, type MenuItem } from '../package/component/menu.js';
import { CommandPalette } from '../package/component/menu.js';
import type { ScrollBar, ScrollBox } from '../package/component/scroll.js';
import { render } from '../package/solid/render.js';
import { BorderStyleType } from '../package/style/border_style.js';
import { Color } from '../package/util/color.js';

type Status = 'Backlog' | 'In Progress' | 'Review' | 'Done';
interface Issue { id: number; title: string; description: string; status: Status; priority: string; assignee: string; guarded: boolean; }

const C = {
    canvas: Color.of(8, 11, 18), panel: Color.of(16, 21, 31), elevated: Color.of(23, 30, 43),
    border: Color.of(59, 73, 98), text: Color.of(232, 239, 251), muted: Color.of(132, 148, 174),
    cyan: Color.of(74, 211, 255), violet: Color.of(170, 126, 255), green: Color.of(108, 224, 167),
    amber: Color.of(255, 194, 92), coral: Color.of(255, 112, 122),
};

const initialIssues: Issue[] = Array.from({ length: 1000 }, (_, index) => ({
    id: index + 1,
    title: index === 0 ? 'Fix Yoga remainder-cell seams' : `Workbench issue ${String(index + 1).padStart(4, '0')}`,
    description: index === 0
        ? 'Verify 79/80/81 and 119/120/121 columns.\nSelection sample: 中文 👩‍💻 1️⃣ é.\nPaste multiple lines here.'
        : `This is a virtualized issue detail for row ${index + 1}.\nDrag it to another status and watch the activity log.`,
    status: (['Backlog', 'In Progress', 'Review', 'Done'] as Status[])[index % 4],
    priority: ['P0', 'P1', 'P2'][index % 3],
    assignee: ['Ari', 'Bo', 'Chen', 'Dina'][index % 4],
    guarded: index % 7 === 0,
}));

function Workbench() {
    const [issues, setIssues] = createSignal(initialIssues);
    const [selectedId, setSelectedId] = createSignal(1);
    const [query, setQuery] = createSignal('');
    const [logs, setLogs] = createSignal<string[]>(['Workbench ready · Ctrl+P opens commands']);
    const [progress, setProgress] = createSignal(34);
    let palette!: CommandPalette;
    let menu!: Menu;
    let logScroll!: ScrollBox;
    let logBar!: ScrollBar;

    const selected = createMemo(() => issues().find((issue) => issue.id === selectedId()) ?? issues()[0]);
    const filtered = createMemo(() => {
        const needle = query().toLocaleLowerCase();
        return issues().filter((issue) => `${issue.id} ${issue.title} ${issue.status}`.toLocaleLowerCase().includes(needle));
    });
    const selectOptions = createMemo(() => filtered().map((issue) => ({
        name: `#${issue.id} ${issue.title}`,
        value: issue.id,
        description: issue.status,
    })));
    const log = (message: string) => setLogs((items) => [...items, `${new Date().toLocaleTimeString()}  ${message}`].slice(-200));
    const updateSelected = (patch: Partial<Issue>) => {
        const id = selectedId();
        setIssues((items) => items.map((issue) => issue.id === id ? { ...issue, ...patch } : issue));
    };
    const moveTo = (status: Status) => {
        const issue = selected();
        if (!issue) return;
        updateSelected({ status });
        log(`#${issue.id} moved to ${status}`);
    };

    const commands = [
        { id: 'focus-search', name: 'Focus issue search', shortcut: 'Ctrl+F', action: () => log('Search command selected') },
        { id: 'mark-done', name: 'Move current issue to Done', shortcut: 'Alt+D', action: () => moveTo('Done') },
        { id: 'toggle-guard', name: 'Toggle guarded flag', action: () => updateSelected({ guarded: !selected()?.guarded }) },
        { id: 'copy-link', name: 'Copy issue link', shortcut: 'Ctrl+Shift+C', action: () => log(`Copied issue://${selectedId()}`) },
    ];
    const menuItems: MenuItem[] = [
        { name: 'Move to Backlog', value: 'backlog', action: () => moveTo('Backlog') },
        { name: 'Move to Review', value: 'review', action: () => moveTo('Review') },
        { name: 'More actions', value: 'more', submenu: [
            { name: 'Mark Done', value: 'done', shortcut: 'Alt+D', action: () => moveTo('Done') },
            { name: 'Toggle Guard', value: 'guard', action: () => updateSelected({ guarded: !selected()?.guarded }) },
        ] },
    ];

    const timer = setInterval(() => {
        setProgress((value) => (value + 1) % 101);
        if (Date.now() % 5 === 0) log('Background index refreshed');
    }, 800);
    onCleanup(() => clearInterval(timer));

    return <box position={PositionType.Absolute} top={0} left={0} right={0} bottom={0} padding={1} gap={1}
        flex_direction={FlexDirection.Column} bg_color={C.canvas}
        on_contextmenu={(event: MouseInputEvent) => { event.preventDefault(); menu.openAt(event.clientX, event.clientY); }}>
        <box height={3} flex_shrink={0} padding_horizontal={1} align_items={Align.Center} bg_color={C.elevated}
            border={1} border_type={BorderStyleType.Round} border_color={C.border}>
            <text-box flex_grow={1}><text color={C.cyan} bold>KLI WORKBENCH</text><text color={C.muted}> / Issue Triage Studio</text></text-box>
            <tabs width={45} tabs={[
                { id: 'issues', label: 'Issues', badge: filtered().length }, { id: 'preview', label: 'Preview' }, { id: 'metrics', label: 'Metrics' },
            ]}/>
            <text-box><text color={C.green}> Ctrl+P COMMANDS </text></text-box>
        </box>

        <split-pane flex_grow={1} min_height={16} split={34} min_split={24} max_split={48}>
            <box min_width={24} flex_direction={FlexDirection.Column} gap={1} padding={1} bg_color={C.panel}
                border={1} border_type={BorderStyleType.Round} border_color={C.border}>
                <text-box><text color={C.violet} bold>ISSUES / 1,000</text></text-box>
                <search-box value={query()} width={'100%'} placeholder="Filter id, title or status…"
                    on_input={(event) => setQuery((event as ValueInputEvent<string>).value)}/>
                <select flex_grow={1} width={'100%'} height={'auto'} options={selectOptions()} value={selectedId()}
                    on_change={(event: ValueInputEvent<number>) => { setSelectedId(event.value); log(`Selected #${event.value}`); }}/>
            </box>

            <box flex_grow={1} min_width={38} flex_direction={FlexDirection.Column} gap={1}>
                <box flex_grow={1} min_height={12} flex_direction={FlexDirection.Row} flex_wrap={Wrap.Wrap} gap={1}>
                    <box flex_grow={2} min_width={38} padding={1} flex_direction={FlexDirection.Column} gap={1}
                        bg_color={C.panel} border={1} border_type={BorderStyleType.Round} border_color={C.border}>
                        <text-box><text color={C.cyan} bold>EDITOR / #{selected()?.id}</text></text-box>
                        <input-box width={'100%'} value={selected()?.title ?? ''}
                            on_input={(event) => updateSelected({ title: (event as ValueInputEvent<string>).value })}/>
                        <textarea width={'100%'} flex_grow={1} value={selected()?.description ?? ''} placeholder="Issue description"
                            on_input={(event) => updateSelected({ description: (event as ValueInputEvent<string>).value })}/>
                        <text-box selectable><text color={C.amber} bold>PREVIEW  </text><text color={C.text}>{selected()?.title}</text><br/>
                            <text color={C.muted}>{selected()?.description}</text></text-box>
                    </box>

                    <box flex_grow={1} min_width={27} padding={1} flex_direction={FlexDirection.Column} gap={1}
                        bg_color={C.panel} border={1} border_type={BorderStyleType.Round} border_color={C.border}>
                        <text-box><text color={C.violet} bold>INSPECTOR</text></text-box>
                        <select height={6} width={'100%'} options={(['Backlog', 'In Progress', 'Review', 'Done'] as Status[]).map((status) => ({ name: status, value: status }))}
                            value={selected()?.status} on_change={(event: ValueInputEvent<Status>) => moveTo(event.value)}/>
                        <checkbox label="Guarded" checked={selected()?.guarded ?? false}
                            on_change={(event: ValueInputEvent<boolean>) => updateSelected({ guarded: event.value })}/>
                        <radio-group height={5} width={'100%'} choices={['P0', 'P1', 'P2'].map((priority) => ({ name: priority, value: priority }))}
                            value={selected()?.priority} on_change={(event: ValueInputEvent<string>) => updateSelected({ priority: event.value })}/>
                        <slider width={'100%'} value={progress()} min={0} max={100}/>
                        <progress width={'100%'} value={progress()}/>
                    </box>
                </box>

                <focus-group height={5} flex_shrink={0} orientation="horizontal" gap={1}>
                    <For each={(['Backlog', 'In Progress', 'Review', 'Done'] as Status[])}>{(status) =>
                        <button flex_grow={1} label={status} draggable droppable
                            on_dragstart={(event: DragInputEvent) => event.dataTransfer.setData('application/x-kli-issue', String(selectedId()))}
                            on_dragover={(event: DragInputEvent) => event.preventDefault()}
                            on_drop={() => moveTo(status)}
                            on_dragreorder={() => moveTo(status)}
                            on_click={() => moveTo(status)}/>
                    }</For>
                </focus-group>
            </box>
        </split-pane>

        <box height={7} flex_shrink={0} flex_direction={FlexDirection.Row} gap={0}>
            <scrollbox ref={logScroll} flex_grow={1} scroll_y sticky_scroll sticky_start="bottom" padding={1}
                bg_color={C.panel} border={1} border_type={BorderStyleType.Round} border_color={C.border}>
                <text-box><text color={C.green} bold>ACTIVITY / STICKY LOG</text><br/>
                    <For each={logs()}>{(line) => <><text color={C.muted}>{line}</text><br/></>}</For>
                </text-box>
            </scrollbox>
            <scrollbar ref={logBar} target={logScroll} height={'100%'} show_arrows/>
        </box>

        <status-bar segments={[
            { id: 'issue', text: `#${selected()?.id} ${selected()?.status}`, color: C.cyan },
            { id: 'selection', text: 'mouse select · Ctrl+C', color: C.muted },
            { id: 'drag', text: 'drag / Alt+Arrow', color: C.amber },
            { id: 'protocol', text: 'paste · OSC52 · diff render', align: 'right', color: C.green },
        ]}/>

        <menu ref={menu} items={menuItems}/>
        <command-palette ref={palette} commands={commands}/>
        <debug-overlay/>
    </box>;
}

render(Workbench, { synchronizedOutput: true, focusReporting: true, dirtyDraw: true });
