/**
 * PointerEvent Constants
 *
 * Button bit/index mappings (DOM conventions) and SGR-1006 encoding bits.
 */

/** DOM buttons bitmask: left */
export const BUTTON_BIT_LEFT = 1;
/** DOM buttons bitmask: right */
export const BUTTON_BIT_RIGHT = 2;
/** DOM buttons bitmask: middle */
export const BUTTON_BIT_MIDDLE = 4;

/** Button bits in diff order */
export const BUTTON_BITS: readonly number[] = [
	BUTTON_BIT_LEFT,
	BUTTON_BIT_RIGHT,
	BUTTON_BIT_MIDDLE,
];

/**
 * Map a buttons-bitmask bit to its DOM `button` index.
 * left bit 1 -> 0, right bit 2 -> 2, middle bit 4 -> 1.
 */
export const BUTTON_INDEX_BY_BIT: Record<number, number> = {
	[BUTTON_BIT_LEFT]: 0,
	[BUTTON_BIT_RIGHT]: 2,
	[BUTTON_BIT_MIDDLE]: 1,
};

/** No button is pressed/changed */
export const NO_BUTTON = -1;

// SGR-1006 encoding bits (added to the button code)
/** Shift modifier flag in an SGR button code */
export const SGR_MOD_SHIFT = 4;
/** Alt modifier flag in an SGR button code */
export const SGR_MOD_ALT = 8;
/** Ctrl modifier flag in an SGR button code */
export const SGR_MOD_CTRL = 16;
/** Motion flag in an SGR button code */
export const SGR_MOTION_FLAG = 32;
/** Wheel flag in an SGR button code */
export const SGR_WHEEL_FLAG = 64;
/** Button code used for motion with no button held */
export const SGR_NO_BUTTON = 3;
