import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, fonts, fontScale } from "@/src/theme";

const SECTIONS: { h: string; b: string }[] = [
  { h: "1. Verantwortlicher", b: "Verantwortlich für die Datenverarbeitung ist der Betreiber der App Sugar. Bei Fragen zum Datenschutz kannst du uns über die in der App angegebenen Kontaktwege erreichen." },
  { h: "2. Welche Daten wir verarbeiten", b: "E-Mail-Adresse, Passwort (verschlüsselt), Profilangaben (Name, Alter, Land, Bio), Fotos, Präferenzen, Matches und Chatnachrichten sowie technische Daten zur Bereitstellung des Dienstes." },
  { h: "3. Zweck der Verarbeitung", b: "Deine Daten werden verwendet, um Konten zu verwalten, Matches herzustellen, Chats zu ermöglichen und die Sicherheit der Community zu gewährleisten (z. B. Foto-Moderation, Meldungen)." },
  { h: "4. Foto-Moderation", b: "Hochgeladene Bilder werden zur Erkennung unangemessener Inhalte automatisiert analysiert. Dies dient dem Schutz aller Nutzer." },
  { h: "5. Verifizierung", b: "Zur Verifizierung wird ein Live-Selfie aufgenommen. Es dient ausschließlich der Bestätigung, dass ein echter Mensch das Konto nutzt." },
  { h: "6. Speicherdauer & Löschung", b: "Deine Daten werden gespeichert, solange dein Konto besteht. Bei Kontolöschung werden Profil, Fotos, Matches und Nachrichten dauerhaft entfernt." },
  { h: "7. Deine Rechte", b: "Du hast das Recht auf Auskunft, Berichtigung und Löschung deiner Daten. Die Löschung kannst du jederzeit selbst in den Einstellungen auslösen." },
  { h: "8. Weitergabe", b: "Wir verkaufen deine Daten nicht. Eine Weitergabe erfolgt nur, soweit dies zur Bereitstellung des Dienstes oder aufgrund gesetzlicher Pflichten erforderlich ist." },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="privacy-back" onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Feather name="chevron-left" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Datenschutzerklärung</Text>
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
