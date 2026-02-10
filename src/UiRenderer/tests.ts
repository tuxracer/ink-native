/**
 * Tests for UiRenderer utilities
 */

import { describe, expect, it } from "vitest";
import { packColor } from ".";

describe("packColor", () => {
	it("should pack red into 0xAARRGGBB format", () => {
		expect(packColor(255, 0, 0)).toBe(0xffff0000);
	});

	it("should pack green into 0xAARRGGBB format", () => {
		expect(packColor(0, 255, 0)).toBe(0xff00ff00);
	});

	it("should pack blue into 0xAARRGGBB format", () => {
		expect(packColor(0, 0, 255)).toBe(0xff0000ff);
	});

	it("should pack black as fully opaque", () => {
		expect(packColor(0, 0, 0)).toBe(0xff000000);
	});

	it("should pack white as fully opaque", () => {
		expect(packColor(255, 255, 255)).toBe(0xffffffff);
	});

	it("should pack mixed colors correctly", () => {
		// R=0x12, G=0x34, B=0x56 → 0xFF123456
		expect(packColor(0x12, 0x34, 0x56)).toBe(0xff123456);
	});
});
