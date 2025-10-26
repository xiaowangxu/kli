import 'solid-js';
import { LayoutStyle } from '../style/layout_style.ts';
import { BoxStyle } from '../style/box_style.ts';
import { BorderStyle } from '../style/border_style.ts';
import { TextLayoutStyle, TextStyle } from '../style/text_style.ts';

interface NodeAttrs {
    focusable: boolean;
    on_focused: () => void;
    on_blured: () => void;
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
            br: {};
        }
    }
}