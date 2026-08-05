import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale, IMAGES } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, setUser, signOut } = useAuth();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  if (!token) return <Redirect href="/login" />;

  const pickImage = async (fromCamera: boolean) => {
    setError(null);
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        if (!perm.canAskAgain) {
          setBlocked(true);
        }
        setError(
          fromCamera
            ? "Kamerazugriff benötigt, um dich zu verifizieren."
            : "Fotozugriff benötigt, um ein Selfie auszuwählen."
        );
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            cameraType: ImagePicker.CameraType.front,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.6,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.6,
            base64: true,
          });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.base64) {
        setSelfie(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setSelfie(asset.uri);
      }
    } catch {
      setError("Foto konnte nicht geladen werden.");
    }
  };

  const submit = async () => {
    if (!selfie) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.verify(selfie);
      setUser(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/discover");
    } catch (e: any) {
      setError(e?.message || "Verifizierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="verify-signout" onPress={signOut} hitSlop={12}>
          <Feather name="log-out" size={20} color={colors.onSurfaceTertiary} />
        </Pressable>
        <View style={styles.verifiedChip}>
          <Feather name="shield" size={13} color={colors.onBrandTertiary} />
          <Text style={styles.verifiedChipText}>Verifizierung</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Bestätige,{"\n"}dass du echt bist</Text>
        <Text style={styles.subtitle}>
          Sugar ist ein verifizierter Kreis. Ein kurzes Selfie schaltet dein Profil frei.
        </Text>

        <Pressable
          testID="selfie-preview"
          onPress={() => pickImage(true)}
          style={styles.heroCard}
        >
          {selfie ? (
            <Image source={{ uri: selfie }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <>
              <Image
                source={{ uri: IMAGES.verificationDemo }}
                style={[styles.heroImage, { opacity: 0.35 }]}
                contentFit="cover"
              />
              <View style={styles.heroOverlay}>
                <View style={styles.cameraCircle}>
                  <Feather name="camera" size={26} color={colors.onBrandPrimary} />
                </View>
                <Text style={styles.heroPrompt}>Selfie aufnehmen</Text>
              </View>
            </>
          )}
        </Pressable>

        {selfie && (
          <Pressable testID="retake-selfie" onPress={() => pickImage(true)} style={styles.retake}>
            <Feather name="refresh-ccw" size={14} color={colors.brandPrimary} />
            <Text style={styles.retakeText}>Neu aufnehmen</Text>
          </Pressable>
        )}

        {!selfie && (
          <Text style={styles.cameraHint}>
            Nur ein echtes Live-Selfie mit der Kamera – kein Galerie-Upload.
          </Text>
        )}

        {error && (
          <View style={styles.errorBox} testID="verify-error">
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {blocked && (
          <Pressable testID="open-settings" onPress={() => Linking.openSettings()} style={styles.settingsBtn}>
            <Feather name="settings" size={14} color={colors.onSurface} />
            <Text style={styles.settingsText}>Einstellungen öffnen</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          testID="submit-verification"
          onPress={submit}
          disabled={!selfie || loading}
          style={({ pressed }) => [
            styles.cta,
            (!selfie || loading) && { opacity: 0.4 },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <Text style={styles.ctaText}>Verifizierung abschließen</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  verifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandTertiary,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  verifiedChipText: {
    fontFamily: fonts.textBold,
    fontSize: fontScale.sm,
    color: colors.onBrandTertiary,
  },
  body: { flex: 1, paddingHorizontal: spacing.xl },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: fontScale["3xl"],
    color: colors.onSurface,
    lineHeight: 40,
    marginTop: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.textRegular,
    fontSize: fontScale.lg,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  heroCard: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  cameraCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPrompt: {
    fontFamily: fonts.textBold,
    fontSize: fontScale.lg,
    color: colors.onSurface,
  },
  retake: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  retakeText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.brandPrimary },
  cameraHint: {
    fontFamily: fonts.textRegular,
    fontSize: fontScale.sm,
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(179,18,34,0.08)",
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.error, flex: 1 },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  settingsText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onSurface },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  cta: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontFamily: fonts.textBold,
    fontSize: fontScale.lg,
    color: colors.onBrandPrimary,
    letterSpacing: 0.3,
  },
});
