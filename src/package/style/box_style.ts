import { Color } from "../util/color.js";
import { Shader } from "./shader.js";

export interface BoxStyle {
    bg_color: Color | undefined;
    bg_shader: Shader | undefined;
}