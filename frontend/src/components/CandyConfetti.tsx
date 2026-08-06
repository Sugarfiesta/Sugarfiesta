import React, { useEffect } from "react";
import { StyleSheet, Text, Dimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, Easing } from "react-native-reanimated";

const CANDIES = ["🍬", "🍭", "🧁", "🐻", "🍡", "🍫", "🍬", "🍭"];
const { width, height } = Dimensions.get("window");

function Piece({ index }: { index: number }) {
  const y = useSharedValue(-60);
  const rot = useSharedValue(0);
  const x = ((index * 41) % Math.max(1, Math.floor(width - 30)));
  const emoji = CANDIES[index % CANDIES.length];
  const delay = (index % 8) * 120;
  const duration = 2200 + (index % 5) * 400;

  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(height + 60, { duration, easing: Easing.linear }), -1, false));
    rot.value = withRepeat(withTiming(360, { duration: 1400, easing: Easing.linear }), -1, false);
  }, [y, rot, delay, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.piece, { left: x }, style]} pointerEvents="none">
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

// Playful falling-candy confetti — overlay it while a celebration is on screen.
export function CandyConfetti({ count = 16 }: { count?: number }) {
  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none" testID="candy-confetti">
      {Array.from({ length: count }).map((_, i) => (
        <Piece key={i} index={i} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", top: 0 },
  emoji: { fontSize: 26 },
});
