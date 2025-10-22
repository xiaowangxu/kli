import { h, VNode } from "vue";
import { TextContainer } from "../../node/container.js";
import { TextLayoutStyle } from "../../style/text_style.js";
import { Text } from "../../node/text.js";

export function TextBox(style?: Partial<TextLayoutStyle>, children?: VNode): VNode<TextContainer> {
    return h(
        'text-box',
        style,
        children,
    ) as VNode<TextContainer>;
}