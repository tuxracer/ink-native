/**
 * UI Renderer
 *
 * Renders Ink UI to a native framebuffer window by parsing ANSI sequences
 * and drawing bitmap font glyphs directly into a pixel buffer.
 * No GPU, no textures -- pure TypeScript pixel manipulation.
 */

import { AnsiParser, type Color, type DrawCommand } from "../AnsiParser";
import { BitmapFontRenderer, GLYPH_HEIGHT, GLYPH_WIDTH } from "../BitmapFont";
import { COLOR_CHANNEL_MAX } from "../consts";
import type { FensterKeyEvent, FensterPointer } from "../Fenster";
import {
	FENSTER_KEY_A,
	FENSTER_KEY_BACKSLASH,
	FENSTER_KEY_BACKSPACE,
	FENSTER_KEY_BRACKET_LEFT,
	FENSTER_KEY_BRACKET_RIGHT,
	FENSTER_KEY_DELETE,
	FENSTER_KEY_DOWN,
	FENSTER_KEY_END,
	FENSTER_KEY_ESCAPE,
	FENSTER_KEY_HOME,
	FENSTER_KEY_INSERT,
	FENSTER_KEY_LEFT,
	FENSTER_KEY_PAGEDOWN,
	FENSTER_KEY_PAGEUP,
	FENSTER_KEY_RETURN,
	FENSTER_KEY_RIGHT,
	FENSTER_KEY_SPACE,
	FENSTER_KEY_TAB,
	FENSTER_KEY_UP,
	FENSTER_KEY_Z,
	FENSTER_MOD_CTRL,
	FENSTER_MOD_SHIFT,
	getFenster,
	KEYS_ARRAY_SIZE,
} from "../Fenster";
import {
	ALPHA_MASK,
	ASCII_PRINTABLE_END,
	ASCII_PRINTABLE_START,
	BOLD_BRIGHTNESS_MULTIPLIER,
	CTRL_KEY_OFFSET,
	DEFAULT_BG,
	DEFAULT_FG,
	DEFAULT_WINDOW_HEIGHT,
	DEFAULT_WINDOW_WIDTH,
	DIM_BRIGHTNESS_MULTIPLIER,
	FENSTER_REFRESH_RATE,
	GREEN_SHIFT,
	HEX_COLOR_LENGTH,
	HEX_G_END,
	HEX_R_END,
	MIN_BRIGHTNESS,
	MIN_COLUMNS,
	MIN_ROWS,
	RED_SHIFT,
	SHIFTED_SYMBOLS,
	STRIKETHROUGH_POSITION,
	TEXT_DECORATION_THICKNESS,
	UNDERLINE_POSITION,
} from "./consts";
import type {
	Framebuffer,
	ProcessEventsResult,
	UiRendererOptions,
} from "./types";

export * from "./consts";
export * from "./types";

/**
 * Pack RGB color into fenster's 0xAARRGGBB pixel format
 */
export const packColor = (r: number, g: number, b: number): number =>
	(ALPHA_MASK | (r << RED_SHIFT) | (g << GREEN_SHIFT) | b) >>> 0;

/**
 * Adjust color brightness by a multiplier
 */
const adjustBrightness = (
	color: Color,
	multiplier: number,
	clamp = true,
): Color => ({
	r: clamp
		? Math.min(COLOR_CHANNEL_MAX, Math.floor(color.r * multiplier))
		: Math.floor(color.r * multiplier),
	g: clamp
		? Math.min(COLOR_CHANNEL_MAX, Math.floor(color.g * multiplier))
		: Math.floor(color.g * multiplier),
	b: clamp
		? Math.min(COLOR_CHANNEL_MAX, Math.floor(color.b * multiplier))
		: Math.floor(color.b * multiplier),
});

/**
 * Parse a background color from various formats
 */
const parseBackgroundColor = (
	color: [number, number, number] | string | undefined,
): Color => {
	if (!color) {
		return { ...DEFAULT_BG };
	}

	if (Array.isArray(color)) {
		return { r: color[0], g: color[1], b: color[2] };
	}

	const hex = color.startsWith("#") ? color.slice(1) : color;
	if (hex.length === HEX_COLOR_LENGTH) {
		const r = parseInt(hex.slice(0, HEX_R_END), 16);
		const g = parseInt(hex.slice(HEX_R_END, HEX_G_END), 16);
		const b = parseInt(hex.slice(HEX_G_END), 16);
		if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
			return { r, g, b };
		}
	}

	return { ...DEFAULT_BG };
};

/**
 * UI Renderer
 *
 * Renders Ink UI to a native framebuffer by parsing ANSI sequences
 * and drawing bitmap font glyphs. Uses a JS-side Uint32Array for
 * rendering, then copies to the native buffer on present.
 */
export class UiRenderer {
	private fenster = getFenster();
	private fensterPtr: FensterPointer;
	private fontRenderer = new BitmapFontRenderer();
	private ansiParser: AnsiParser;

	/** Logical window dimensions (in points) */
	private windowWidth: number;
	private windowHeight: number;

	/** Physical framebuffer dimensions (in pixels) */
	private physicalWidth: number;
	private physicalHeight: number;

	/** Backing scale factor */
	private scaleFactor: number;

	/** User-requested scale factor override (null = auto-detect) */
	private userScaleFactor: number | null;

	/** Scaled glyph dimensions (in physical pixels) */
	private scaledGlyphWidth: number;
	private scaledGlyphHeight: number;

	private columns: number;
	private rows: number;

	/** JS-side framebuffer for rendering (at physical resolution) */
	private framebuffer: Uint32Array;

	/** Previous key state for diff-based event detection */
	private prevKeys: Int32Array;

	private fgColor: Color = { ...DEFAULT_FG };
	private bgColor: Color = { ...DEFAULT_BG };
	private defaultBgColor: Color = { ...DEFAULT_BG };
	private bold = false;
	private dim = false;
	private italic = false;
	private underline = false;
	private strikethrough = false;
	private reverse = false;

	private shouldQuit = false;
	private pendingCommands: DrawCommand[] = [];

	constructor(options: UiRendererOptions = {}) {
		this.windowWidth = options.width ?? DEFAULT_WINDOW_WIDTH;
		this.windowHeight = options.height ?? DEFAULT_WINDOW_HEIGHT;
		this.userScaleFactor = options.scaleFactor ?? null;

		// Parse background color
		this.defaultBgColor = parseBackgroundColor(options.backgroundColor);
		this.bgColor = { ...this.defaultBgColor };

		this.ansiParser = new AnsiParser();

		// Initialize key state tracking
		this.prevKeys = new Int32Array(KEYS_ARRAY_SIZE);

		// Create fenster window at logical dimensions
		const title = options.title ?? "ink-native";
		this.fensterPtr = this.fenster.create(
			title,
			this.windowWidth,
			this.windowHeight,
		);
		this.fenster.open(this.fensterPtr);

		// Detect or apply scale factor
		if (this.userScaleFactor !== null) {
			this.fenster.setScale(this.fensterPtr, this.userScaleFactor);
			this.scaleFactor = this.userScaleFactor;
		} else {
			this.scaleFactor = this.fenster.getScale(this.fensterPtr);
		}

		// Compute physical dimensions and scaled glyph sizes
		this.physicalWidth = Math.round(this.windowWidth * this.scaleFactor);
		this.physicalHeight = Math.round(this.windowHeight * this.scaleFactor);
		this.scaledGlyphWidth = Math.round(GLYPH_WIDTH * this.scaleFactor);
		this.scaledGlyphHeight = Math.round(GLYPH_HEIGHT * this.scaleFactor);

		// Calculate terminal dimensions from logical size (unchanged by scale)
		this.columns = Math.max(
			MIN_COLUMNS,
			Math.floor(this.windowWidth / GLYPH_WIDTH),
		);
		this.rows = Math.max(
			MIN_ROWS,
			Math.floor(this.windowHeight / GLYPH_HEIGHT),
		);

		// Create JS-side framebuffer at physical resolution
		this.framebuffer = new Uint32Array(
			this.physicalWidth * this.physicalHeight,
		);

		// Fill with background color
		const bgPacked = packColor(
			this.defaultBgColor.r,
			this.defaultBgColor.g,
			this.defaultBgColor.b,
		);
		this.framebuffer.fill(bgPacked);

		// Copy initial background to native buffer
		this.copyToNativeBuffer();

		// Present initial frame
		this.fenster.loop(this.fensterPtr);
	}

	/**
	 * Copy JS framebuffer to native fenster buffer
	 */
	private copyToNativeBuffer(): void {
		const src = Buffer.from(
			this.framebuffer.buffer,
			this.framebuffer.byteOffset,
			this.framebuffer.byteLength,
		);
		this.fenster.copyBuf(this.fensterPtr, src);
	}

	/**
	 * Process ANSI output from Ink
	 */
	processAnsi(output: string): void {
		const commands = this.ansiParser.parse(output);
		this.pendingCommands.push(...commands);
	}

	/**
	 * Render pending commands and prepare for present
	 */
	present(): void {
		// Process all pending commands into the JS framebuffer
		for (const cmd of this.pendingCommands) {
			this.executeCommand(cmd);
		}
		this.pendingCommands = [];

		// Copy JS framebuffer to native buffer
		this.copyToNativeBuffer();
	}

	/**
	 * Process fenster events and present the buffer to screen
	 *
	 * Calls fenster_loop (which presents the buffer + polls events),
	 * then diffs the keys array to detect press/release events.
	 */
	processEventsAndPresent(): ProcessEventsResult {
		const result = this.fenster.loop(this.fensterPtr);
		if (result !== 0) {
			this.shouldQuit = true;
		}

		// Diff keys array for events
		const keyEvents: FensterKeyEvent[] = [];
		const currentKeys = this.fenster.getKeys(this.fensterPtr);

		for (let i = 0; i < KEYS_ARRAY_SIZE; i++) {
			const current = currentKeys[i]!;
			const prev = this.prevKeys[i]!;

			if (current !== prev) {
				keyEvents.push({
					keyIndex: i,
					pressed: current !== 0,
				});
				this.prevKeys[i] = current;
			}
		}

		const mod = this.fenster.getMod(this.fensterPtr);

		// Check for resize
		let resized = false;
		const resizeResult = this.fenster.getResized(this.fensterPtr);
		if (resizeResult) {
			this.handleResize(resizeResult.width, resizeResult.height);
			resized = true;
		}

		return { keyEvents, mod, resized };
	}

	/**
	 * Handle window resize by updating dimensions and recreating the framebuffer
	 *
	 * Receives physical dimensions from getResized() and derives logical
	 * dimensions using the current scale factor.
	 */
	private handleResize(newPhysWidth: number, newPhysHeight: number): void {
		// Re-query scale (may have changed if window moved between displays)
		this.scaleFactor =
			this.userScaleFactor ?? this.fenster.getScale(this.fensterPtr);

		this.physicalWidth = newPhysWidth;
		this.physicalHeight = newPhysHeight;
		this.windowWidth = Math.round(newPhysWidth / this.scaleFactor);
		this.windowHeight = Math.round(newPhysHeight / this.scaleFactor);

		this.scaledGlyphWidth = Math.round(GLYPH_WIDTH * this.scaleFactor);
		this.scaledGlyphHeight = Math.round(GLYPH_HEIGHT * this.scaleFactor);

		this.columns = Math.max(
			MIN_COLUMNS,
			Math.floor(this.windowWidth / GLYPH_WIDTH),
		);
		this.rows = Math.max(
			MIN_ROWS,
			Math.floor(this.windowHeight / GLYPH_HEIGHT),
		);

		// Recreate framebuffer at new physical size
		this.framebuffer = new Uint32Array(newPhysWidth * newPhysHeight);
		const bgPacked = packColor(
			this.defaultBgColor.r,
			this.defaultBgColor.g,
			this.defaultBgColor.b,
		);
		this.framebuffer.fill(bgPacked);

		// Reset ANSI parser state so Ink re-renders cleanly
		this.ansiParser.reset();
	}

	/**
	 * Convert a fenster key event to a terminal escape sequence
	 */
	keyEventToSequence(event: FensterKeyEvent, mod: number): string | null {
		// Only emit sequences on key press
		if (!event.pressed) {
			return null;
		}

		const key = event.keyIndex;
		const ctrl = (mod & FENSTER_MOD_CTRL) !== 0;
		const shift = (mod & FENSTER_MOD_SHIFT) !== 0;
		// Alt modifier available for future use
		// const alt = (mod & FENSTER_MOD_ALT) !== 0;

		// Navigation keys
		switch (key) {
			case FENSTER_KEY_UP:
				return "\x1b[A";
			case FENSTER_KEY_DOWN:
				return "\x1b[B";
			case FENSTER_KEY_RIGHT:
				return "\x1b[C";
			case FENSTER_KEY_LEFT:
				return "\x1b[D";
			case FENSTER_KEY_HOME:
				return "\x1b[H";
			case FENSTER_KEY_END:
				return "\x1b[F";
			case FENSTER_KEY_PAGEUP:
				return "\x1b[5~";
			case FENSTER_KEY_PAGEDOWN:
				return "\x1b[6~";
			case FENSTER_KEY_RETURN:
				return "\r";
			case FENSTER_KEY_ESCAPE:
				return "\x1b";
			case FENSTER_KEY_BACKSPACE:
				return "\x7f";
			case FENSTER_KEY_TAB:
				return shift ? "\x1b[Z" : "\t";
			case FENSTER_KEY_DELETE:
				return "\x1b[3~";
			case FENSTER_KEY_INSERT:
				return "\x1b[2~";
			case FENSTER_KEY_SPACE:
				return ctrl ? "\x00" : " ";
		}

		// Ctrl+key combinations (A-Z)
		if (ctrl && key >= FENSTER_KEY_A && key <= FENSTER_KEY_Z) {
			const ctrlCode = key - CTRL_KEY_OFFSET;
			return String.fromCharCode(ctrlCode);
		}

		// Ctrl+special keys
		if (ctrl) {
			switch (key) {
				case FENSTER_KEY_BRACKET_LEFT:
					return "\x1b";
				case FENSTER_KEY_BACKSLASH:
					return "\x1c";
				case FENSTER_KEY_BRACKET_RIGHT:
					return "\x1d";
			}
		}

		// Printable ASCII characters
		if (key >= ASCII_PRINTABLE_START && key <= ASCII_PRINTABLE_END) {
			if (key >= FENSTER_KEY_A && key <= FENSTER_KEY_Z) {
				return shift
					? String.fromCharCode(key)
					: String.fromCharCode(key).toLowerCase();
			}
			if (shift) {
				const shifted = SHIFTED_SYMBOLS[key];
				if (shifted) {
					return shifted;
				}
			}
			return String.fromCharCode(key);
		}

		return null;
	}

	/**
	 * Check if quit was requested
	 */
	shouldClose(): boolean {
		return this.shouldQuit;
	}

	/**
	 * Reset input state (no-op for fenster, modifier state is polled)
	 */
	resetInputState(): void {
		this.prevKeys.fill(0);
	}

	/**
	 * Get the display refresh rate (fixed for fenster)
	 */
	getDisplayRefreshRate(): number {
		return FENSTER_REFRESH_RATE;
	}

	/**
	 * Get terminal dimensions
	 */
	getDimensions(): { columns: number; rows: number } {
		return { columns: this.columns, rows: this.rows };
	}

	/**
	 * Get direct access to the framebuffer pixel buffer.
	 *
	 * The returned `pixels` array is the same backing buffer used by the
	 * renderer, so writes are immediately visible on the next `present()` call.
	 * Pixel format is 0xAARRGGBB — use `packColor(r, g, b)` to create values.
	 */
	getFramebuffer(): Framebuffer {
		return {
			pixels: this.framebuffer,
			width: this.physicalWidth,
			height: this.physicalHeight,
		};
	}

	/**
	 * Clear the entire screen
	 */
	clear(): void {
		const bgPacked = packColor(
			this.defaultBgColor.r,
			this.defaultBgColor.g,
			this.defaultBgColor.b,
		);
		this.framebuffer.fill(bgPacked);
		this.ansiParser.reset();
	}

	/**
	 * Get cursor position
	 */
	getCursorPos(): { x: number; y: number } {
		const cursor = this.ansiParser.getCursor();
		return { x: cursor.col, y: cursor.row };
	}

	/**
	 * Execute a single draw command
	 */
	private executeCommand(cmd: DrawCommand): void {
		switch (cmd.type) {
			case "text":
				this.renderText(cmd);
				break;

			case "clear_screen": {
				const bgPacked = packColor(
					this.defaultBgColor.r,
					this.defaultBgColor.g,
					this.defaultBgColor.b,
				);
				this.framebuffer.fill(bgPacked);
				this.ansiParser.reset();
				break;
			}

			case "clear_line":
				this.clearLine(cmd.row ?? 1, cmd.col ?? 1);
				break;

			case "cursor_move":
				break;

			case "set_fg":
				if (cmd.color) {
					this.fgColor = cmd.color;
				}
				break;

			case "set_bg":
				if (cmd.color) {
					this.bgColor = cmd.color;
				}
				break;

			case "reset_style":
				this.fgColor = { ...DEFAULT_FG };
				this.bgColor = { ...this.defaultBgColor };
				this.bold = false;
				this.dim = false;
				this.italic = false;
				this.underline = false;
				this.strikethrough = false;
				this.reverse = false;
				break;

			case "set_bold":
				this.bold = cmd.enabled ?? false;
				break;

			case "set_dim":
				this.dim = cmd.enabled ?? false;
				break;

			case "set_italic":
				this.italic = cmd.enabled ?? false;
				break;

			case "set_underline":
				this.underline = cmd.enabled ?? false;
				break;

			case "set_strikethrough":
				this.strikethrough = cmd.enabled ?? false;
				break;

			case "set_reverse":
				this.reverse = cmd.enabled ?? false;
				break;
		}
	}

	/**
	 * Render text at position (using scaled coordinates for physical resolution)
	 */
	private renderText(cmd: DrawCommand): void {
		if (!cmd.text) {
			return;
		}

		const text = cmd.text;
		const row = cmd.row ?? 1;
		const col = cmd.col ?? 1;

		// Calculate pixel position in physical coordinates (1-indexed to 0-indexed)
		const x = (col - 1) * this.scaledGlyphWidth;
		const y = (row - 1) * this.scaledGlyphHeight;

		// Determine colors (handle reverse)
		let fg = this.reverse ? this.bgColor : this.fgColor;
		const bg = this.reverse ? this.fgColor : this.bgColor;

		// Apply bold (brighten colors)
		if (this.bold) {
			fg = adjustBrightness(fg, BOLD_BRIGHTNESS_MULTIPLIER);
		}

		// Apply dim (darken colors)
		if (this.dim) {
			fg = adjustBrightness(fg, DIM_BRIGHTNESS_MULTIPLIER, false);
		}

		// Ensure minimum brightness for visibility
		const brightness = Math.max(fg.r, fg.g, fg.b);
		if (brightness < MIN_BRIGHTNESS) {
			if (brightness === 0) {
				fg = { r: MIN_BRIGHTNESS, g: MIN_BRIGHTNESS, b: MIN_BRIGHTNESS };
			} else {
				fg = adjustBrightness(fg, MIN_BRIGHTNESS / brightness);
			}
		}

		// Measure text width at physical scale
		const textWidth = this.fontRenderer.measureTextScaled(
			text,
			this.scaleFactor,
		);

		// Draw background rectangle
		const bgPacked = packColor(bg.r, bg.g, bg.b);
		this.fillRect(x, y, textWidth, this.scaledGlyphHeight, bgPacked);

		// Render text glyphs via nearest-neighbor scaling
		const fgPacked = packColor(fg.r, fg.g, fg.b);
		this.fontRenderer.renderTextScaled(
			this.framebuffer,
			this.physicalWidth,
			this.physicalHeight,
			x,
			y,
			text,
			fgPacked,
			this.scaleFactor,
			this.italic,
		);

		// Draw text decorations (scaled)
		if (this.underline || this.strikethrough) {
			const lineThickness = Math.max(
				1,
				Math.round(this.scaledGlyphHeight * TEXT_DECORATION_THICKNESS),
			);

			if (this.underline) {
				const underlineY =
					y + Math.round(this.scaledGlyphHeight * UNDERLINE_POSITION);
				this.fillRect(x, underlineY, textWidth, lineThickness, fgPacked);
			}

			if (this.strikethrough) {
				const strikeY =
					y + Math.round(this.scaledGlyphHeight * STRIKETHROUGH_POSITION);
				this.fillRect(x, strikeY, textWidth, lineThickness, fgPacked);
			}
		}
	}

	/**
	 * Fill a rectangle in the framebuffer (physical pixel coordinates)
	 */
	private fillRect(
		x: number,
		y: number,
		w: number,
		h: number,
		color: number,
	): void {
		const x0 = Math.max(0, x);
		const y0 = Math.max(0, y);
		const x1 = Math.min(this.physicalWidth, x + w);
		const y1 = Math.min(this.physicalHeight, y + h);

		for (let py = y0; py < y1; py++) {
			const rowOffset = py * this.physicalWidth;
			for (let px = x0; px < x1; px++) {
				this.framebuffer[rowOffset + px] = color;
			}
		}
	}

	/**
	 * Clear a line from a specific position (scaled coordinates)
	 */
	private clearLine(row: number, fromCol: number): void {
		const x = (fromCol - 1) * this.scaledGlyphWidth;
		const y = (row - 1) * this.scaledGlyphHeight;
		const clearWidth = this.physicalWidth - x;
		const bgPacked = packColor(this.bgColor.r, this.bgColor.g, this.bgColor.b);
		this.fillRect(x, y, clearWidth, this.scaledGlyphHeight, bgPacked);
	}

	/**
	 * Clean up resources
	 */
	destroy(): void {
		this.fenster.close(this.fensterPtr);
	}

	/**
	 * Reset state for reuse
	 */
	reset(): void {
		this.shouldQuit = false;
		this.pendingCommands = [];
		this.fgColor = { ...DEFAULT_FG };
		this.bgColor = { ...this.defaultBgColor };
		this.bold = false;
		this.dim = false;
		this.italic = false;
		this.underline = false;
		this.strikethrough = false;
		this.reverse = false;
		this.ansiParser.reset();
	}
}
