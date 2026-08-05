import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { storage } from "@/src/utils/storage";
import { colors, spacing, radius, fonts, fontScale } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/context/AuthContext";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    setDeleting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await api.deleteAccount().catch(() => {});
      // reset local data
      await storage.removeItem("sugar_eula_accepted");
      await signOut();
      router.replace("/login");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="settings-back" onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Sicherheit & Einstellungen</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community-Regeln</Text>
          <Text style={styles.body}>
            Sugar hat eine Null-Toleranz-Politik gegenüber anstößigen Inhalten und missbräuchlichem Verhalten.
            Nacktheit, Belästigung und illegale Inhalte sind streng verboten und führen zum sofortigen Ban.
            Meldungen werden innerhalb von 24 Stunden geprüft.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Melden & Blockieren</Text>
          <Text style={styles.body}>
            {"Im Live-Video kannst du jede Person über „Melden\" oder „Blockieren\" sofort trennen. Blockierte Personen werden dir nie wieder zugeordnet."}
          </Text>
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Gefahrenzone</Text>
          {!confirm ? (
            <Pressable testID="delete-account" onPress={() => setConfirm(true)} style={styles.deleteBtn}>
              <Feather name="trash-2" size={18} color={colors.onError} />
              <Text style={styles.deleteText}>Account unwiderruflich löschen</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                Bist du sicher? Dein Profil, deine Fotos, Matches und Chats werden dauerhaft gelöscht.
              </Text>
              <View style={styles.confirmRow}>
                <Pressable testID="delete-cancel" onPress={() => setConfirm(false)} style={styles.cancelBtn} disabled={deleting}>
                  <Text style={styles.cancelText}>Abbrechen</Text>
                </Pressable>
                <Pressable testID="delete-confirm" onPress={deleteAccount} style={styles.confirmDeleteBtn} disabled={deleting}>
                  {deleting ? <ActivityIndicator color={colors.onError} /> : <Text style={styles.deleteText}>Endgültig löschen</Text>}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backBtn: { padding: 2 },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface },
  scroll: { padding: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  body: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceSecondary, lineHeight: 22 },
  dangerSection: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.xl },
  dangerTitle: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.error },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
  },
  deleteText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onError },
  confirmBox: { gap: spacing.md, backgroundColor: "rgba(179,18,34,0.06)", borderRadius: radius.md, padding: spacing.lg },
  confirmText: { fontFamily: fonts.textMedium, fontSize: fontScale.base, color: colors.onSurface, lineHeight: 22 },
  confirmRow: { flexDirection: "row", gap: spacing.md },
  cancelBtn: { flex: 1, height: 50, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onSurface },
  confirmDeleteBtn: { flex: 1, height: 50, borderRadius: radius.pill, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" },
});
