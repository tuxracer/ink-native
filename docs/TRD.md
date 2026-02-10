# Technical Requirements Document: ink-native

## Overview

**ink-native** is a standalone npm package that enables developers using [Ink](https://github.com/vadimdemedes/ink) (the React-based TUI framework) to render their terminal UI to a native window instead of the terminal. It requires zero system dependencies. The rendering pipeline uses an embedded bitmap font and a bundled native framebuffer library.

### Problem Statement

Ink applications are limited to terminal rendering, which presents challenges for certain use cases:

- **Inconsistent rendering**: Different terminal emulators vary in ANSI support, color accuracy, and font rendering
- **Limited control**: Applications cannot directly control HiDPI scaling or window dimensions
- **Distribution friction**: End users need a compatible terminal emulator to run TUI applications
- **Mixed rendering**: Applications needing both high-framerate graphics (emulators, games, video) and Ink UI cannot efficiently share a terminal window

### Solution

ink-native provides a drop-in replacement for Ink's stdout/stdin streams that redirect rendering to a native framebuffer window while maintaining full compatibility with existing Ink applications. No system dependencies are required. The package bundles a compiled native bridge and an embedded bitmap font.

### Goals

1. **Zero application changes**: Existing Ink apps work by swapping stream configuration
2. **Zero system dependencies**: No libraries to install - everything is bundled
3. **Full ANSI support**: Parse and render all ANSI sequences Ink produces
4. **Cross-platform**: macOS, Linux, and Windows support
5. **No native compilation**: Uses FFI bindings via koffi to a bundled shared library
6. **HiDPI support**: Crisp bitmap font rendering on Retina/HiDPI displays

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                    Ink Application                       │
│                   (React Components)                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Ink Runtime                         │
│              (Renders to ANSI sequences)                 │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│   process.stdout    │    │      ink-native streams      │
│   (Terminal)        │    │                             │
└─────────────────────┘    │  ┌─────────────────────┐    │
                           │  │   OutputStream      │    │
                           │  │  (Writable stream)  │    │
                           │  └─────────────────────┘    │
                           │            │                 │
                           │            ▼                 │
                           │  ┌─────────────────────┐    │
                           │  │    AnsiParser       │    │
                           │  │  (ANSI → Commands)  │    │
                           │  └─────────────────────┘    │
                           │            │                 │
                           │            ▼                 │
                           │  ┌─────────────────────┐    │
                           │  │    UiRenderer       │    │
                           │  │ (Commands → pixels) │    │
                           │  └─────────────────────┘    │
                           │            │                 │
                           │            ▼                 │
                           │  ┌─────────────────────┐    │
                           │  │ BitmapFontRenderer  │    │
                           │  │  (embedded glyphs)  │    │
                           │  └─────────────────────┘    │
                           │            │                 │
                           │            ▼                 │
                           │  ┌─────────────────────┐    │
                           │  │   Fenster Window    │    │
                           │  │   (framebuffer)     │    │
                           │  └─────────────────────┘    │
                           │                             │
                           │  ┌─────────────────────┐    │
                           │  │    InputStream      │    │
                           │  │  (Readable stream)  │    │
                           │  └─────────────────────┘    │
                           └─────────────────────────────┘
```

### Core Components

#### 1. OutputStream

A Node.js Writable stream that:

- Implements the TTY interface Ink expects (`isTTY`, `columns`, `rows`)
- Receives ANSI escape sequence output from Ink
- Passes data to the ANSI parser via a duck-typed `UiRendererLike` interface
- Triggers frame presentation after each write

The `UiRendererLike` interface decouples the stream from the renderer implementation:

```typescript
interface UiRendererLike {
  getDimensions(): { columns: number; rows: number };
  processAnsi(text: string): void;
  present(): void;
  clear(): void;
  getCursorPos(): { x: number; y: number };
}
```

#### 2. InputStream

A Node.js Readable stream that:

- Implements TTY interface (`setRawMode()`, `isTTY`)
- Buffers keyboard input from window events
- Provides input to Ink's key handling system
- Always operates in raw mode (terminal sequences, not line-buffered)

#### 3. AnsiParser

Parses ANSI escape sequences and produces draw commands:

- Cursor positioning (absolute and relative)
- Colors: 16-color, 256-color, and 24-bit RGB
- Styles: bold, dim, italic, underline, strikethrough, reverse video
- Screen/line clearing
- Special characters (newline, tab, carriage return)

The parser is completely backend-agnostic, it converts ANSI text into a stream of `DrawCommand` objects that the renderer interprets.

#### 4. UiRenderer

The main rendering coordinator:

- Creates and manages the fenster window
- Maintains cursor position and style state
- Processes draw commands from AnsiParser
- Handles window resize and HiDPI scaling
- Coordinates with BitmapFontRenderer for glyph output
- Diffs fenster's polled key state array to detect key press/release events
- Maps key events to terminal escape sequences

Rendering is done entirely in TypeScript: commands manipulate a JS-side `Uint32Array` framebuffer at physical resolution, which is then bulk-copied to the native buffer on present.

#### 5. BitmapFontRenderer

Renders text using embedded Cozette bitmap font data:

- 6,014 glyphs including ASCII, Latin-1, box drawing, block elements, geometric shapes, braille patterns, and emoji
- Each glyph stored as bit-packed row data (1 byte/row for 6px wide, 2 bytes/row for 12px wide double-width characters)
- Pure TypeScript just bit tests and pixel writes, no allocations per glyph
- Supports nearest-neighbor scaling for HiDPI displays (preserves crisp pixel aesthetics)
- Faux-italic rendering via horizontal shear (~8.7 degree slant)
- Glyph dimensions: 6x13 pixels (normal), 12x13 pixels (double-width)

#### 6. KeyboardEvent

Converts fenster key events into `NativeKeyboardEvent` objects:

- Maps fenster key indices to `key` and `code` strings via lookup tables
- Handles shift state to produce correct `key` values (e.g., `a` → `A`, `1` → `!`)
- Derives modifier booleans (`ctrlKey`, `shiftKey`, `altKey`, `metaKey`) from fenster's bitmask
- Returns `null` for unmapped key indices
- Self-contained module — does not depend on UiRenderer's `SHIFTED_SYMBOLS`

#### 7. Window

The window wrapper and event loop coordinator:

- Manages the `setInterval`-based event loop
- Processes key events from UiRenderer and pushes sequences to InputStream
- Emits `keydown`/`keyup` events with `NativeKeyboardEvent` payload
- Handles Ctrl+C (SIGINT) with configurable behavior
- Emits events: `close`, `resize`, `keydown`, `keyup`, `sigint`
- Provides `createStreams()` factory function for creating all components

#### 8. Fenster FFI Bindings

FFI bindings to the fenster native bridge via koffi:

- Bundled shared library per platform (`.dylib` / `.so` / `.dll`)
- Lazy singleton pattern (instantiated on first use)
- No system dependencies the native library is included in the package
- Thin C bridge (~70 LOC) that wraps fenster's inline functions as exported symbols
- Exposes: window create/open/loop/close, buffer copy, key state, modifier state, resize detection, HiDPI scale factor

## API Design

### Primary API

```typescript
import { createStreams } from "ink-native";
import { render, Text, Box } from "ink";

const App = () => (
  <Box flexDirection="column">
    <Text color="green">Hello from ink-native!</Text>
    <Text>Press 'q' to quit</Text>
  </Box>
);

const { stdin, stdout, window } = createStreams({
  title: "My App",
  width: 800,
  height: 600,
  backgroundColor: "#1a1a2e",
});

render(<App />, { stdin, stdout });

window.on("close", () => process.exit(0));
```

### Configuration Options

```typescript
interface StreamsOptions {
  /** Window title (default: "ink-native") */
  title?: string;
  /** Window width in pixels (default: 800) */
  width?: number;
  /** Window height in pixels (default: 600) */
  height?: number;
  /** Background color as RGB tuple [r, g, b] or hex string "#RRGGBB" */
  backgroundColor?: [number, number, number] | string;
  /** Force a specific frame rate instead of default 60fps */
  frameRate?: number;
  /** HiDPI scale factor override (number = override, null/undefined = auto-detect) */
  scaleFactor?: number | null;
}
```

### Streams Result

```typescript
interface Streams {
  /** Readable stream for keyboard input */
  stdin: InputStream;
  /** Writable stream for ANSI output */
  stdout: OutputStream;
  /** Window wrapper with events */
  window: Window;
  /** UI renderer (for advanced use) */
  renderer: UiRenderer;
}
```

### Stream Interfaces

```typescript
interface OutputStream extends Writable {
  readonly isTTY: true;
  readonly columns: number;
  readonly rows: number;

  // Resize event for Ink
  on(event: "resize", handler: () => void): this;
}

interface InputStream extends Readable {
  readonly isTTY: true;
  isRaw: boolean;

  setRawMode(mode: boolean): this;
  ref(): this;
  unref(): this;
}
```

### Window Events

```typescript
window.on("close", () => {
  /* window closed */
});
window.on("resize", (dims) => {
  /* { columns, rows } */
});
window.on("keydown", (event: NativeKeyboardEvent) => {
  /* key press event */
  console.log(event.key, event.code, event.ctrlKey);
});
window.on("keyup", (event: NativeKeyboardEvent) => {
  /* key release event */
});
window.on("sigint", () => {
  /* Ctrl+C pressed */
});
```

#### NativeKeyboardEvent

```typescript
interface NativeKeyboardEvent {
  readonly key: string;        // Key value: "a", "A", "Enter", "ArrowUp", "!"
  readonly code: string;       // Physical key code: "KeyA", "Digit1", "ArrowUp"
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: false;      // Always false (fenster only reports transitions)
  readonly type: "keydown" | "keyup";
}
```

## ANSI Sequence Support

### Required Sequences

| Category | Sequences                          | Description                            |
| -------- | ---------------------------------- | -------------------------------------- |
| Cursor   | `CSI H`, `CSI ;H`, `CSI row;colH`  | Absolute positioning                   |
| Cursor   | `CSI A/B/C/D`                      | Relative movement (up/down/left/right) |
| Cursor   | `CSI G`                            | Cursor horizontal absolute             |
| Colors   | `SGR 30-37`, `SGR 90-97`           | Foreground colors (normal/bright)      |
| Colors   | `SGR 40-47`, `SGR 100-107`         | Background colors (normal/bright)      |
| Colors   | `SGR 38;5;N`, `SGR 48;5;N`         | 256-color mode                         |
| Colors   | `SGR 38;2;R;G;B`, `SGR 48;2;R;G;B` | 24-bit RGB                             |
| Styles   | `SGR 0`                            | Reset all attributes                   |
| Styles   | `SGR 1`                            | Bold                                   |
| Styles   | `SGR 2`                            | Dim                                    |
| Styles   | `SGR 3`, `SGR 23`                  | Italic on/off                          |
| Styles   | `SGR 4`, `SGR 24`                  | Underline on/off                       |
| Styles   | `SGR 7`, `SGR 27`                  | Reverse video on/off                   |
| Styles   | `SGR 9`, `SGR 29`                  | Strikethrough on/off                   |
| Styles   | `SGR 22`                           | Normal intensity                       |
| Styles   | `SGR 39`, `SGR 49`                 | Default fg/bg color                    |
| Erase    | `CSI 2J`                           | Clear entire screen                    |
| Erase    | `CSI 3J`                           | Clear screen and scrollback            |
| Erase    | `CSI K`, `CSI 0K`                  | Clear to end of line                   |
| Erase    | `CSI 1K`                           | Clear to beginning of line             |
| Erase    | `CSI 2K`                           | Clear entire line                      |

### Control Characters

| Character       | Code        | Behavior                      |
| --------------- | ----------- | ----------------------------- |
| Newline         | `\n` (0x0A) | Move to next line, column 1   |
| Carriage Return | `\r` (0x0D) | Move to column 1              |
| Tab             | `\t` (0x09) | Move to next 8-space tab stop |

## Keyboard Input Mapping

Fenster uses a polled `keys[256]` array instead of an event queue. UiRenderer diffs the current and previous key state arrays each frame to detect press/release events, then maps them to terminal escape sequences.

### Special Keys

| Key         | Terminal Sequence |
| ----------- | ----------------- |
| Arrow Up    | `\x1b[A`          |
| Arrow Down  | `\x1b[B`          |
| Arrow Right | `\x1b[C`          |
| Arrow Left  | `\x1b[D`          |
| Home        | `\x1b[H`          |
| End         | `\x1b[F`          |
| Page Up     | `\x1b[5~`         |
| Page Down   | `\x1b[6~`         |
| Delete      | `\x1b[3~`         |
| Enter       | `\r`              |
| Tab         | `\t`              |
| Shift+Tab   | `\x1b[Z`          |
| Escape      | `\x1b`            |
| Backspace   | `\x7f`            |

### Modifier Combinations

| Modifier       | Behavior                                      |
| -------------- | --------------------------------------------- |
| Ctrl + Letter  | Sends control character (e.g., Ctrl+C = 0x03) |
| Ctrl + Space   | Sends NUL (0x00)                              |
| Ctrl + `[`     | Sends ESC (0x1b)                              |
| Ctrl + `\`     | Sends FS (0x1c)                               |
| Ctrl + `]`     | Sends GS (0x1d)                               |
| Shift + Letter | Sends uppercase letter                        |

### Modifier Bitmask

Fenster reports modifiers as a bitmask: Ctrl=1, Shift=2, Alt=4, Meta=8.

## HiDPI Handling

1. Scale factor detected per-platform: macOS `backingScaleFactor`, Windows `GetDpiForWindow` (dynamically loaded for backward compatibility), Linux defaults to 1.0
2. User can override via `scaleFactor` option (number = override, null/undefined = auto-detect)
3. Framebuffer allocated at physical resolution (logical size x scale factor)
4. Bitmap font glyphs scaled via nearest-neighbor sampling (preserves crisp pixel aesthetics)
5. Terminal dimensions (columns/rows) computed from logical window size (unchanged by scale)
6. Scale changes detected on each frame (e.g., window moved between displays)

## Dependencies

### Runtime Dependencies

| Package | Purpose                                            |
| ------- | -------------------------------------------------- |
| koffi   | FFI bindings to the bundled fenster native library |

### System Dependencies

None. The fenster native library is bundled with the package as a pre-compiled shared library per platform.

### Bundled Assets

- **Cozette font** (Cozette.bdf): Source BDF file used to generate the embedded bitmap font data
- **Fenster native bridge**: Pre-compiled shared library (`fenster.dylib` / `fenster.so` / `fenster.dll`)

## Cross-Platform Considerations

### Native Library Resolution

The fenster native library is bundled in the `native/` directory of the package. Library paths are resolved relative to the project root:

| Platform | Library Path           |
| -------- | ---------------------- |
| macOS    | `native/fenster.dylib` |
| Linux    | `native/fenster.so`    |
| Windows  | `native/fenster.dll`   |

## Performance Considerations

### Rendering Pipeline

1. Ink writes ANSI output to OutputStream
2. OutputStream calls `processAnsi()` on UiRenderer
3. AnsiParser converts to draw commands (minimal allocations)
4. UiRenderer executes commands into a JS-side `Uint32Array` framebuffer
5. Framebuffer bulk-copied to native buffer via `fenster_bridge_copy_buf`
6. `fenster_loop()` presents the buffer and polls events

### Bitmap Font Rendering

- No glyph caching needed, rendering is just bit tests and pixel writes
- Each glyph's bitmap data is stored as compact `Uint8Array` (13 bytes for normal, 26 bytes for wide)
- Nearest-neighbor scaling for HiDPI avoids any interpolation overhead
- Background rectangles rendered as simple `fillRect` operations

### Input Processing

- Key state diffed once per frame (256-entry array comparison)
- Only changed keys generate events
- Modifier state polled directly from fenster

### Frame Rate

- Default 60fps via `setInterval`-based event loop
- Configurable via `frameRate` option in `createStreams()`
- Ink's own debouncing applies to updates

## Testing Strategy

### Unit Tests

- AnsiParser: Comprehensive sequence parsing tests
- BitmapFontRenderer: Glyph rendering and measurement
- KeyboardEvent: Key mapping, shift state, modifiers, keydown/keyup
- Color conversion: 256-color and RGB accuracy

### Integration Tests

- Stream interface compatibility with Ink
- Window lifecycle (create, resize, close)
- Full render pipeline with sample Ink components

### Visual Tests

- Reference screenshots for regression testing
- HiDPI rendering verification
- Unicode character rendering

## Package Structure

Each module is a directory named after its primary export, containing `index.ts` and optionally `consts.ts` for module-specific constants, `types.ts` for type definitions, and `tests.ts` for tests:

```
ink-native/
├── src/
│   ├── index.ts                # Public API exports
│   ├── cli.tsx                 # CLI entry point (pnpm dlx ink-native)
│   ├── consts.ts               # Shared constants
│   ├── Demo/
│   │   └── index.tsx           # Demo components (DemoApp)
│   ├── Window/                 # Entry point and event loop
│   │   ├── index.ts            # createStreams(), Window class
│   │   ├── consts.ts
│   │   └── types.ts            # StreamsOptions, Streams
│   ├── OutputStream/
│   │   ├── index.ts            # Writable stream for ANSI output
│   │   ├── consts.ts
│   │   └── types.ts            # UiRendererLike interface
│   ├── InputStream/
│   │   └── index.ts            # Readable stream for keyboard input
│   ├── UiRenderer/
│   │   ├── index.ts            # Framebuffer renderer and key mapping
│   │   ├── consts.ts
│   │   └── types.ts            # UiRendererOptions, ProcessEventsResult
│   ├── AnsiParser/
│   │   ├── index.ts            # ANSI escape sequence parsing
│   │   ├── tests.ts
│   │   ├── consts.ts
│   │   └── types.ts            # Color, DrawCommand, DrawCommandType
│   ├── BitmapFont/
│   │   ├── index.ts            # Bitmap glyph blitter (Uint32Array)
│   │   ├── glyphData.ts        # Generated: 6,014 Cozette glyph bitmaps
│   │   ├── consts.ts
│   │   └── types.ts            # GlyphBitmap
│   ├── KeyboardEvent/
│   │   ├── index.ts            # createKeyboardEvent()
│   │   ├── consts.ts           # Fenster-to-key mapping tables
│   │   ├── types.ts            # NativeKeyboardEvent, isNativeKeyboardEvent
│   │   └── tests.ts
│   └── Fenster/
│       ├── index.ts            # FFI bindings to fenster via koffi
│       ├── consts.ts           # Key indices, modifier bitmasks, library paths
│       └── types.ts            # FensterPointer, FensterKeyEvent
├── native/
│   ├── fenster.h               # Vendored fenster header
│   ├── fenster_bridge.c        # C bridge (~70 LOC) for koffi
│   └── fenster.dylib           # Compiled native library (platform-specific)
├── scripts/
│   ├── build-fenster.sh        # Compiles native bridge → fenster.dylib/.so
│   └── generate-font-data.ts   # Parses Cozette.bdf → glyphData.ts
├── fonts/
│   └── Cozette.bdf             # BDF source (bitmap font generation)
├── docs/
│   └── TRD.md
├── package.json
├── tsconfig.json
└── README.md
```

## CLI Demo

The package includes a built-in demo that can be run directly:

```bash
# Run the demo (installs and executes)
pnpm dlx ink-native

# With options
pnpm dlx ink-native --title "My App" --width 1024 --height 768
pnpm dlx ink-native --background "#1a1a2e"
pnpm dlx ink-native --frame-rate 30
```

The demo showcases text styles, colors (16, 256, and RGB), box layouts, and dynamic updates.

## Usage Examples

### Basic Usage

```typescript
import React from "react";
import { render, Text, Box } from "ink";
import { createStreams } from "ink-native";

const App = () => (
  <Box flexDirection="column">
    <Text color="green">Hello from ink-native!</Text>
    <Text>Press 'q' to quit</Text>
  </Box>
);

const { stdin, stdout, window } = createStreams({
  title: "My Ink App",
  width: 640,
  height: 480,
});

const { unmount } = render(<App />, { stdin, stdout });

window.on("close", () => {
  unmount();
  window.close();
  process.exit(0);
});
```

### Custom Background Color

```typescript
const { stdin, stdout, window } = createStreams({
  title: "Dark Theme",
  backgroundColor: "#1a1a2e",
});
```

### HiDPI Scale Override

```typescript
// Force 2x scaling regardless of display
const { stdin, stdout, window } = createStreams({
  scaleFactor: 2,
});

// Auto-detect (default behavior)
const { stdin, stdout, window } = createStreams({
  scaleFactor: null,
});
```

## Direct Framebuffer Access

### Pixel Format

The framebuffer uses `0xAARRGGBB` 32-bit pixel format (big-endian ARGB in a `Uint32Array`). The alpha channel is always `0xFF` (fully opaque). Use `packColor(r, g, b)` to create pixel values.

### Pause/Resume Mechanism

The `Window` class provides `pause()` and `resume()` methods to transfer control between Ink's event loop and user code:

1. **Paused**: `Window.pause()` clears the `setInterval` event loop. The user is responsible for calling `renderer.processEventsAndPresent()` to poll window events and present the framebuffer.
2. **Resumed**: `Window.resume()` restarts the `setInterval` event loop, returning to normal Ink rendering.

The `getFramebuffer()` method returns a `Framebuffer` object with the live `pixels` array (same backing buffer as the renderer), plus `width` and `height` in physical pixels. Writes to `pixels` are visible on the next `present()` call.

## Future Considerations

### Potential Enhancements

1. **Mouse support**: Map native mouse events to terminal mouse sequences
2. **Clipboard integration**: Native clipboard access
3. **Multiple windows**: Support for multi-window Ink applications
4. **Custom cursor styles**: Block, underline, bar cursor options
5. **Alt screen buffer**: Save/restore screen buffer support

### Out of Scope (v1)

- Image rendering (Kitty/iTerm2 graphics protocols)
- GPU-accelerated effects/shaders
- Custom widget rendering (non-Ink components)
- Sound/audio integration
- Custom font loading (TTF/OTF)

## Success Criteria

1. **Compatibility**: Works with any Ink application without code changes
2. **Zero dependencies**: No system libraries to install
3. **Performance**: 60fps rendering with complex UIs
4. **Cross-platform**: Verified on macOS, Linux, and Windows
5. **Documentation**: Clear setup instructions and API reference
6. **Reliability**: Proper cleanup on exit, no resource leaks
