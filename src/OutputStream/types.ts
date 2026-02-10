/**
 * OutputStream Types
 */

/** Duck-typed interface for any UI renderer compatible with OutputStream */
export interface UiRendererLike {
	getDimensions(): { columns: number; rows: number };
	processAnsi(text: string): void;
	present(): void;
	clear(): void;
	getCursorPos(): { x: number; y: number };
}
