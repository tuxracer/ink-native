/**
 * Window Constants
 */

import type { PointerEventType } from "../PointerEvent";

/** mouse* aliases for the pointer* events that have a MouseEvent equivalent */
export const POINTER_EVENT_ALIASES: Partial<Record<PointerEventType, string>> =
	{
		pointerdown: "mousedown",
		pointerup: "mouseup",
		pointermove: "mousemove",
	};

/** Milliseconds per second, for converting Hz to interval */
export const MS_PER_SECOND = 1_000;

/** Default event loop interval in ms (~60 fps) */
export const DEFAULT_EVENT_LOOP_INTERVAL_MS = 16;

/** Default frame rate when none specified */
export const DEFAULT_FRAME_RATE = 60;
