import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Trash2 } from "lucide-react-native";
import { COLORS } from "../theme/colors";
import * as Haptics from "expo-haptics";
import { RectButton } from "react-native-gesture-handler";

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

function RightAction({
  drag,
  onPress,
}: {
  drag: SharedValue<number>;
  onPress: () => void;
}) {
  const styleAnimation = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drag.value + 100 }], // 100 is the width of the action
    };
  });

  return (
    <RectButton style={styles.deleteAction} onPress={onPress}>
      <Animated.View style={[styles.deleteIconContainer, styleAnimation]}>
        <Trash2 color={COLORS.background} size={22} />
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>
    </RectButton>
  );
}

export function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const renderRightActions = useCallback(
    (
      _progress: SharedValue<number>,
      drag: SharedValue<number>,
      _swipeable: SwipeableMethods,
    ) => {
      const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete();
      };

      return <RightAction drag={drag} onPress={handlePress} />;
    },
    [onDelete],
  );

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      friction={2}
      containerStyle={styles.swipeableContainer}
      rightThreshold={40}
      enableTrackpadTwoFingerGesture
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  swipeableContainer: {
    backgroundColor: COLORS.danger,
  },
  deleteAction: {
    width: 100,
    backgroundColor: COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
  },
  deleteText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
});
