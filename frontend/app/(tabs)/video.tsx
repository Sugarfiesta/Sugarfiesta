import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale, IMAGES } from "@/src/theme";
import { tierName, tierRank, TIER_COLORS } from "@/src/constants";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";

const PREFS = [
  { key: "female", label: "Frauen" },
  { key: "male", label: "Männer" },
  { key: "everyone", label: "Alle" },
];

export default function VideoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [blocked, setBlocked] = useState(false);
  const [pref, setPref] = useState(user?.preference || "everyone");

  const cameraGranted = permission?.granted;
  const hasVideo = tierRank(user?.tier) >= 1;
  const tierColor = TIER_COLORS[user?.tier || "free"];

  const enableCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await requestPermission();
    if (!res.granted && !res.canAskAgain) setBlocked(true);
  };

  const choosePref = async (key: string) => {
    setPref(key);
    Haptics.selectionAsync();
    try {
      const updated = await api.setPreference(key);
      setUser(updated);
    } catch {
      /* keep local */
    }
  };

  const startDating = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!hasVideo) {
      router.push("/subscribe");
      return;
    }
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
        colors={["rgba(31,10,14,0.4)", "rgba(31,10,14,0.25)", "rgba(31,10,14,0.9)"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.userChip}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "S").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <Pressable testID="tier-badge" onPress={() => router.push("/subscribe")} style={[styles.tierBadge, { backgroundColor: tierColor }]}>
          <Feather name="star" size={12} color={colors.onBrandPrimary} />
          <Text style={styles.tierBadgeText}>{tierName(user?.tier)}</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text style={styles.welcomeSmall}>Live Video-Dating</Text>
        <Text style={styles.brand}>Sugar</Text>
        <Text style={styles.blurb}>Wische nach links, um sofort die nächste Person zu treffen.</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <BlurView intensity={30} tint="dark" style={styles.prefCard}>
          <Text style={styles.prefTitle}>Wen möchtest du treffen?</Text>
          <View style={styles.prefRow}>
            {PREFS.map((p) => {
              const active = pref === p.key;
              return (
                <Pressable
                  key={p.key}
                  testID={`video-pref-${p.key}`}
                  onPress={() => choosePref(p.key)}
                  style={[styles.prefPill, active && styles.prefPillActive]}
                >
                  <Text style={[styles.prefText, active && styles.prefTextActive]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>

        {!cameraGranted && (
          <BlurView intensity={30} tint="dark" style={styles.permCard}>
            <View style={styles.permInner}>
              <Feather name="video" size={18} color={colors.onSurfaceInverse} />
              <Text style={styles.permText}>Aktiviere deine Kamera, damit dein Match dich sieht.</Text>
            </View>
            {blocked ? (
              <Pressable testID="open-settings-video" onPress={() => Linking.openSettings()} style={styles.permBtn}>
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
          <Feather name={hasVideo ? "heart" : "lock"} size={20} color={colors.onBrandPrimary} />
          <Text style={styles.ctaText}>{hasVideo ? "Start Dating" : "Video freischalten (ab 4,99 €)"}</Text>
        </Pressable>
        {!hasVideo && <Text style={styles.lockHint}>Live-Video ist ab Sugar Plus verfügbar</Text>}
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
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  tierBadgeText: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: colors.onBrandPrimary },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
  welcomeSmall: { fontFamily: fonts.textMedium, fontSize: fontScale.xl, color: "rgba(255,255,255,0.85)" },
  brand: { fontFamily: fonts.displayBold, fontSize: 72, color: colors.onSurfaceInverse, marginTop: -spacing.xs },
  blurb: { fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: "rgba(255,255,255,0.8)", marginTop: spacing.md, lineHeight: 24, maxWidth: "90%" },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.md },
  prefCard: { borderRadius: radius.md, overflow: "hidden", padding: spacing.md, gap: spacing.sm },
  prefTitle: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: "rgba(255,255,255,0.85)" },
  prefRow: { flexDirection: "row", gap: spacing.sm },
  prefPill: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  prefPillActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  prefText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: "rgba(255,255,255,0.85)" },
  prefTextActive: { color: colors.onBrandPrimary },
  permCard: { borderRadius: radius.md, overflow: "hidden", flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  permInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  permText: { flex: 1, fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.onSurfaceInverse },
  permBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
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
  ctaText: { fontFamily: fonts.textBold, fontSize: fontScale.xl, color: colors.onBrandPrimary, letterSpacing: 0.3 },
  lockHint: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: "rgba(255,255,255,0.8)", textAlign: "center" },
});
