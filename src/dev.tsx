import { Color } from "./package/util/color.js";
import { BorderStyleType } from "./package/style/border_style.js";
import { render } from './package/solid/render.js';
import { createSignal, Index, onCleanup } from 'solid-js';
import { Align, FlexDirection, Justify, Overflow, PositionType } from "yoga-layout";
import { useDeltaFrame } from "./package/solid/hook/use_delta_frame.js";
import { Shader } from "./package/style/shader.js";

function hsv2rgb(h: number, s: number, v: number) {
	const k = (n: number) => (n + h * 6) % 6;
	const f = (n: number) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
	return { r: f(5), g: f(3), b: f(1) };
}

function Frame() {
	const { delta, duration } = useDeltaFrame(30, true);
	const shader: Shader = (u, v, w, h) => {
		const time = duration() / 1000;
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
			content: u < 0.5 ? (v < 0.5 ? '\\' : '/') : (v < 0.5 ? '/' : '\\'),
		};
	}
	return <box bg_shader={shader} flex_grow={0} flex_shrink={0} width={'100%'} aspect_ratio={2} padding_horizontal={1} border={1} border_type={BorderStyleType.Round} border_color={Color.of(255, 0, 190)} flex_direction={FlexDirection.Row} align_content={Align.Center} align_items={Align.Center} justify_content={Justify.Center}>
		<box bg_color={Color.of(0, 0, 0)} padding_horizontal={1}>
			<text-box>
				<text color={Color.of(255, 255, 255)}>{duration()}ms</text>
			</text-box>
		</box>
	</box>
}

function Box(props: { name: string }) {
	const [count, setCount] = createSignal(0);
	const timer = setInterval(() => {
		setCount(count() + 1);
	}, 500);
	onCleanup(() => clearInterval(timer));
	return <box flex_grow={0} flex_shrink={0} height={5} padding_horizontal={2} padding_vertical={1} border={1} border_type={BorderStyleType.Round} border_color={Color.of(100, 100, 100)} overflow={Overflow.Hidden}>
		<text-box>
			<text>{props.name} : {count()}</text>
		</text-box>
	</box>
}

function App() {
	return (
		<box position={PositionType.Absolute} top={0} left={0} right={0} bottom={0} flex_direction={FlexDirection.Row} gap={1} align_items={Align.Stretch}>
			<box flex_direction={FlexDirection.Column} padding_horizontal={2} padding_vertical={1} flex_grow={1} flex_shrink={1} overflow={Overflow.Scroll} border={1} border_type={BorderStyleType.Round} border_color={Color.of(100, 100, 100)}>
				<text-box>
					<text color={Color.of(255, 190, 0)} underline>Hello from <text bold>Kli</text></text>
					<br />
					<br />
					<text>Hello World 这个可以换行 😘</text>
					<br />
					<text  color={Color.of(255, 190, 0)}>这是个非常好的问题，实际上是 <text bold italic>终端字符宽度（character width / display width）</text> 的问题。</text>
					<br />
					<text>{`你看到中文引号 \`“ ”\` 在控制台中宽度为 **1**，是因为 **Unicode East Asian Width 属性** 的定义和终端渲染策略不一致造成的。下面我来详细解释：

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

如果你愿意，我可以帮你写一个 **TypeScript 函数**，在 CLI 布局中正确计算中英文混合字符串的显示宽度（考虑全角、半角和 Ambiguous 的差异）。是否要我帮你写？` }</text>
				</text-box>
			</box>
			<box flex_grow={0} flex_shrink={0} width={24} padding_horizontal={0} overflow={Overflow.Hidden} border={0} border_type={undefined /*BorderStyleType.Round*/} border_color={Color.of(255, 0, 0)}>
				<Index each={['hello', 'test', '你好世界']}>
					{(cat, i) => (
						<Box name={cat()} />
					)}
				</Index>
				<Frame />
			</box>
			<box position={PositionType.Absolute} bottom={0} right={0} border={1} padding_horizontal={1} border_type={BorderStyleType.Round} border_color={Color.of(255, 124, 255)}>
				<text-box>
					<text color={Color.of(255, 124, 255)}>Kli</text>
				</text-box>
			</box>
		</box>
	);
}

render(App);