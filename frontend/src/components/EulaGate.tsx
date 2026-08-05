import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { storage } from "@/src/utils/storage";
import { colors, spacing, radius, fonts, fontScale } from "@/src/theme";

const EULA_KEY = "sugar_eula_accepted";

const RULES = [
  "Nacktheit oder sexuelle Inhalte sind streng verboten.",
  "Belästigung, Hass oder Bedrohungen sind verboten.",
  "Illegale Inhalte führen zum sofortigen, dauerhaften Ban.",
  "Verstöße kannst du jederzeit über die Melden-Funktion anzeigen.",
];

export function EulaGate() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<"loading" | "need" | "ok">("loading");

  useEffect(() => {
    (async () => {
      const accepted = await storage.getItem(EULA_KEY, false);
      setStatus(accepted ? "ok" : "need");
    })();
  }, []);

  if (status !== "need") return null;

  const accept = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await storage.setItem(EULA_KEY, true);
    setStatus("ok");
  };

  return (
    <View style={styles.overlay} testID="eula-gate">
      <LinearGradient colors={[colors.surfaceInverse, "#3A121C"]} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.brand}>Sugar</Text>
        <Text style={styles.title}>Willkommen bei Sugar</Text>

        <ScrollView style={styles.card} contentContainerStyle={styles.cardInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.lead}>
            Sugar ist eine Live-Video- & Foto-Dating-Community. Für ein sicheres Erlebnis gelten klare Regeln:
          </Text>
          {RULES.map((r) => (
            <View key={r} style={styles.ruleRow}>
              <Feather name="shield" size={16} color={colors.brandSecondary} />
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
          onPress={accept}
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <Text style={styles.ctaText}>Akzeptieren & Fortfahren</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999 },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  brand: { fontFamily: fonts.displayBold, fontSize: 40, color: colors.onSurfaceInverse },
  title: { fontFamily: fonts.textBold, fontSize: fontScale.xl, color: "rgba(255,255,255,0.9)", marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  cardInner: { padding: spacing.lg, gap: spacing.md },
  lead: { fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: colors.onSurfaceInverse, lineHeight: 24 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  ruleText: { flex: 1, fontFamily: fonts.textMedium, fontSize: fontScale.base, color: "rgba(255,255,255,0.9)", lineHeight: 22 },
  consent: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onSurfaceInverse, lineHeight: 22, marginTop: spacing.sm },
  policy: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: "rgba(255,255,255,0.7)", lineHeight: 20 },
  cta: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  ctaText: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onBrandPrimary, letterSpacing: 0.3 },
});
