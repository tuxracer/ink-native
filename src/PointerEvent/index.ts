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
import {
	BUTTON_BIT_LEFT,
	BUTTON_BIT_MIDDLE,
	BUTTON_BIT_RIGHT,
	BUTTON_BITS,
	BUTTON_INDEX_BY_BIT,
	NO_BUTTON,
	SGR_MOD_ALT,
	SGR_MOD_CTRL,
	SGR_MOD_SHIFT,
	SGR_MOTION_FLAG,
	SGR_NO_BUTTON,
	SGR_WHEEL_FLAG,
} from "./consts";
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

const sgrModBits = (mods: Modifiers): number =>
	(mods.shiftKey ? SGR_MOD_SHIFT : 0) +
	(mods.altKey ? SGR_MOD_ALT : 0) +
	(mods.ctrlKey ? SGR_MOD_CTRL : 0);

/** Build one SGR-1006 report. `pressed` selects the final M (press) or m (release). */
const encodeSgr = (
	code: number,
	column: number,
	row: number,
	pressed: boolean,
): string => `\x1b[<${code};${column};${row}${pressed ? "M" : "m"}`;

/** SGR button code for the lowest button currently held, or SGR_NO_BUTTON. */
const heldButtonCode = (buttons: number): number => {
	if ((buttons & BUTTON_BIT_LEFT) !== 0) {
		return 0;
	}
	if ((buttons & BUTTON_BIT_MIDDLE) !== 0) {
		return 1;
	}
	if ((buttons & BUTTON_BIT_RIGHT) !== 0) {
		return 2;
	}
	return SGR_NO_BUTTON;
};

export class PointerTracker {
	private prev: PointerSample | null = null;
	private leftDownCell: { column: number; row: number } | null = null;

	/**
	 * Diff a new sample against the previous frame and return the DOM events
	 * and SGR sequences produced by the transitions.
	 */
	update(
		sample: PointerSample,
		mod: number,
		mouseMode: MouseMode,
	): PointerUpdate {
		const prev = this.prev ?? { ...ZERO_SAMPLE, x: sample.x, y: sample.y };
		const mods = readModifiers(mod);
		const events: NativePointerEvent[] = [];
		const sequences: string[] = [];
		const sgrOn = mouseMode.sgr && mouseMode.tracking !== "off";
		const modBits = sgrModBits(mods);

		if (sample.x !== prev.x || sample.y !== prev.y) {
			events.push(
				this.build("pointermove", sample, NO_BUTTON, mods, {
					movementX: sample.x - prev.x,
					movementY: sample.y - prev.y,
				}),
			);
			const reportMotion =
				mouseMode.tracking === "any" ||
				(mouseMode.tracking === "button" && sample.buttons !== 0);
			if (sgrOn && reportMotion) {
				const code = heldButtonCode(sample.buttons) + SGR_MOTION_FLAG + modBits;
				sequences.push(encodeSgr(code, sample.column, sample.row, true));
			}
		}

		for (const bit of BUTTON_BITS) {
			const was = (prev.buttons & bit) !== 0;
			const now = (sample.buttons & bit) !== 0;
			if (!was && now) {
				events.push(
					this.build("pointerdown", sample, BUTTON_INDEX_BY_BIT[bit]!, mods),
				);
				if (sgrOn) {
					sequences.push(
						encodeSgr(
							BUTTON_INDEX_BY_BIT[bit]! + modBits,
							sample.column,
							sample.row,
							true,
						),
					);
				}
				if (bit === BUTTON_BIT_LEFT) {
					this.leftDownCell = { column: sample.column, row: sample.row };
				}
			} else if (was && !now) {
				events.push(
					this.build("pointerup", sample, BUTTON_INDEX_BY_BIT[bit]!, mods),
				);
				if (sgrOn) {
					sequences.push(
						encodeSgr(
							BUTTON_INDEX_BY_BIT[bit]! + modBits,
							sample.column,
							sample.row,
							false,
						),
					);
				}
				if (
					bit === BUTTON_BIT_LEFT &&
					this.leftDownCell !== null &&
					this.leftDownCell.column === sample.column &&
					this.leftDownCell.row === sample.row
				) {
					events.push(
						this.build("click", sample, BUTTON_INDEX_BY_BIT[bit]!, mods),
					);
				}
				if (bit === BUTTON_BIT_LEFT) {
					this.leftDownCell = null;
				}
			}
		}

		if (sample.wheelDy !== 0 || sample.wheelDx !== 0) {
			events.push(
				this.build("wheel", sample, NO_BUTTON, mods, {
					deltaX: sample.wheelDx,
					deltaY: sample.wheelDy,
				}),
			);
			if (sgrOn && sample.wheelDy !== 0) {
				const wheelCode =
					SGR_WHEEL_FLAG + (sample.wheelDy > 0 ? 1 : 0) + modBits;
				sequences.push(encodeSgr(wheelCode, sample.column, sample.row, true));
			}
		}

		this.prev = sample;
		return { events, sequences };
	}

	reset(): void {
		this.prev = null;
		this.leftDownCell = null;
	}

	private build(
		type: NativePointerEvent["type"],
		sample: PointerSample,
		button: number,
		mods: Modifiers,
		extra: {
			movementX?: number;
			movementY?: number;
			deltaX?: number;
			deltaY?: number;
		} = {},
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
			deltaX: extra.deltaX ?? 0,
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
