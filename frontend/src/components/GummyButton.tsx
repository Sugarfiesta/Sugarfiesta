import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, fonts, fontScale, candyShadow, gradients } from "@/src/theme";
import { LollipopLoader } from "@/src/components/LollipopLoader";

type Props = {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
};

// Glossy gummy-bear / glazed-candy button (neumorphic, domed, light reflection).
export function GummyButton({
  label,
  onPress,
  color = colors.brandPrimary,
  textColor = colors.onBrandPrimary,
  loading = false,
  disabled = false,
  testID,
  style,
  height = 56,
}: Props) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: color, height, borderRadius: radius.pill },
        candyShadow(color),
        pressed && { transform: [{ scale: 0.97 }] },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      <LinearGradient
        colors={gradients.glossHighlight}
        style={[styles.gloss, { borderRadius: radius.pill }]}
        pointerEvents="none"
      />
      {loading ? (
        <LollipopLoader size={30} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  gloss: { position: "absolute", top: 0, left: 0, right: 0, height: "55%" },
  label: { fontFamily: fonts.textBold, fontSize: fontScale.lg, letterSpacing: 0.3 },
});
