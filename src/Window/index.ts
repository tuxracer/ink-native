/**
 * Window and Streams for Ink
 *
 * Factory function to create stdin/stdout streams that render to a
 * native framebuffer window.
 */

import { EventEmitter } from "node:events";
import { isDefined, pickBy } from "remeda";
import { InputStream } from "../InputStream";
import { OutputStream } from "../OutputStream";
import { UiRenderer, type UiRendererOptions } from "../UiRenderer";
import {
	DEFAULT_EVENT_LOOP_INTERVAL_MS,
	DEFAULT_FRAME_RATE,
	MS_PER_SECOND,
} from "./consts";

import type { Streams, StreamsOptions } from "./types";

export * from "./types";

/**
 * Window wrapper that emits events
 *
 * Manages the event loop, key event processing, and stream coordination
 * for the native window backend.
 */
export class Window extends EventEmitter {
	private renderer: UiRenderer;
	private eventLoopHandle: ReturnType<typeof setInterval> | null = null;
	private inputStream: InputStream;
	private outputStream: OutputStream;
	private closed = false;
	private paused = false;
	private currentFrameRate: number;

	constructor(
		renderer: UiRenderer,
		inputStream: InputStream,
		outputStream: OutputStream,
		frameRate?: number,
	) {
		super();
		this.renderer = renderer;
		this.inputStream = inputStream;
		this.outputStream = outputStream;
		this.currentFrameRate = frameRate ?? DEFAULT_FRAME_RATE;

		this.startEventLoop();
	}

	/**
	 * Start the event loop
	 */
	private startEventLoop(): void {
		const intervalMs =
			this.currentFrameRate > 0
				? Math.floor(MS_PER_SECOND / this.currentFrameRate)
				: DEFAULT_EVENT_LOOP_INTERVAL_MS;

		this.eventLoopHandle = setInterval(() => {
			this.runEventLoopIteration();
		}, intervalMs);
	}

	/**
	 * Run a single iteration of the event loop
	 */
	private runEventLoopIteration(): void {
		if (this.closed) {
			return;
		}

		// Process events and present the framebuffer
		const { keyEvents, mod, resized } = this.renderer.processEventsAndPresent();

		// Convert key events to terminal sequences
		for (const event of keyEvents) {
			const sequence = this.renderer.keyEventToSequence(event, mod);
			if (sequence) {
				// Ctrl+C handling
				if (sequence === "\x03") {
					if (this.listenerCount("sigint") > 0) {
						this.emit("sigint");
					} else {
						process.kill(process.pid, "SIGINT");
					}
					continue;
				}

				this.inputStream.pushKey(sequence);
				this.emit("key", event);
			}
		}

		// Notify Ink of resize so it can re-render with new dimensions
		if (resized) {
			this.outputStream.notifyResize();
			this.emit("resize", this.renderer.getDimensions());
		}

		// Check for window close
		if (this.renderer.shouldClose()) {
			this.emit("close");
			this.close();
		}
	}

	/**
	 * Get terminal dimensions
	 */
	getDimensions(): { columns: number; rows: number } {
		return this.renderer.getDimensions();
	}

	/**
	 * Clear the screen
	 */
	clear(): void {
		this.renderer.clear();
		this.renderer.present();
	}

	/**
	 * Close the window
	 */
	close(): void {
		if (this.closed) {
			return;
		}

		this.closed = true;

		if (this.eventLoopHandle) {
			clearInterval(this.eventLoopHandle);
			this.eventLoopHandle = null;
		}

		this.inputStream.close();
		this.renderer.destroy();
	}

	/**
	 * Check if window is closed
	 */
	isClosed(): boolean {
		return this.closed;
	}

	/**
	 * Pause the Ink event loop so the caller can take over rendering.
	 *
	 * While paused, call `renderer.processEventsAndPresent()` manually
	 * in your own loop to poll events and present the framebuffer.
	 */
	pause(): void {
		if (this.paused) {
			return;
		}

		this.paused = true;

		if (this.eventLoopHandle) {
			clearInterval(this.eventLoopHandle);
			this.eventLoopHandle = null;
		}
	}

	/**
	 * Resume the Ink event loop after pausing.
	 */
	resume(): void {
		if (!this.paused) {
			return;
		}

		this.paused = false;
		this.startEventLoop();
	}

	/**
	 * Check if the event loop is paused
	 */
	isPaused(): boolean {
		return this.paused;
	}

	/**
	 * Get the output stream
	 */
	getOutputStream(): OutputStream {
		return this.outputStream;
	}

	/**
	 * Get the current frame rate
	 */
	getFrameRate(): number {
		return this.currentFrameRate;
	}
}

/**
 * Create streams for use with Ink
 *
 * Creates stdin/stdout streams backed by a native window.
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
export const createStreams = (options: StreamsOptions = {}): Streams => {
	// Enable ANSI color output for chalk/Ink
	if (process.env["FORCE_COLOR"] === undefined) {
		process.env["FORCE_COLOR"] = "3";
	}

	// Create the UI renderer - filter out undefined options
	const rendererOptions = pickBy(options, isDefined) as UiRendererOptions;

	const renderer = new UiRenderer(rendererOptions);

	// Create streams
	const inputStream = new InputStream();
	const outputStream = new OutputStream(renderer);

	// Create window wrapper
	const window = new Window(
		renderer,
		inputStream,
		outputStream,
		options.frameRate,
	);

	return {
		stdin: inputStream,
		stdout: outputStream,
		window,
		renderer,
	};
};

// Re-export consts
export * from "./consts";
