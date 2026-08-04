import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale, IMAGES } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

export default function LobbyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [blocked, setBlocked] = useState(false);

  if (!token) return <Redirect href="/login" />;

  const cameraGranted = permission?.granted;

  const enableCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await requestPermission();
    if (!res.granted && !res.canAskAgain) setBlocked(true);
  };

  const startDating = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/stage");
  };

  return (
    <View style={styles.root}>
      {cameraGranted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="front" />
      ) : (
        <Image source={{ uri: IMAGES.authHero }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
      <LinearGradient
        colors={["rgba(31,10,14,0.35)", "rgba(31,10,14,0.2)", "rgba(31,10,14,0.85)"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.userChip}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || "S").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name}</Text>
            <View style={styles.verifiedRow}>
              <Feather name="check-circle" size={11} color="#7CF0AE" />
              <Text style={styles.verifiedText}>Verifiziert</Text>
            </View>
          </View>
        </View>
        <Pressable testID="lobby-signout" onPress={signOut} hitSlop={12} style={styles.iconBtn}>
          <Feather name="log-out" size={18} color={colors.onSurfaceInverse} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text style={styles.welcomeSmall}>Willkommen bei</Text>
        <Text style={styles.brand}>Sugar</Text>
        <Text style={styles.blurb}>
          Ein Wisch nach links und du triffst die nächste Person. Live, echt, verifiziert.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        {!cameraGranted && (
          <BlurView intensity={30} tint="dark" style={styles.permCard}>
            <View style={styles.permInner}>
              <Feather name="video" size={18} color={colors.onSurfaceInverse} />
              <Text style={styles.permText}>
                Aktiviere deine Kamera, damit dein Match dich sieht.
              </Text>
            </View>
            {blocked ? (
              <Pressable testID="open-settings-lobby" onPress={() => Linking.openSettings()} style={styles.permBtn}>
                <Text style={styles.permBtnText}>Einstellungen</Text>
              </Pressable>
            ) : (
              <Pressable testID="enable-camera" onPress={enableCamera} style={styles.permBtn}>
                <Text style={styles.permBtnText}>Aktivieren</Text>
              </Pressable>
            )}
          </BlurView>
        )}

        <Pressable
          testID="start-dating-button"
          onPress={startDating}
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <Feather name="heart" size={20} color={colors.onBrandPrimary} />
          <Text style={styles.ctaText}>Start Dating</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceInverse },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  userChip: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.displayBold, fontSize: fontScale.lg, color: colors.onBrandPrimary },
  userName: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onSurfaceInverse },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 },
  verifiedText: { fontFamily: fonts.textMedium, fontSize: 11, color: "#7CF0AE" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
  welcomeSmall: {
    fontFamily: fonts.textMedium,
    fontSize: fontScale.xl,
    color: "rgba(255,255,255,0.85)",
  },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 72,
    color: colors.onSurfaceInverse,
    marginTop: -spacing.xs,
  },
  blurb: {
    fontFamily: fonts.textRegular,
    fontSize: fontScale.lg,
    color: "rgba(255,255,255,0.8)",
    marginTop: spacing.md,
    lineHeight: 24,
    maxWidth: "90%",
  },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.md },
  permCard: {
    borderRadius: radius.md,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  permInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  permText: { flex: 1, fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.onSurfaceInverse },
  permBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  permBtnText: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: colors.onSurfaceInverse },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
  },
  ctaText: {
    fontFamily: fonts.textBold,
    fontSize: fontScale.xl,
    color: colors.onBrandPrimary,
    letterSpacing: 0.3,
  },
});
