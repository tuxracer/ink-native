import { isBoolean, isNumber, isPlainObject } from "remeda";

/** One frame's worth of raw mouse state sampled from the native window */
export interface PointerSample {
	/** Logical pixel X, origin top-left */
	x: number;
	/** Logical pixel Y, origin top-left */
	y: number;
	/** 1-based cell column */
	column: number;
	/** 1-based cell row */
	row: number;
	/** DOM buttons bitmask (1 left, 2 right, 4 middle) */
	buttons: number;
	/** Horizontal wheel delta accumulated this frame */
	wheelDx: number;
	/** Vertical wheel delta this frame (positive = scroll down, DOM convention) */
	wheelDy: number;
}

/** Result of diffing one sample against the previous one */
export interface PointerUpdate {
	events: NativePointerEvent[];
	sequences: string[];
}

/** Pointer event type names emitted on the Window */
export type PointerEventType =
	| "pointerdown"
	| "pointerup"
	| "pointermove"
	| "click"
	| "wheel";

/** DOM-PointerEvent-compatible event with TUI cell extensions */
export interface NativePointerEvent {
	readonly type: PointerEventType;
	readonly pointerId: 1;
	readonly pointerType: "mouse";
	readonly isPrimary: true;
	/** Logical pixel position, origin top-left */
	readonly clientX: number;
	readonly clientY: number;
	/** TUI extension: 1-based cell coordinates */
	readonly column: number;
	readonly row: number;
	/** DOM button index: -1 none, 0 left, 1 middle, 2 right */
	readonly button: number;
	/** DOM buttons bitmask: 1 left, 2 right, 4 middle */
	readonly buttons: number;
	readonly movementX: number;
	readonly movementY: number;
	/** Wheel deltas (0 for non-wheel events) */
	readonly deltaX: number;
	readonly deltaY: number;
	readonly deltaMode: 0;
	readonly ctrlKey: boolean;
	readonly shiftKey: boolean;
	readonly altKey: boolean;
	readonly metaKey: boolean;
	/** Aliases for rough DOM compatibility; equal to clientX/clientY */
	readonly offsetX: number;
	readonly offsetY: number;
	readonly pageX: number;
	readonly pageY: number;
	readonly screenX: number;
	readonly screenY: number;
}

export const isNativePointerEvent = (
	value: unknown,
): value is NativePointerEvent => {
	if (!isPlainObject(value)) {
		return false;
	}
	return (
		(value["type"] === "pointerdown" ||
			value["type"] === "pointerup" ||
			value["type"] === "pointermove" ||
			value["type"] === "click" ||
			value["type"] === "wheel") &&
		value["pointerType"] === "mouse" &&
		isNumber(value["clientX"]) &&
		isNumber(value["clientY"]) &&
		isNumber(value["column"]) &&
		isNumber(value["row"]) &&
		isNumber(value["button"]) &&
		isNumber(value["buttons"]) &&
		isBoolean(value["ctrlKey"])
	);
};
