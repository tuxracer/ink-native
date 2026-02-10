/**
 * Output Stream for Ink
 *
 * A Writable stream that intercepts Ink's ANSI output and renders it
 * to a native window.
 */

import { Writable } from "node:stream";
import { isString } from "remeda";
import { DEFAULT_COLUMNS, DEFAULT_ROWS } from "./consts";
import type { UiRendererLike } from "./types";

export * from "./consts";
export * from "./types";

/**
 * Output Stream
 *
 * Wraps a UiRenderer in a Node.js Writable stream that Ink
 * can use as stdout.
 */
export class OutputStream extends Writable {
	/** TTY interface property expected by Ink */
	isTTY = true;

	private uiRenderer: UiRendererLike;

	constructor(uiRenderer: UiRendererLike) {
		super({
			decodeStrings: false,
		});

		this.uiRenderer = uiRenderer;
	}

	/**
	 * Get terminal columns
	 */
	get columns(): number {
		const dims = this.uiRenderer.getDimensions();
		return dims.columns || DEFAULT_COLUMNS;
	}

	/**
	 * Get terminal rows
	 */
	get rows(): number {
		const dims = this.uiRenderer.getDimensions();
		return dims.rows || DEFAULT_ROWS;
	}

	/**
	 * Notify Ink of resize
	 */
	notifyResize(): void {
		this.emit("resize");
	}

	/**
	 * Implement Writable._write
	 */
	override _write(
		chunk: Buffer | string,
		_encoding: BufferEncoding,
		callback: (error?: Error | null) => void,
	): void {
		try {
			const text = isString(chunk) ? chunk : chunk.toString("utf8");

			// Process the ANSI output
			this.uiRenderer.processAnsi(text);

			// Present the frame
			this.uiRenderer.present();

			callback(null);
		} catch (error) {
			callback(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get the underlying renderer
	 */
	getRenderer(): UiRendererLike {
		return this.uiRenderer;
	}

	/**
	 * Clear the screen
	 */
	clear(): void {
		this.uiRenderer.clear();
	}

	/**
	 * Write a string directly (bypasses Writable buffering)
	 */
	writeSync(text: string): void {
		this.uiRenderer.processAnsi(text);
		this.uiRenderer.present();
	}

	/**
	 * Get cursor position
	 */
	getCursorPos(): { x: number; y: number } {
		return this.uiRenderer.getCursorPos();
	}
}
