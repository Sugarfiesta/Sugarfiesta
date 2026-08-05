import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Keyboard, TouchableWithoutFeedback } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { storage } from "@/src/utils/storage";
import { colors, spacing, radius, fonts, fontScale, gradients } from "@/src/theme";
import { CandyLogo } from "@/src/components/CandyLogo";

const EULA_KEY = "sugar_eula_accepted";
const DOB_KEY = "sugar_birthdate";

const RULES = [
  "Nacktheit oder sexuelle Inhalte sind streng verboten.",
  "Belästigung, Hass oder Bedrohungen sind verboten.",
  "Illegale Inhalte führen zum sofortigen, dauerhaften Ban.",
  "Verstöße kannst du jederzeit über die Melden-Funktion anzeigen.",
];

export function EulaGate() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<"loading" | "rules" | "age" | "ok">("loading");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [ageError, setAgeError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const accepted = await storage.getItem(EULA_KEY, false);
      const dob = await storage.getItem(DOB_KEY, "");
      if (accepted && dob) setStatus("ok");
      else if (accepted) setStatus("age");
      else setStatus("rules");
    })();
  }, []);

  if (status === "loading" || status === "ok") return null;

  const acceptRules = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await storage.setItem(EULA_KEY, true);
    setStatus("age");
  };

  const confirmAge = async () => {
    Keyboard.dismiss();
    setAgeError(null);
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > new Date().getFullYear()) {
      setAgeError("Bitte gib ein gültiges Geburtsdatum ein.");
      return;
    }
    const now = new Date();
    let age = now.getFullYear() - y;
    const monthDiff = now.getMonth() - (m - 1);
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) age--;
    if (age < 18) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setAgeError("Du musst mindestens 18 Jahre alt sein, um Sugar zu nutzen.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await storage.setItem(DOB_KEY, `${y}-${m}-${d}`);
    setStatus("ok");
  };

  return (
    <View style={styles.overlay} testID="eula-gate">
      <LinearGradient colors={gradients.cottonCandy} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.logoRow}>
          <CandyLogo size={72} />
        </View>

        {status === "rules" ? (
          <>
            <Text style={styles.title}>Willkommen bei Sugar</Text>
            <ScrollView style={styles.card} contentContainerStyle={styles.cardInner} showsVerticalScrollIndicator={false}>
              <Text style={styles.lead}>
                Sugar ist eine Live-Video- & Foto-Dating-Community. Für ein sicheres Erlebnis gelten klare Regeln:
              </Text>
              {RULES.map((r) => (
                <View key={r} style={styles.ruleRow}>
                  <Feather name="shield" size={16} color={colors.brandPrimary} />
                  <Text style={styles.ruleText}>{r}</Text>
                </View>
              ))}
              <Text style={styles.consent}>
                Ich akzeptiere die Nutzungsbedingungen. Ich verstehe, dass Nacktheit, Belästigung und illegale Inhalte streng verboten sind und zum sofortigen Ban führen.
              </Text>
              <Text style={styles.policy}>
                Wir tolerieren keine anstößigen Inhalte oder missbräuchliches Verhalten (Zero-Tolerance). Meldungen werden innerhalb von 24 Stunden geprüft.
              </Text>
            </ScrollView>
            <Pressable
              testID="eula-accept"
              onPress={acceptRules}
              style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Text style={styles.ctaText}>Akzeptieren & Fortfahren</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Bestätige dein Alter</Text>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.ageBody}>
              <Feather name="calendar" size={40} color={colors.brandPrimary} />
              <Text style={styles.ageLead}>Sugar ist nur für Erwachsene. Bitte gib dein Geburtsdatum ein.</Text>
              <View style={styles.dobRow}>
                <View style={styles.dobField}>
                  <Text style={styles.dobLabel}>Tag</Text>
                  <TextInput testID="dob-day" style={styles.dobInput} placeholder="TT" placeholderTextColor={colors.onSurfaceTertiary} keyboardType="number-pad" returnKeyType="done" maxLength={2} value={day} onChangeText={(t) => setDay(t.replace(/[^0-9]/g, ""))} />
                </View>
                <View style={styles.dobField}>
                  <Text style={styles.dobLabel}>Monat</Text>
                  <TextInput testID="dob-month" style={styles.dobInput} placeholder="MM" placeholderTextColor={colors.onSurfaceTertiary} keyboardType="number-pad" returnKeyType="done" maxLength={2} value={month} onChangeText={(t) => setMonth(t.replace(/[^0-9]/g, ""))} />
                </View>
                <View style={[styles.dobField, { flex: 1.4 }]}>
                  <Text style={styles.dobLabel}>Jahr</Text>
                  <TextInput testID="dob-year" style={styles.dobInput} placeholder="JJJJ" placeholderTextColor={colors.onSurfaceTertiary} keyboardType="number-pad" returnKeyType="done" maxLength={4} value={year} onChangeText={(t) => setYear(t.replace(/[^0-9]/g, ""))} onSubmitEditing={() => Keyboard.dismiss()} blurOnSubmit />
                </View>
              </View>
              {ageError && (
                <View style={styles.ageErrorBox} testID="dob-error">
                  <Feather name="alert-triangle" size={14} color={colors.error} />
                  <Text style={styles.ageErrorText}>{ageError}</Text>
                </View>
              )}
            </View>
            </TouchableWithoutFeedback>
            <Pressable
              testID="dob-confirm"
              onPress={confirmAge}
              style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Text style={styles.ctaText}>Weiter</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999 },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  logoRow: { alignItems: "flex-start" },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  cardInner: { padding: spacing.lg, gap: spacing.md },
  lead: { fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: colors.onSurface, lineHeight: 24 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  ruleText: { flex: 1, fontFamily: fonts.textMedium, fontSize: fontScale.base, color: colors.onSurface, lineHeight: 22 },
  consent: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onSurface, lineHeight: 22, marginTop: spacing.sm },
  policy: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceSecondary, lineHeight: 20 },
  cta: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  ctaText: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onBrandPrimary, letterSpacing: 0.3 },
  ageBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, paddingHorizontal: spacing.sm },
  ageLead: { fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: colors.onSurface, textAlign: "center", lineHeight: 24 },
  dobRow: { flexDirection: "row", gap: spacing.md, width: "100%" },
  dobField: { flex: 1, gap: spacing.xs },
  dobLabel: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.onSurfaceSecondary, textAlign: "center" },
  dobInput: {
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontFamily: fonts.textBold,
    fontSize: fontScale.xl,
    color: colors.onSurface,
    textAlign: "center",
  },
  ageErrorBox: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: "rgba(255,107,129,0.18)", borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  ageErrorText: { flex: 1, fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.error },
});
