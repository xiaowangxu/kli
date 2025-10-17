import Yoga from 'yoga-layout-prebuilt';
import { Container, Text, TextContainer, TextContent } from './index.js';
import { Color } from './package/util/color.js';
import { TTyRenderer } from './package/render/ttyRenderer.js';
import { sleep } from './package/util/common.js';

function create() {
    const cot = new Container();
    const txt_cot = new TextContainer();
    const txt = new Text();
    const span0 = new TextContent('Hello');
    const span1 = new TextContent(' ');
    const span2 = new TextContent('Kli');
    cot.add_child(txt_cot);
    txt_cot.set_text(txt);
    txt.add_child(span0);
    txt.add_child(span1);
    txt.add_child(span2);
    return cot;
}

const cot = new Container();
cot.add_child(create());
cot.add_child(create());

cot.layout_node.calculateLayout(100, 100, Yoga.DIRECTION_LTR);

console.log(cot.get_unstyled_text_content());
console.log(
    cot.layout_node.getComputedLeft(),
    cot.layout_node.getComputedLeft(),
    cot.layout_node.getComputedWidth(),
    cot.layout_node.getComputedHeight(),
);
console.log(Color.of(255, 212, 0).hex);

console.log(">>>>>> clearing");

function clear() {
    setTimeout(async () => {
        const tty = new TTyRenderer(process.stdout);
        tty.begin_render();
        for (let i = 0; i < 100; i++) {
            await (tty.clear());
            await (tty.write(`cleared ${i}`));
            await sleep(33);
        }
        tty.end_render();
    }, 1000);
}

clear();