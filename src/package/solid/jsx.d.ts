import 'solid-js';
import { LayoutStyle } from '../style/layout_style.ts';
import { BoxStyle } from '../style/box_style.ts';
import { BorderStyle } from '../style/border_style.ts';
import { TextLayoutStyle, TextStyle } from '../style/text_style.ts';
import { ClipboardInputEvent, DragInputEvent, FocusInputEvent, InputEvent, KeyboardDragInputEvent, KeyInputEvent, MouseInputEvent, PasteInputEvent, ValueInputEvent, WheelInputEvent } from '../input/event.ts';
import { Button, Checkbox, InputBox } from '../component/controls.ts';
import { TextArea } from '../component/textarea.ts';
import { ScrollBar, ScrollBox } from '../component/scroll.ts';
import { Select } from '../component/select.ts';
import { Dialog, FocusGroup, Layer, Modal } from '../component/overlay.ts';
import { CommandPalette, Menu } from '../component/menu.ts';
import { List, Table, Tree, VirtualList } from '../component/virtual_list.ts';
import { FormField, Label, Progress, RadioGroup, Slider, Spinner, Switch, Tabs, ToastHost } from '../component/extra_controls.ts';
import { Accordion, Collapsible, Resizable, SplitPane } from '../component/layout_components.ts';
import { Autocomplete, Breadcrumb, Combobox, MultiSelect, Pagination, SearchBox, StatusBar } from '../component/navigation.ts';
import { CodeView, DescriptionList, DiffView, LineNumber, MarkdownView, TreeSelect } from '../component/content.ts';
import { DebugOverlay } from '../component/debug.ts';
import { FrameBufferView } from '../component/frame_buffer_view.ts';

interface NodeAttrs {
    focusable: boolean;
    disabled: boolean;
    pointer_events: boolean;
    tab_index: number;
    draggable: boolean;
    droppable: boolean;
    z_index: number;
    zIndex: number;
    role: string;
    aria_label: string;
    aria_description: string;
    ariaLabel: string;
    ariaDescription: string;
    on_focused: () => void;
    on_blured: () => void;
    on_input: (event: InputEvent) => void;
    on_beforeinput: (event: ValueInputEvent<string>) => void;
    on_change: (event: ValueInputEvent<any>) => void;
    on_keydown: (event: KeyInputEvent) => void;
    on_keyup: (event: KeyInputEvent) => void;
    on_paste: (event: PasteInputEvent) => void;
    on_copy: (event: ClipboardInputEvent) => void;
    on_cut: (event: ClipboardInputEvent) => void;
    on_focus: (event: FocusInputEvent) => void;
    on_blur: (event: FocusInputEvent) => void;
    on_focusin: (event: FocusInputEvent) => void;
    on_focusout: (event: FocusInputEvent) => void;
    on_mousedown: (event: MouseInputEvent) => void;
    on_mouseup: (event: MouseInputEvent) => void;
    on_mousemove: (event: MouseInputEvent) => void;
    on_mouseover: (event: MouseInputEvent) => void;
    on_mouseout: (event: MouseInputEvent) => void;
    on_mouseenter: (event: MouseInputEvent) => void;
    on_mouseleave: (event: MouseInputEvent) => void;
    on_click: (event: MouseInputEvent) => void;
    on_contextmenu: (event: MouseInputEvent) => void;
    on_dragstart: (event: DragInputEvent) => void;
    on_drag: (event: DragInputEvent) => void;
    on_dragenter: (event: DragInputEvent) => void;
    on_dragover: (event: DragInputEvent) => void;
    on_dragleave: (event: DragInputEvent) => void;
    on_drop: (event: DragInputEvent) => void;
    on_dragend: (event: DragInputEvent) => void;
    on_dragreorder: (event: KeyboardDragInputEvent) => void;
    on_cancel: (event: InputEvent) => void;
    on_close: (event: InputEvent) => void;
    on_wheel: (event: WheelInputEvent) => void;
    on_keydown_capture: (event: KeyInputEvent) => void;
    on_keyup_capture: (event: KeyInputEvent) => void;
    on_paste_capture: (event: PasteInputEvent) => void;
    on_copy_capture: (event: ClipboardInputEvent) => void;
    on_cut_capture: (event: ClipboardInputEvent) => void;
    on_mousedown_capture: (event: MouseInputEvent) => void;
    on_mouseup_capture: (event: MouseInputEvent) => void;
    on_mousemove_capture: (event: MouseInputEvent) => void;
    on_click_capture: (event: MouseInputEvent) => void;
    on_wheel_capture: (event: WheelInputEvent) => void;
    ref: any;
}

declare module 'solid-js' {
    namespace JSX {
        interface IntrinsicElements {
            box: Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & {
                    children?: JSX.Element;
                }
            >;
            'text-box': Partial<
                LayoutStyle & TextLayoutStyle & NodeAttrs & {
                    selectable: boolean;
                    children?: JSX.Element;
                }
            >;
            text: Partial<
                TextLayoutStyle & TextStyle & {
                    children?: JSX.Element;
                }
            >;
            button: Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Button & {
                    label: string;
                    children?: JSX.Element;
                }
            >;
            checkbox: Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Checkbox & {
                    label: string;
                    checked: boolean;
                    children?: JSX.Element;
                }
            >;
            'input-box': Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & InputBox & {
                    value: string;
                    placeholder: string;
                    children?: JSX.Element;
                }
            >;
            textarea: Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & TextArea & {
                    value: string;
                    placeholder: string;
                    children?: JSX.Element;
                }
            >;
            scrollbox: Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Omit<ScrollBox, 'children'> & {
                    children?: JSX.Element;
                }
            >;
            scrollbar: Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & ScrollBar & {
                    children?: JSX.Element;
                }
            >;
            select: Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Select<any> & {
                    children?: JSX.Element;
                }
            >;
            layer: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Layer & { children?: JSX.Element }>;
            'focus-group': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Omit<FocusGroup, 'children'> & { children?: JSX.Element }>;
            modal: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Modal & { children?: JSX.Element }>;
            dialog: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Omit<Dialog, 'children'> & { children?: JSX.Element }>;
            menu: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Menu & { children?: JSX.Element }>;
            'command-palette': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & CommandPalette & { children?: JSX.Element }>;
            'virtual-list': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & VirtualList<any> & { children?: JSX.Element }>;
            list: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & List<any> & { children?: JSX.Element }>;
            table: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Table<any> & { children?: JSX.Element }>;
            tree: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Tree<any> & { children?: JSX.Element }>;
            switch: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Switch & { children?: JSX.Element }>;
            'radio-group': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & RadioGroup<any> & { children?: JSX.Element }>;
            slider: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Slider & { children?: JSX.Element }>;
            progress: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Progress & { children?: JSX.Element }>;
            spinner: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Spinner & { children?: JSX.Element }>;
            label: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Label & { children?: JSX.Element }>;
            'form-field': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & FormField & { children?: JSX.Element }>;
            tabs: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Tabs & { children?: JSX.Element }>;
            'toast-host': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & ToastHost & { children?: JSX.Element }>;
            'split-pane': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Omit<SplitPane, 'children'> & { children?: JSX.Element }>;
            resizable: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Resizable & { children?: JSX.Element }>;
            collapsible: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Collapsible & { children?: JSX.Element }>;
            accordion: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Accordion & { children?: JSX.Element }>;
            breadcrumb: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Breadcrumb & { children?: JSX.Element }>;
            pagination: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Pagination & { children?: JSX.Element }>;
            'status-bar': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & StatusBar & { children?: JSX.Element }>;
            'search-box': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & SearchBox & { children?: JSX.Element }>;
            autocomplete: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Autocomplete<any> & { children?: JSX.Element }>;
            combobox: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & Combobox<any> & { children?: JSX.Element }>;
            'multi-select': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & MultiSelect<any> & { children?: JSX.Element }>;
            'description-list': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & DescriptionList & { children?: JSX.Element }>;
            code: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & CodeView & { children?: JSX.Element }>;
            'line-number': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & LineNumber & { children?: JSX.Element }>;
            diff: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & DiffView & { children?: JSX.Element }>;
            markdown: Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & MarkdownView & { children?: JSX.Element }>;
            'tree-select': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & TreeSelect<any> & { children?: JSX.Element }>;
            'debug-overlay': Partial<LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & DebugOverlay & { children?: JSX.Element }>;
            'frame-buffer': Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & FrameBufferView & {
                    children?: JSX.Element;
                }
            >;
            br: {};
        }
    }
}
