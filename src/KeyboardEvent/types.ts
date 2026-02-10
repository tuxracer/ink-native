import { isBoolean, isPlainObject, isString } from "remeda";

/** Keyboard event from the native window */
export interface NativeKeyboardEvent {
	/** Key value: "a", "A", "Enter", "ArrowUp", "!" */
	readonly key: string;
	/** Physical key code: "KeyA", "Digit1", "ArrowUp" */
	readonly code: string;
	readonly ctrlKey: boolean;
	readonly shiftKey: boolean;
	readonly altKey: boolean;
	readonly metaKey: boolean;
	/** Always false — fenster only reports transitions, not held state */
	readonly repeat: false;
	readonly type: "keydown" | "keyup";
}

export const isNativeKeyboardEvent = (
	value: unknown,
): value is NativeKeyboardEvent => {
	if (!isPlainObject(value)) {
		return false;
	}

	return (
		isString(value["key"]) &&
		isString(value["code"]) &&
		isBoolean(value["ctrlKey"]) &&
		isBoolean(value["shiftKey"]) &&
		isBoolean(value["altKey"]) &&
		isBoolean(value["metaKey"]) &&
		value["repeat"] === false &&
		(value["type"] === "keydown" || value["type"] === "keyup")
	);
};
