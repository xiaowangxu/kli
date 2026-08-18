import 'solid-js';
import { LayoutStyle } from '../style/layout_style.ts';
import { BoxStyle } from '../style/box_style.ts';
import { BorderStyle } from '../style/border_style.ts';
import { TextLayoutStyle, TextStyle } from '../style/text_style.ts';
import { FocusInputEvent, InputEvent, KeyInputEvent, MouseInputEvent, ValueInputEvent, WheelInputEvent } from '../input/event.ts';
import { Button, Checkbox, InputBox } from '../component/controls.ts';
import { FrameBufferView } from '../component/frame_buffer_view.ts';

interface NodeAttrs {
    focusable: boolean;
    disabled: boolean;
    pointer_events: boolean;
    tab_index: number;
    on_focused: () => void;
    on_blured: () => void;
    on_input: (event: InputEvent) => void;
    on_beforeinput: (event: ValueInputEvent<string>) => void;
    on_change: (event: ValueInputEvent<any>) => void;
    on_keydown: (event: KeyInputEvent) => void;
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
    on_wheel: (event: WheelInputEvent) => void;
    on_keydown_capture: (event: KeyInputEvent) => void;
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
                TextLayoutStyle & NodeAttrs & {
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
            'frame-buffer': Partial<
                LayoutStyle & BoxStyle & BorderStyle & NodeAttrs & FrameBufferView & {
                    children?: JSX.Element;
                }
            >;
            br: {};
        }
    }
}
