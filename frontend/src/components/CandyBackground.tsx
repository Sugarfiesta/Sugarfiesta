import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "@/src/theme";

// Soft "marshmallow melt" gradient background filling its parent.
export function CandyBackground() {
  return (
    <LinearGradient
      colors={gradients.marshmallow}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
