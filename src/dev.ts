import { TTyRenderer } from "./package/render/tty/ttyRenderer.js";
import { Color } from "./package/util/color.js";
import { Rect } from "./package/util/rect.js";

let time = 0;

const renderer = new TTyRenderer(process.stdout);
renderer.init();
function render() {
    renderer.begin_render(process.stdout.columns, process.stdout.rows);
    renderer.set_viewport(Rect.of(0, 0, process.stdout.columns, process.stdout.rows));
    renderer.fill(0, 0, process.stdout.columns, process.stdout.rows, Color.of(0, 120, 50));
    renderer.fill(Math.floor(time), 0, 15, 4, Color.of(255, 120, 0));
    renderer.draw_box_border(Math.floor(time), 0, 15, 4, {
        top_left: "╭",
        top: "─",
        top_right: "╮",
        right: "│",
        bottom_left: "╰",
        bottom: "─",
        bottom_right: "╯",
        left: "│"
    }, { color: Color.of(190, 190, 190), bg_color: Color.of(0, 120, 50) }, true);
    renderer.draw_string(Math.floor(time) + 2, 1, 'Hello Wrold', { color: Color.of(255, 160, 0) });
    renderer.draw_string(Math.floor(time) + 2, 2, 'from Kli', { color: Color.of(255, 255, 255), bold: true, italic: true, underline: true });
    renderer.render(Rect.of(0, 0, process.stdout.columns, process.stdout.rows), false, false);
    renderer.end_render();
}

render();

setInterval(() => {
    render();
    time += 0.1;
    time %= 20;
}, 16);