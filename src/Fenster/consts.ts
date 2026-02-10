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
export const FENSTER_KEY_A = 65;
export const FENSTER_KEY_B = 66;
export const FENSTER_KEY_C = 67;
export const FENSTER_KEY_D = 68;
export const FENSTER_KEY_E = 69;
export const FENSTER_KEY_F = 70;
export const FENSTER_KEY_G = 71;
export const FENSTER_KEY_H = 72;
export const FENSTER_KEY_I = 73;
export const FENSTER_KEY_J = 74;
export const FENSTER_KEY_K = 75;
export const FENSTER_KEY_L = 76;
export const FENSTER_KEY_M = 77;
export const FENSTER_KEY_N = 78;
export const FENSTER_KEY_O = 79;
export const FENSTER_KEY_P = 80;
export const FENSTER_KEY_Q = 81;
export const FENSTER_KEY_R = 82;
export const FENSTER_KEY_S = 83;
export const FENSTER_KEY_T = 84;
export const FENSTER_KEY_U = 85;
export const FENSTER_KEY_V = 86;
export const FENSTER_KEY_W = 87;
export const FENSTER_KEY_X = 88;
export const FENSTER_KEY_Y = 89;
export const FENSTER_KEY_Z = 90;

// Digit keys (0-9 map to 48-57)
export const FENSTER_KEY_0 = 48;
export const FENSTER_KEY_1 = 49;
export const FENSTER_KEY_2 = 50;
export const FENSTER_KEY_3 = 51;
export const FENSTER_KEY_4 = 52;
export const FENSTER_KEY_5 = 53;
export const FENSTER_KEY_6 = 54;
export const FENSTER_KEY_7 = 55;
export const FENSTER_KEY_8 = 56;
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

// Modifier keys (left/right, indices 128-135)
export const FENSTER_KEY_SHIFT_LEFT = 128;
export const FENSTER_KEY_SHIFT_RIGHT = 129;
export const FENSTER_KEY_CONTROL_LEFT = 130;
export const FENSTER_KEY_CONTROL_RIGHT = 131;
export const FENSTER_KEY_ALT_LEFT = 132;
export const FENSTER_KEY_ALT_RIGHT = 133;
export const FENSTER_KEY_META_LEFT = 134;
export const FENSTER_KEY_META_RIGHT = 135;

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
