import { h, VNode } from "vue";
import { TextStyle } from "../../style/text_style.js";
import { TextContent } from "../../node/text.js";
import { log } from "../../util/logger.js";

export function Span(style?: Partial<TextStyle>, text?: string): VNode<TextContent> {
    log("span!!!!", text);
    return h(
        'span',
        {...style, content: text},
    ) as VNode<TextContent>;
}