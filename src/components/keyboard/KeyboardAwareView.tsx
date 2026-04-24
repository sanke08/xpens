import React, { createContext, useContext } from "react";
import { ViewStyle, StyleProp } from "react-native";
import Animated, {
  AnimatedKeyboardInfo,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";

const KeyboardContext = createContext<AnimatedKeyboardInfo | null>(null);

/**
 * KeyboardProvider - Initializes the Reanimated keyboard listener once at the root level.
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
 * useKeyboardHeight - Hook to consume the global keyboard shared value.
 */
export const useKeyboardHeight = () => {
  const context = useContext(KeyboardContext);
  if (!context) {
    return useAnimatedKeyboard().height;
  }
  return context.height;
};

/**
 * KeyboardAwareView - A reusable wrapper that automatically handles keyboard avoidance.
 */
export const KeyboardAwareView: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  const height = useKeyboardHeight();
  const animatedStyle = useAnimatedStyle(() => ({
    paddingBottom: height.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
