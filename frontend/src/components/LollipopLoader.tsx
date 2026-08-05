import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from "react-native-svg";

// A small swirling lollipop loading indicator.
export function LollipopLoader({ size = 56 }: { size?: number }) {
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1);
  }, [rot]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <View style={{ width: size, height: size * 1.35, alignItems: "center" }} testID="lollipop-loader">
      {/* stick */}
      <Svg width={size} height={size * 1.35} viewBox="0 0 40 54" style={{ position: "absolute" }}>
        <Rect x="18.5" y="26" width="3" height="26" rx="1.5" fill="#F4D9E6" />
      </Svg>
      {/* spinning candy head */}
      <Animated.View style={[{ width: size, height: size }, spin]}>
        <Svg width={size} height={size} viewBox="0 0 40 40">
          <Defs>
            <LinearGradient id="lolli" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FF528A" />
              <Stop offset="0.5" stopColor="#FDF07B" />
              <Stop offset="1" stopColor="#98F5E1" />
            </LinearGradient>
          </Defs>
          <Circle cx="20" cy="20" r="16" fill="url(#lolli)" />
          <Path
            d="M20 20 m0 0 a2 2 0 1 1 3 -1 a5 5 0 1 1 -8 3 a8 8 0 1 1 13 -6 a11 11 0 1 1 -18 8"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
