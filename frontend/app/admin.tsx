import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/context/AuthContext";

type Report = {
  id: string;
  reason: string;
  reporter_name?: string;
  reported_id?: string;
  reported_name?: string | null;
  reported_banned?: boolean;
  status: string;
  created_at: string;
};

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.adminReports();
      setReports(data.reports);
      setOpenCount(data.open_count);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (user && !user.is_admin) return <Redirect href="/(tabs)/profile" />;

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const resolve = async (id: string, action: "dismiss" | "ban") => {
    Haptics.impactAsync(action === "ban" ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.adminResolve(id, action);
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="admin-back" onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.onSurface} />
        </Pressable>
        <View>
          <Text style={styles.title}>Meldungen</Text>
          <Text style={styles.sub}>{openCount} offen · {reports.length} gesamt</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.list, reports.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="admin-empty">
              <Feather name="check-circle" size={40} color={colors.success} />
              <Text style={styles.emptyText}>Keine Meldungen. Alles sauber! ✨</Text>
            </View>
          }
          renderItem={({ item }) => {
            const open = item.status === "open";
            return (
              <View style={styles.card} testID={`report-${item.id}`}>
                <View style={styles.cardTop}>
                  <View style={[styles.statusDot, { backgroundColor: open ? colors.warning : colors.success }]} />
                  <Text style={styles.reason}>{item.reason}</Text>
                </View>
                <Text style={styles.meta}>Gemeldet: {item.reported_name || item.reported_id || "unbekannt"}{item.reported_banned ? " (gesperrt)" : ""}</Text>
                <Text style={styles.meta}>Von: {item.reporter_name || "?"}</Text>
                {open ? (
                  <View style={styles.actions}>
                    <Pressable testID={`dismiss-${item.id}`} onPress={() => resolve(item.id, "dismiss")} style={styles.dismissBtn}>
                      <Text style={styles.dismissText}>Verwerfen</Text>
                    </Pressable>
                    <Pressable testID={`ban-${item.id}`} onPress={() => resolve(item.id, "ban")} style={styles.banBtn}>
                      <Feather name="slash" size={14} color={colors.onError} />
                      <Text style={styles.banText}>Sperren</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.resolved}>Erledigt · {item.status}</Text>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backBtn: { padding: 2 },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface },
  sub: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceTertiary },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  reason: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface, flex: 1 },
  meta: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceSecondary },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  dismissBtn: { flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  dismissText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onSurface },
  banBtn: { flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.error, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  banText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onError },
  resolved: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.success, marginTop: spacing.xs },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyText: { fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: colors.onSurfaceTertiary },
});
