# ink-native

Render [Ink](https://github.com/vadimdemedes/ink) TUI applications in native windows instead of the terminal. Build graphical applications using React/Ink's declarative paradigm with zero system dependencies.

## Why ink-native?

For plain text TUIs, a GPU-accelerated terminal like [Ghostty](https://ghostty.org/) or [Kitty](https://sw.kovidgoyal.net/kitty/) works great. So why render to a native window instead?

**The problem appears when you need high-framerate graphics alongside your Ink UI** like an emulator, game, or video player with a React-based menu system.

Even GPU-accelerated terminals struggle when using image protocols (like the [Kitty graphics protocol](https://sw.kovidgoyal.net/kitty/graphics-protocol/)) because they require:

```
Raw pixels → base64 encode (+33% size) → escape sequences →
PTY syscalls → terminal parses sequences → base64 decode → GPU upload → render
```

At 60fps for an 800x600 frame, that's ~110 MB/s of base64-encoded data through the PTY. Even the fastest terminals can't keep up.

**Direct framebuffer rendering bypasses all of this:**

```
Raw pixels → memcpy to framebuffer → render
```

No encoding, no PTY, no parsing, no process boundary - just a memory copy.

**ink-native lets you combine both**: render game/emulator frames directly to the framebuffer for performance, while reusing your existing Ink components for menus and UI in the same window. And since everything is bundled (native library + bitmap font), there are zero system dependencies to install.

## Features

- Zero system dependencies - no external libraries to install
- Full ANSI color support (16, 256, and 24-bit true color)
- Keyboard input with modifier keys (Ctrl, Shift, Alt)
- Window resizing with automatic terminal dimension updates
- HiDPI/Retina display support
- Embedded [Cozette](https://github.com/slavfox/Cozette) bitmap font with 6,000+ glyphs
- Cross-platform (macOS, Linux, Windows)

## Installation

```bash
npm install ink-native
# or
pnpm add ink-native
```

No system dependencies required. The native window library and bitmap font are bundled with the package.

## Demo

Run the built-in demo to see ink-native in action:

```bash
npx ink-native
# or
pnpm dlx ink-native
```

The demo showcases text styles, colors, box layouts, and dynamic updates. Use `--help` to see available options:

```bash
npx ink-native --help
```

**Example commands:**

```bash
# Custom window size
npx ink-native --width 1024 --height 768

# Dark background
npx ink-native --background "#1a1a2e"

# Custom frame rate
npx ink-native --frame-rate 30
```

| Flag           | Description                               |
| -------------- | ----------------------------------------- |
| `--title`      | Window title                              |
| `--width`      | Window width in pixels (default: 800)     |
| `--height`     | Window height in pixels (default: 600)    |
| `--background` | Background color as hex (e.g., "#1a1a2e") |
| `--frame-rate` | Force frame rate instead of default 60fps |
| `-h`, `--help` | Show help message                         |

## Usage

```tsx
import React, { useState, useEffect } from "react";
import { render, Text, Box } from "ink";
import { createStreams } from "ink-native";

const App = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green" bold>
        Hello from ink-native!
      </Text>
      <Text>
        Counter: <Text color="cyan">{count}</Text>
      </Text>
    </Box>
  );
};

const { stdin, stdout, window } = createStreams({
  title: "My App",
  width: 800,
  height: 600,
});

render(<App />, { stdin, stdout });

window.on("close", () => process.exit(0));
```

## Direct Framebuffer Access

For high-framerate graphics (emulators, games, video players), you can write pixels directly to the framebuffer while pausing Ink:

```tsx
import { createStreams, packColor } from "ink-native";
import { render, Text, Box } from "ink";

const App = () => (
  <Box>
    <Text>Game UI overlay</Text>
  </Box>
);

const { stdin, stdout, window, renderer } = createStreams({
  title: "My Game",
  width: 800,
  height: 600,
});

render(<App />, { stdin, stdout });

// Pause Ink to take over rendering
window.pause();

const fb = renderer.getFramebuffer();

// Keyboard events keep firing when paused
window.on("keydown", (event) => {
  if (event.key === "q") {
    clearInterval(gameLoop);
    window.resume(); // hand control back to Ink
  }
});

window.on("close", () => {
  clearInterval(gameLoop);
  process.exit(0);
});

// Game loop — just render, events are handled automatically
const gameLoop = setInterval(() => {
  // Write pixels directly (0xAARRGGBB format)
  for (let y = 100; y < 200; y++) {
    for (let x = 100; x < 200; x++) {
      fb.pixels[y * fb.width + x] = packColor(255, 0, 0); // red square
    }
  }

  // Copy to native buffer (the event loop presents it)
  renderer.present();
}, 16); // ~60fps
```

### Switching Between Ink UI and Custom Rendering

For applications that need to switch between Ink UI (e.g., menus) and custom rendering (e.g., an emulator or game), use `pause()` and `resume()` to hand off control:

```typescript
import { render, Text, Box } from "ink";
import { createStreams, packColor } from "ink-native";

const { stdin, stdout, window, renderer } = createStreams({
  title: "My Emulator",
  width: 800,
  height: 600,
});

// Phase 1: Render menu UI with Ink
const MenuApp = () => (
  <Box flexDirection="column" padding={1}>
    <Text color="green" bold>My Emulator</Text>
    <Text>Press Enter to start</Text>
  </Box>
);

const { unmount } = render(<MenuApp />, { stdin, stdout });

// Phase 2: When ready, pause Ink and take over rendering
const startEmulator = () => {
  window.pause();

  const fb = renderer.getFramebuffer();
  let emuLoop: ReturnType<typeof setInterval>;

  // Keyboard events keep firing when paused
  window.on("keydown", (event) => {
    if (event.key === "Escape") {
      // Return to menu
      clearInterval(emuLoop);
      renderer.clear();
      window.resume(); // hand control back to Ink
    }
  });

  emuLoop = setInterval(() => {
    // Write emulator frame directly to the framebuffer
    renderEmulatorFrame(fb.pixels, fb.width, fb.height);

    // Copy to native buffer (the event loop presents it)
    renderer.present();
  }, 16);
};
```

The framebuffer is shared — Ink renders to it when active, and you write pixels directly when paused. Calling `resume()` hands control back to Ink seamlessly.

### API Summary

| Export                      | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `packColor(r, g, b)`        | Pack RGB values into `0xAARRGGBB` pixel format          |
| `renderer.getFramebuffer()` | Get `{ pixels, width, height }` — the live pixel buffer |
| `window.pause()`            | Pause Ink (events keep firing)                          |
| `window.resume()`           | Resume Ink                                              |
| `window.isPaused()`         | Check if Ink is paused                                  |

## API

### `createStreams(options?)`

Creates stdin/stdout streams and a window for use with Ink.

#### Options (`StreamsOptions`)

| Option            | Type                                 | Default        | Description                                           |
| ----------------- | ------------------------------------ | -------------- | ----------------------------------------------------- |
| `title`           | `string`                             | `"ink-native"` | Window title                                          |
| `width`           | `number`                             | `800`          | Window width in pixels                                |
| `height`          | `number`                             | `600`          | Window height in pixels                               |
| `backgroundColor` | `[number, number, number] \| string` | `[0, 0, 0]`    | Background color as RGB tuple or hex string "#RRGGBB" |
| `frameRate`       | `number`                             | `60`           | Target frame rate                                     |
| `scaleFactor`     | `number \| null`                     | `null`         | Override HiDPI scale factor (null = auto-detect)      |

#### Returns (`Streams`)

```typescript
{
  stdin: InputStream; // Readable stream for keyboard input
  stdout: OutputStream; // Writable stream for ANSI output
  window: Window; // Window wrapper with events
  renderer: UiRenderer; // UI renderer (for advanced use)
}
```

### `Window`

Event emitter for window lifecycle and input events.

#### Events

- `keydown` -- Emitted when a key is pressed (with `NativeKeyboardEvent` payload)
- `keyup` -- Emitted when a key is released (with `NativeKeyboardEvent` payload)
- `close` -- Emitted when the window is closed
- `resize` -- Emitted when the window is resized (with `{ columns, rows }`)
- `sigint` -- Emitted on Ctrl+C (if a listener is registered; otherwise sends SIGINT to the process)

#### Methods

- `getDimensions()` -- Returns `{ columns, rows }` for terminal size
- `getFrameRate()` -- Returns the current frame rate
- `getOutputStream()` -- Returns the output stream
- `clear()` -- Clear the screen
- `close()` -- Close the window
- `isClosed()` -- Check if the window is closed
- `pause()` -- Pause Ink for manual rendering (keydown/keyup/resize/close events keep firing)
- `resume()` -- Resume Ink
- `isPaused()` -- Check if Ink is paused
- `processEvents()` -- Manually poll events and present the framebuffer (for custom render loops that need explicit control)

## Keyboard Events

The `window` emits `keydown` and `keyup` events with a `NativeKeyboardEvent` payload:

```typescript
import { createStreams, type NativeKeyboardEvent } from "ink-native";

const { window } = createStreams({ title: "My Game" });

window.on("keydown", (event: NativeKeyboardEvent) => {
  console.log(event.key);     // "a", "A", "Enter", "ArrowUp", "Shift"
  console.log(event.code);    // "KeyA", "Enter", "ArrowUp", "ShiftLeft"
  console.log(event.ctrlKey); // true if Ctrl is held
  console.log(event.type);    // "keydown"
});

window.on("keyup", (event: NativeKeyboardEvent) => {
  console.log(event.key, "released");
});
```

#### `NativeKeyboardEvent`

| Property   | Type                     | Description                                             |
| ---------- | ------------------------ | ------------------------------------------------------- |
| `key`      | `string`                 | The key value: `"a"`, `"A"`, `"Enter"`, `"Shift"`      |
| `code`     | `string`                 | Physical key code: `"KeyA"`, `"Enter"`, `"ShiftLeft"`   |
| `ctrlKey`  | `boolean`                | Whether Ctrl is held                                    |
| `shiftKey` | `boolean`                | Whether Shift is held                                   |
| `altKey`   | `boolean`                | Whether Alt is held                                     |
| `metaKey`  | `boolean`                | Whether Meta/Command is held                            |
| `repeat`   | `false`                  | Always `false` (fenster only reports transitions)       |
| `type`     | `"keydown" \| "keyup"`   | Whether the key was pressed or released                 |

Modifier keys fire their own events with left/right distinction — `event.code` will be `"ShiftLeft"` or `"ShiftRight"`, while `event.key` gives the generic name `"Shift"`.

#### `isNativeKeyboardEvent(value)`

Type guard to check if a value is a `NativeKeyboardEvent`:

```typescript
import { isNativeKeyboardEvent } from "ink-native";

window.on("keydown", (event) => {
  if (isNativeKeyboardEvent(event)) {
    // event is typed as NativeKeyboardEvent
  }
});
```

### Terminal Sequences

In addition to `keydown`/`keyup` events, key presses are also mapped to terminal escape sequences and pushed to `stdin` for Ink's built-in key handling:

- Arrow keys (Up, Down, Left, Right)
- Enter, Escape, Backspace, Tab, Delete
- Home, End, Page Up, Page Down
- Function keys (F1-F12)
- Ctrl+A through Ctrl+Z
- Shift for uppercase letters
- Alt + letter sends `\x1b` + letter

## Low-Level Components

For advanced use cases, ink-native exports its internal components:

```typescript
import {
  // Main API
  createStreams,
  Window,
  InputStream,
  OutputStream,

  // Keyboard events
  createKeyboardEvent,
  isNativeKeyboardEvent,
  type NativeKeyboardEvent,

  // Renderer
  UiRenderer,
  packColor,
  type UiRendererOptions,
  type Framebuffer,
  type ProcessEventsResult,

  // Font
  BitmapFontRenderer,

  // ANSI parsing
  AnsiParser,
  type Color,
  type DrawCommand,

  // Fenster FFI bindings
  getFenster,
  Fenster,
  isFensterAvailable,
  type FensterPointer,
  type FensterKeyEvent,

  // Types
  type StreamsOptions,
  type Streams,
} from "ink-native";
```

### `isFensterAvailable()`

Check if the native fenster library can be loaded on the current platform. Useful for graceful fallback to terminal rendering:

```typescript
import { isFensterAvailable, createStreams } from "ink-native";
import { render } from "ink";

if (isFensterAvailable()) {
  const { stdin, stdout, window } = createStreams({ title: "My App" });
  render(<App />, { stdin, stdout });
  window.on("close", () => process.exit(0));
} else {
  render(<App />);
}
```

### `AnsiParser`

Parses ANSI escape sequences into structured draw commands. Supports cursor positioning, 16/256/24-bit colors, text styles (bold, dim, reverse), screen/line clearing, and alt screen buffer.

### `BitmapFontRenderer`

Renders text by blitting embedded Cozette bitmap font glyphs into a `Uint32Array` framebuffer. Supports 6,000+ glyphs including ASCII, Latin-1, box drawing, block elements, braille patterns, and more.

### `getFenster()` / `Fenster`

Low-level FFI bindings to the [fenster](https://github.com/zserge/fenster) native library via koffi. Provides direct access to window creation, framebuffer manipulation, and event polling.

## License

MIT
