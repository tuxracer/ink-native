/**
 * Fenster FFI Bindings
 *
 * Provides fenster bindings for framebuffer-based window rendering
 * using koffi for foreign function interface. No system dependencies
 * required beyond the bundled native library.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import koffi from "koffi";
import { FENSTER_LIB_PATHS, INT32_BYTES, KEYS_ARRAY_SIZE } from "./consts";
import type { FensterPointer } from "./types";

/**
 * Resolve the bundled fenster library path for the current platform.
 *
 * Uses Node's module resolution via `import.meta.resolve` to locate the
 * native library within the installed package. This works even when a
 * consumer bundles their code, because the package (and its native files)
 * still lives in node_modules.
 *
 * Falls back to resolving relative to this file for development.
 */
const findFensterLibrary = (): string | null => {
	const libName = FENSTER_LIB_PATHS[process.platform];
	if (!libName) {
		return null;
	}

	// When consumed as a dependency: resolve through Node's module system
	try {
		return fileURLToPath(import.meta.resolve(`ink-native/${libName}`));
	} catch {
		// Not installed as a dependency — running from source
	}

	// Development fallback: resolve relative to this file
	const currentDir = dirname(fileURLToPath(import.meta.url));
	const projectRoot = resolve(currentDir, "../..");
	return resolve(projectRoot, libName);
};

/**
 * Fenster API wrapper class
 *
 * Provides type-safe access to the fenster bridge functions for
 * framebuffer-based window rendering.
 */
export class Fenster {
	private lib: koffi.IKoffiLib;

	private _create!: (title: string, w: number, h: number) => FensterPointer;
	private _open!: (f: FensterPointer) => number;
	private _loop!: (f: FensterPointer) => number;
	private _close!: (f: FensterPointer) => void;
	private _copyBuf!: (
		f: FensterPointer,
		src: Buffer,
		byteLength: number,
	) => void;
	private _getKeys!: (f: FensterPointer) => unknown;
	private _getMod!: (f: FensterPointer) => number;
	private _getSize!: (f: FensterPointer, w: Buffer, h: Buffer) => void;
	private _getResized!: (f: FensterPointer, w: Buffer, h: Buffer) => number;
	private _getScale!: (f: FensterPointer) => number;
	private _setScale!: (f: FensterPointer, scale: number) => void;

	constructor() {
		const libPath = findFensterLibrary();
		if (!libPath) {
			throw new Error(
				"Fenster native library not found. Run: pnpm run build:fenster",
			);
		}

		this.lib = koffi.load(libPath);
		this.bindFunctions();
	}

	private bindFunctions(): void {
		this._create = this.lib.func(
			"void* fenster_bridge_create(const char* title, int w, int h)",
		);
		this._open = this.lib.func("int fenster_bridge_open(void* f)");
		this._loop = this.lib.func("int fenster_bridge_loop(void* f)");
		this._close = this.lib.func("void fenster_bridge_close(void* f)");
		this._copyBuf = this.lib.func(
			"void fenster_bridge_copy_buf(void* f, const uint8_t* src, int byte_length)",
		);
		this._getKeys = this.lib.func("void* fenster_bridge_get_keys(void* f)");
		this._getMod = this.lib.func("int fenster_bridge_get_mod(void* f)");
		this._getSize = this.lib.func(
			"void fenster_bridge_get_size(void* f, int* w, int* h)",
		);
		this._getResized = this.lib.func(
			"int fenster_bridge_get_resized(void* f, int* w, int* h)",
		);
		this._getScale = this.lib.func("float fenster_bridge_get_scale(void* f)");
		this._setScale = this.lib.func(
			"void fenster_bridge_set_scale(void* f, float scale)",
		);
	}

	/**
	 * Create a new fenster window (does not open it yet)
	 */
	create(title: string, width: number, height: number): FensterPointer {
		const ptr = this._create(title, width, height);
		if (!ptr) {
			throw new Error("Failed to create fenster window");
		}
		return ptr;
	}

	/**
	 * Open the fenster window
	 */
	open(f: FensterPointer): void {
		const result = this._open(f);
		if (result !== 0) {
			throw new Error("Failed to open fenster window");
		}
	}

	/**
	 * Process events and present the buffer
	 *
	 * Returns 0 on success, non-zero if window should close.
	 */
	loop(f: FensterPointer): number {
		return this._loop(f);
	}

	/**
	 * Close the fenster window and free resources
	 */
	close(f: FensterPointer): void {
		this._close(f);
	}

	/**
	 * Copy pixel data into fenster's native buffer
	 *
	 * Accepts a Buffer (e.g. a view over a Uint32Array) and memcpy's it
	 * into the native pixel buffer so the next `loop()` call presents it.
	 */
	copyBuf(f: FensterPointer, src: Buffer): void {
		this._copyBuf(f, src, src.byteLength);
	}

	/**
	 * Get the keys state array
	 *
	 * 256 entries; each entry is 1 (pressed) or 0 (released).
	 */
	getKeys(f: FensterPointer): number[] {
		const ptr = this._getKeys(f);
		return koffi.decode(ptr, koffi.types.int32, KEYS_ARRAY_SIZE) as number[];
	}

	/**
	 * Get the current modifier bitmask
	 *
	 * Bits: ctrl=1, shift=2, alt=4, meta=8
	 */
	getMod(f: FensterPointer): number {
		return this._getMod(f);
	}

	/**
	 * Check if the window was resized since the last call
	 *
	 * Returns the new dimensions if resized, or null if no resize occurred.
	 * Clears the resize flag on read.
	 */
	getResized(f: FensterPointer): { width: number; height: number } | null {
		const wBuf = Buffer.alloc(INT32_BYTES);
		const hBuf = Buffer.alloc(INT32_BYTES);
		const resized = this._getResized(f, wBuf, hBuf);
		if (resized === 0) {
			return null;
		}
		return {
			width: wBuf.readInt32LE(0),
			height: hBuf.readInt32LE(0),
		};
	}

	/**
	 * Get the backing scale factor (1.0 = normal, 2.0 = Retina)
	 */
	getScale(f: FensterPointer): number {
		return this._getScale(f);
	}

	/**
	 * Override the backing scale factor
	 *
	 * Recomputes physical dimensions from logical size * scale.
	 */
	setScale(f: FensterPointer, scale: number): void {
		this._setScale(f, scale);
	}

	/**
	 * Get the window size
	 */
	getSize(f: FensterPointer): { width: number; height: number } {
		const wBuf = Buffer.alloc(INT32_BYTES);
		const hBuf = Buffer.alloc(INT32_BYTES);
		this._getSize(f, wBuf, hBuf);
		return {
			width: wBuf.readInt32LE(0),
			height: hBuf.readInt32LE(0),
		};
	}
}

// Singleton instance (lazy-loaded)
let fensterInstance: Fenster | null = null;

/**
 * Get the Fenster API singleton
 */
export const getFenster = (): Fenster => {
	if (!fensterInstance) {
		fensterInstance = new Fenster();
	}
	return fensterInstance;
};

/**
 * Check if fenster is available without throwing
 */
export const isFensterAvailable = (): boolean => {
	try {
		getFenster();
		return true;
	} catch {
		return false;
	}
};

export * from "./consts";
// Re-export types and constants
export type { FensterKeyEvent, FensterPointer } from "./types";
