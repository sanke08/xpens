import React, { ReactNode } from "react";
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
  renderItem: (info: { item: T; index: number }) => ReactNode;
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
  /**
   * Optional function to calculate item layout (prevents dynamic measurement lag).
   */
  getItemLayout?: (
    data: ArrayLike<T> | null | undefined,
    index: number,
  ) => { length: number; offset: number; index: number };
}

/**
 * XpensListInner - Internal implementation to preserve generics.
 */
function XpensListInner<T extends { id: string }>(props: XpensListProps<T>) {
  const {
    renderItem,
    wrapperStyle = { flex: 1 },
    itemExiting = FadeOutUp.duration(200),
    itemEntering = FadeInDown,
    itemLayout = LinearTransition,
    ...flatListProps
  } = props;

  const stableRenderItem = React.useCallback(
    ({ item, index }: { item: T; index: number }) => {
      let enteringAnimation: any = undefined;

      // Only staggered entering animation for the first 15 items
      if (index < 15) {
        enteringAnimation = itemEntering;
        if (typeof enteringAnimation !== "function") {
          enteringAnimation = enteringAnimation.delay(index * 50);
        }
      }

      return (
        <Animated.View
          key={item.id}
          layout={itemLayout}
          exiting={itemExiting}
          entering={enteringAnimation}
        >
          {renderItem({ item, index })}
        </Animated.View>
      );
    },
    [renderItem, itemEntering, itemLayout, itemExiting],
  );

  return (
    <Animated.View style={wrapperStyle}>
      <FlatList
        {...flatListProps}
        // Disabled removeClippedSubviews to prevent the 1-2s delay during fast scrolling
        removeClippedSubviews={false}
        initialNumToRender={40}
        maxToRenderPerBatch={20}
        windowSize={11}
        updateCellsBatchingPeriod={30}
        showsVerticalScrollIndicator={false}
        renderItem={stableRenderItem}
      />
    </Animated.View>
  );
}

/**
 * XpensList - A performance-optimized, animated FlatList wrapper.
 * Centralizes Reanimated layout transitions and best-practice FlatList props.
 */
export const XpensList = React.memo(XpensListInner) as typeof XpensListInner;
