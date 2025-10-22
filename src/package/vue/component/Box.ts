import { h, VNode } from "vue";
import { Container, TextContainer } from "../../node/container.js";
import { BoxStyle } from "../../style/box_style.js";
import { LayoutStyle } from "../../style/layout_style.js";
import { BorderStyle } from "../../style/border_style.js";

export function Box(style?: Partial<BoxStyle & LayoutStyle & BorderStyle>, children?: VNode[]): VNode<Container> {
    return h(
        'box',
        style,
        children,
    ) as VNode<Container>;
}