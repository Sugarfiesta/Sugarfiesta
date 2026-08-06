import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { G, Circle, Rect, Ellipse, Path } from "react-native-svg";
import { colors, fonts } from "@/src/theme";

const EYE = "#3A2230";

function Bear({ transform, color, light }: { transform: string; color: string; light: string }) {
  return (
    <G transform={transform}>
      {/* legs */}
      <Ellipse cx={22} cy={76} rx={9} ry={9} fill={color} />
      <Ellipse cx={38} cy={76} rx={9} ry={9} fill={color} />
      {/* arms */}
      <Ellipse cx={11} cy={48} rx={8} ry={11} fill={color} />
      <Ellipse cx={49} cy={48} rx={8} ry={11} fill={color} />
      {/* body */}
      <Rect x={13} y={34} width={34} height={44} rx={16} fill={color} />
      {/* ears */}
      <Circle cx={16} cy={12} r={7} fill={color} />
      <Circle cx={44} cy={12} r={7} fill={color} />
      <Circle cx={16} cy={12} r={3.2} fill={light} />
      <Circle cx={44} cy={12} r={3.2} fill={light} />
      {/* head */}
      <Circle cx={30} cy={22} r={17} fill={color} />
      {/* gloss */}
      <Ellipse cx={23} cy={13} rx={9} ry={5} fill="rgba(255,255,255,0.35)" />
      <Ellipse cx={20} cy={44} rx={5} ry={9} fill="rgba(255,255,255,0.18)" />
      {/* kawaii face */}
      <Circle cx={24} cy={22} r={2.7} fill={EYE} />
      <Circle cx={36} cy={22} r={2.7} fill={EYE} />
      <Circle cx={24.9} cy={21.1} r={0.9} fill="#FFFFFF" />
      <Circle cx={36.9} cy={21.1} r={0.9} fill="#FFFFFF" />
      <Circle cx={19} cy={28} r={3.2} fill="rgba(255,120,170,0.75)" />
      <Circle cx={41} cy={28} r={3.2} fill="rgba(255,120,170,0.75)" />
      <Path d="M26 27.5 Q30 31.5 34 27.5" stroke={EYE} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </G>
  );
}

// Two cute Haribo-style gummy bears (red + cola-brown) + "Sugar" icing wordmark.
export function CandyLogo({ size = 96, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  const w = size * 1.4;
  const h = size * 1.0;
  return (
    <View style={styles.wrap} testID="app-logo">
      <Svg width={w} height={h} viewBox="0 0 148 100">
        <Bear transform="translate(6,12)" color="#EF3E52" light="#FF9AA8" />
        <Bear transform="translate(78,12)" color="#8A5A34" light="#C79A6E" />
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
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
