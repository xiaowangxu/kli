export interface DemoDefinition {
    id: string;
    title: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    summary: string;
    acceptance: string;
}

export const demoCatalog: DemoDefinition[] = [
    { id: 'D01', title: 'Layout Reactivity', priority: 'P0', summary: 'Flex, gap, padding, size and absolute positioning.', acceptance: 'Live updates and stable remainder-cell distribution at odd/even widths.' },
    { id: 'D02', title: 'Protocol Inspector', priority: 'P0', summary: 'Keys, raw packets, modifiers, paste, focus and mouse.', acceptance: 'One PasteEvent per bracketed paste; Kitty/CSI-u press, repeat and release.' },
    { id: 'D03', title: 'Selection & Clipboard', priority: 'P0', summary: 'Cross-node selection with CJK, Emoji and combining marks.', acceptance: 'Cell-correct selection and safe host/OSC52 copy.' },
    { id: 'D04', title: 'Input & Textarea', priority: 'P0', summary: 'Single and multiline editing.', acceptance: 'Word navigation, undo/redo, paste, mouse selection and scrolling.' },
    { id: 'D05', title: 'Select Gallery', priority: 'P0', summary: 'Normal, disabled, empty, descriptions and 1000 options.', acceptance: 'Separate highlight/commit state, typeahead and automatic reveal.' },
    { id: 'D06', title: 'Scroll Laboratory', priority: 'P0', summary: 'Vertical, horizontal, nested and sticky scrolling.', acceptance: 'Wheel, Shift+Wheel, pages, bounds and chained scroll.' },
    { id: 'D07', title: 'ScrollBar', priority: 'P0', summary: 'Horizontal and vertical standalone scrollbars.', acceptance: 'Arrow, track, thumb drag and two-way synchronization.' },
    { id: 'D08', title: 'Drag & Drop', priority: 'P1', summary: 'Reorder, cross-column move, invalid target and cancel.', acceptance: 'Stable capture, edge auto-scroll, Escape and Alt+Arrow parity.' },
    { id: 'D09', title: 'Focus & Overlay', priority: 'P1', summary: 'Modal, context menu and command palette.', acceptance: 'Focus trap, close restoration, outside click and full keyboard path.' },
    { id: 'D10', title: 'Virtual Data', priority: 'P1', summary: '10,000-row List, Table and Tree.', acceptance: 'Only visible rows are formatted and drawn.' },
    { id: 'D11', title: 'Component Gallery', priority: 'P2', summary: 'Controls, layout, navigation, content and async states.', acceptance: 'Hover/focus/active/disabled/error states serve as visual regression.' },
    { id: 'D12', title: 'Renderer Benchmark', priority: 'P2', summary: 'Counters, logs, progress and dirty-region metrics.', acceptance: 'Shows frame time, bytes, dirty cells and diff-render behavior.' },
];
