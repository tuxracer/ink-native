/**
 * Bitmap Font Renderer
 *
 * Renders text using embedded Cozette bitmap font data directly into
 * a Uint32Array framebuffer. Pure TypeScript -- no native dependencies,
 * no caching needed (just bit tests and pixel writes).
 */

import {
	BITS_PER_BYTE,
	GLYPH_HEIGHT,
	GLYPH_WIDTH,
	ITALIC_SHEAR_AMOUNT,
	MISSING_GLYPH_CODEPOINT,
	MSB_BIT_POSITION,
	WIDE_GLYPH_WIDTH,
} from "./consts";
import { GLYPH_DATA } from "./glyphData";

export * from "./consts";
export * from "./types";

/**
 * Bitmap Font Renderer
 *
 * Blits bitmap font glyphs directly into a Uint32Array pixel buffer.
 */
export class BitmapFontRenderer {
	private fallbackGlyph = GLYPH_DATA.get(MISSING_GLYPH_CODEPOINT);

	/**
	 * Get the fixed character cell dimensions
	 */
	getCharDimensions(): { width: number; height: number } {
		return { width: GLYPH_WIDTH, height: GLYPH_HEIGHT };
	}

	/**
	 * Check if a glyph is double-width based on its data length
	 *
	 * Wide glyphs have 2 bytes per row (26 bytes total) vs 1 byte (13 bytes).
	 */
	isWideGlyph(codepoint: number): boolean {
		const glyph = GLYPH_DATA.get(codepoint);
		return glyph !== undefined && glyph.length > GLYPH_HEIGHT;
	}

	/**
	 * Get the pixel width of a glyph
	 */
	getGlyphPixelWidth(codepoint: number): number {
		return this.isWideGlyph(codepoint) ? WIDE_GLYPH_WIDTH : GLYPH_WIDTH;
	}

	/**
	 * Measure the total pixel width of a text string
	 */
	measureText(text: string): number {
		let width = 0;
		for (const char of text) {
			const codepoint = char.codePointAt(0) ?? MISSING_GLYPH_CODEPOINT;
			width += this.getGlyphPixelWidth(codepoint);
		}
		return width;
	}

	/**
	 * Render a single character into the framebuffer
	 */
	renderChar(
		buf: Uint32Array,
		bufWidth: number,
		x: number,
		y: number,
		codepoint: number,
		fgColor: number,
		italic = false,
	): void {
		const glyph = GLYPH_DATA.get(codepoint) ?? this.fallbackGlyph;
		if (!glyph) {
			return;
		}

		const isWide = glyph.length > GLYPH_HEIGHT;
		const charWidth = isWide ? WIDE_GLYPH_WIDTH : GLYPH_WIDTH;
		const bytesPerRow = isWide ? 2 : 1;

		for (let row = 0; row < GLYPH_HEIGHT; row++) {
			const py = y + row;
			if (py < 0) {
				continue;
			}

			const rowOffset = py * bufWidth;
			const idx = row * bytesPerRow;
			const shearOffset = italic
				? Math.round(
						((GLYPH_HEIGHT - 1 - row) * ITALIC_SHEAR_AMOUNT) /
							(GLYPH_HEIGHT - 1),
					)
				: 0;

			for (let col = 0; col < charWidth; col++) {
				const byteIdx = Math.floor(col / BITS_PER_BYTE);
				const bitIdx = MSB_BIT_POSITION - (col % BITS_PER_BYTE);
				const rowByte = glyph[idx + byteIdx]!;

				if (rowByte & (1 << bitIdx)) {
					const px = x + col + shearOffset;
					if (px >= 0 && px < bufWidth) {
						buf[rowOffset + px] = fgColor;
					}
				}
			}
		}
	}

	/**
	 * Render a string of text into the framebuffer
	 *
	 * Returns the total pixel width rendered.
	 */
	renderText(
		buf: Uint32Array,
		bufWidth: number,
		x: number,
		y: number,
		text: string,
		fgColor: number,
		italic = false,
	): number {
		let cursorX = x;

		for (const char of text) {
			const codepoint = char.codePointAt(0) ?? MISSING_GLYPH_CODEPOINT;

			if (char !== " ") {
				this.renderChar(buf, bufWidth, cursorX, y, codepoint, fgColor, italic);
			}
			cursorX += this.getGlyphPixelWidth(codepoint);
		}

		return cursorX - x;
	}

	/**
	 * Render a single character scaled via nearest-neighbor into the framebuffer
	 *
	 * Maps each destination pixel back to the source glyph bitmap using
	 * nearest-neighbor sampling. Preserves the crisp, pixelated look of
	 * bitmap fonts on HiDPI displays.
	 */
	renderCharScaled(
		buf: Uint32Array,
		bufWidth: number,
		bufHeight: number,
		x: number,
		y: number,
		codepoint: number,
		fgColor: number,
		destWidth: number,
		destHeight: number,
		italic = false,
	): void {
		const glyph = GLYPH_DATA.get(codepoint) ?? this.fallbackGlyph;
		if (!glyph) {
			return;
		}

		const isWide = glyph.length > GLYPH_HEIGHT;
		const srcWidth = isWide ? WIDE_GLYPH_WIDTH : GLYPH_WIDTH;
		const bytesPerRow = isWide ? 2 : 1;
		const scaledShear = italic
			? Math.round((ITALIC_SHEAR_AMOUNT * destHeight) / GLYPH_HEIGHT)
			: 0;

		for (let dy = 0; dy < destHeight; dy++) {
			const py = y + dy;
			if (py < 0) {
				continue;
			}
			if (py >= bufHeight) {
				break;
			}

			const srcRow = Math.floor((dy * GLYPH_HEIGHT) / destHeight);
			const rowOffset = py * bufWidth;
			const idx = srcRow * bytesPerRow;
			const shearOffset = italic
				? Math.round(((destHeight - 1 - dy) * scaledShear) / (destHeight - 1))
				: 0;

			for (let dx = 0; dx < destWidth; dx++) {
				const srcCol = Math.floor((dx * srcWidth) / destWidth);
				const byteIdx = Math.floor(srcCol / BITS_PER_BYTE);
				const bitIdx = MSB_BIT_POSITION - (srcCol % BITS_PER_BYTE);
				const rowByte = glyph[idx + byteIdx]!;

				if (rowByte & (1 << bitIdx)) {
					const px = x + dx + shearOffset;
					if (px >= 0 && px < bufWidth) {
						buf[rowOffset + px] = fgColor;
					}
				}
			}
		}
	}

	/**
	 * Render a string of text scaled via nearest-neighbor into the framebuffer
	 *
	 * Returns the total pixel width rendered.
	 */
	renderTextScaled(
		buf: Uint32Array,
		bufWidth: number,
		bufHeight: number,
		x: number,
		y: number,
		text: string,
		fgColor: number,
		scale: number,
		italic = false,
	): number {
		let cursorX = x;
		const destHeight = Math.round(GLYPH_HEIGHT * scale);

		for (const char of text) {
			const codepoint = char.codePointAt(0) ?? MISSING_GLYPH_CODEPOINT;
			const destWidth = Math.round(this.getGlyphPixelWidth(codepoint) * scale);

			if (char !== " ") {
				this.renderCharScaled(
					buf,
					bufWidth,
					bufHeight,
					cursorX,
					y,
					codepoint,
					fgColor,
					destWidth,
					destHeight,
					italic,
				);
			}
			cursorX += destWidth;
		}

		return cursorX - x;
	}

	/**
	 * Measure the total scaled pixel width of a text string
	 */
	measureTextScaled(text: string, scale: number): number {
		let width = 0;
		for (const char of text) {
			const codepoint = char.codePointAt(0) ?? MISSING_GLYPH_CODEPOINT;
			width += Math.round(this.getGlyphPixelWidth(codepoint) * scale);
		}
		return width;
	}
}
