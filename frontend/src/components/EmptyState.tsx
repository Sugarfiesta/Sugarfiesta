import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Circle, Path, Ellipse } from "react-native-svg";
import { colors, spacing, fonts, fontScale } from "@/src/theme";
import { GummyButton } from "@/src/components/GummyButton";

// A cute kawaii marshmallow mascot for empty states.
export function MarshmallowMascot({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Ellipse cx={60} cy={104} rx={34} ry={7} fill="rgba(255,105,180,0.12)" />
      {/* marshmallow body */}
      <Rect x={26} y={30} width={68} height={64} rx={26} fill="#FFFFFF" stroke="#FFDCEB" strokeWidth={3} />
      <Rect x={26} y={58} width={68} height={4} fill="#FFEAF3" />
      {/* gloss */}
      <Ellipse cx={44} cy={44} rx={12} ry={7} fill="rgba(255,220,235,0.6)" />
      {/* face */}
      <Circle cx={49} cy={56} r={4} fill="#3A2230" />
      <Circle cx={71} cy={56} r={4} fill="#3A2230" />
      <Circle cx={50.5} cy={54.5} r={1.2} fill="#FFFFFF" />
      <Circle cx={72.5} cy={54.5} r={1.2} fill="#FFFFFF" />
      <Circle cx={42} cy={64} r={5} fill="rgba(255,120,170,0.6)" />
      <Circle cx={78} cy={64} r={5} fill="rgba(255,120,170,0.6)" />
      <Path d="M53 66 Q60 73 67 66" stroke="#3A2230" strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function EmptyState({
  title,
  text,
  ctaLabel,
  onCta,
  testID,
}: {
  title: string;
  text?: string;
  ctaLabel?: string;
  onCta?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.wrap} testID={testID}>
      <MarshmallowMascot size={128} />
      <Text style={styles.title}>{title}</Text>
      {!!text && <Text style={styles.text}>{text}</Text>}
      {ctaLabel && onCta && (
        <GummyButton label={ctaLabel} onPress={onCta} testID="empty-cta" style={{ marginTop: spacing.lg, paddingHorizontal: spacing.xl }} height={50} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, marginTop: spacing.md, textAlign: "center" },
  text: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceTertiary, textAlign: "center", lineHeight: 22 },
});
