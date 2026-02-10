/**
 * ink-native
 *
 * Render Ink TUI applications in native windows.
 *
 * @example
 * ```typescript
 * import { render, Text, Box } from "ink";
 * import { createStreams } from "ink-native";
 *
 * const App = () => (
 *   <Box flexDirection="column">
 *     <Text color="green">Hello from ink-native!</Text>
 *   </Box>
 * );
 *
 * const { stdin, stdout, window } = createStreams({
 *   title: "My App",
 *   width: 800,
 *   height: 600,
 * });
 *
 * render(<App />, { stdin, stdout });
 *
 * window.on("close", () => process.exit(0));
 * ```
 */

// Enable ANSI color output for chalk/Ink.
// This must be set before chalk is imported (via Ink) for colors to work.
// If ink-native is imported before ink, this will enable colors automatically.
// Otherwise, users should set FORCE_COLOR=3 in their environment.
if (process.env["FORCE_COLOR"] === undefined) {
	process.env["FORCE_COLOR"] = "3";
}

// Shared
export { AnsiParser, type Color, type DrawCommand } from "./AnsiParser";
// Font
export { BitmapFontRenderer } from "./BitmapFont";
// Fenster bindings (for advanced use)
export {
	Fenster,
	type FensterKeyEvent,
	type FensterPointer,
	getFenster,
	isFensterAvailable,
} from "./Fenster";
export { InputStream } from "./InputStream";
export { OutputStream } from "./OutputStream";
// Renderer
export {
	type Framebuffer,
	type ProcessEventsResult,
	packColor,
	UiRenderer,
	type UiRendererOptions,
} from "./UiRenderer";
// Main API
export {
	createStreams,
	type Streams,
	type StreamsOptions,
	Window,
} from "./Window";
