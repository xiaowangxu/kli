import { h, VNode } from "vue";
import { Newline } from "../../node/text.js";

export function Br(): VNode<Newline> {
    return h(
        'newline',
    ) as VNode<Newline>;
}