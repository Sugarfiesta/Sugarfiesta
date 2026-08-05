import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, gradients } from "@/src/theme";

// Rounded avatar with a thin rainbow-candy gradient border ring.
export function RainbowAvatar({
  uri,
  size = 96,
  fallback = "S",
  ring = 3,
  square = false,
}: {
  uri?: string | null;
  size?: number;
  fallback?: string;
  ring?: number;
  square?: boolean;
}) {
  const outer = square ? Math.round(size * 0.28) : 999;
  const inner = square ? Math.round(size * 0.24) : 999;
  return (
    <LinearGradient
      colors={gradients.rainbowRing}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: outer, padding: ring, alignItems: "center", justifyContent: "center" }}
    >
      <View style={[styles.inner, { borderRadius: inner, width: "100%", height: "100%" }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%", borderRadius: inner }} contentFit="cover" />
        ) : (
          <Text style={[styles.fallback, { fontSize: size * 0.4 }]}>{fallback.charAt(0).toUpperCase()}</Text>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  inner: {
    overflow: "hidden",
    backgroundColor: colors.brandTertiary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: { fontFamily: fonts.displayBold, color: colors.onBrandTertiary },
});
