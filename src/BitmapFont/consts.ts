/**
 * BitmapFont Constants
 */

/** Glyph cell width in pixels (Cozette monospace advance width) */
export const GLYPH_WIDTH = 6;

/** Wide glyph cell width in pixels (double-width characters) */
export const WIDE_GLYPH_WIDTH = 12;

/** Glyph cell height in pixels (Cozette ascent + descent) */
export const GLYPH_HEIGHT = 13;

/** Codepoint for the fallback "missing glyph" character */
export const MISSING_GLYPH_CODEPOINT = 63; // '?'

/** Bit position of the MSB in a byte (for pixel extraction) */
export const MSB_BIT_POSITION = 7;

/** Number of bits in a byte */
export const BITS_PER_BYTE = 8;

/** Horizontal shear in pixels for faux-italic rendering (~8.7° slant) */
export const ITALIC_SHEAR_AMOUNT = 2;
