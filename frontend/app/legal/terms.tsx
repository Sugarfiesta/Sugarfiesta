import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, fonts, fontScale } from "@/src/theme";

const SECTIONS: { h: string; b: string }[] = [
  { h: "1. Geltungsbereich", b: "Diese Nutzungsbedingungen regeln die Nutzung der App Sugar. Mit der Registrierung erklärst du dich mit ihnen einverstanden." },
  { h: "2. Mindestalter", b: "Sugar ist ausschließlich für Personen ab 18 Jahren. Mit der Nutzung bestätigst du, dass du volljährig bist." },
  { h: "3. Verhaltensregeln (Zero-Tolerance)", b: "Nacktheit, sexuell explizite Inhalte, Belästigung, Hassrede, Bedrohungen und illegale Inhalte sind streng verboten. Verstöße führen zur sofortigen und dauerhaften Sperrung deines Kontos." },
  { h: "4. Nutzergenerierte Inhalte", b: "Hochgeladene Fotos werden automatisch geprüft. Unangemessene Inhalte werden abgelehnt. Andere Nutzer können Verstöße jederzeit melden; Meldungen werden innerhalb von 24 Stunden bearbeitet." },
  { h: "5. Melden & Blockieren", b: "Du kannst jede Person melden oder blockieren. Blockierte Personen werden dir nicht mehr angezeigt oder zugeordnet." },
  { h: "6. Abonnements", b: "Kostenpflichtige Funktionen (z. B. Live-Video ab Sugar Plus) werden als Abonnement angeboten. In dieser Vorschauversion erfolgt keine echte Abbuchung." },
  { h: "7. Kündigung & Löschung", b: "Du kannst dein Konto jederzeit in den Einstellungen unwiderruflich löschen. Dabei werden dein Profil, deine Fotos, Matches und Nachrichten dauerhaft entfernt." },
  { h: "8. Haftung", b: "Sugar wird mit größtmöglicher Sorgfalt betrieben, übernimmt jedoch keine Haftung für das Verhalten anderer Nutzer. Handle stets vorsichtig und respektvoll." },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="terms-back" onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Feather name="chevron-left" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Nutzungsbedingungen (AGB)</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Zuletzt aktualisiert: Juni 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.b}>{s.b}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { padding: 2 },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, flex: 1 },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  updated: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceTertiary },
  section: { gap: spacing.xs },
  h: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  b: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceSecondary, lineHeight: 22 },
});
