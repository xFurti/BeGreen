import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { author, VERIFY_GOAL, VerifyBar } from "@/components/post-card";
import { ProofMedia } from "@/components/proof-media";
import { Avatar, Mono, Press, SdgTags, Tag } from "@/components/ui";
import { ACTIONS } from "@/data/actions";
import { SDGS } from "@/data/sdgs";
import { ME_ID } from "@/data/seed";
import { useAllPosts, useApp } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic, timeAgo } from "@/utils/format";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const post = useAllPosts().find((p) => p.id === id);
  const meName = useApp((s) => s.profile.name);
  const comment = useApp((s) => s.comment);
  const react = useApp((s) => s.react);
  const mine = useApp((s) => s.reacted[id]);
  const flagged = useApp((s) => !!s.flagged[id]);
  const flag = useApp((s) => s.flag);
  const [text, setText] = useState("");

  if (!post) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={T.body}>This BeGreen is gone.</Text>
      </View>
    );
  }

  const a = author(post.authorId, meName);
  const action = ACTIONS[post.action];
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
              {a.tag} · {post.place} · {timeAgo(post.createdAt)}
            </Mono>
          </View>
          {post.isDrop && <Tag label="DROP" solid />}
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
            <Icon name={action.icon} size={16} color={C.leaf} />
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 18, letterSpacing: -0.4 }}>{action.label}</Text>
          </View>
          {!!post.caption && (
            <Text selectable style={[T.body, { fontSize: 17, lineHeight: 25 }]}>
              {post.caption}
            </Text>
          )}
          <VerifyBar post={post} />
        </View>

        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 28, letterSpacing: -1.2 }}>
              ≈ {action.impact.value} <Text style={{ fontSize: 16, letterSpacing: -0.3 }}>{action.impact.unit}</Text>
            </Text>
            <Mono>estimate</Mono>
          </View>
          <Text style={[T.callout, { fontSize: 14, lineHeight: 20 }]}>{action.impact.note}</Text>
          <View style={{ gap: 6 }}>
            <SdgTags goals={action.sdgs} />
            <Text style={T.caption}>Moves {action.sdgs.map((g) => SDGS[g]).join(", ").toLowerCase()}.</Text>
          </View>
        </View>

        {post.verifiedBy.length > 0 && (
          <View style={{ gap: 12 }}>
            <Mono color={C.ink}>Verified by</Mono>
            <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              {post.verifiedBy.map((v) => {
                const u = author(v, meName);
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
          <Mono color={C.ink}>Comments · {post.comments.length}</Mono>
          {post.comments.length === 0 && <Text style={T.callout}>Be the first to hype this up.</Text>}
          {post.comments.map((c, i) => {
            const u = author(c.authorId, meName);
            return (
              <Animated.View key={c.id} entering={FadeInDown.delay(i * 40)} style={{ flexDirection: "row", gap: 10 }}>
                <Avatar src={u?.avatar} name={u?.name ?? "?"} size={30} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: F.semibold, fontSize: 14 }}>
                    {u?.name} <Text style={{ fontFamily: F.regular, color: C.mute }}>{timeAgo(c.createdAt)}</Text>
                  </Text>
                  <Text style={[T.body, { fontSize: 15, lineHeight: 21 }]}>{c.text}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {post.authorId !== ME_ID && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderColor: C.line, paddingTop: 16 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Mono color={C.ink}>Doesn’t look real?</Mono>
              <Text style={T.caption}>{flagged ? "Flagged on this device." : "A flag is saved on this device only."}</Text>
            </View>
            <Press
              disabled={flagged}
              hitSlop={6}
              accessibilityLabel={flagged ? "Proof flagged" : "Flag this proof"}
              onPress={() =>
                Alert.alert("Flag this proof?", "It will be marked on this device. This prototype has no moderators, and Seeds stay as they are.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Flag",
                    style: "destructive",
                    onPress: () => {
                      flag(post.id);
                      haptic.success();
                    },
                  },
                ])
              }
              style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 34, borderRadius: R.pill, borderWidth: 1, borderColor: C.mint2 }}
            >
              <Icon name={flagged ? "check" : "flag"} size={12} color={C.leaf} />
              <Text style={{ fontFamily: F.medium, fontSize: 13 }}>{flagged ? "Proof flagged" : "Flag proof"}</Text>
            </Press>
          </View>
        )}
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
          placeholder="Add a comment…"
          placeholderTextColor={C.mute}
          style={{ flex: 1, height: 44, borderRadius: R.pill, backgroundColor: C.card, paddingHorizontal: 16, fontSize: 15, fontFamily: F.regular, color: C.ink }}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <Pressable
          accessibilityLabel="Send comment"
          disabled={!text.trim()}
          onPress={send}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? C.forest : C.card, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="send" size={17} color={text.trim() ? C.lime : C.faint} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
