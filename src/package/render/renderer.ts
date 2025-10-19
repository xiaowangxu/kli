import { Color } from "../util/color.js";
import { Rect } from "../util/rect.js";

export type RenderReady = Promise<void>;

export interface Renderer {
    init(): void | RenderReady;
    dispose(): void | RenderReady;

    begin_render(width: number, height: number): void;
    set_viewport(viewport: Rect): void;
    render(target: Rect, clear_screen: boolean, clear_empty: boolean, clear_screen_color?: Color, clear_empty_color?: Color): void;
    end_render(): void | RenderReady;
}