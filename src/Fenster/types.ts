/** Opaque pointer type for fenster bridge handle */
export type FensterPointer = unknown;

/** Key event from fenster key state diffing */
export interface FensterKeyEvent {
	/** Key index in fenster's keys[256] array (mostly ASCII) */
	keyIndex: number;
	/** Whether the key is pressed (true) or released (false) */
	pressed: boolean;
}
