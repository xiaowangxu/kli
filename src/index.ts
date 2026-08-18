import {
    render,
    effect,
    memo,
    createComponent,
    createElement,
    createTextNode,
    insertNode,
    insert,
    spread,
    setProp,
    mergeProps,
    use,
} from './package/solid/render.js';
export type { RenderHandle, RenderOptions } from './package/solid/render.js';
export {
    render,
    effect,
    memo,
    createComponent,
    createElement,
    createTextNode,
    insertNode,
    insert,
    spread,
    setProp,
    mergeProps,
    use,
};
export type * from './package/solid/jsx.js';

import { Wrap, PositionType, Align, Justify, FlexDirection, Display, BoxSizing, Overflow } from "yoga-layout";
export {
    Wrap,
    PositionType,
    Align,
    Justify,
    FlexDirection,
    Display,
    BoxSizing,
    Overflow,
};

import { Color } from "./package/util/color.js";
import { Position } from "./package/util/position.js";
import { Rect } from "./package/util/rect.js";
import { Signal, type SignalBindOption, type SignalListener } from "./package/util/signal.js";
export {
    Color,
    Position,
    Rect,
    Signal,
    SignalBindOption,
    SignalListener,
};

import { type BorderType, type BorderStyle, BorderStyleType } from './package/style/border_style.js';
import { type BoxStyle } from './package/style/box_style.js';
import { type LayoutStyle } from './package/style/layout_style.js';
import { type Shader } from './package/style/shader.js';
import { type TextLayoutStyle, type TextStyle, merge_text_styles } from './package/style/text_style.js';
export {
    BorderType,
    BorderStyle,
    BorderStyleType,
    BoxStyle,
    LayoutStyle,
    Shader,
    TextLayoutStyle,
    TextStyle,
    merge_text_styles,
};

import { useDeltaFrame } from './package/solid/hook/use_delta_frame.js';
export {
    useDeltaFrame,
};
export { darkTheme, lightTheme } from './package/style/theme.js';
export type { KliTheme } from './package/style/theme.js';

export { Input } from './package/input/input.js';
export type { InputOptions } from './package/input/input.js';
export { EditBuffer } from './package/input/edit_buffer.js';
export type { EditBufferReplacement, EditBufferSnapshot } from './package/input/edit_buffer.js';
export { Clipboard, HostClipboardBackend, MemoryClipboardBackend, Osc52ClipboardBackend, is_remote_session } from './package/input/clipboard.js';
export type {
    ClipboardBackend,
    ClipboardDestination,
    ClipboardOperationResult,
    ClipboardOperationStatus,
    ClipboardOptions,
    ClipboardWriteOptions,
    ClipboardWriteResult,
} from './package/input/clipboard.js';
export {
    InputEvent,
    InputEventPhase,
    ComposeInputEvent,
    KeyInputEvent,
    PasteInputEvent,
    ClipboardInputEvent,
    DragDataTransfer,
    DragInputEvent,
    KeyboardDragInputEvent,
    SelectionInputEvent,
    MouseButton,
    MouseInputEvent,
    WheelInputEvent,
    FocusInputEvent,
    TerminalFocusInputEvent,
    TerminalColorInputEvent,
    ValueInputEvent,
    MouseWheel,
    MouseWheelInputEvent,
} from './package/input/event.js';
export { TextSelection } from './package/input/selection.js';
export { decode_terminal_text } from './package/input/text_encoding.js';
export { TextLayout, get_text_layout, is_word_break_after, split_graphemes_with_width } from './package/text/text_layout.js';
export type {
    CellBoundaryBias,
    GraphemeCell,
    TextWrapMode,
    VisualTextEntry,
    VisualTextLayout,
    VisualTextLine,
    VisualTextPosition,
} from './package/text/text_layout.js';
export type {
    InputEventInit,
    ComposeInputEventInit,
    KeyInputEventInit,
    PasteInputEventInit,
    MouseInputEventInit,
    DragInputEventInit,
    WheelInputEventInit,
    ValueInputEventInit,
} from './package/input/event.js';
export type { KeyboardDragDirection } from './package/input/event.js';
export { Node, NodeWithChildren } from './package/node/node.js';
export type { CursorState, InputEventListener, InputEventListenerOptions } from './package/node/node.js';
export { Container, TextContainer, TextWrap, TextBreak } from './package/node/container.js';
export { Text, TextContent, Newline } from './package/node/text.js';
export { Scene } from './package/scene/scene.js';
export type { SemanticNode } from './package/scene/scene.js';
export { Button, Checkbox, InputBox } from './package/component/controls.js';
export { TextArea, Textarea } from './package/component/textarea.js';
export { ScrollBar, ScrollBox } from './package/component/scroll.js';
export type { ScrollbarOrientation, StickyScrollEdge } from './package/component/scroll.js';
export { Select } from './package/component/select.js';
export type { SelectOption } from './package/component/select.js';
export { Dialog, FocusGroup, Layer, Modal } from './package/component/overlay.js';
export type { FocusGroupOrientation } from './package/component/overlay.js';
export { CommandPalette, Menu } from './package/component/menu.js';
export type { CommandItem, MenuItem } from './package/component/menu.js';
export { List, Table, Tree, VirtualList } from './package/component/virtual_list.js';
export type { TableColumn, TreeItem, VirtualListRange } from './package/component/virtual_list.js';
export { FormField, Label, Progress, RadioGroup, Slider, Spinner, Switch, Tabs, ToastHost } from './package/component/extra_controls.js';
export type { TabItem, ToastMessage, ToastTone } from './package/component/extra_controls.js';
export { Accordion, Collapsible, Resizable, SplitPane } from './package/component/layout_components.js';
export type { SplitOrientation } from './package/component/layout_components.js';
export { Autocomplete, Breadcrumb, Combobox, MultiSelect, Pagination, SearchBox, StatusBar } from './package/component/navigation.js';
export type { BreadcrumbItem, StatusSegment } from './package/component/navigation.js';
export { CodeView, DescriptionList, DiffView, LineNumber, MarkdownView, TreeSelect } from './package/component/content.js';
export type { DescriptionItem, DiffLine, DiffLineKind } from './package/component/content.js';
export { DebugOverlay } from './package/component/debug.js';
export { MockKeyboard, MockMouse, TestRenderer } from './package/testing/test_renderer.js';
export { FrameBufferView } from './package/component/frame_buffer_view.js';
export {
    Buffer,
    BufferPixel,
    FrameBuffer,
    BlendFactor,
    BlendEquation,
    blend_source_over,
} from './package/render/buffer.js';
export type { BlendState, PixelTextStyle } from './package/render/buffer.js';
export { Renderer, ANSI, calculate_char_width, calculate_string_width, split_string_with_width } from './package/render/renderer.js';
export type { RendererOptions } from './package/render/renderer.js';
export { detect_terminal_capabilities, detectTerminalCapabilities } from './package/render/terminal.js';
export type { TerminalCapabilities } from './package/render/terminal.js';
