/**
 * Fenster Constants
 *
 * Key indices, modifier bitmasks, and library paths for the fenster backend.
 */

// =============================================================================
// Key Indices (fenster's keys[] array, mostly ASCII)
// =============================================================================

/** Backspace key */
export const FENSTER_KEY_BACKSPACE = 8;

/** Tab key */
export const FENSTER_KEY_TAB = 9;

/** Return/Enter key */
export const FENSTER_KEY_RETURN = 10;

/** Up arrow key */
export const FENSTER_KEY_UP = 17;

/** Down arrow key */
export const FENSTER_KEY_DOWN = 18;

/** Right arrow key */
export const FENSTER_KEY_RIGHT = 19;

/** Left arrow key */
export const FENSTER_KEY_LEFT = 20;

/** Escape key */
export const FENSTER_KEY_ESCAPE = 27;

/** Space key */
export const FENSTER_KEY_SPACE = 32;

/** Delete key */
export const FENSTER_KEY_DELETE = 127;

/** Home key */
export const FENSTER_KEY_HOME = 2;

/** Page Up key */
export const FENSTER_KEY_PAGEUP = 3;

/** Page Down key */
export const FENSTER_KEY_PAGEDOWN = 4;

/** End key */
export const FENSTER_KEY_END = 5;

/** Insert key */
export const FENSTER_KEY_INSERT = 26;

// Letter keys (A-Z map to 65-90)
/** ASCII code for 'A' in fenster key indices */
export const FENSTER_KEY_A = 65;

/** ASCII code for 'Z' in fenster key indices */
export const FENSTER_KEY_Z = 90;

// Digit keys (0-9 map to 48-57)
/** ASCII code for '0' in fenster key indices */
export const FENSTER_KEY_0 = 48;

/** ASCII code for '9' in fenster key indices */
export const FENSTER_KEY_9 = 57;

// Symbol keys
/** Apostrophe key */
export const FENSTER_KEY_APOSTROPHE = 39;

/** Comma key */
export const FENSTER_KEY_COMMA = 44;

/** Minus key */
export const FENSTER_KEY_MINUS = 45;

/** Period key */
export const FENSTER_KEY_PERIOD = 46;

/** Slash key */
export const FENSTER_KEY_SLASH = 47;

/** Semicolon key */
export const FENSTER_KEY_SEMICOLON = 59;

/** Equal key */
export const FENSTER_KEY_EQUAL = 61;

/** Left bracket key */
export const FENSTER_KEY_BRACKET_LEFT = 91;

/** Backslash key */
export const FENSTER_KEY_BACKSLASH = 92;

/** Right bracket key */
export const FENSTER_KEY_BRACKET_RIGHT = 93;

/** Grave/backtick key */
export const FENSTER_KEY_GRAVE = 96;

// =============================================================================
// Modifier Bitmasks (fenster mod field)
// =============================================================================

/** Control key modifier bitmask */
export const FENSTER_MOD_CTRL = 1;

/** Shift key modifier bitmask */
export const FENSTER_MOD_SHIFT = 2;

/** Alt key modifier bitmask */
export const FENSTER_MOD_ALT = 4;

/** Meta/Super key modifier bitmask */
export const FENSTER_MOD_META = 8;

// =============================================================================
// Buffer Constants
// =============================================================================

/** Bytes per pixel in fenster buffer (ARGB8888) */
export const BYTES_PER_PIXEL = 4;

/** Size of fenster's keys array */
export const KEYS_ARRAY_SIZE = 256;

/** Size of an int32 in bytes */
export const INT32_BYTES = 4;

/** Size of a float32 in bytes */
export const FLOAT32_BYTES = 4;

/** Default backing scale factor (1x, no HiDPI) */
export const DEFAULT_SCALE = 1;

// =============================================================================
// Library Paths
// =============================================================================

/** Bundled fenster library path by platform (relative to project root) */
export const FENSTER_LIB_PATHS: Record<string, string> = {
	darwin: "native/fenster.dylib",
	linux: "native/fenster.so",
	win32: "native/fenster.dll",
};
