import React from "react";
import { ViewStyle, StyleProp } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboard } from "../../providers/KeyboardProvider";

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra spacing above the keyboard/safe area */
  offset?: number;
  /** Whether to account for the safe area bottom inset when keyboard is closed */
  useInsets?: boolean;
}

/**
 * KeyboardAwareView - A drop-in replacement for any container that needs to stay above the keyboard.
 * It uses the global KeyboardProvider for optimized performance.
 */
export const KeyboardAwareView: React.FC<KeyboardAwareViewProps> = ({
  children,
  style,
  offset = 16,
  useInsets = true,
}) => {
  const keyboard = useKeyboard();
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    const bottomInset = useInsets ? insets.bottom : 0;
    // We use the global keyboard height and compare it with the safe area
    return {
      paddingBottom: Math.max(keyboard.height.value, bottomInset) + offset,
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
