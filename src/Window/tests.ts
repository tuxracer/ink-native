/**
 * Tests for Window pause/resume
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InputStream } from "../InputStream";
import type { OutputStream } from "../OutputStream";
import type { UiRenderer } from "../UiRenderer";
import { Window } from ".";

const createMockRenderer = () => ({
	processEventsAndPresent: vi.fn().mockReturnValue({
		keyEvents: [],
		mod: 0,
		resized: false,
	}),
	keyEventToSequence: vi.fn(),
	shouldClose: vi.fn().mockReturnValue(false),
	getDimensions: vi.fn().mockReturnValue({ columns: 80, rows: 24 }),
	getDisplayRefreshRate: vi.fn().mockReturnValue(60),
	destroy: vi.fn(),
	clear: vi.fn(),
	present: vi.fn(),
});

const createMockInputStream = () =>
	({
		pushKey: vi.fn(),
		close: vi.fn(),
	}) as unknown as InputStream;

const createMockOutputStream = () =>
	({
		notifyResize: vi.fn(),
	}) as unknown as OutputStream;

describe("Window pause/resume", () => {
	let win: Window;
	let winCreated = false;

	beforeEach(() => {
		vi.useFakeTimers();
		const renderer = createMockRenderer() as unknown as UiRenderer;
		const inputStream = createMockInputStream();
		const outputStream = createMockOutputStream();
		win = new Window(renderer, inputStream, outputStream, 60);
		winCreated = true;
	});

	afterEach(() => {
		if (winCreated) {
			win.close();
			winCreated = false;
		}
		vi.useRealTimers();
	});

	it("should start unpaused", () => {
		expect(win.isPaused()).toBe(false);
	});

	it("should be paused after calling pause()", () => {
		win.pause();
		expect(win.isPaused()).toBe(true);
	});

	it("should stop the event loop when paused", () => {
		win.pause();

		// Advance time — the event loop should NOT fire
		const renderer = (
			win as unknown as { renderer: ReturnType<typeof createMockRenderer> }
		).renderer;
		renderer.processEventsAndPresent.mockClear();
		vi.advanceTimersByTime(100);

		expect(renderer.processEventsAndPresent).not.toHaveBeenCalled();
	});

	it("should resume the event loop after calling resume()", () => {
		win.pause();
		win.resume();

		expect(win.isPaused()).toBe(false);

		const renderer = (
			win as unknown as { renderer: ReturnType<typeof createMockRenderer> }
		).renderer;
		renderer.processEventsAndPresent.mockClear();
		vi.advanceTimersByTime(100);

		expect(renderer.processEventsAndPresent).toHaveBeenCalled();
	});

	it("should be a no-op when pausing while already paused", () => {
		win.pause();
		win.pause(); // second call should not throw
		expect(win.isPaused()).toBe(true);
	});

	it("should be a no-op when resuming while not paused", () => {
		win.resume(); // should not throw or restart loop
		expect(win.isPaused()).toBe(false);
	});
});
