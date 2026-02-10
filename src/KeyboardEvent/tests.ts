/**
 * Tests for KeyboardEvent
 */

import { describe, expect, it } from "vitest";
import {
	FENSTER_KEY_0,
	FENSTER_KEY_A,
	FENSTER_KEY_ALT_LEFT,
	FENSTER_KEY_ALT_RIGHT,
	FENSTER_KEY_BACKSPACE,
	FENSTER_KEY_CONTROL_LEFT,
	FENSTER_KEY_CONTROL_RIGHT,
	FENSTER_KEY_DELETE,
	FENSTER_KEY_DOWN,
	FENSTER_KEY_END,
	FENSTER_KEY_ESCAPE,
	FENSTER_KEY_GRAVE,
	FENSTER_KEY_HOME,
	FENSTER_KEY_INSERT,
	FENSTER_KEY_LEFT,
	FENSTER_KEY_META_LEFT,
	FENSTER_KEY_META_RIGHT,
	FENSTER_KEY_PAGEDOWN,
	FENSTER_KEY_PAGEUP,
	FENSTER_KEY_RETURN,
	FENSTER_KEY_RIGHT,
	FENSTER_KEY_SEMICOLON,
	FENSTER_KEY_SHIFT_LEFT,
	FENSTER_KEY_SHIFT_RIGHT,
	FENSTER_KEY_SLASH,
	FENSTER_KEY_SPACE,
	FENSTER_KEY_TAB,
	FENSTER_KEY_UP,
	FENSTER_MOD_ALT,
	FENSTER_MOD_CTRL,
	FENSTER_MOD_META,
	FENSTER_MOD_SHIFT,
} from "../Fenster";
import { createKeyboardEvent, isNativeKeyboardEvent } from ".";

describe("createKeyboardEvent", () => {
	describe("letters", () => {
		it("should map unshifted letter to lowercase key", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: true },
				0,
			);

			expect(event).toEqual({
				key: "a",
				code: "KeyA",
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				repeat: false,
				type: "keydown",
			});
		});

		it("should map shifted letter to uppercase key", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: true },
				FENSTER_MOD_SHIFT,
			);

			expect(event?.key).toBe("A");
			expect(event?.code).toBe("KeyA");
			expect(event?.shiftKey).toBe(true);
		});

		it("should map letter Z", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A + 25, pressed: true },
				0,
			);

			expect(event?.key).toBe("z");
			expect(event?.code).toBe("KeyZ");
		});
	});

	describe("digits", () => {
		it("should map unshifted digit", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_0, pressed: true },
				0,
			);

			expect(event?.key).toBe("0");
			expect(event?.code).toBe("Digit0");
		});

		it("should map shifted digit to symbol", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_0 + 1, pressed: true },
				FENSTER_MOD_SHIFT,
			);

			expect(event?.key).toBe("!");
			expect(event?.code).toBe("Digit1");
			expect(event?.shiftKey).toBe(true);
		});

		it("should map shifted 0 to )", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_0, pressed: true },
				FENSTER_MOD_SHIFT,
			);

			expect(event?.key).toBe(")");
		});

		it("should map shifted 9 to (", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_0 + 9, pressed: true },
				FENSTER_MOD_SHIFT,
			);

			expect(event?.key).toBe("(");
		});
	});

	describe("navigation keys", () => {
		it("should map arrow keys", () => {
			const up = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_UP, pressed: true },
				0,
			);
			const down = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_DOWN, pressed: true },
				0,
			);
			const left = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_LEFT, pressed: true },
				0,
			);
			const right = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_RIGHT, pressed: true },
				0,
			);

			expect(up?.key).toBe("ArrowUp");
			expect(up?.code).toBe("ArrowUp");
			expect(down?.key).toBe("ArrowDown");
			expect(left?.key).toBe("ArrowLeft");
			expect(right?.key).toBe("ArrowRight");
		});

		it("should map Home, End, PageUp, PageDown, Insert", () => {
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_HOME, pressed: true }, 0)
					?.key,
			).toBe("Home");
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_END, pressed: true }, 0)
					?.key,
			).toBe("End");
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_PAGEUP, pressed: true }, 0)
					?.key,
			).toBe("PageUp");
			expect(
				createKeyboardEvent(
					{ keyIndex: FENSTER_KEY_PAGEDOWN, pressed: true },
					0,
				)?.key,
			).toBe("PageDown");
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_INSERT, pressed: true }, 0)
					?.key,
			).toBe("Insert");
		});

		it("should map Enter, Escape, Backspace, Delete, Tab, Space", () => {
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_RETURN, pressed: true }, 0)
					?.key,
			).toBe("Enter");
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_ESCAPE, pressed: true }, 0)
					?.key,
			).toBe("Escape");
			expect(
				createKeyboardEvent(
					{ keyIndex: FENSTER_KEY_BACKSPACE, pressed: true },
					0,
				)?.key,
			).toBe("Backspace");
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_DELETE, pressed: true }, 0)
					?.key,
			).toBe("Delete");
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_TAB, pressed: true }, 0)
					?.key,
			).toBe("Tab");
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_SPACE, pressed: true }, 0)
					?.key,
			).toBe(" ");
		});
	});

	describe("symbols", () => {
		it("should map unshifted semicolon", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_SEMICOLON, pressed: true },
				0,
			);

			expect(event?.key).toBe(";");
			expect(event?.code).toBe("Semicolon");
		});

		it("should map shifted semicolon to colon", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_SEMICOLON, pressed: true },
				FENSTER_MOD_SHIFT,
			);

			expect(event?.key).toBe(":");
		});

		it("should map unshifted slash and shifted to question mark", () => {
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_SLASH, pressed: true }, 0)
					?.key,
			).toBe("/");
			expect(
				createKeyboardEvent(
					{ keyIndex: FENSTER_KEY_SLASH, pressed: true },
					FENSTER_MOD_SHIFT,
				)?.key,
			).toBe("?");
		});

		it("should map unshifted grave and shifted to tilde", () => {
			expect(
				createKeyboardEvent({ keyIndex: FENSTER_KEY_GRAVE, pressed: true }, 0)
					?.key,
			).toBe("`");
			expect(
				createKeyboardEvent(
					{ keyIndex: FENSTER_KEY_GRAVE, pressed: true },
					FENSTER_MOD_SHIFT,
				)?.key,
			).toBe("~");
		});
	});

	describe("modifier booleans", () => {
		it("should set ctrlKey when ctrl is held", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: true },
				FENSTER_MOD_CTRL,
			);

			expect(event?.ctrlKey).toBe(true);
			expect(event?.shiftKey).toBe(false);
			expect(event?.altKey).toBe(false);
			expect(event?.metaKey).toBe(false);
		});

		it("should set altKey when alt is held", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: true },
				FENSTER_MOD_ALT,
			);

			expect(event?.altKey).toBe(true);
		});

		it("should set metaKey when meta is held", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: true },
				FENSTER_MOD_META,
			);

			expect(event?.metaKey).toBe(true);
		});

		it("should set multiple modifiers simultaneously", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: true },
				FENSTER_MOD_CTRL | FENSTER_MOD_SHIFT | FENSTER_MOD_ALT,
			);

			expect(event?.ctrlKey).toBe(true);
			expect(event?.shiftKey).toBe(true);
			expect(event?.altKey).toBe(true);
			expect(event?.metaKey).toBe(false);
			expect(event?.key).toBe("A");
		});
	});

	describe("keyup vs keydown", () => {
		it("should set type to keydown when pressed", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: true },
				0,
			);

			expect(event?.type).toBe("keydown");
		});

		it("should set type to keyup when released", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: false },
				0,
			);

			expect(event?.type).toBe("keyup");
		});
	});

	describe("modifier keys", () => {
		it("should map left and right shift", () => {
			const left = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_SHIFT_LEFT, pressed: true },
				FENSTER_MOD_SHIFT,
			);
			const right = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_SHIFT_RIGHT, pressed: true },
				FENSTER_MOD_SHIFT,
			);

			expect(left?.key).toBe("Shift");
			expect(left?.code).toBe("ShiftLeft");
			expect(right?.key).toBe("Shift");
			expect(right?.code).toBe("ShiftRight");
		});

		it("should map left and right control", () => {
			const left = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_CONTROL_LEFT, pressed: true },
				FENSTER_MOD_CTRL,
			);
			const right = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_CONTROL_RIGHT, pressed: true },
				FENSTER_MOD_CTRL,
			);

			expect(left?.key).toBe("Control");
			expect(left?.code).toBe("ControlLeft");
			expect(right?.key).toBe("Control");
			expect(right?.code).toBe("ControlRight");
		});

		it("should map left and right alt", () => {
			const left = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_ALT_LEFT, pressed: true },
				FENSTER_MOD_ALT,
			);
			const right = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_ALT_RIGHT, pressed: true },
				FENSTER_MOD_ALT,
			);

			expect(left?.key).toBe("Alt");
			expect(left?.code).toBe("AltLeft");
			expect(right?.key).toBe("Alt");
			expect(right?.code).toBe("AltRight");
		});

		it("should map left and right meta", () => {
			const left = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_META_LEFT, pressed: true },
				FENSTER_MOD_META,
			);
			const right = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_META_RIGHT, pressed: true },
				FENSTER_MOD_META,
			);

			expect(left?.key).toBe("Meta");
			expect(left?.code).toBe("MetaLeft");
			expect(right?.key).toBe("Meta");
			expect(right?.code).toBe("MetaRight");
		});

		it("should emit keyup when modifier is released", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_SHIFT_LEFT, pressed: false },
				0,
			);

			expect(event?.type).toBe("keyup");
			expect(event?.key).toBe("Shift");
		});
	});

	describe("edge cases", () => {
		it("should return null for unknown key index", () => {
			const event = createKeyboardEvent({ keyIndex: 200, pressed: true }, 0);

			expect(event).toBeNull();
		});

		it("should always set repeat to false", () => {
			const event = createKeyboardEvent(
				{ keyIndex: FENSTER_KEY_A, pressed: true },
				0,
			);

			expect(event?.repeat).toBe(false);
		});
	});
});

describe("isNativeKeyboardEvent", () => {
	it("should return true for a valid event", () => {
		const event = createKeyboardEvent(
			{ keyIndex: FENSTER_KEY_A, pressed: true },
			0,
		);

		expect(isNativeKeyboardEvent(event)).toBe(true);
	});

	it("should return false for null", () => {
		expect(isNativeKeyboardEvent(null)).toBe(false);
	});

	it("should return false for a plain object missing fields", () => {
		expect(isNativeKeyboardEvent({ key: "a" })).toBe(false);
	});

	it("should return false for non-objects", () => {
		expect(isNativeKeyboardEvent("keydown")).toBe(false);
		expect(isNativeKeyboardEvent(42)).toBe(false);
	});
});
