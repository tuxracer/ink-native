/**
 * Tests for PointerEvent
 */

import { describe, expect, it } from "vitest";
import { FENSTER_MOD_SHIFT } from "../Fenster";
import { PointerTracker } from ".";
import type { PointerSample } from "./types";

const OFF = { tracking: "off", sgr: false } as const;

const sample = (over: Partial<PointerSample> = {}): PointerSample => ({
	x: 0,
	y: 0,
	column: 1,
	row: 1,
	buttons: 0,
	wheelDx: 0,
	wheelDy: 0,
	...over,
});

describe("PointerTracker move and button events", () => {
	it("emits pointermove with movement deltas", () => {
		const tracker = new PointerTracker();
		tracker.update(sample({ x: 10, y: 20, column: 2, row: 2 }), 0, OFF);
		const { events } = tracker.update(
			sample({ x: 16, y: 33, column: 3, row: 3 }),
			0,
			OFF,
		);
		const move = events.find((e) => e.type === "pointermove");
		expect(move).toBeDefined();
		expect(move?.movementX).toBe(6);
		expect(move?.movementY).toBe(13);
		expect(move?.button).toBe(-1);
		expect(move?.clientX).toBe(16);
		expect(move?.column).toBe(3);
	});

	it("emits pointerdown then pointerup for the left button", () => {
		const tracker = new PointerTracker();
		const down = tracker.update(sample({ buttons: 1 }), 0, OFF);
		const up = tracker.update(sample({ buttons: 0 }), 0, OFF);
		expect(down.events.some((e) => e.type === "pointerdown")).toBe(true);
		const downEvent = down.events.find((e) => e.type === "pointerdown");
		expect(downEvent?.button).toBe(0);
		expect(downEvent?.buttons).toBe(1);
		expect(up.events.some((e) => e.type === "pointerup")).toBe(true);
		expect(up.events.find((e) => e.type === "pointerup")?.button).toBe(0);
	});

	it("maps right and middle button bits to DOM indices", () => {
		const tracker = new PointerTracker();
		const right = tracker.update(sample({ buttons: 2 }), 0, OFF);
		expect(right.events.find((e) => e.type === "pointerdown")?.button).toBe(2);
		tracker.update(sample({ buttons: 0 }), 0, OFF);
		const middle = tracker.update(sample({ buttons: 4 }), 0, OFF);
		expect(middle.events.find((e) => e.type === "pointerdown")?.button).toBe(1);
	});

	it("reflects modifier state on events", () => {
		const tracker = new PointerTracker();
		const { events } = tracker.update(
			sample({ buttons: 1 }),
			FENSTER_MOD_SHIFT,
			OFF,
		);
		expect(events.find((e) => e.type === "pointerdown")?.shiftKey).toBe(true);
	});
});
