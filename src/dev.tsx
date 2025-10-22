import { Align, BoxSizing, FlexDirection, Justify, PositionType, Wrap } from "yoga-layout";
import { Container, Overflow, TextContainer, TextWrap } from "./package/node/container.js";
import { calculate_char_width, Renderer } from "./package/render/renderer.js";
import { Color } from "./package/util/color.js";
import { Rect } from "./package/util/rect.js";
import { Input } from "./package/input/input.js";
import { Scene } from "./package/scene/scene.js";
import { BorderStyleType } from "./package/style/border_style.js";
import { Newline, Text, TextContent } from "./package/node/text.js";
import { log } from "./package/util/logger.js";

const box = new Container();
const sub1 = new Container();
const sub2 = new Container();

const text = new TextContainer();
const text_span = new Text();
const text_span2 = new Text();
const text_content1 = new TextContent();
const text_content2 = new TextContent();
text_content1.content = `Hello Kli 111 222 333 444 555 666 777 888 999 000 Hello World 这个可以换行 😘
这是个非常好的问题，实际上是 **终端字符宽度（character width / display width）** 的问题`;
text_content2.content = `Hello World 这个可以换行 😘
这是个非常好的问题，实际上是 **终端字符宽度（character width / display width）** 的问题。
你看到中文引号 \`“ ”\` 在控制台中宽度为 **1**，是因为 **Unicode East Asian Width 属性** 的定义和终端渲染策略不一致造成的。下面我来详细解释：

---

## 🧩 1. Unicode 定义的宽度属性

Unicode 为每个字符定义了一个 **East Asian Width** 属性，用于描述字符在东亚（中日韩）环境中应占的宽度：

| 属性            | 含义   | 宽度    |
| ------------- | ---- | ----- |
| F (Fullwidth) | 全角   | 2     |
| W (Wide)      | 宽    | 2     |
| H (Halfwidth) | 半角   | 1     |
| Na (Narrow)   | 窄    | 1     |
| A (Ambiguous) | 模棱两可 | 1 或 2 |
| N (Neutral)   | 中性   | 1     |

---

## 🧠 2. 中文引号属于 “Ambiguous（模棱两可）” 字符

根据 Unicode 数据：

\`\`\`
U+201C “  → East Asian Width: Ambiguous (A)
U+201D ”  → East Asian Width: Ambiguous (A)
\`\`\`

也就是说，Unicode 没有强制定义它是「宽」还是「窄」，由显示环境自己决定。

---

## 💻 3. 终端（Console）如何处理 “Ambiguous” 宽度

* **Linux / macOS 的大多数终端（如 xterm, iTerm2, VSCode Terminal）**：
  遵循 \`wcwidth\` / \`EastAsianWidth=A\` → **1宽度**（默认西方字体逻辑）。

* **某些中文终端或 Windows 控制台（cmd / PowerShell）**：
  使用东亚字体渲染时，可能仍然显示为 **2宽度**。

也就是说：

> 在大多数现代控制台中，\`“\` 和 \`”\` 被当成「模棱两可（A）」字符，渲染宽度 = 1。
> 而「真正的中文标点」如 \`（\` \`）\` \`，\` \`。\` 这些是 \`Wide (W)\`，宽度 = 2。

---

## 📏 4. 验证示例（Python）

\`\`\`python
import unicodedata, wcwidth

for ch in "“”":
    print(ch, unicodedata.name(ch), wcwidth.wcwidth(ch))
\`\`\`

输出：

\`\`\`
“ LEFT DOUBLE QUOTATION MARK 1
” RIGHT DOUBLE QUOTATION MARK 1
\`\`\`

可以看到 \`wcwidth()\` 给的宽度就是 1。

---

## 🧮 5. 如果你想在 CLI 或文本布局中对齐中文内容

为了避免对齐错乱，你可以：

* 在程序中手动判断字符宽度（用 \`wcwidth\` / \`east_asian_width\`）。
* 把 \`Ambiguous\` 字符视为 2 宽（例如在中日文界面下）。
* 或者在终端设置中启用「东亚宽字符模式」：

  * macOS iTerm2 → Profiles → Text → **Use Unicode Version 9 Widths**
  * 一些终端有 “treat ambiguous width as wide” 的选项。

---

## ✅ 总结

| 现象           | 原因                                    |
| ------------ | ------------------------------------- |
| “中文引号宽度=1”   | 它是 Unicode 中 “Ambiguous” 字符，终端按西文规则显示 |
| 为什么不和中文标点一样宽 | 因为 Unicode 没强制规定它是全角字符                |
| 如何修正         | 在渲染逻辑中将 Ambiguous 视为宽字符（或切换字体/终端设置）   |

---

如果你愿意，我可以帮你写一个 **TypeScript 函数**，在 CLI 布局中正确计算中英文混合字符串的显示宽度（考虑全角、半角和 Ambiguous 的差异）。是否要我帮你写？`;
text_content1.color = Color.of(255, 190, 0);
text_content1.bold = true;

sub1.add_child(text);
text.set_text(text_span);
text_span.add_child(text_span2);
text_span2.add_child(text_content1);
text_span.add_child(new Newline());
text_span.add_child(text_content2);

box.flex_direction = FlexDirection.Row;
box.gap = 1;
box.align_items = Align.Center;
box.min_height = '100%';
box.max_height = '100%';
box.overflow = Overflow.Hidden;
sub1.flex_grow = 1;
sub1.flex_shrink = 1;
sub1.overflow = Overflow.Hidden;
sub1.padding_horizontal = 1;
sub2.width = 50;
sub2.min_width = 50;
sub2.flex_grow = 0;
sub2.flex_shrink = 0;
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
// const renderer = new Renderer(process.stdout, (render) => {
//     // render.fill(Rect.of(0, 0, render.width, render.height), Color.of(0, 0, 0));
//     // render.set_viewport(Rect.of(0, 0, 40, 10));
//     // render.fill(Rect.of(0, 0, render.width, render.height));
//     render.draw_scene();
//     render.execute_render(Rect.of(0, 0, render.width, render.height), Rect.of(0, 0, render.width, render.height), false, false);
// });
// renderer.set_scene(scene);
// const input = new Input(process.stdin);
// renderer.init();
// input.init();

// setInterval(() => {
//     time += 0.01;
//     renderer.queue_render();
// }, 33)

// renderer.queue_render();

// input.stream.on('data', (data) => {
//     time += 0.1;
//     time %= 20;
// });

// process.on('exit', () => {
//     renderer.dispose();
//     input.dispose();
// });

import { createSSRApp, PropType } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { defineComponent, ref, reactive } from 'vue'

const Counter = defineComponent({
    name: 'Counter',
    setup() {
        const count = ref(0)
        const increment = () => count.value++
        const decrement = () => count.value--

        return () => (
            <div class="counter">
                <h2>计数器组件</h2>
                <p>当前计数: {count.value}</p>
                <button onClick={increment}>+1</button>
                <button onClick={decrement}>-1</button>
            </div>
        )
    }
})

interface Todo {
    id: number
    text: string
    completed: boolean
}

const TodoList = defineComponent({
    name: 'TodoList',
    setup() {
        const todos = reactive<Todo[]>([
            { id: 1, text: '学习 Vue 3', completed: false },
            { id: 2, text: '学习 TSX', completed: false }
        ])
        const newTodo = ref('')

        const addTodo = () => {
            if (newTodo.value.trim()) {
                todos.push({
                    id: Date.now(),
                    text: newTodo.value,
                    completed: false
                })
                newTodo.value = ''
            }
        }

        const toggleTodo = (id: number) => {
            const todo = todos.find(t => t.id === id)
            if (todo) todo.completed = !todo.completed
        }

        const removeTodo = (id: number) => {
            const index = todos.findIndex(t => t.id === id)
            if (index > -1) todos.splice(index, 1)
        }

        return () => (
            <div class="todo-list">
                <h2>Todo 列表</h2>
                <div class="input-group">
                    <input
                        type="text"
                        value={newTodo.value}
                        placeholder="添加新任务..."
                    />
                    <button onClick={addTodo}>添加</button>
                </div>
                <ul>
                    {todos.map(todo => (
                        <li
                            key={todo.id}
                            class={todo.completed ? 'completed' : ''}
                            onClick={() => toggleTodo(todo.id)}
                        >
                            <span>{todo.text}</span>
                            <button>删除</button>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }
})

const ConditionalRender = defineComponent({
    name: 'ConditionalRender',
    setup() {
        const show = ref(true)
        const type = ref<'success' | 'error'>('success')

        return () => (
            <div class="conditional">
                <h2>条件渲染</h2>
                <button onClick={() => show.value = !show.value}>
                    {show.value ? '隐藏' : '显示'}
                </button>
                <button onClick={() => type.value = type.value === 'success' ? 'error' : 'success'}>
                    切换类型
                </button>
                {show.value && (
                    <p class={type.value}>
                        这是一条 {type.value} 消息
                    </p>
                )}
            </div>
        )
    }
})

interface User {
    name: string
    age: number
}

const UserCard = defineComponent({
    name: 'UserCard',
    props: {
        user: {
            type: Object as PropType<User>,
            required: true
        },
        showAge: {
            type: Boolean,
            default: true
        }
    },
    emits: ['update'],
    setup(props, { emit }) {
        const handleUpdate = () => {
            emit('update', props.user.name)
        }

        return () => (
            <div class="user-card">
                <h3>{props.user.name}</h3>
                {props.showAge && <p>年龄: {props.user.age}</p>}
                <button onClick={handleUpdate}>更新</button>
            </div>
        )
    }
})

const App = defineComponent({
    name: 'App',
    setup() {
        const user = ref({ name: 'Alice', age: 25 })

        const handleUserUpdate = (name: string) => {
            console.log('User updated:', name)
        }

        return () => (
            <div id="app">
                <h1>Vue 3 + TSX 示例</h1>

                <Counter />

                <TodoList />

                <ConditionalRender />

                <UserCard
                    user={user.value}
                    showAge={true}
                    onUpdate={handleUserUpdate}
                />
            </div>
        )
    }
})

async function render() {
    const app = createSSRApp(App)
    const html = await renderToString(app)

    console.log('Rendered HTML:')
    console.log(html)

    return html
}

render().catch(console.error)