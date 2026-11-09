import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { colors, spacing, radius, fonts, fontScale, gradients } from "@/src/theme";
import { countryLabel, orientationColor, orientationLabel, storyVisIcon } from "@/src/constants";
import { api } from "@/src/api";
import { LollipopLoader } from "@/src/components/LollipopLoader";

const { width } = Dimensions.get("window");
const CANDY = ["🍬", "🍭", "🧁", "🍫", "🍡", "🐻"];

type Profile = {
  id: string;
  name: string;
  age?: number | null;
  gender: string;
  country: string;
  bio: string;
  photos: string[];
  orientation?: string;
  religion?: string;
  hobby?: string;
  job?: string;
  verified: boolean;
  stories?: { url: string; visibility: string }[];
};

function SideCandy({ side, top }: { side: "left" | "right"; top: number }) {
  const emoji = CANDY[(top / 90) % CANDY.length | 0];
  return (
    <Text style={[styles.sideCandy, side === "left" ? { left: 4 } : { right: 4 }, { top }]} pointerEvents="none">
      {emoji}
    </Text>
  );
}

function Fact({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  if (!value) return null;
  return (
    <View style={styles.factCard}>
      <View style={[styles.factIcon, { backgroundColor: color }]}>
        <Feather name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.getUserProfile(String(id));
        if (active) setProfile(data);
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <LinearGradient colors={gradients.marshmallow} style={StyleSheet.absoluteFill} />
        <LollipopLoader size={64} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <LinearGradient colors={gradients.marshmallow} style={StyleSheet.absoluteFill} />
        <Text style={styles.errText}>Profil nicht gefunden</Text>
        <Pressable testID="user-back" onPress={() => router.back()} style={styles.backPill}>
          <Text style={styles.backPillText}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  const accent = orientationColor(profile.orientation);

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.marshmallow} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing["3xl"] }}>
        {/* Hero photo */}
        <View style={styles.hero}>
          {profile.photos[0] ? (
            <Image source={{ uri: profile.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.noPhoto]}>
              <Text style={styles.noPhotoText}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <LinearGradient colors={["rgba(74,46,59,0.1)", "rgba(74,46,59,0.85)"]} style={styles.heroScrim} />
          <Pressable testID="user-back" onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + spacing.sm }]} hitSlop={10}>
            <Feather name="chevron-left" size={26} color="#FFFFFF" />
          </Pressable>
          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{profile.name}{profile.age ? `, ${profile.age}` : ""}</Text>
              {profile.verified && <Feather name="check-circle" size={20} color="#7CF0AE" />}
            </View>
            <View style={styles.chipRow}>
              {!!profile.country && (
                <View style={styles.metaChip}><Text style={styles.metaChipText}>{countryLabel(profile.country)}</Text></View>
              )}
              {!!profile.orientation && (
                <View style={[styles.metaChip, { backgroundColor: accent }]}>
                  <Text style={[styles.metaChipText, { color: "#FFFFFF" }]}>{orientationLabel(profile.orientation)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Scrollable content with candy sides */}
        <View style={styles.body}>
          <SideCandy side="left" top={20} />
          <SideCandy side="right" top={70} />

          {!!profile.bio && (
            <View style={styles.bioCard}>
              <Text style={styles.sectionTitle}>Über mich</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          <SideCandy side="right" top={230} />
          <SideCandy side="left" top={300} />

          <Text style={styles.sectionTitle}>Steckbrief</Text>
          <Fact icon="book-open" label="Religion" value={profile.religion || ""} color={colors.brandTertiary} />
          <Fact icon="heart" label="Hobby" value={profile.hobby || ""} color={colors.brandPrimary} />
          <Fact icon="briefcase" label="Job" value={profile.job || ""} color={colors.accentCyan} />
          {!profile.religion && !profile.hobby && !profile.job && (
            <Text style={styles.emptyHint}>Noch keine Angaben 🍬</Text>
          )}

          {profile.photos.length > 1 && (
            <>
              <SideCandy side="left" top={560} />
              <Text style={styles.sectionTitle}>Weitere Fotos</Text>
              {profile.photos.slice(1).map((p, i) => (
                <LinearGradient key={i} colors={gradients.rainbowRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.galleryFrame}>
                  <Image source={{ uri: p }} style={styles.galleryImg} contentFit="cover" />
                </LinearGradient>
              ))}
            </>
          )}

          {!!profile.stories?.length && (
            <>
              <Text style={styles.sectionTitle}>Storys</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
                {profile.stories.map((s, i) => (
                  <View key={i} style={styles.storyCircle}>
                    <Image source={{ uri: s.url }} style={styles.storyImg} contentFit="cover" />
                    <View style={styles.storyBadge}><Feather name={storyVisIcon(s.visibility)} size={11} color="#FFFFFF" /></View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, backgroundColor: colors.surface },
  errText: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  backPill: { backgroundColor: colors.brandPrimary, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.pill },
  backPillText: { fontFamily: fonts.textBold, color: colors.onBrandPrimary },
  hero: { width: "100%", height: width * 1.15, backgroundColor: colors.surfaceTertiary },
  heroScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  noPhoto: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  noPhotoText: { fontFamily: fonts.displayBold, fontSize: 110, color: colors.onBrandTertiary },
  backBtn: { position: "absolute", left: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  heroInfo: { position: "absolute", left: spacing.xl, right: spacing.xl, bottom: spacing.xl, gap: spacing.sm },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heroName: { fontFamily: fonts.displayBold, fontSize: fontScale["3xl"], color: "#FFFFFF" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  metaChip: { backgroundColor: "rgba(255,255,255,0.25)", paddingVertical: 4, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  metaChipText: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: "#FFFFFF" },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.md },
  sideCandy: { position: "absolute", fontSize: 22, opacity: 0.6 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, marginTop: spacing.sm },
  bioCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs },
  bioText: { fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: colors.onSurfaceSecondary, lineHeight: 24 },
  factCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  factIcon: { width: 42, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFFFFF" },
  factLabel: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.onSurfaceTertiary },
  factValue: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  emptyHint: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurfaceTertiary },
  galleryFrame: { width: "100%", height: width * 1.1, borderRadius: radius.lg + 3, padding: 4, marginTop: spacing.sm },
  galleryImg: { flex: 1, borderRadius: radius.lg },
  storyRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  storyCircle: { width: 72, height: 72, borderRadius: radius.pill, overflow: "hidden", borderWidth: 2.5, borderColor: colors.brandPrimary },
  storyImg: { width: "100%", height: "100%" },
  storyBadge: { position: "absolute", bottom: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFFFFF" },
});
