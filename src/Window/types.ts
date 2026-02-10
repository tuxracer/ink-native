import type { InputStream } from "../InputStream";
import type { OutputStream } from "../OutputStream";
import type { UiRenderer } from "../UiRenderer";
import type { Window } from ".";

/**
 * Options for creating streams
 */
export interface StreamsOptions {
	/** Window title */
	title?: string;
	/** Window width in pixels */
	width?: number;
	/** Window height in pixels */
	height?: number;
	/** Background color as RGB tuple [r, g, b] or hex string "#RRGGBB" */
	backgroundColor?: [number, number, number] | string | undefined;
	/** Force a specific frame rate instead of default 60fps */
	frameRate?: number | undefined;
	/** HiDPI scale factor override (number = override, null/undefined = auto-detect) */
	scaleFactor?: number | null;
}

/**
 * Result of createStreams
 */
export interface Streams {
	/** Readable stream for keyboard input */
	stdin: InputStream;
	/** Writable stream for ANSI output */
	stdout: OutputStream;
	/** Window wrapper with events */
	window: Window;
	/** UI renderer (for advanced use) */
	renderer: UiRenderer;
}
