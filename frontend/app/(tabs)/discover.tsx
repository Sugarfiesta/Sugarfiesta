import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale } from "@/src/theme";
import { COUNTRIES, countryLabel } from "@/src/constants";
import { api, DiscoverCard } from "@/src/api";

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canFilter, setCanFilter] = useState(false);
  const [filter, setFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [match, setMatch] = useState<any | null>(null);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const cardsRef = useRef<DiscoverCard[]>([]);
  const indexRef = useRef(0);

  const load = useCallback(async (country: string) => {
    setLoading(true);
    try {
      const data = await api.discover(country || undefined);
      setCards(data.cards);
      cardsRef.current = data.cards;
      setIndex(0);
      indexRef.current = 0;
      setCanFilter(data.can_filter);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [load, filter])
  );

  const doSwipe = useCallback(async (card: DiscoverCard, action: "like" | "heart") => {
    try {
      const res = await api.swipe(card.id, action);
      if (res.matched) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMatch(res.match);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const finish = useCallback(
    (action: "like" | "pass" | "heart") => {
      const card = cardsRef.current[indexRef.current];
      tx.value = 0;
      ty.value = 0;
      if (card && action !== "pass") doSwipe(card, action);
      const ni = indexRef.current + 1;
      indexRef.current = ni;
      setIndex(ni);
    },
    [doSwipe, tx, ty]
  );

  const trigger = useCallback(
    (action: "like" | "pass" | "heart") => {
      Haptics.impactAsync(action === "heart" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
      if (action === "heart") {
        ty.value = withTiming(-700, { duration: 240 }, (f) => {
          if (f) runOnJS(finish)("heart");
        });
      } else {
        tx.value = withTiming(action === "like" ? 520 : -520, { duration: 240 }, (f) => {
          if (f) runOnJS(finish)(action);
        });
      }
    },
    [finish, tx, ty]
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationX > 110) {
        tx.value = withTiming(520, { duration: 200 }, (f) => f && runOnJS(finish)("like"));
      } else if (e.translationX < -110) {
        tx.value = withTiming(-520, { duration: 200 }, (f) => f && runOnJS(finish)("pass"));
      } else if (e.translationY < -120) {
        ty.value = withTiming(-700, { duration: 220 }, (f) => f && runOnJS(finish)("heart"));
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const topStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${tx.value / 22}deg` }],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, tx.value / 110)) }));
  const nopeStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, -tx.value / 110)) }));
  const heartStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, -ty.value / 120)) }));

  const openFilter = () => {
    if (!canFilter) {
      router.push("/subscribe");
      return;
    }
    setShowFilter(true);
  };

  const visible = cards.slice(index, index + 3);
  const done = !loading && index >= cards.length;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.title}>Entdecken</Text>
          <Text style={styles.subtitle}>Wische, um Menschen zu treffen</Text>
        </View>
        <Pressable testID="country-filter" onPress={openFilter} style={styles.filterBtn}>
          <Feather name={canFilter ? "sliders" : "lock"} size={16} color={colors.onSurface} />
          <Text style={styles.filterText} numberOfLines={1}>
            {filter ? countryLabel(filter) : "Land"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.deck}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        ) : done ? (
          <View style={styles.empty} testID="discover-empty">
            <Feather name="compass" size={44} color={colors.brandTertiary} />
            <Text style={styles.emptyTitle}>{"Das war's fürs Erste"}</Text>
            <Text style={styles.emptyText}>Schau später wieder vorbei – oder ändere deinen Filter.</Text>
            <Pressable testID="reload-discover" onPress={() => load(filter)} style={styles.reloadBtn}>
              <Feather name="refresh-cw" size={16} color={colors.onBrandPrimary} />
              <Text style={styles.reloadText}>Neu laden</Text>
            </Pressable>
          </View>
        ) : (
          visible
            .map((card, i) => {
              const isTop = i === 0;
              const inner = (
                <View style={styles.cardInner} testID={isTop ? "top-card" : undefined}>
                  {card.photo ? (
                    <Image source={{ uri: card.photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.noPhoto]}>
                      <Text style={styles.noPhotoText}>{card.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <LinearGradient colors={["transparent", "rgba(31,10,14,0.85)"]} style={styles.cardScrim} />
                  {isTop && (
                    <>
                      <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]}>
                        <Text style={[styles.stampText, { color: colors.success }]}>LIKE</Text>
                      </Animated.View>
                      <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStyle]}>
                        <Text style={[styles.stampText, { color: colors.error }]}>NÖ</Text>
                      </Animated.View>
                      <Animated.View style={[styles.stamp, styles.heartStamp, heartStyle]}>
                        <Feather name="heart" size={30} color={colors.brandSecondary} />
                        <Text style={[styles.stampText, { color: colors.brandSecondary, fontSize: 20 }]}>SUPER</Text>
                      </Animated.View>
                    </>
                  )}
                  <View style={styles.cardInfo}>
                    <View style={styles.cardNameRow}>
                      <Text style={styles.cardName}>
                        {card.name}{card.age ? `, ${card.age}` : ""}
                      </Text>
                      {card.verified && <Feather name="check-circle" size={18} color="#7CF0AE" />}
                    </View>
                    {!!card.country && <Text style={styles.cardCountry}>{countryLabel(card.country)}</Text>}
                    {!!card.bio && <Text style={styles.cardBio} numberOfLines={2}>{card.bio}</Text>}
                  </View>
                </View>
              );

              const staticStyle = {
                transform: [{ scale: 1 - i * 0.04 }, { translateY: i * 10 }],
                zIndex: 10 - i,
              };

              if (isTop) {
                return (
                  <GestureDetector key={card.id} gesture={pan}>
                    <Animated.View style={[styles.card, { zIndex: 10 }, topStyle]}>{inner}</Animated.View>
                  </GestureDetector>
                );
              }
              return (
                <Animated.View key={card.id} style={[styles.card, staticStyle]} pointerEvents="none">
                  {inner}
                </Animated.View>
              );
            })
            .reverse()
        )}
      </View>

      {!loading && !done && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable testID="pass-button" onPress={() => trigger("pass")} style={[styles.actionBtn, styles.passBtn]}>
            <Feather name="x" size={28} color={colors.error} />
          </Pressable>
          <Pressable testID="heart-button" onPress={() => trigger("heart")} style={[styles.actionBtn, styles.heartBtn]}>
            <Feather name="heart" size={26} color={colors.onBrandPrimary} />
          </Pressable>
          <Pressable testID="like-button" onPress={() => trigger("like")} style={[styles.actionBtn, styles.likeBtn]}>
            <Feather name="check" size={28} color={colors.success} />
          </Pressable>
        </View>
      )}

      {/* Match overlay */}
      {match && (
        <View style={StyleSheet.absoluteFill} testID="match-overlay">
          <LinearGradient colors={["rgba(31,10,14,0.95)", "rgba(138,15,44,0.95)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.matchContent}>
            <Text style={styles.matchTitle}>Es ist ein Match!</Text>
            {match.partner?.photo && (
              <Image source={{ uri: match.partner.photo }} style={styles.matchPhoto} contentFit="cover" />
            )}
            <Text style={styles.matchName}>Du und {match.partner?.name} mögt euch 💘</Text>
            <Pressable
              testID="match-message"
              onPress={() => {
                const id = match.id;
                setMatch(null);
                router.push(`/chat/${id}`);
              }}
              style={styles.matchBtn}
            >
              <Feather name="message-circle" size={18} color={colors.brandPrimary} />
              <Text style={styles.matchBtnText}>Nachricht senden</Text>
            </Pressable>
            <Pressable testID="match-continue" onPress={() => setMatch(null)} style={styles.matchGhost}>
              <Text style={styles.matchGhostText}>Weiter entdecken</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Country filter modal */}
      {showFilter && (
        <View style={StyleSheet.absoluteFill} testID="filter-modal">
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFilter(false)} />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nach Land filtern</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {COUNTRIES.map((c) => (
                <Pressable
                  key={c.code || "all"}
                  testID={`filter-${c.code || "all"}`}
                  onPress={() => {
                    setFilter(c.code);
                    setShowFilter(false);
                  }}
                  style={styles.countryRow}
                >
                  <Text style={styles.countryText}>{c.flag} {c.label}</Text>
                  {filter === c.code && <Feather name="check" size={18} color={colors.brandPrimary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale["3xl"], color: colors.onSurface },
  subtitle: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceTertiary, marginTop: 2 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.surfaceTertiary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, maxWidth: 140 },
  filterText: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.onSurface },
  deck: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { position: "absolute", width: "100%", height: "100%", borderRadius: radius.lg },
  cardInner: { flex: 1, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceTertiary },
  noPhoto: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  noPhotoText: { fontFamily: fonts.displayBold, fontSize: 90, color: colors.onBrandTertiary },
  cardScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  cardInfo: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.xl, gap: 4 },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardName: { fontFamily: fonts.displayBold, fontSize: fontScale["3xl"], color: colors.onSurfaceInverse },
  cardCountry: { fontFamily: fonts.textMedium, fontSize: fontScale.base, color: "rgba(255,255,255,0.85)" },
  cardBio: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  stamp: { position: "absolute", top: 40, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  likeStamp: { left: 24, borderColor: colors.success, transform: [{ rotate: "-18deg" }] },
  nopeStamp: { right: 24, borderColor: colors.error, transform: [{ rotate: "18deg" }] },
  heartStamp: { alignSelf: "center", top: 120, borderColor: colors.brandSecondary, alignItems: "center", flexDirection: "row", gap: spacing.xs },
  stampText: { fontFamily: fonts.textBold, fontSize: 26, letterSpacing: 2 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xl, paddingTop: spacing.sm },
  actionBtn: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  passBtn: { width: 62, height: 62, borderRadius: 31 },
  likeBtn: { width: 62, height: 62, borderRadius: 31 },
  heartBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandSecondary, borderColor: colors.brandSecondary },
  empty: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, marginTop: spacing.sm },
  emptyText: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceTertiary, textAlign: "center" },
  reloadBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md, backgroundColor: colors.brandPrimary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.pill },
  reloadText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.onBrandPrimary },
  matchContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  matchTitle: { fontFamily: fonts.displayBold, fontSize: 44, color: colors.onSurfaceInverse, textAlign: "center" },
  matchPhoto: { width: 160, height: 200, borderRadius: radius.lg, borderWidth: 3, borderColor: colors.onSurfaceInverse },
  matchName: { fontFamily: fonts.textMedium, fontSize: fontScale.lg, color: "rgba(255,255,255,0.9)", textAlign: "center" },
  matchBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.onSurfaceInverse, paddingVertical: spacing.md, paddingHorizontal: spacing["2xl"], borderRadius: radius.pill },
  matchBtnText: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.brandPrimary },
  matchGhost: { paddingVertical: spacing.sm },
  matchGhostText: { fontFamily: fonts.textMedium, fontSize: fontScale.base, color: "rgba(255,255,255,0.85)" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  modalHandle: { width: 44, height: 5, borderRadius: radius.pill, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.md },
  modalTitle: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, marginBottom: spacing.sm },
  countryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  countryText: { fontFamily: fonts.textMedium, fontSize: fontScale.lg, color: colors.onSurface },
});
