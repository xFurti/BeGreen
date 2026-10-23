import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { author, VERIFY_GOAL, VerifyBar } from "@/components/post-card";
import { ProofMedia } from "@/components/proof-media";
import { Avatar, Mono, SdgTags, Tag } from "@/components/ui";
import { actionCopy, placeLabel, sdgTitle, textOf } from "@/i18n/content";
import { formatNumber, timeAgo } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { useAllPosts, useApp } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const post = useAllPosts().find((p) => p.id === id);
  const meName = useApp((s) => s.profile.name);
  const comment = useApp((s) => s.comment);
  const react = useApp((s) => s.react);
  const mine = useApp((s) => s.reacted[id]);
  const [text, setText] = useState("");
  const { t, language } = useI18n();
  const you = t("common.you");

  if (!post) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={T.body}>{t("post.gone")}</Text>
      </View>
    );
  }

  const a = author(post.authorId, meName, you);
  const action = actionCopy(t, post.action);
  const caption = textOf(post.caption, post.captionKey, language);
  const send = () => {
    if (!text.trim()) return;
    comment(post.id, text.trim());
    setText("");
    haptic.soft();
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100} style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: a.name }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 30 }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar src={a.avatar} name={a.name} size={42} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 16, letterSpacing: -0.2 }}>{a.name}</Text>
            <Mono>
              {a.tag} · {placeLabel(post.place, t)} · {timeAgo(post.createdAt, language)}
            </Mono>
          </View>
          {post.isDrop && <Tag label={t("common.drop")} solid />}
        </View>

        <ProofMedia
          photo={post.photo}
          proof={post.proof}
          active
          verified={post.verifiedBy.length >= VERIFY_GOAL}
          onDoubleTap={() => {
            if (mine !== "💚") react(post.id, "💚");
          }}
        />

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name={action.icon} size={16} color={C.ink} />
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 18, letterSpacing: -0.4 }}>{action.label}</Text>
          </View>
          {!!caption && (
            <Text selectable style={[T.body, { fontSize: 17, lineHeight: 25 }]}>
              {caption}
            </Text>
          )}
          <VerifyBar post={post} />
        </View>

        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 28, letterSpacing: -1.2 }}>
              ≈ {formatNumber(action.impact.value, language)} <Text style={{ fontSize: 16, letterSpacing: -0.3 }}>{action.impact.unitLabel}</Text>
            </Text>
            <Mono>{t("common.estimate")}</Mono>
          </View>
          <Text style={[T.callout, { fontSize: 14, lineHeight: 20 }]}>{action.impact.note}</Text>
          <View style={{ gap: 6 }}>
            <SdgTags goals={action.sdgs} />
            <Text style={T.caption}>{t("post.moves", { goals: action.sdgs.map((g) => sdgTitle(t, g)).join(", ").toLowerCase() })}</Text>
          </View>
        </View>

        {post.verifiedBy.length > 0 && (
          <View style={{ gap: 12 }}>
            <Mono color={C.ink}>{t("post.verifiedByLabel")}</Mono>
            <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              {post.verifiedBy.map((v) => {
                const u = author(v, meName, you);
                return (
                  <View key={v} style={{ alignItems: "center", gap: 6 }}>
                    <Avatar src={u?.avatar} name={u?.name ?? "?"} size={42} />
                    <Text style={{ fontFamily: F.medium, fontSize: 12 }}>{u?.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ gap: 16, paddingTop: 4 }}>
          <Mono color={C.ink}>{t("post.commentsCount", { count: post.comments.length })}</Mono>
          {post.comments.length === 0 && <Text style={T.callout}>{t("post.firstComment")}</Text>}
          {post.comments.map((c, i) => {
            const u = author(c.authorId, meName, you);
            return (
              <Animated.View key={c.id} entering={FadeInDown.delay(i * 40)} style={{ flexDirection: "row", gap: 10 }}>
                <Avatar src={u?.avatar} name={u?.name ?? "?"} size={30} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: F.semibold, fontSize: 14 }}>
                    {u?.name} <Text style={{ fontFamily: F.regular, color: C.mute }}>{timeAgo(c.createdAt, language)}</Text>
                  </Text>
                  <Text style={[T.body, { fontSize: 15, lineHeight: 21 }]}>{textOf(c.text, c.textKey, language)}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <Pressable
          onPress={() =>
            Alert.alert(t("post.flagTitle"), t("post.flagBody"), [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("post.flagConfirm"), style: "destructive" },
            ])
          }
          style={{ alignSelf: "center", paddingTop: 8 }}
          accessibilityRole="button"
        >
          <Mono>{t("post.flag")}</Mono>
        </Pressable>
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: bottom + 10,
          borderTopWidth: 1,
          borderTopColor: C.line,
          backgroundColor: C.bg,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("post.commentPlaceholder")}
          placeholderTextColor={C.mute}
          style={{ flex: 1, height: 44, borderRadius: R.pill, backgroundColor: C.card, paddingHorizontal: 16, fontSize: 15, fontFamily: F.regular, color: C.ink }}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <Pressable
          accessibilityLabel={t("post.sendComment")}
          disabled={!text.trim()}
          onPress={send}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? C.ink : C.card, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="send" size={17} color={text.trim() ? C.white : C.faint} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
