import React from "react";
import { FlatList, FlatListProps, Platform, ViewStyle } from "react-native";
import Animated, {
  ComplexAnimationBuilder,
  EntryExitAnimationFunction,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";

interface XpensListProps<T> extends Omit<FlatListProps<T>, "renderItem"> {
  /**
   * The render function for items.
   * Note: The item is automatically wrapped in an Animated.View with layout transitions.
   */
  renderItem: (item: T, index: number) => React.ReactNode;
  /**
   * Animation used when an item is removed from the list.
   * Defaults to FadeOutUp.
   */
  itemExiting?: EntryExitAnimationFunction | ComplexAnimationBuilder;
  /**
   * Animation used when an item enters the list.
   * Defaults to FadeIn.
   */
  itemEntering?: EntryExitAnimationFunction | ComplexAnimationBuilder;
  /**
   * Layout transition used when items shift positions.
   * Defaults to LinearTransition with spring damping.
   */
  itemLayout?: any;
  /**
   * Optional style for the Animated.View wrapper.
   */
  wrapperStyle?: ViewStyle;
}

/**
 * XpensList - A performance-optimized, animated FlatList wrapper.
 * Centralizes Reanimated layout transitions and best-practice FlatList props.
 */
export function XpensList<T extends { id: string }>(props: XpensListProps<T>) {
  const { renderItem, wrapperStyle = { flex: 1 }, ...flatListProps } = props;

  return (
    <Animated.View style={wrapperStyle} layout={LinearTransition}>
      <FlatList
        {...flatListProps}
        // Performance defaults
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View
            key={item.id}
            layout={LinearTransition}
            exiting={FadeOutUp.duration(200)}
            entering={FadeInDown.delay(index * 50)}
          >
            {renderItem(item, index)}
          </Animated.View>
        )}
      />
    </Animated.View>
  );
}
