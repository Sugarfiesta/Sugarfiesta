import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale } from "@/src/theme";
import { TIER_COLORS } from "@/src/constants";
import { api } from "@/src/api";
import { useAuth } from "@/src/context/AuthContext";

type Tier = { id: string; name: string; price: number; tagline: string; features: string[] };

export default function SubscribeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refresh } = useAuth();

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [current, setCurrent] = useState("free");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getSubscription();
        setTiers(data.tiers);
        setCurrent(data.tier);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const choose = async (tier: Tier) => {
    if (tier.id === current) return;
    setBusy(tier.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.subscribe(tier.id);
      await refresh();
      setCurrent(tier.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.back(), 500);
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const priceLabel = (p: number) => (p === 0 ? "Kostenlos" : `${p.toFixed(2).replace(".", ",")} € / Monat`);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.surfaceInverse, "#3A121C"]} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="subscribe-close" onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.onSurfaceInverse} />
        </Pressable>
        <Text style={styles.title}>Sugar Abos</Text>
        <Text style={styles.subtitle}>Live-Video-Dating ist ab Sugar Plus dabei 🎥</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
          {tiers.map((t) => {
            const active = current === t.id;
            const accent = TIER_COLORS[t.id] || colors.brandPrimary;
            const recommended = t.id === "gold";
            return (
              <View key={t.id} style={[styles.card, active && { borderColor: accent, borderWidth: 2 }]} testID={`tier-${t.id}`}>
                {recommended && (
                  <View style={[styles.badge, { backgroundColor: accent }]}>
                    <Text style={styles.badgeText}>Beliebt</Text>
                  </View>
                )}
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tierName, { color: accent }]}>{t.name}</Text>
                    <Text style={styles.tagline}>{t.tagline}</Text>
                  </View>
                  <Text style={styles.price}>{priceLabel(t.price)}</Text>
                </View>
                <View style={styles.features}>
                  {t.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Feather name="check" size={16} color={accent} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  testID={`tier-select-${t.id}`}
                  onPress={() => choose(t)}
                  disabled={active || busy !== null}
                  style={({ pressed }) => [
                    styles.selectBtn,
                    { backgroundColor: active ? colors.surfaceTertiary : accent },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {busy === t.id ? (
                    <ActivityIndicator color={colors.onBrandPrimary} />
                  ) : (
                    <Text style={[styles.selectText, active && { color: colors.onSurfaceTertiary }]}>
                      {active ? "Aktueller Plan" : t.price === 0 ? "Wechseln zu Free" : "Auswählen"}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
          <Text style={styles.disclaimer}>
            Mock-Zahlung – es wird kein echtes Geld abgebucht. Echte Zahlungen (Stripe) folgen später.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  closeBtn: { alignSelf: "flex-end" },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale["3xl"], color: colors.onSurfaceInverse, marginTop: spacing.sm },
  subtitle: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: "rgba(255,255,255,0.85)", marginTop: spacing.xs },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  badge: {
    position: "absolute",
    top: -10,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: fonts.textBold, fontSize: 11, color: colors.onBrandPrimary },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  tierName: { fontFamily: fonts.displayBold, fontSize: fontScale["2xl"] },
  tagline: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  price: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  features: { gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  featureText: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceSecondary, flex: 1 },
  selectBtn: { height: 50, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  selectText: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onBrandPrimary },
  disclaimer: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm },
});
