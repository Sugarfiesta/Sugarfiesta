import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { colors, spacing, radius, fonts, fontScale } from "@/src/theme";
import { api, MatchView } from "@/src/api";

function timeLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.matches();
      setMatches(data.matches);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.count}>{matches.length} Verbindungen</Text>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, matches.length === 0 && { flex: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty} testID="matches-empty">
              <Feather name="heart" size={40} color={colors.brandTertiary} />
              <Text style={styles.emptyTitle}>Noch keine Matches</Text>
              <Text style={styles.emptyText}>{"Wische im Tab „Entdecken\", um jemanden kennenzulernen."}</Text>
              <Pressable testID="go-discover" onPress={() => router.push("/(tabs)/discover")} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Jetzt entdecken</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`match-row-${item.id}`}
            onPress={() => router.push(`/chat/${item.id}`)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTertiary }]}
          >
            {item.partner.photo ? (
              <Image source={{ uri: item.partner.photo }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{item.partner.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.partner.name}
                </Text>
                {item.partner.verified && <Feather name="check-circle" size={13} color={colors.success} />}
                <View style={{ flex: 1 }} />
                <Text style={styles.time}>{timeLabel(item.last_at)}</Text>
              </View>
              <Text style={styles.last} numberOfLines={1}>
                {item.last_text || "Neues Match – sag Hallo 👋"}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale["3xl"], color: colors.onSurface },
  count: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceTertiary, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  avatar: { width: 60, height: 60, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  avatarText: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onBrandTertiary },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface, maxWidth: "70%" },
  time: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceTertiary },
  last: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceSecondary },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, marginTop: spacing.sm },
  emptyText: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceTertiary, textAlign: "center" },
  emptyBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  emptyBtnText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onBrandPrimary },
});
