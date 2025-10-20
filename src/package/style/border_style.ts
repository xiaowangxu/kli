import { Color } from "../util/color.js";

export type BorderType = {
    top_left: string,
    top: string,
    top_right: string,
    right: string,
    bottom_left: string,
    bottom: string,
    bottom_right: string,
    left: string,
}

export const BorderStyleType = {
    Round: {
        top_left: "╭",
        top: "─",
        top_right: "╮",
        right: "│",
        bottom_left: "╰",
        bottom: "─",
        bottom_right: "╯",
        left: "│"
    } as BorderType,
} as const;

export interface BorderStyle {
    get border_color(): Color | undefined;
    get border_type(): BorderType | undefined;

    set border_color(v: Color | undefined);
    set border_type(v: BorderType | undefined);
}