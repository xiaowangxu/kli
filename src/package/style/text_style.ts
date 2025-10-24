import { TextBreak, TextWrap } from "../node/container.js";
import { Color } from "../util/color.js";

export interface TextLayoutStyle {
    text_wrap: TextWrap | undefined;
    text_break: TextBreak | undefined;
}

export interface TextStyle {
    color: Color | undefined;
    bg_color: Color | undefined;
    bold: boolean | undefined;
    italic: boolean | undefined;
    underline: boolean | undefined;
}

export function merge_text_styles(b: Partial<TextStyle>, a: Partial<TextStyle>): Partial<TextStyle> {
    return {
        color: a.color ?? b.color,
        bg_color: a.bg_color ?? b.bg_color,
        bold: a.bold ?? b.bold,
        italic: a.italic ?? b.italic,
        underline: a.underline ?? b.underline,
    };
}