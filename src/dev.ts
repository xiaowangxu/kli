import { Align, BoxSizing, FlexDirection, Justify, Wrap } from "yoga-layout";
import { Container } from "./package/node/container.js";
import { TTyRenderer } from "./package/render/tty/ttyRenderer.js";
import { Color } from "./package/util/color.js";
import { Rect } from "./package/util/rect.js";

const box = new Container();
const sub1 = new Container();
const sub2 = new Container();

box.flex_direction = FlexDirection.Row;
box.gap = 1;
box.border = 1;
box.padding_horizontal = 1;
box.align_items = Align.Center;
sub1.flex_grow = 1;
sub1.flex_basis = '50%';
sub2.flex_grow = 1;
sub2.flex_shrink = 1;
sub1.height = '100%';
sub2.height = 20;
sub1.border = 1;
sub2.border = 1;
box.add_child(sub1);
box.add_child(sub2);

sub2.flex_direction = FlexDirection.Row;
sub2.gap_column = 1;
sub2.padding_horizontal = 1;
sub2.flex_wrap = Wrap.Wrap;
const boxes: Container[] = [];
for (let i = 0; i < 13; i++) {
    const box = new Container();
    boxes.push(box);
    sub2.add_child(box);
    box.flex_basis = 4 + Math.round(Math.random() * 20);
    box.flex_grow = 1;
    box.height = 4;
}

let time = 0;
const border_style = {
    top_left: "╭",
    top: "─",
    top_right: "╮",
    right: "│",
    bottom_left: "╰",
    bottom: "─",
    bottom_right: "╯",
    left: "│"
};

const renderer = new TTyRenderer(process.stdout);
renderer.init();
function render() {
    box.layout_node.calculateLayout(process.stdout.columns, process.stdout.rows);
    // console.log(box.get_rect());
    // console.log(sub1.get_rect());
    // console.log(sub2.get_rect());
    renderer.begin_render(process.stdout.columns, process.stdout.rows);
    renderer.set_viewport(Rect.of(0, 0, process.stdout.columns, process.stdout.rows));
    renderer.fill(0, 0, process.stdout.columns, process.stdout.rows);
    // renderer.fill(Math.floor(time), 0, 15, 4, Color.of(255, 120, 0));
    renderer.draw_box_border(box.get_rect(), border_style, { color: Color.of(190, 190, 190), bg_color: undefined }, true);
    renderer.draw_box_border(sub1.get_rect(), border_style, { color: Color.of(255, 120, 0), bg_color: undefined }, true);
    renderer.draw_box_border(sub2.get_rect(), border_style, { color: Color.of(190, 90, 190), bg_color: undefined }, true);
    for (const box of boxes) {
        renderer.draw_box_border(box.get_rect(), border_style, { color: Color.of(190, 90, 90), bg_color: undefined }, true);
    }
    renderer.draw_string(sub1.get_rect().x + 2, sub1.get_rect().y, ` 你好 World ${time.toFixed(3)} `, { color: Color.of(255, 120, 0) });
    renderer.draw_string(sub2.get_rect().x + 2, sub2.get_rect().y, ' from Kli ', { color: Color.of(190, 90, 190), bold: true, italic: true });
    // renderer.draw_string(Math.floor(time) + 2, 2, 'from Kli', { color: Color.of(255, 255, 255), bold: true, italic: true, underline: true });
    renderer.render(Rect.of(0, 0, process.stdout.columns, process.stdout.rows), false, false);
    renderer.end_render();
}

render();

setInterval(() => {
    render();
    time += 0.1;
    time %= 20;
}, 16);