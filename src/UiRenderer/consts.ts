/**
 * UiRenderer Constants
 */

import type { Color } from "../AnsiParser";

/** Default background color (black) */
export const DEFAULT_BG: Color = { r: 0, g: 0, b: 0 };

/** Default foreground color (white) */
export const DEFAULT_FG: Color = { r: 255, g: 255, b: 255 };

/** Minimum brightness for text visibility */
export const MIN_BRIGHTNESS = 100;

/** Length of a 6-character hex color string (RRGGBB) */
export const HEX_COLOR_LENGTH = 6;

/** Slice indices for parsing hex color channels */
export const HEX_R_END = 2;
export const HEX_G_END = 4;

/** Default window width in pixels */
export const DEFAULT_WINDOW_WIDTH = 800;

/** Default window height in pixels */
export const DEFAULT_WINDOW_HEIGHT = 600;

/** Default terminal columns */
export const DEFAULT_COLUMNS = 80;

/** Default terminal rows */
export const DEFAULT_ROWS = 24;

/** Minimum terminal columns */
export const MIN_COLUMNS = 40;

/** Minimum terminal rows */
export const MIN_ROWS = 10;

/** Bold text brightness multiplier */
export const BOLD_BRIGHTNESS_MULTIPLIER = 1.3;

/** Dim text brightness multiplier */
export const DIM_BRIGHTNESS_MULTIPLIER = 0.5;

/** Underline position as fraction of character height from top */
export const UNDERLINE_POSITION = 0.9;

/** Strikethrough position as fraction of character height from top */
export const STRIKETHROUGH_POSITION = 0.5;

/** Line thickness for underline/strikethrough as fraction of character height */
export const TEXT_DECORATION_THICKNESS = 0.08;

/** Fixed refresh rate for fenster (no display detection) */
export const FENSTER_REFRESH_RATE = 60;

/** Alpha channel mask for ARGB pixel format (fully opaque) */
export const ALPHA_MASK = 0xff000000;

/** Bit shift for red channel in ARGB format */
export const RED_SHIFT = 16;

/** Bit shift for green channel in ARGB format */
export const GREEN_SHIFT = 8;

/** Ctrl+key offset: 'A' (65) - 1 = 96, so ctrl+A = 65 - 96 = 1 */
export const CTRL_KEY_OFFSET = 96;

/** Start of printable ASCII range */
export const ASCII_PRINTABLE_START = 32;

/** End of printable ASCII range */
export const ASCII_PRINTABLE_END = 126;
