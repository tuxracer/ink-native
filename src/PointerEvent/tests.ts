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

describe("PointerTracker click and wheel", () => {
	it("emits click on same-cell left down then up", () => {
		const tracker = new PointerTracker();
		tracker.update(sample({ buttons: 1, column: 5, row: 3 }), 0, OFF);
		const { events } = tracker.update(
			sample({ buttons: 0, column: 5, row: 3 }),
			0,
			OFF,
		);
		expect(events.some((e) => e.type === "click")).toBe(true);
		const click = events.find((e) => e.type === "click");
		expect(click?.column).toBe(5);
		expect(click?.button).toBe(0);
	});

	it("does not emit click when up lands in a different cell", () => {
		const tracker = new PointerTracker();
		tracker.update(sample({ buttons: 1, column: 5, row: 3 }), 0, OFF);
		const { events } = tracker.update(
			sample({ buttons: 0, column: 8, row: 3 }),
			0,
			OFF,
		);
		expect(events.some((e) => e.type === "click")).toBe(false);
	});

	it("does not synthesize click for non-left buttons", () => {
		const tracker = new PointerTracker();
		tracker.update(sample({ buttons: 2, column: 5, row: 3 }), 0, OFF);
		const { events } = tracker.update(
			sample({ buttons: 0, column: 5, row: 3 }),
			0,
			OFF,
		);
		expect(events.some((e) => e.type === "click")).toBe(false);
	});

	it("emits a wheel event with deltaY", () => {
		const tracker = new PointerTracker();
		tracker.update(sample(), 0, OFF);
		const { events } = tracker.update(sample({ wheelDy: 3 }), 0, OFF);
		const wheel = events.find((e) => e.type === "wheel");
		expect(wheel).toBeDefined();
		expect(wheel?.deltaY).toBe(3);
		expect(wheel?.button).toBe(-1);
	});
});

describe("PointerTracker SGR sequences", () => {
	const CLICK = { tracking: "click", sgr: true } as const;
	const BUTTON = { tracking: "button", sgr: true } as const;
	const ANY = { tracking: "any", sgr: true } as const;

	it("emits no sequences when tracking is off", () => {
		const tracker = new PointerTracker();
		const { sequences } = tracker.update(sample({ buttons: 1 }), 0, OFF);
		expect(sequences).toEqual([]);
	});

	it("emits no sequences when sgr encoding is disabled", () => {
		const tracker = new PointerTracker();
		const { sequences } = tracker.update(sample({ buttons: 1 }), 0, {
			tracking: "any",
			sgr: false,
		});
		expect(sequences).toEqual([]);
	});

	it("encodes left press and release with M/m and 1-based cell", () => {
		const tracker = new PointerTracker();
		const down = tracker.update(
			sample({ buttons: 1, column: 5, row: 3 }),
			0,
			CLICK,
		);
		expect(down.sequences).toContain("\x1b[<0;5;3M");
		const up = tracker.update(
			sample({ buttons: 0, column: 5, row: 3 }),
			0,
			CLICK,
		);
		expect(up.sequences).toContain("\x1b[<0;5;3m");
	});

	it("does not report motion in click mode", () => {
		const tracker = new PointerTracker();
		tracker.update(sample({ x: 0, column: 1, row: 1 }), 0, CLICK);
		const { sequences } = tracker.update(
			sample({ x: 30, column: 6, row: 1 }),
			0,
			CLICK,
		);
		expect(sequences).toEqual([]);
	});

	it("reports drag motion only with a button held in button mode", () => {
		const tracker = new PointerTracker();
		tracker.update(sample({ buttons: 1, column: 5, row: 3 }), 0, BUTTON);
		const drag = tracker.update(
			sample({ buttons: 1, x: 30, column: 6, row: 3 }),
			0,
			BUTTON,
		);
		// button held (left=0) + motion flag (32) = 32
		expect(drag.sequences).toContain("\x1b[<32;6;3M");
	});

	it("reports buttonless motion in any mode with code 35", () => {
		const tracker = new PointerTracker();
		tracker.update(sample({ column: 1, row: 1 }), 0, ANY);
		const { sequences } = tracker.update(
			sample({ x: 30, column: 6, row: 1 }),
			0,
			ANY,
		);
		// no button (3) + motion flag (32) = 35
		expect(sequences).toContain("\x1b[<35;6;1M");
	});

	it("encodes wheel down as code 65", () => {
		const tracker = new PointerTracker();
		tracker.update(sample({ column: 4, row: 2 }), 0, ANY);
		const { sequences } = tracker.update(
			sample({ wheelDy: 1, column: 4, row: 2 }),
			0,
			ANY,
		);
		expect(sequences).toContain("\x1b[<65;4;2M");
	});
});
