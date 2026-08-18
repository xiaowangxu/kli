# Kli

Kli is an experimental terminal UI renderer for Solid. It lets you describe a reactive TUI with JSX while Yoga handles flexbox layout and Kli renders the result with ANSI escape sequences.

The current alpha supports:

- Solid signals, components, lifecycle, and keyed/list rendering
- Flexbox layout powered by Yoga
- RGB foreground/background colors, text styles, borders, and shaders
- Unicode-aware text measurement, wrapping, and clipping
- Framebuffer rendering with source-over/custom blending, alpha, opacity stacks, and scissor rectangles
- DOM-like capture/target/bubble events with cancellation and pointer capture
- SGR mouse position, hover, click, context-menu, drag, and wheel input
- Focus traversal, terminal-cursor synchronization, and keyboard/wheel scrolling
- Native `button`, `checkbox`, `input-box`, and `frame-buffer` JSX elements

## Requirements

- Node.js 20 or newer
- A terminal with ANSI and true-color support
- `solid-js` in the consuming project

## Run the demo

```bash
npm install
npm start
```

Press `Ctrl+C` to exit. Use the mouse wheel to move between the controls and framebuffer labs. `Tab`/`Shift+Tab` move focus; focused scroll containers also respond to arrows, `PageUp`, `PageDown`, `Home`, and `End`.

## Minimal app

```tsx
import { createSignal } from 'solid-js';
import {
  FlexDirection,
  ValueInputEvent,
  render,
} from 'kli';

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <box flex_direction={FlexDirection.Column} padding={1}>
      <text-box>
        <text bold>Kli controls</text>
      </text-box>
      <input-box placeholder="Your name" />
      <button label={`Count: ${count()}`} on_click={() => setCount((value) => value + 1)} />
      <checkbox label="Send updates" on_change={(event: ValueInputEvent<boolean>) => {
        console.log(event.value);
      }} />
    </box>
  );
}

render(App);
```

Solid must compile JSX with its universal renderer pointed at `kli`. The repository's [`tsup.config.dev.ts`](./tsup.config.dev.ts) shows the required `esbuild-plugin-solid` setup.

## Event and input model

Nodes expose `addEventListener`/`removeEventListener` and JSX event properties such as `on_click`, `on_click_capture`, `on_keydown`, and `on_wheel`. Events travel through capture, target, and bubble phases. `stopPropagation()`, `stopImmediatePropagation()`, and `preventDefault()` follow browser-style semantics; snake-case aliases remain available.

Keyboard input is represented by `KeyInputEvent`:

- `key` is normalized for UI code, for example `Tab`, `Enter`, `ArrowDown`, or the printable character.
- `keycode` keeps Node's terminal key name, for example `tab`, `return`, or `down`.
- `ctrl`, `shift`, and `alt` describe modifier keys.
- `preventDefault()` cancels built-in focus, widget, or scrolling behavior.

Terminal protocols generally do not expose key-release events, so keyboard events currently use `pressed: true`.

`MouseInputEvent` includes zero-based `clientX`/`clientY`, movement, button state, modifiers, and related targets. `WheelInputEvent` adds `deltaX`/`deltaY`. Mouse input uses SGR coordinates and supports hover transitions, synthesized click/context-menu events, hit testing through clipped layouts, and pointer capture during drags.

## Framebuffer

`FrameBuffer` is available for offscreen drawing and compositing. It supports RGBA cells, source-over alpha by default, WebGL-style blend factors/equations, constant blend color, opacity stacks, nested scissor rectangles, cropped framebuffer blits, and pixel reads. Use `<frame-buffer source={buffer} />` to place an offscreen buffer in the Yoga scene graph.

## Project status

Kli is still an alpha, so API stability and broader terminal compatibility remain active work. The demo and automated suite cover the current renderer, interaction model, controls, scrolling, and color compositor.

## Development

```bash
npm run typecheck
npm test
npm run build
```
