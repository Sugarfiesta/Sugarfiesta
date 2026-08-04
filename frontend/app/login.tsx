import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale, IMAGES } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

const GENDERS = [
  { key: "female", label: "Frau" },
  { key: "male", label: "Mann" },
  { key: "other", label: "Divers" },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("female");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, name.trim(), gender);
      }
      router.replace("/");
    } catch (e: any) {
      setError(e?.message || "Etwas ist schiefgelaufen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={{ uri: IMAGES.authHero }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={["rgba(31,10,14,0.15)", "rgba(31,10,14,0.55)"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing["3xl"], paddingBottom: insets.bottom + spacing.xl },
        ]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <Text style={styles.brand} testID="app-logo">Sugar</Text>
          <Text style={styles.tagline}>Finde deinen süßen Moment</Text>
        </View>

        <BlurView intensity={40} tint="light" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>
              {mode === "login" ? "Willkommen zurück" : "Erstelle dein Profil"}
            </Text>

            {mode === "signup" && (
              <View style={styles.field}>
                <Feather name="user" size={18} color={colors.onSurfaceTertiary} />
                <TextInput
                  testID="name-input"
                  style={styles.input}
                  placeholder="Dein Name"
                  placeholderTextColor={colors.onSurfaceTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.field}>
              <Feather name="mail" size={18} color={colors.onSurfaceTertiary} />
              <TextInput
                testID="email-input"
                style={styles.input}
                placeholder="E-Mail"
                placeholderTextColor={colors.onSurfaceTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Feather name="lock" size={18} color={colors.onSurfaceTertiary} />
              <TextInput
                testID="password-input"
                style={styles.input}
                placeholder="Passwort"
                placeholderTextColor={colors.onSurfaceTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {mode === "signup" && (
              <View style={styles.genderRow}>
                {GENDERS.map((g) => {
                  const active = gender === g.key;
                  return (
                    <Pressable
                      key={g.key}
                      testID={`gender-${g.key}`}
                      onPress={() => setGender(g.key)}
                      style={[styles.genderPill, active && styles.genderPillActive]}
                    >
                      <Text style={[styles.genderText, active && styles.genderTextActive]}>
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {error && (
              <View style={styles.errorBox} testID="auth-error">
                <Feather name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              testID="auth-submit-button"
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [
                styles.cta,
                pressed && { transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.7 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <Text style={styles.ctaText}>
                  {mode === "login" ? "Einloggen" : "Weiter"}
                </Text>
              )}
            </Pressable>

            <Pressable
              testID="toggle-auth-mode"
              onPress={() => {
                setError(null);
                setMode(mode === "login" ? "signup" : "login");
              }}
              style={styles.toggle}
            >
              <Text style={styles.toggleText}>
                {mode === "login" ? "Neu hier? " : "Schon dabei? "}
                <Text style={styles.toggleLink}>
                  {mode === "login" ? "Registrieren" : "Einloggen"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </BlurView>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceInverse },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
  brandWrap: { alignItems: "center", marginBottom: spacing.xl },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 56,
    color: colors.onSurfaceInverse,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: fonts.textMedium,
    fontSize: fontScale.lg,
    color: "rgba(255,255,255,0.85)",
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  cardInner: {
    backgroundColor: "rgba(255,255,255,0.72)",
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: fontScale["2xl"],
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 54,
  },
  input: {
    flex: 1,
    fontFamily: fonts.textRegular,
    fontSize: fontScale.lg,
    color: colors.onSurface,
    height: "100%",
  },
  genderRow: { flexDirection: "row", gap: spacing.sm },
  genderPill: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderPillActive: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brandPrimary,
  },
  genderText: {
    fontFamily: fonts.textMedium,
    fontSize: fontScale.base,
    color: colors.onSurfaceTertiary,
  },
  genderTextActive: { color: colors.onBrandTertiary },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(179,18,34,0.08)",
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  errorText: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.error, flex: 1 },
  cta: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  ctaText: {
    fontFamily: fonts.textBold,
    fontSize: fontScale.lg,
    color: colors.onBrandPrimary,
    letterSpacing: 0.3,
  },
  toggle: { alignItems: "center", paddingVertical: spacing.sm },
  toggleText: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceSecondary },
  toggleLink: { fontFamily: fonts.textBold, color: colors.brandPrimary },
});
