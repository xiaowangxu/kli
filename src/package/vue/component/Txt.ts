import { createTextVNode, h, VNode } from "vue";
import { TextLayoutStyle, TextStyle } from "../../style/text_style.js";
import { Newline, TextContent, Text } from "../../node/text.js";
import { Span } from "./Span.js";

export function Txt(style?: Partial<TextLayoutStyle & TextStyle>, children?: (VNode | string)[] | string): VNode<Text> {
    if (typeof children === 'string') {
        return h(
            'text',
            style,
            [Span(undefined, children)],
        ) as VNode<Text>;
    }
    else {
        return h(
            'text',
            style,
            children?.map(c => typeof c === 'string' ? createTextVNode(c) : c),
        ) as VNode<Text>;
    }
}