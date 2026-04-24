import { useKeyboard } from "../providers/KeyboardProvider";

/**
 * useKeyboardHeight - A custom hook that tracks the keyboard height using Reanimated.
 * It is optimized to use a global provider if available, otherwise it falls back to a local listener.
 *
 * @returns {Animated.SharedValue<number>} The shared value containing the keyboard height.
 */
export function useKeyboardHeight() {
  const keyboard = useKeyboard();
  return keyboard.height;
}
