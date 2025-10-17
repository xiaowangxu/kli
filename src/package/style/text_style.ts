import { Color } from "../util/color.js";

export interface TextStyle {
    get color(): Color | undefined;
    get bg_color(): Color | undefined;
    get bold(): boolean | undefined;
    get italic(): boolean | undefined;
    get underline(): boolean | undefined;

    set color(v: Color | undefined);
    set bg_color(v: Color | undefined);
    set bold(v: boolean | undefined);
    set italic(v: boolean | undefined);
    set underline(v: boolean | undefined);
}