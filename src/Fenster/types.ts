/** Opaque pointer type for fenster bridge handle */
export type FensterPointer = unknown;

/** Key event from fenster key state diffing */
export interface FensterKeyEvent {
	/** Key index in fenster's keys[256] array (mostly ASCII) */
	keyIndex: number;
	/** Whether the key is pressed (true) or released (false) */
	pressed: boolean;
}

/** Raw mouse state read from the native window */
export interface FensterPointerSample {
	/** Logical pixel X, origin top-left */
	x: number;
	/** Logical pixel Y, origin top-left */
	y: number;
	/** DOM buttons bitmask (1 left, 2 right, 4 middle) */
	buttons: number;
}
