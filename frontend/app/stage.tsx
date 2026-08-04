import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale, IMAGES, partnerImage } from "@/src/theme";
import { storage } from "@/src/utils/storage";
import { TOKEN_KEY, wsUrl } from "@/src/api";

type Partner = { id: string; name: string; gender: string; verified: boolean; is_bot: boolean };
type Status = "connecting" | "searching" | "matched" | "error";

export default function StageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission] = useCameraPermissions();

  const [status, setStatus] = useState<Status>("connecting");
  const [partner, setPartner] = useState<Partner | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const closingRef = useRef(false);

  const connect = useCallback(async () => {
    closingRef.current = false;
    const token = (await storage.secureGet(TOKEN_KEY, "")) as string;
    if (!token) {
      setStatus("error");
      return;
    }
    const ws = new WebSocket(wsUrl(token));
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      setStatus("searching");
      ws.send(JSON.stringify({ type: "find" }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "searching") {
          setPartner(null);
          setStatus("searching");
        } else if (msg.type === "matched") {
          setPartner(msg.partner);
          setStatus("matched");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (msg.type === "partner_left") {
          setPartner(null);
          setStatus("searching");
        }
      } catch {
        /* ignore malformed */
      }
    };
    ws.onerror = () => {
      if (!closingRef.current) setStatus("error");
    };
    ws.onclose = () => {
      if (!closingRef.current) setStatus("error");
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      closingRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  const handleNext = useCallback(() => {
    if (status !== "matched") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPartner(null);
    setStatus("searching");
    wsRef.current?.send(JSON.stringify({ type: "next" }));
  }, [status]);

  const handleStop = useCallback(() => {
    closingRef.current = true;
    wsRef.current?.send(JSON.stringify({ type: "stop" }));
    wsRef.current?.close();
    router.back();
  }, [router]);

  const handleRetry = useCallback(() => {
    wsRef.current?.close();
    connect();
  }, [connect]);

  // Swipe-left to skip (only when matched)
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .onEnd((e) => {
          if (e.translationX < -70) {
            runOnJS(handleNext)();
          }
        }),
    [handleNext]
  );

  // Pulsing searching circle
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.25 }],
    opacity: 0.4 + (1 - pulse.value) * 0.4,
  }));

  const cameraGranted = permission?.granted;
  const accent = partner?.gender === "female" ? colors.brandSecondary : colors.brandPrimary;

  return (
    <View style={styles.root}>
      {/* Full-bleed partner feed (mock WebRTC) */}
      {status === "matched" && partner ? (
        <GestureDetector gesture={swipe}>
          <View style={StyleSheet.absoluteFill}>
            <Image
              source={{ uri: partnerImage(partner.gender) }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              testID="partner-feed"
            />
            <LinearGradient
              colors={["rgba(31,10,14,0.55)", "rgba(31,10,14,0)", "rgba(31,10,14,0.8)"]}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </GestureDetector>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri: IMAGES.authHero }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} />
          <LinearGradient
            colors={["rgba(31,10,14,0.5)", "rgba(31,10,14,0.85)"]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Top controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="stop-button" onPress={handleStop} style={styles.roundBtn} hitSlop={8}>
          <Feather name="x" size={22} color={colors.onSurfaceInverse} />
        </Pressable>
        {status === "matched" && partner && (
          <BlurView intensity={40} tint="dark" style={styles.partnerChip} testID="partner-name-chip">
            <View style={[styles.liveDot, { backgroundColor: accent }]} />
            <Text style={styles.partnerName}>{partner.name}</Text>
            {partner.verified && <Feather name="check-circle" size={14} color="#7CF0AE" />}
          </BlurView>
        )}
        <View style={styles.roundBtn} />
      </View>

      {/* Self PiP */}
      <View style={[styles.pip, { top: insets.top + 64 }]} testID="self-pip">
        {cameraGranted ? (
          <CameraView style={styles.pipInner} facing="front" />
        ) : (
          <Image source={{ uri: IMAGES.selfDemo }} style={styles.pipInner} contentFit="cover" />
        )}
        <View style={styles.pipLabel}>
          <Text style={styles.pipLabelText}>Du</Text>
        </View>
      </View>

      {/* Center state */}
      {(status === "searching" || status === "connecting") && (
        <View style={styles.center} testID="searching-state">
          <View style={styles.pulseWrap}>
            <Animated.View style={[styles.pulseCircle, { backgroundColor: colors.brandSecondary }, pulseStyle]} />
            <BlurView intensity={50} tint="light" style={styles.pulseCore}>
              <Feather name="heart" size={30} color={colors.brandPrimary} />
            </BlurView>
          </View>
          <Text style={styles.searchTitle}>Searching for Sugar…</Text>
          <Text style={styles.searchSub}>Wir suchen jemand Besonderen für dich</Text>
        </View>
      )}

      {status === "error" && (
        <View style={styles.center} testID="error-state">
          <BlurView intensity={40} tint="dark" style={styles.errorCard}>
            <Feather name="wifi-off" size={28} color={colors.onSurfaceInverse} />
            <Text style={styles.errorTitle}>Verbindung verloren</Text>
            <Pressable testID="retry-button" onPress={handleRetry} style={styles.retryBtn}>
              <Text style={styles.retryText}>Erneut versuchen</Text>
            </Pressable>
          </BlurView>
        </View>
      )}

      {/* Bottom: Next */}
      {status === "matched" && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.swipeHint}>Nach links wischen zum Weiterspringen</Text>
          <Pressable
            testID="next-button"
            onPress={handleNext}
            style={({ pressed }) => [styles.nextBtn, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <Feather name="chevrons-right" size={22} color={colors.onBrandPrimary} />
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const PIP_W = 96;
const PIP_H = 132;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceInverse },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  partnerName: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurfaceInverse },
  pip: {
    position: "absolute",
    right: spacing.lg,
    width: PIP_W,
    height: PIP_H,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.onSurfaceInverse,
    backgroundColor: colors.surfaceInverse,
  },
  pipInner: { width: "100%", height: "100%" },
  pipLabel: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pipLabelText: { fontFamily: fonts.textMedium, fontSize: 10, color: colors.onSurfaceInverse },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  pulseWrap: { width: 160, height: 160, alignItems: "center", justifyContent: "center" },
  pulseCircle: { position: "absolute", width: 160, height: 160, borderRadius: 80 },
  pulseCore: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  searchTitle: {
    fontFamily: fonts.displayBold,
    fontSize: fontScale["2xl"],
    color: colors.onSurfaceInverse,
    marginTop: spacing.xl,
  },
  searchSub: {
    fontFamily: fonts.textRegular,
    fontSize: fontScale.base,
    color: "rgba(255,255,255,0.8)",
    marginTop: spacing.xs,
  },
  errorCard: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  errorTitle: { fontFamily: fonts.textBold, fontSize: fontScale.xl, color: colors.onSurfaceInverse },
  retryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  retryText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onBrandPrimary },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingHorizontal: spacing.xl, gap: spacing.md },
  swipeHint: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: "rgba(255,255,255,0.75)" },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 60,
    width: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
  },
  nextText: {
    fontFamily: fonts.textBold,
    fontSize: fontScale.xl,
    color: colors.onBrandPrimary,
    letterSpacing: 0.5,
  },
});
