import React, { createContext, useContext } from "react";
import {
  AnimatedKeyboardInfo,
  useAnimatedKeyboard,
} from "react-native-reanimated";

const KeyboardContext = createContext<AnimatedKeyboardInfo | null>(null);

/**
 * KeyboardProvider - Initializes the Reanimated keyboard listener once at the root level.
 * This is highly optimized as it shares a single native listener across the entire app.
 */
export const KeyboardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const keyboard = useAnimatedKeyboard();

  return (
    <KeyboardContext.Provider value={keyboard}>
      {children}
    </KeyboardContext.Provider>
  );
};

/**
 * useKeyboard - Hook to consume the global keyboard shared value.
 * Use this in animated styles to avoid re-renders.
 */
export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (!context) {
    // If no provider is found, we fall back to a local instance
    // but warn the developer to use the provider for optimization.
    return useAnimatedKeyboard();
  }
  return context;
};
