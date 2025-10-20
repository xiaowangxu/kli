import { PixelTextStyle } from "../render/buffer.js";
import { Rect } from "../util/rect.js";

export type Shader = (u: number, v: number, width: number, height: number) => PixelTextStyle & { content?: string } | undefined;

export function execute_shader(shader: Shader, screen: Rect, fn: (x: number, y: number, color: PixelTextStyle & { content?: string } | undefined) => void) {
    for (let i = 0; i < screen.width; i++) {
        for (let j = 0; j < screen.height; j++) {
            fn(
                screen.x + i, screen.y + j,
                shader(
                    screen.width <= 1 ? 0.5 : i / (screen.width - 1),
                    1 - (screen.height <= 1 ? 0.5 : j / (screen.height - 1)),
                    screen.width, screen.height
                ),
            );
        }
    }
}