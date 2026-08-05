import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, fonts, fontScale } from "@/src/theme";

const SECTIONS: { h: string; b: string }[] = [
  { h: "Angaben gemäß § 5 TMG", b: "Sugar\nMuster­straße 1\n10115 Berlin\nDeutschland" },
  { h: "Vertreten durch", b: "Geschäftsführung: Sugar Team" },
  { h: "Kontakt", b: "E-Mail: support@sugar.app\nTelefon: +49 30 000000" },
  { h: "Umsatzsteuer-ID", b: "USt-IdNr. gemäß § 27 a UStG: DE000000000" },
  { h: "Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)", b: "Sugar Team, Musterstraße 1, 10115 Berlin" },
  { h: "Streitschlichtung", b: "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen." },
];

export default function ImpressumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="impressum-back" onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Feather name="chevron-left" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Impressum</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Angaben gemäß § 5 TMG · Juni 2026</Text>
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
