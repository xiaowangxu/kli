import { Align, BoxSizing, FlexDirection, Justify, PositionType, Wrap } from "yoga-layout";
import { Container, Overflow, TextContainer } from "./package/node/container.js";
import { Renderer } from "./package/render/renderer.js";
import { Color } from "./package/util/color.js";
import { Rect } from "./package/util/rect.js";
import { Input } from "./package/input/input.js";
import { Scene } from "./package/scene/scene.js";
import { BorderStyleType } from "./package/style/border_style.js";
import { Newline, Text, TextContent } from "./package/node/text.js";

const box = new Container();
const sub1 = new Container();
const sub2 = new Container();

const text = new TextContainer();
const text_span = new Text();
const text_content1 = new TextContent();
const text_content2 = new TextContent();
text_content1.content = "Hello Kli";
text_content2.content = "World";
text_content2.color = Color.of(255, 0, 0);
text_content2.bg_color = Color.of(0, 0, 255);
text_content2.italic = true;

sub1.add_child(text);
text.set_text(text_span);
text_span.add_child(text_content1);
text_span.add_child(new Newline());
text_span.add_child(text_content2);

box.flex_direction = FlexDirection.Row;
box.gap = 1;
box.align_items = Align.Center;
box.min_height = '100%';
box.max_height = '100%';
box.overflow = Overflow.Hidden;
sub1.flex_basis = 1;
sub1.flex_grow = 1;
sub1.flex_shrink = 1;
sub1.overflow = Overflow.Hidden;
sub1.padding_horizontal = 1;
sub2.flex_grow = 1;
sub2.flex_shrink = 1;
sub1.height = '100%';
sub2.max_height = '100%';
sub2.flex_basis = 1;
sub1.border = 1;
sub2.border = 1;
// sub2.margin = 1;
sub2.overflow = Overflow.Hidden;
box.add_child(sub1);
box.add_child(sub2);

sub2.flex_direction = FlexDirection.Column;
sub2.padding_horizontal = 1;

sub2.border_color = Color.of(190, 255, 0);
sub2.border_type = BorderStyleType.Round;
sub1.border_color = Color.of(190, 0, 255);
sub1.border_type = BorderStyleType.Round;

function hsv2rgb(h: number, s: number, v: number) {
    const k = (n: number) => (n + h * 6) % 6;
    const f = (n: number) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
    return { r: f(5), g: f(3), b: f(1) };
}

let time = 0;
setInterval(() => {
    time += 0.01;
    renderer.queue_render();
}, 33)

const boxes: Container[] = [];
for (let i = 0; i < 13; i++) {
    const box = new Container();
    boxes.push(box);
    sub2.add_child(box);
    box.height = 4;
    box.flex_grow = 1;
    box.height = 7;
    box.border = 1;
    box.border_color = Color.of(240, 150, 100);
    box.border_type = BorderStyleType.Round;
    const text = new TextContainer();
    const text_span = new Text();
    const text_content = new TextContent();
    text_content.content = `Index : ${i + 1}`;
    // box.add_child(text);
    // text.set_text(text_span);
    // text_span.add_child(text_content);
    box.padding_horizontal = 1;
    if (i === 0) {
        box.height = 15;
        box.bg_shader = (x, y) => {
            return {
                bg_color: Color.of(x * 255, y * 255, 0),
            }
        };
    }
    if (i === 1) {
        box.aspect_ratio = 2;
        box.height = 15;
        box.bg_shader = (u, v, w, h) => {
            const uvx = u - 0.5;
            const uvy = v - 0.5;
            const r = Math.sqrt(uvx * uvx + uvy * uvy);
            const angle = Math.atan2(uvy, uvx);

            const wave = Math.sin(10 * r - time * 3) * 0.5 + 0.5;
            const hue = (angle / Math.PI + 1) * 0.5 + time * 0.2;
            const sat = 1.0;
            const val = Math.pow(wave, 2.0);

            const c = hsv2rgb(hue, sat, val);

            return {
                color: Color.of(c.r * 255, c.g * 255, c.b * 255),
                content: '●'
            };
        }
    }
}

const scene = new Scene();
scene.add_child(box);
const renderer = new Renderer(process.stdout, (render) => {
    render.fill(Rect.of(0, 0, render.width, render.height), Color.of(0, 0, 0));
    // render.set_viewport(Rect.of(0, 0, 40, 10));
    // render.fill(Rect.of(0, 0, render.width, render.height));
    render.draw_scene();
    render.execute_render(Rect.of(0, 0, render.width, render.height), Rect.of(0, 0, render.width, render.height), false, false);
});
renderer.set_scene(scene);
const input = new Input(process.stdin);
renderer.init();
input.init();

renderer.queue_render();

// setInterval(() => {
//     sub2.offset.y = sub2.offset.y - 1;
//     sub2.offset.y = sub2.offset.y < -50 ? 20 : sub2.offset.y;
//     renderer.queue_render();
// }, 66);

input.stream.on('data', (data) => {
    time += 0.1;
    time %= 20;
});

process.on('exit', () => {
    renderer.dispose();
    input.dispose();
});