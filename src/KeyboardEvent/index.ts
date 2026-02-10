/**
 * KeyboardEvent
 *
 * Converts fenster key events into NativeKeyboardEvent objects,
 * providing keydown/keyup events for games and interactive apps.
 */

import type { FensterKeyEvent } from "../Fenster";
import {
	FENSTER_MOD_ALT,
	FENSTER_MOD_CTRL,
	FENSTER_MOD_META,
	FENSTER_MOD_SHIFT,
} from "../Fenster";
import { FENSTER_TO_CODE, FENSTER_TO_KEY, SHIFTED_KEY } from "./consts";
import type { NativeKeyboardEvent } from "./types";

export * from "./consts";
export * from "./types";

/**
 * Create a NativeKeyboardEvent from a fenster key event and modifier bitmask.
 *
 * Returns null for unmapped key indices.
 */
export const createKeyboardEvent = (
	event: FensterKeyEvent,
	mod: number,
): NativeKeyboardEvent | null => {
	const code = FENSTER_TO_CODE[event.keyIndex];
	if (code === undefined) {
		return null;
	}

	const shiftKey = (mod & FENSTER_MOD_SHIFT) !== 0;
	const key =
		(shiftKey ? SHIFTED_KEY[event.keyIndex] : undefined) ??
		FENSTER_TO_KEY[event.keyIndex];

	if (key === undefined) {
		return null;
	}

	return {
		key,
		code,
		ctrlKey: (mod & FENSTER_MOD_CTRL) !== 0,
		shiftKey,
		altKey: (mod & FENSTER_MOD_ALT) !== 0,
		metaKey: (mod & FENSTER_MOD_META) !== 0,
		repeat: false,
		type: event.pressed ? "keydown" : "keyup",
	};
};
