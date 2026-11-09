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
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, fonts, fontScale, gradients } from "@/src/theme";
import {
  COUNTRIES, countryLabel, tierName, TIER_COLORS,
  ORIENTATIONS, STORY_VIS, storyVisIcon, storyVisLabel,
  RELIGION_OPTIONS, HOBBY_OPTIONS, JOB_OPTIONS, STORY_TEXT_COLORS,
} from "@/src/constants";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";
import { RainbowAvatar } from "@/src/components/RainbowAvatar";
import { GummyButton } from "@/src/components/GummyButton";

const PREFS = [
  { key: "female", label: "Frauen" },
  { key: "male", label: "Männer" },
  { key: "everyone", label: "Alle" },
];

type Viewer = { url: string; index: number; visibility: string; caption: string; textColor: string };
type Editor = { uri: string; visibility: string; caption: string; textColor: string };
type Picker = { field: "religion" | "hobby" | "job"; title: string; options: string[] };

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
  const [orientation, setOrientation] = useState(user?.orientation || "");
  const [interest, setInterest] = useState<string[]>(user?.orientation_interest || []);

  const [storyBusy, setStoryBusy] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [customText, setCustomText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCountry, setShowCountry] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const stories = user?.stories || [];
  const tierColor = TIER_COLORS[user?.tier || "free"];

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1800);
  };

  // ---- Story creation: pick image -> edit (caption/color/visibility) -> share
  const beginStory = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      flash("Fotozugriff benötigt");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, base64: true });
    if (res.canceled) return;
    const asset = res.assets[0];
    const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    setEditor({ uri, visibility: "public", caption: "", textColor: "#FFFFFF" });
  };

  const cycleEditorVisibility = () => {
    setEditor((e) => {
      if (!e) return e;
      const order = STORY_VIS.map((v) => v.key);
      const next = order[(order.indexOf(e.visibility) + 1) % order.length];
      Haptics.selectionAsync();
      return { ...e, visibility: next };
    });
  };

  const shareStory = async () => {
    if (!editor || storyBusy) return;
    setStoryBusy(true);
    try {
      const result = await api.addStory(editor.uri, editor.visibility, editor.caption.trim(), editor.textColor);
      if (!result.ok) {
        flash(result.explicit ? "Story abgelehnt: unangemessener Inhalt" : "Story abgelehnt");
        return;
      }
      setUser(result.user);
      setEditor(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flash("Story geteilt");
    } catch {
      flash("Upload fehlgeschlagen");
    } finally {
      setStoryBusy(false);
    }
  };

  const changeStoryVisibility = async (index: number, visibility: string) => {
    try {
      const updated = await api.setStoryVisibility(index, visibility);
      setUser(updated);
      setViewer((v) => (v ? { ...v, visibility } : v));
      Haptics.selectionAsync();
      flash(`Sichtbarkeit: ${storyVisLabel(visibility)}`);
    } catch {
      flash("Aktualisierung fehlgeschlagen");
    }
  };

  const removeStory = async (index: number) => {
    try {
      const updated = await api.deleteStory(index);
      setUser(updated);
      setViewer(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      flash("Story gelöscht");
    } catch {
      flash("Löschen fehlgeschlagen");
    }
  };

  // ---- Preset pickers (religion / hobby / job)
  const openPicker = (field: Picker["field"], title: string, options: string[]) => {
    Keyboard.dismiss();
    setCustomText("");
    setPicker({ field, title, options });
  };

  const applyOption = (val: string) => {
    if (!picker) return;
    if (picker.field === "religion") setReligion(val);
    if (picker.field === "hobby") setHobby(val);
    if (picker.field === "job") setJob(val);
    setPicker(null);
  };

  const skipDetails = () => {
    Keyboard.dismiss();
    setReligion("");
    setHobby("");
    setJob("");
    flash("Details zurückgesetzt");
  };

  const toggleInterest = (key: string) => {
    Haptics.selectionAsync();
    setInterest((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  };

  // ---- Photos
  const addPhoto = async () => {
    if (photos.length >= 6) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      flash("Fotozugriff benötigt");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [3, 4], quality: 0.6, base64: true });
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
        orientation,
        orientation_interest: interest,
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

  const SelectField = ({ icon, ph, value, field, title, options, testID }: any) => (
    <Pressable testID={testID} style={styles.field} onPress={() => openPicker(field, title, options)}>
      <Feather name={icon} size={18} color={colors.onSurfaceTertiary} />
      <Text style={[styles.input, { paddingTop: 16, color: value ? colors.onSurface : colors.onSurfaceTertiary }]}>
        {value || ph}
      </Text>
      <Feather name="chevron-down" size={18} color={colors.onSurfaceTertiary} />
    </Pressable>
  );

  const MenuCard = ({ icon, label, color, onPress, testID }: any) => (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.menuCard, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={[styles.menuIcon, { backgroundColor: color }]}>
        <Feather name={icon} size={18} color={colors.onBrandPrimary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Feather name="chevron-right" size={20} color={colors.onSurfaceTertiary} />
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.marshmallow} style={StyleSheet.absoluteFill} pointerEvents="none" />
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
          <RainbowAvatar uri={photos[0]} size={108} fallback={name || "S"} />
          <Text style={styles.identityName}>{name || "Dein Name"}{age ? `, ${age}` : ""}</Text>
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
          <Pressable testID="post-story" onPress={beginStory} style={styles.addStory}>
            {storyBusy && !editor ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Feather name="plus" size={26} color={colors.onBrandPrimary} />}
          </Pressable>
          {stories.map((s, i) => (
            <Pressable key={`${i}`} testID={`story-${i}`} onPress={() => setViewer({ url: s.url, index: i, visibility: s.visibility, caption: s.caption || "", textColor: s.text_color || "#FFFFFF" })} style={styles.storyCircle}>
              <Image source={{ uri: s.url }} style={styles.storyImg} contentFit="cover" />
              {!!s.caption && (
                <View style={styles.storyCaptionDot}><Feather name="type" size={9} color={colors.onBrandPrimary} /></View>
              )}
              <View style={styles.storyVisBadge}>
                <Feather name={storyVisIcon(s.visibility)} size={11} color={colors.onBrandPrimary} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.hint}>Tippe auf „+", wähle die Sichtbarkeit und gestalte deine Story mit Text – ganz wie bei Instagram.</Text>

        {/* Photos */}
        <Text style={styles.sectionLabel}>Meine Fotos</Text>
        <Text style={styles.hint}>{"Für Foto-Matching im „Entdecken\"-Tab. Tippe das ✕, um ein Foto zu löschen."}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map((p, i) => (
            <LinearGradient key={`${i}-${p.slice(-8)}`} colors={gradients.rainbowRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.photoFrame}>
              <View style={styles.photoWrap}>
                <Image source={{ uri: p }} style={styles.photo} contentFit="cover" />
                {i === 0 && (
                  <View style={styles.mainTag}><Text style={styles.mainTagText}>Hauptfoto</Text></View>
                )}
                <Pressable testID={`remove-photo-${i}`} onPress={() => removePhoto(i)} style={styles.removeBtn}>
                  <Feather name="x" size={14} color={colors.onBrandPrimary} />
                </Pressable>
              </View>
            </LinearGradient>
          ))}
          {photos.length < 6 && (
            <Pressable testID="add-photo" onPress={addPhoto} style={styles.addPhoto}>
              <Feather name="plus" size={26} color={colors.brandPrimary} />
              <Text style={styles.addPhotoText}>Foto</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* About */}
        <Text style={styles.sectionLabel}>Über mich</Text>
        <View style={styles.field}>
          <TextInput testID="profile-name" style={styles.input} placeholder="Name" placeholderTextColor={colors.onSurfaceTertiary} value={name} onChangeText={setName} />
        </View>
        <View style={[styles.field, { height: 96, alignItems: "flex-start", paddingTop: spacing.md }]}>
          <TextInput testID="profile-bio" style={[styles.input, { height: "100%" }]} placeholder="Erzähl etwas über dich…" placeholderTextColor={colors.onSurfaceTertiary} value={bio} onChangeText={setBio} multiline />
        </View>
        <View style={styles.field}>
          <Feather name="calendar" size={18} color={colors.onSurfaceTertiary} />
          <TextInput testID="profile-age" style={styles.input} placeholder="Alter" placeholderTextColor={colors.onSurfaceTertiary} value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, "").slice(0, 2))} keyboardType="number-pad" returnKeyType="done" blurOnSubmit onSubmitEditing={() => Keyboard.dismiss()} />
        </View>
        <Pressable testID="profile-country" style={styles.field} onPress={() => setShowCountry(true)}>
          <Feather name="map-pin" size={18} color={colors.onSurfaceTertiary} />
          <Text style={[styles.input, { color: country ? colors.onSurface : colors.onSurfaceTertiary, paddingTop: 16 }]}>
            {country ? countryLabel(country) : "Land auswählen"}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>

        {/* Optional details as quick-select presets */}
        <View style={styles.detailsHead}>
          <Text style={styles.sectionLabel}>Weitere Details (optional)</Text>
          <Pressable testID="skip-details" onPress={skipDetails} hitSlop={8}>
            <Text style={styles.skipText}>Zurücksetzen</Text>
          </Pressable>
        </View>
        <SelectField testID="profile-religion" icon="book-open" ph="Religion wählen" value={religion} field="religion" title="Religion" options={RELIGION_OPTIONS} />
        <SelectField testID="profile-hobby" icon="heart" ph="Hobby wählen" value={hobby} field="hobby" title="Hobby" options={HOBBY_OPTIONS} />
        <SelectField testID="profile-job" icon="briefcase" ph="Job wählen" value={job} field="job" title="Job" options={JOB_OPTIONS} />

        {/* Orientation (own) */}
        <Text style={styles.sectionLabel}>Orientierung</Text>
        <View style={styles.chipWrap}>
          {ORIENTATIONS.map((o) => {
            const active = orientation === o.key;
            return (
              <Pressable key={o.key} testID={`orientation-${o.key}`} onPress={() => { setOrientation(active ? "" : o.key); Haptics.selectionAsync(); }} style={[styles.chip, { borderColor: o.color }, active && { backgroundColor: o.color }]}>
                <View style={[styles.chipDot, { backgroundColor: active ? colors.onBrandPrimary : o.color }]} />
                <Text style={[styles.chipText, active && { color: colors.onBrandPrimary }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Orientation interest (filter) */}
        <Text style={styles.sectionLabel}>Ich suche nach</Text>
        <Text style={styles.hint}>Wähle Orientierungen, die dir im „Entdecken"-Tab angezeigt werden. Leer = alle.</Text>
        <View style={styles.chipWrap}>
          {ORIENTATIONS.map((o) => {
            const active = interest.includes(o.key);
            return (
              <Pressable key={o.key} testID={`interest-${o.key}`} onPress={() => toggleInterest(o.key)} style={[styles.chip, { borderColor: o.color }, active && { backgroundColor: o.color }]}>
                <Feather name={active ? "check" : "plus"} size={13} color={active ? colors.onBrandPrimary : o.color} />
                <Text style={[styles.chipText, active && { color: colors.onBrandPrimary }]}>{o.label}</Text>
              </Pressable>
            );
          })}
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

        <GummyButton testID="save-profile" label="Profil speichern" onPress={saveProfile} loading={saving} style={{ marginTop: spacing.md }} />

        {/* Creative menu */}
        <View style={styles.menuWrap}>
          <MenuCard testID="manage-subscription" icon="star" label="Abo verwalten" color={colors.brandPrimary} onPress={() => router.push("/subscribe")} />
          <MenuCard testID="open-settings-row" icon="shield" label="Sicherheit & Einstellungen" color={colors.accentCyan} onPress={() => router.push("/settings")} />
          {user?.is_admin && (
            <MenuCard testID="open-admin" icon="flag" label="Admin: Meldungen" color={colors.error} onPress={() => router.push("/admin")} />
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Country modal */}
      {showCountry && (
        <View style={StyleSheet.absoluteFill} testID="country-modal">
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCountry(false)} />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Land auswählen</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {COUNTRIES.filter((c) => c.code).map((c) => (
                <Pressable key={c.code} testID={`country-${c.code}`} onPress={() => { setCountry(c.code); setShowCountry(false); }} style={styles.optionRow}>
                  <Text style={styles.optionText}>{c.flag} {c.label}</Text>
                  {country === c.code && <Feather name="check" size={18} color={colors.brandPrimary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Preset picker (religion/hobby/job) */}
      {picker && (
        <View style={StyleSheet.absoluteFill} testID="option-picker">
          <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)} />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{picker.title} wählen</Text>
            <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
              <Pressable testID="option-clear" onPress={() => applyOption("")} style={styles.optionRow}>
                <Text style={[styles.optionText, { color: colors.onSurfaceTertiary }]}>— Keine Angabe —</Text>
              </Pressable>
              {picker.options.map((opt) => (
                <Pressable key={opt} testID={`option-${opt}`} onPress={() => applyOption(opt)} style={styles.optionRow}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.customRow}>
              <TextInput testID="option-custom-input" style={styles.customInput} placeholder="Eigene Angabe…" placeholderTextColor={colors.onSurfaceTertiary} value={customText} onChangeText={setCustomText} />
              <Pressable testID="option-custom-apply" onPress={() => customText.trim() && applyOption(customText.trim())} style={styles.customApply}>
                <Feather name="check" size={18} color={colors.onBrandPrimary} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Story editor (Instagram-style caption + color) */}
      {editor && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#140A0F" }]} testID="story-editor">
          <Image source={{ uri: editor.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable testID="story-editor-close" onPress={() => setEditor(null)} style={[styles.storyClose, { top: insets.top + spacing.md }]} hitSlop={12}>
              <Feather name="x" size={26} color="#FFFFFF" />
            </Pressable>
            <Pressable testID="story-vis-toggle" onPress={cycleEditorVisibility} style={[styles.visToggle, { top: insets.top + spacing.md }]} hitSlop={8}>
              <Feather name={storyVisIcon(editor.visibility)} size={15} color="#FFFFFF" />
              <Text style={styles.visToggleText}>{storyVisLabel(editor.visibility)}</Text>
            </Pressable>
            <View style={[styles.editorCenter]} pointerEvents="box-none">
              <TextInput
                testID="story-caption-input"
                style={[styles.captionInput, { color: editor.textColor }]}
                placeholder="Text hinzufügen…"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={editor.caption}
                onChangeText={(t) => setEditor((e) => (e ? { ...e, caption: t } : e))}
                multiline
                maxLength={120}
              />
            </View>
            <View style={[styles.editorBar, { bottom: insets.bottom + spacing.lg }]}>
              <View style={styles.colorRow}>
                {STORY_TEXT_COLORS.map((c) => (
                  <Pressable key={c} testID={`caption-color-${c}`} onPress={() => setEditor((e) => (e ? { ...e, textColor: c } : e))} style={[styles.colorDot, { backgroundColor: c }, editor.textColor === c && styles.colorDotActive]} />
                ))}
              </View>
              <GummyButton testID="story-share" label={storyBusy ? "" : "Story teilen"} loading={storyBusy} onPress={shareStory} height={52} />
            </View>
          </View>
        </View>
      )}

      {/* Story viewer */}
      {viewer && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1A0E14" }]} testID="story-viewer">
          <Image source={{ uri: viewer.url }} style={StyleSheet.absoluteFill} contentFit="contain" />
          {!!viewer.caption && (
            <View style={styles.viewerCaptionWrap} pointerEvents="none">
              <Text style={[styles.viewerCaption, { color: viewer.textColor }]}>{viewer.caption}</Text>
            </View>
          )}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable testID="story-viewer-close" onPress={() => setViewer(null)} style={[styles.storyClose, { top: insets.top + spacing.md }]} hitSlop={12}>
              <Feather name="x" size={26} color="#FFFFFF" />
            </Pressable>
            <Pressable testID="story-delete" onPress={() => removeStory(viewer.index)} style={[styles.storyDelete, { top: insets.top + spacing.md }]} hitSlop={12}>
              <Feather name="trash-2" size={20} color="#FFFFFF" />
            </Pressable>
            <View style={[styles.storyVisBar, { bottom: insets.bottom + spacing.xl }]}>
              <Text style={styles.storyVisTitle}>Sichtbarkeit</Text>
              <View style={styles.storyVisOptions}>
                {STORY_VIS.map((v) => {
                  const active = viewer.visibility === v.key;
                  return (
                    <Pressable key={v.key} testID={`story-vis-${v.key}`} onPress={() => changeStoryVisibility(viewer.index, v.key)} style={[styles.storyVisOpt, active && styles.storyVisOptActive]}>
                      <Feather name={storyVisIcon(v.key)} size={16} color={active ? colors.onBrandPrimary : "#FFFFFF"} />
                      <Text style={[styles.storyVisOptText, active && { color: colors.onBrandPrimary }]}>{v.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      )}

      {toast && (
        <View style={[styles.toast, { top: insets.top + 60, pointerEvents: "none" }]} testID="profile-toast">
          <Text style={styles.toastText}>{toast}</Text>
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
  identity: { alignItems: "center", gap: spacing.sm, marginVertical: spacing.md },
  identityName: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface },
  badgesRow: { flexDirection: "row", gap: spacing.sm },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(74,222,128,0.15)", paddingVertical: 5, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  verifiedText: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: colors.success },
  tierBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  tierText: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: colors.onBrandPrimary },
  sectionLabel: { fontFamily: fonts.displayBold, fontSize: fontScale.lg, color: colors.onSurface, marginTop: spacing.md },
  hint: { fontFamily: fonts.textRegular, fontSize: fontScale.sm, color: colors.onSurfaceTertiary, marginTop: -spacing.xs },
  storyRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  addStory: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  storyCircle: { width: 72, height: 72, borderRadius: radius.pill, overflow: "hidden", borderWidth: 2.5, borderColor: colors.brandPrimary },
  storyImg: { width: "100%", height: "100%" },
  storyCaptionDot: { position: "absolute", top: 4, left: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  storyVisBadge: { position: "absolute", bottom: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFFFFF" },
  photoRow: { gap: spacing.md, paddingVertical: spacing.xs },
  photoFrame: { width: 104, height: 136, borderRadius: radius.md + 3, padding: 3 },
  photoWrap: { flex: 1, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surfaceSecondary },
  photo: { width: "100%", height: "100%", backgroundColor: colors.surfaceTertiary },
  mainTag: { position: "absolute", bottom: 6, left: 6, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  mainTagText: { fontFamily: fonts.textBold, fontSize: 9, color: colors.onBrandPrimary },
  removeBtn: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  addPhoto: { width: 104, height: 136, borderRadius: radius.md, borderWidth: 2, borderColor: colors.brandPrimary, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.surfaceSecondary },
  addPhotoText: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: colors.brandPrimary },
  field: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, height: 54 },
  input: { flex: 1, fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: colors.onSurface, height: "100%" },
  detailsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skipText: { fontFamily: fonts.textBold, fontSize: fontScale.base, color: colors.brandPrimary },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1.5, backgroundColor: colors.surfaceSecondary },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontFamily: fonts.textMedium, fontSize: fontScale.base, color: colors.onSurface },
  prefRow: { flexDirection: "row", gap: spacing.sm },
  prefPill: { flex: 1, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  prefPillActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  prefText: { fontFamily: fonts.textMedium, fontSize: fontScale.base, color: colors.onSurfaceTertiary },
  prefTextActive: { color: colors.onBrandTertiary },
  menuWrap: { gap: spacing.sm, marginTop: spacing.lg },
  menuCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  menuIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFFFFF" },
  menuLabel: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(74,46,59,0.45)" },
  modalCard: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  modalHandle: { width: 44, height: 5, borderRadius: radius.pill, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.md },
  modalTitle: { fontFamily: fonts.displayBold, fontSize: fontScale.xl, color: colors.onSurface, marginBottom: spacing.sm },
  optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionText: { fontFamily: fonts.textMedium, fontSize: fontScale.lg, color: colors.onSurface },
  customRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  customInput: { flex: 1, height: 50, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, fontFamily: fonts.textRegular, fontSize: fontScale.lg, color: colors.onSurface },
  customApply: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  visIconWrap: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFFFFF" },
  visRowText: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  storyClose: { position: "absolute", right: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  storyDelete: { position: "absolute", left: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  visToggle: { position: "absolute", right: spacing.lg + 52, height: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)" },
  visToggleText: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: "#FFFFFF" },
  editorCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  captionInput: { fontFamily: fonts.displayBold, fontSize: 30, textAlign: "center", minWidth: 200, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  editorBar: { position: "absolute", left: spacing.lg, right: spacing.lg, gap: spacing.md },
  colorRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)" },
  colorDotActive: { borderColor: "#FFFFFF", transform: [{ scale: 1.2 }] },
  viewerCaptionWrap: { position: "absolute", left: spacing.xl, right: spacing.xl, top: "42%", alignItems: "center" },
  viewerCaption: { fontFamily: fonts.displayBold, fontSize: 30, textAlign: "center", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  storyVisBar: { position: "absolute", left: spacing.lg, right: spacing.lg, gap: spacing.sm },
  storyVisTitle: { fontFamily: fonts.textBold, fontSize: fontScale.sm, color: "rgba(255,255,255,0.85)", textAlign: "center" },
  storyVisOptions: { flexDirection: "row", gap: spacing.sm },
  storyVisOpt: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  storyVisOptActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  storyVisOptText: { fontFamily: fonts.textMedium, fontSize: fontScale.sm, color: "#FFFFFF" },
  toast: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(74,46,59,0.94)", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  toastText: { fontFamily: fonts.textMedium, fontSize: fontScale.base, color: colors.onSurfaceInverse },
});
