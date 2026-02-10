#!/usr/bin/env node
/**
 * CLI entry point for ink-native
 *
 * Run with: pnpm dlx ink-native
 *
 * This demonstrates ink-native's capabilities. For library usage,
 * import { createStreams } from "ink-native" in your own project.
 */

import { parseArgs } from "node:util";
import { render } from "ink";
import { createStreams } from ".";
import { DemoApp } from "./Demo";

// ============================================================================
// Constants
// ============================================================================

/** Default window width in pixels */
const DEFAULT_WIDTH = 800;

/** Default window height in pixels */
const DEFAULT_HEIGHT = 600;

// ============================================================================
// CLI Setup
// ============================================================================

const { values: args } = parseArgs({
	options: {
		title: { type: "string" },
		width: { type: "string" },
		height: { type: "string" },
		background: { type: "string" },
		"frame-rate": { type: "string" },
		help: { type: "boolean", short: "h", default: false },
	},
});

if (args.help) {
	console.log(`
ink-native - Render Ink apps in native windows

Usage: pnpm dlx ink-native [options]

Options:
  --title <string>        Window title
  --width <number>        Window width in pixels (default: 800)
  --height <number>       Window height in pixels (default: 600)
  --background <hex>      Background color (e.g., "#1a1a2e")
  --frame-rate <number>   Force frame rate instead of default 60fps
  -h, --help              Show this help message

For library usage, see: https://github.com/tuxracer/ink-native
`);
	process.exit(0);
}

// ============================================================================
// Initialize and Render
// ============================================================================

const { stdin, stdout, window } = createStreams({
	title: args.title ?? "ink-native Demo",
	width: args.width ? parseInt(args.width, 10) : DEFAULT_WIDTH,
	height: args.height ? parseInt(args.height, 10) : DEFAULT_HEIGHT,
	...(args.background && { backgroundColor: args.background }),
	...(args["frame-rate"] && { frameRate: parseInt(args["frame-rate"], 10) }),
});

const initialFrameRate = window.getFrameRate();

render(<DemoApp scaleFactor={1} initialFrameRate={initialFrameRate} />, {
	stdin: stdin as unknown as NodeJS.ReadStream,
	stdout: stdout as unknown as NodeJS.WriteStream,
});

window.on("close", () => process.exit(0));
process.on("SIGINT", () => {
	window.close();
	process.exit(0);
});
