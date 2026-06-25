/**
 * PointerEvent
 *
 * Diffs per-frame mouse samples into DOM-PointerEvent-compatible events and
 * SGR-1006 mouse sequences, mirroring the keyboard event pipeline.
 */

import type { MouseMode } from "../AnsiParser";
import {
	FENSTER_MOD_ALT,
	FENSTER_MOD_CTRL,
	FENSTER_MOD_META,
	FENSTER_MOD_SHIFT,
} from "../Fenster";
import { BUTTON_BITS, BUTTON_INDEX_BY_BIT, NO_BUTTON } from "./consts";
import type { NativePointerEvent, PointerSample, PointerUpdate } from "./types";

export * from "./consts";
export * from "./types";

interface Modifiers {
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
}

const readModifiers = (mod: number): Modifiers => ({
	ctrlKey: (mod & FENSTER_MOD_CTRL) !== 0,
	shiftKey: (mod & FENSTER_MOD_SHIFT) !== 0,
	altKey: (mod & FENSTER_MOD_ALT) !== 0,
	metaKey: (mod & FENSTER_MOD_META) !== 0,
});

const ZERO_SAMPLE: PointerSample = {
	x: 0,
	y: 0,
	column: 1,
	row: 1,
	buttons: 0,
	wheelDx: 0,
	wheelDy: 0,
};

export class PointerTracker {
	private prev: PointerSample | null = null;

	/**
	 * Diff a new sample against the previous frame and return the DOM events
	 * and SGR sequences produced by the transitions.
	 */
	update(
		sample: PointerSample,
		mod: number,
		// mouseMode is consumed in a later task for SGR generation
		_mouseMode: MouseMode,
	): PointerUpdate {
		const prev = this.prev ?? { ...ZERO_SAMPLE, x: sample.x, y: sample.y };
		const mods = readModifiers(mod);
		const events: NativePointerEvent[] = [];

		if (sample.x !== prev.x || sample.y !== prev.y) {
			events.push(
				this.build("pointermove", sample, NO_BUTTON, mods, {
					movementX: sample.x - prev.x,
					movementY: sample.y - prev.y,
				}),
			);
		}

		for (const bit of BUTTON_BITS) {
			const was = (prev.buttons & bit) !== 0;
			const now = (sample.buttons & bit) !== 0;
			if (!was && now) {
				events.push(
					this.build("pointerdown", sample, BUTTON_INDEX_BY_BIT[bit]!, mods),
				);
			} else if (was && !now) {
				events.push(
					this.build("pointerup", sample, BUTTON_INDEX_BY_BIT[bit]!, mods),
				);
			}
		}

		this.prev = sample;
		return { events, sequences: [] };
	}

	reset(): void {
		this.prev = null;
	}

	private build(
		type: NativePointerEvent["type"],
		sample: PointerSample,
		button: number,
		mods: Modifiers,
		extra: { movementX?: number; movementY?: number; deltaY?: number } = {},
	): NativePointerEvent {
		return {
			type,
			pointerId: 1,
			pointerType: "mouse",
			isPrimary: true,
			clientX: sample.x,
			clientY: sample.y,
			column: sample.column,
			row: sample.row,
			button,
			buttons: sample.buttons,
			movementX: extra.movementX ?? 0,
			movementY: extra.movementY ?? 0,
			deltaX: 0,
			deltaY: extra.deltaY ?? 0,
			deltaMode: 0,
			...mods,
			offsetX: sample.x,
			offsetY: sample.y,
			pageX: sample.x,
			pageY: sample.y,
			screenX: sample.x,
			screenY: sample.y,
		};
	}
}
