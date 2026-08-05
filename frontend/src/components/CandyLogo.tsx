import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, Pattern, Rect, Ellipse, ClipPath, G } from "react-native-svg";
import { colors, fonts } from "@/src/theme";

// Candy-cane striped heart + glossy "Sugar" icing wordmark.
const HEART =
  "M50 89 C 16 63, 2 45, 2 27 C 2 13, 13 4, 26 4 C 36 4, 45 10, 50 19 C 55 10, 64 4, 74 4 C 87 4, 98 13, 98 27 C 98 45, 84 63, 50 89 Z";

export function CandyLogo({ size = 96, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <View style={styles.wrap} testID="app-logo">
      <Svg width={size} height={size * 0.92} viewBox="0 0 100 92">
        <Defs>
          <Pattern id="candy" patternUnits="userSpaceOnUse" width="18" height="18" patternTransform="rotate(45)">
            <Rect width="18" height="18" fill="#FF528A" />
            <Rect x="0" width="6" height="18" fill="#FFFFFF" />
            <Rect x="12" width="6" height="18" fill="#98F5E1" />
          </Pattern>
          <ClipPath id="heartClip">
            <Path d={HEART} />
          </ClipPath>
        </Defs>
        <Path d={HEART} fill="url(#candy)" />
        {/* hard-candy gloss */}
        <G clipPath="url(#heartClip)">
          <Ellipse cx="34" cy="26" rx="20" ry="12" fill="rgba(255,255,255,0.45)" />
        </G>
        <Path d={HEART} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={3} />
      </Svg>
      {showWordmark && <Text style={styles.wordmark}>Sugar</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  wordmark: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    color: colors.brandPrimary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
