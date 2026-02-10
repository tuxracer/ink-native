import type { FensterKeyEvent } from "../Fenster";

/** Options for creating a UiRenderer */
export interface UiRendererOptions {
	/** Window width in pixels (default 800) */
	width?: number;
	/** Window height in pixels (default 600) */
	height?: number;
	/** Window title (default "ink-native") */
	title?: string;
	/** Background color as RGB tuple [r, g, b] or hex string "#RRGGBB" */
	backgroundColor?: [number, number, number] | string | undefined;
	/** HiDPI scale factor override (number = override, null/undefined = auto-detect) */
	scaleFactor?: number | null;
}

/** Direct access to the native framebuffer pixel buffer */
export interface Framebuffer {
	/** Pixel buffer in 0xAARRGGBB format (physical resolution) */
	pixels: Uint32Array;
	/** Physical width in pixels */
	width: number;
	/** Physical height in pixels */
	height: number;
}

/** Result from processing native window events */
export interface ProcessEventsResult {
	/** Key events detected by diffing the keys array */
	keyEvents: FensterKeyEvent[];
	/** Current modifier bitmask */
	mod: number;
	/** Whether the window was resized this frame */
	resized: boolean;
}
