import * as Haptics from "expo-haptics";
import { Trash2 } from "lucide-react-native";
import React, { useCallback } from "react";
import { StyleSheet, Text } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { COLORS } from "../theme/colors";

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
        <Trash2 color={COLORS.muted} size={18} />
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
      rightThreshold={40}
      enableTrackpadTwoFingerGesture
      childrenContainerStyle={{ paddingVertical: 6 }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    width: 100,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  deleteIconContainer: {
    backgroundColor: COLORS.card,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    height: "100%",
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
});
