import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { colors, spacing, radius, fonts, fontScale } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/context/AuthContext";
import { LollipopLoader } from "@/src/components/LollipopLoader";

type Msg = { id: string; sender: string; text: string; created_at: string };

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [partner, setPartner] = useState<{ name: string; photo?: string | null; verified?: boolean } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.matchDetail(id as string);
      setPartner(data.match.partner);
      setMessages(data.messages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setSending(true);
    const optimistic: Msg = { id: `tmp-${Date.now()}`, sender: user?.id || "me", text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await api.sendMatchMessage(id as string, text);
      setMessages((m) => {
        const base = m.filter((x) => x.id !== optimistic.id);
        const next = [...base, res.message];
        if (res.reply) next.push(res.reply);
        return next;
      });
    } catch {
      /* keep optimistic */
    } finally {
      setSending(false);
    }
  };

  const data = [...messages].reverse();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="chat-back" onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.onSurface} />
        </Pressable>
        {partner?.photo ? (
          <Image source={{ uri: partner.photo }} style={styles.headerAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
            <Text style={styles.headerAvatarText}>{(partner?.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerNameWrap}>
          <Text style={styles.headerName} numberOfLines={1}>
            {partner?.name || "…"}
          </Text>
          {partner?.verified && (
            <View style={styles.headerVerified}>
              <Feather name="check-circle" size={11} color={colors.success} />
              <Text style={styles.headerVerifiedText}>Verifiziert</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <LollipopLoader size={56} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <FlatList
            ref={listRef}
            data={data}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.empty}>Ihr habt gematcht! Schreib die erste Nachricht 💬</Text>
            }
            renderItem={({ item }) => {
              const mine = item.sender === user?.id;
              return (
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={mine ? styles.mineText : styles.theirsText}>{item.text}</Text>
                </View>
              );
            }}
          />
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
            <TextInput
              testID="dm-input"
              style={styles.input}
              placeholder="Nachricht…"
              placeholderTextColor={colors.onSurfaceTertiary}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <Pressable testID="dm-send" onPress={send} style={styles.sendBtn}>
              <Feather name="send" size={20} color={colors.onBrandPrimary} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: { padding: 2 },
  headerAvatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  headerAvatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  headerAvatarText: { fontFamily: fonts.displayBold, fontSize: fontScale.lg, color: colors.onBrandTertiary },
  headerNameWrap: { flex: 1 },
  headerName: { fontFamily: fonts.textBold, fontSize: fontScale.lg, color: colors.onSurface },
  headerVerified: { flexDirection: "row", alignItems: "center", gap: 3 },
  headerVerifiedText: { fontFamily: fonts.textMedium, fontSize: 11, color: colors.success },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  empty: {
    fontFamily: fonts.textRegular,
    fontSize: fontScale.base,
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    transform: [{ scaleY: -1 }],
    marginTop: spacing.xl,
  },
  bubble: { maxWidth: "78%", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md },
  mine: { alignSelf: "flex-end", backgroundColor: colors.brandPrimary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surfaceTertiary, borderBottomLeftRadius: 4 },
  mineText: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onBrandPrimary },
  theirsText: { fontFamily: fonts.textRegular, fontSize: fontScale.base, color: colors.onSurface },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    minHeight: 46,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.textRegular,
    fontSize: fontScale.lg,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
