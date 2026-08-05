import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Image } from "expo-image";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale } from "@/src/theme";
import { COUNTRIES, countryLabel, tierName, TIER_COLORS } from "@/src/constants";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";

const PREFS = [
  { key: "female", label: "Frauen" },
  { key: "male", label: "Männer" },
  { key: "everyone", label: "Alle" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser, signOut } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [country, setCountry] = useState(user?.country || "");
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const [pref, setPref] = useState(user?.preference || "everyone");
  const [religion, setReligion] = useState(user?.religion || "");
  const [hobby, setHobby] = useState(user?.hobby || "");
  const [job, setJob] = useState(user?.job || "");
  const [storyBusy, setStoryBusy] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCountry, setShowCountry] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const tierColor = TIER_COLORS[user?.tier || "free"];

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1800);
  };

  const postStory = async () => {
    if (storyBusy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      flash("Fotozugriff benötigt");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, base64: true });
    if (res.canceled) return;
    const asset = res.assets[0];
    const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    setStoryBusy(true);
    try {
      const result = await api.addStory(uri);
      if (!result.ok) {
        flash(result.explicit ? "Story abgelehnt: unangemessener Inhalt" : "Story abgelehnt");
        return;
      }
      setUser(result.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flash("Story gepostet");
    } catch {
      flash("Upload fehlgeschlagen");
    } finally {
      setStoryBusy(false);
    }
  };

  const skipDetails = () => {
    Keyboard.dismiss();
    setReligion("");
    setHobby("");
    setJob("");
    flash("Details übersprungen");
  };

  const addPhoto = async () => {
    if (photos.length >= 6) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      flash("Fotozugriff benötigt");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.6,
      base64: true,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    try {
      const result = await api.addPhoto(uri);
      if (!result.ok) {
        flash(result.explicit ? "Foto abgelehnt: unangemessener Inhalt" : "Foto abgelehnt");
        return;
      }
      setUser(result.user);
      setPhotos(result.user.photos || []);
      Haptics.selectionAsync();
    } catch {
      flash("Upload fehlgeschlagen");
    }
  };

  const removePhoto = async (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    try {
      const updated = await api.updateProfile({ photos: next });
      setUser(updated);
    } catch {
      /* ignore */
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        bio,
        age: age ? parseInt(age, 10) : null,
        country,
        religion,
        hobby,
        job,
      });
      setUser(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flash("Profil gespeichert");
    } catch {
      flash("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const choosePref = async (key: string) => {
    setPref(key);
    try {
      const updated = await api.setPreference(key);
      setUser(updated);
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing["3xl"] }]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profil</Text>
          <Pressable testID="profile-signout" onPress={signOut} hitSlop={10} style={styles.signout}>
            <Feather name="log-out" size={20} color={colors.onSurfaceTertiary} />
          </Pressable>
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.bigAvatar}>
            {photos[0] ? (
              <Image source={{ uri: photos[0] }} style={styles.bigAvatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.bigAvatarText}>{(name || "S").charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.badgesRow}>
            {user?.verified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={12} color={colors.success} />
                <Text style={styles.verifiedText}>Verifiziert</Text>
              </View>
            )}
            <Pressable testID="profile-tier" onPress={() => router.push("/subscribe")} style={[styles.tierBadge, { backgroundColor: tierColor }]}>
              <Feather name="star" size={11} color={colors.onBrandPrimary} />
              <Text style={styles.tierText}>{tierName(user?.tier)}</Text>
            </Pressable>
          </View>
        </View>

        {/* Storys */}
        <Text style={styles.sectionLabel}>Deine Storys</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
          <Pressable testID="post-story" onPress={postStory} style={styles.addStory}>
            {storyBusy ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Feather name="plus" size={26} color={colors.onBrandPrimary} />
            )}
          </Pressable>
          {(user?.stories || []).map((s, i) => (
            <Pressable key={`${i}`} testID={`story-${i}`} onPress={() => setViewer(s)} style={styles.storyCircle}>
              <Image source={{ uri: s }} style={styles.storyImg} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.hint}>Tippe auf „+", um eine Story zu posten. Storys werden automatisch geprüft.</Text>

        {/* Photos */}
        <Text style={styles.sectionLabel}>Meine Fotos</Text>
        <Text style={styles.hint}>{"Für Foto-Matching im „Entdecken\"-Tab. Alle Fotos werden automatisch auf unangemessene Inhalte geprüft."}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map((p, i) => (
            <View key={`${i}-${p.slice(-8)}`} style={styles.photoWrap}>
              <Image source={{ uri: p }} style={styles.photo} contentFit="cover" />
              <Pressable testID={`remove-photo-${i}`} onPress={() => removePhoto(i)} style={styles.removeBtn}>
                <Feather name="x" size={14} color={colors.onBrandPrimary} />
              </Pressable>
            </View>
          ))}
          {photos.length < 6 && (
            <Pressable testID="add-photo" onPress={addPhoto} style={styles.addPhoto}>
              <Feather name="plus" size={26} color={colors.brandPrimary} />
              <Text style={styles.addPhotoText}>Foto</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Editable fields */}
        <Text style={styles.sectionLabel}>Über mich</Text>
        <View style={styles.field}>
          <TextInput testID="profile-name" style={styles.input} placeholder="Name" placeholderTextColor={colors.onSurfaceTertiary} value={name} onChangeText={setName} />
        </View>
        <View style={[styles.field, { height: 96, alignItems: "flex-start", paddingTop: spacing.md }]}>
          <TextInput
            testID="profile-bio"
            style={[styles.input, { height: "100%" }]}
            placeholder="Erzähl etwas über dich…"
            placeholderTextColor={colors.onSurfaceTertiary}
            value={bio}
            onChangeText={setBio}
            multiline
          />
        </View>
        <View style={styles.field}>
          <Feather name="calendar" size={18} color={colors.onSurfaceTertiary} />
          <TextInput
            testID="profile-age"
            style={styles.input}
            placeholder="Alter"
            placeholderTextColor={colors.onSurfaceTertiary}
            value={age}
            onChangeText={(t) => setAge(t.replace(/[^0-9]/g, "").slice(0, 2))}
            keyboardType="number-pad"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
        <Pressable testID="profile-country" style={styles.field} onPress={() => setShowCountry(true)}>
          <Feather name="map-pin" size={18} color={colors.onSurfaceTertiary} />
          <Text style={[styles.input, { color: country ? colors.onSurface : colors.onSurfaceTertiary, paddingTop: 16 }]}>
            {country ? countryLabel(country) : "Land auswählen"}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>

        {/* Optional details */}
        <View style={styles.detailsHead}>
          <Text style={styles.sectionLabel}>Weitere Details (optional)</Text>
          <Pressable testID="skip-details" onPress={skipDetails} hitSlop={8}>
            <Text style={styles.skipText}>Überspringen</Text>
          </Pressable>
        </View>
        <View style={styles.field}>
          <Feather name="book-open" size={18} color={colors.onSurfaceTertiary} />
          <TextInput testID="profile-religion" style={styles.input} placeholder="Religion" placeholderTextColor={colors.onSurfaceTertiary} value={religion} onChangeText={setReligion} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
        </View>
        <View style={styles.field}>
          <Feather name="heart" size={18} color={colors.onSurfaceTertiary} />
          <TextInput testID="profile-hobby" style={styles.input} placeholder="Hobby" placeholderTextColor={colors.onSurfaceTertiary} value={hobby} onChangeText={setHobby} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
        </View>
        <View style={styles.field}>
          <Feather name="briefcase" size={18} color={colors.onSurfaceTertiary} />
          <TextInput testID="profile-job" style={styles.input} placeholder="Job" placeholderTextColor={colors.onSurfaceTertiary} value={job} onChangeText={setJob} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
        </View>

        {/* Preference */}
        <Text style={styles.sectionLabel}>Wen möchtest du treffen?</Text>
        <View style={styles.prefRow}>
          {PREFS.map((p) => {
            const active = pref === p.key;
            return (
              <Pressable key={p.key} testID={`profile-pref-${p.key}`} onPress={() => choosePref(p.key)} style={[styles.prefPill, active && styles.prefPillActive]}>
                <Text style={[styles.prefText, active && styles.prefTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable testID="save-profile" onPress={saveProfile} disabled={saving} style={({ pressed }) => [styles.saveBtn, pressed && { transform: [{ scale: 0.98 }] }, saving && { opacity: 0.7 }]}>
          {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.saveText}>Profil speichern</Text>}
        </Pressable>

        <Pressable testID="manage-subscription" onPress={() => router.push("/subscribe")} style={styles.subRow}>
          <Feather name="star" size={18} color={colors.brandPrimary} />
          <Text style={styles.subText}>Abo verwalten</Text>
          <View style={{ flex: 1 }} />
          <Feather name="chevron-right" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>

        <Pressable testID="open-settings-row" onPress={() => router.push("/settings")} style={styles.settingsRow}>
          <Feather name="shield" size={18} color={colors.onSurface} />
          <Text style={styles.subText}>Sicherheit & Einstellungen</Text>
          <View style={{ flex: 1 }} />
          <Feather name="chevron-right" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>

        {user?.is_admin && (
          <Pressable testID="open-admin" onPress={() => router.push("/admin")} style={styles.settingsRow}>
            <Feather name="flag" size={18} color={colors.error} />
            <Text style={styles.subText}>Admin: Meldungen</Text>
            <View style={{ flex: 1 }} />
            <Feather name="chevron-right" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
        )}
      </KeyboardAwareScrollView>

      {showCountry && (
        <View style={StyleSheet.absoluteFill} testID="country-modal">
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCountry(false)} />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Land auswählen</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {COUNTRIES.filter((c) => c.code).map((c) => (
                <Pressable
                  key={c.code}
                  testID={`country-${c.code}`}
                  onPress={() => {
                    setCountry(c.code);
                    setShowCountry(false);
                  }}
                  style={styles.countryRow}
                >
                  <Text style={styles.countryText}>{c.flag} {c.label}</Text>
                  {country === c.code && <Feather name="check" size={18} color={colors.brandPrimary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {toast && (
        <View style={[styles.toast, { top: insets.top + 60, pointerEvents: "none" }]} testID="profile-toast">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {viewer && (
        <View style={StyleSheet.absoluteFill} testID="story-viewer">
          <Image source={{ uri: viewer }} style={StyleSheet.absoluteFill} contentFit="contain" />
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable testID="story-viewer-close" onPress={() => setViewer(null)} style={[styles.storyClose, { top: insets.top + spacing.md }]} hitSlop={12}>
              <Feather name="x" size={26} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.xl, gap: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.displayBold, fontSize: fontScale["3xl"], color: colors.onSurface },
  signout: { padding: 4 },
  identity: { alignItems: "center", gap: spacing.md, marginVertical: spacing.md },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bigAvatarImg: { width: "100%", height: "100%" },
  bigAvatarText: { fontFamily: fonts.displayBold, fontSize: 40, color: colors.onBrandTertiary },
  badgesRow: { flexDirection: "row", gap: spacing.sm },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(18,138,74,0.1)", paddingVertical: 5, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  verifiedText: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: colors.success },
  tierBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  tierText: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: colors.onBrandPrimary },
  sectionLabel: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface, marginTop: spacing.md },
  hint: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceTertiary, marginTop: -spacing.xs },
  storyRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  addStory: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  storyCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.brandPrimary,
  },
  storyImg: { width: "100%", height: "100%" },
  detailsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skipText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.brandPrimary },
  storyClose: { position: "absolute", right: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  photoRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  photoWrap: { width: 96, height: 128, borderRadius: radius.md, overflow: "hidden" },
  photo: { width: "100%", height: "100%", backgroundColor: colors.surfaceTertiary },
  removeBtn: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  addPhoto: {
    width: 96,
    height: 128,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.brandTertiary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoText: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.brandPrimary },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 54,
  },
  input: { flex: 1, fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: colors.onSurface, height: "100%" },
  prefRow: { flexDirection: "row", gap: spacing.sm },
  prefPill: { flex: 1, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  prefPillActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  prefText: { fontFamily: fonts.textMedium, fontSize: fontScale.base, color: colors.onSurfaceTertiary },
  prefTextActive: { color: colors.onBrandTertiary },
  saveBtn: { height: 56, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  saveText: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onBrandPrimary },
  subRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, marginTop: spacing.md },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider },
  subText: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  modalHandle: { width: 44, height: 5, borderRadius: radius.pill, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.md },
  modalTitle: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, marginBottom: spacing.sm },
  countryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  countryText: { fontFamily: fonts.textMedium, fontSize: fontScale.lg, color: colors.onSurface },
  toast: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(20,6,9,0.92)", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  toastText: { fontFamily: fonts.textMedium, fontSize: fontScale.base, color: colors.onSurfaceInverse },
});
