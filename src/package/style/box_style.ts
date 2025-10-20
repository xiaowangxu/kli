import { Color } from "../util/color.js";
import { Shader } from "./shader.js";

export interface BoxStyle {
    get bg_color(): Color | undefined;
    get bg_shader(): Shader | undefined;

    set bg_color(v: Color | undefined);
    set bg_shader(v: Shader | undefined);
}