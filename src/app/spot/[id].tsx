import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { CategoryTag, dateText, LoveButton, ProofRow, SaveButton, spotText, StatusBadge, whenText } from "@/components/community-ui";
import { Icon } from "@/components/icon";
import { REACTIONS } from "@/components/post-card";
import { Avatar, Button, Mono, Press, SectionHeader } from "@/components/ui";
import { eventPhase } from "@/data/community";
import { timeAgo } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { useApp, useAuthor } from "@/store/app-store";
import { NO_FLAGS, useCommunity, useCommunityById, useSpot } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { openDirections } from "@/utils/directions";
import { haptic } from "@/utils/format";

// The full card of a place or experience: photos, practical info, linked proofs, comments,
// and the tools that keep a shared map honest.
export default function SpotDetail() {
  const { C, T } = useTheme();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const spot = useSpot(id);
  const { t, language } = useI18n();
  const author = useAuthor();
  const meId = useApp((s) => s.userId);
  const posts = useApp((s) => s.posts);
  const community = useCommunityById(spot?.communityId);
  const role = useCommunity((s) => (spot ? s.roles[spot.communityId] : undefined));
  const going = useCommunity((s) => !!s.going[id]);
  const myFlags = useCommunity((s) => s.myFlags[id]) ?? NO_FLAGS;
  const blocked = useCommunity((s) => s.blocked);
  const reacted = useCommunity((s) => s.reacted[id]);
  const { toggleGoing, comment, react, editSpot, removeSpot, verify, hide, flag } = useCommunity.getState();
  const [text, setText] = useState("");

  if (!spot) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={T.body}>{t("community.spot.gone")}</Text>
      </View>
    );
  }

  const { title, body } = spotText(t, spot);
  const mine = spot.authorId === meId;
  const mod = role === "moderator";
  const member = !!role;
  const who = spot.isExample ? t("community.examples.author") : author(spot.authorId).name;
  const linked = posts.filter((p) => p.spotId === spot.id && !blocked.includes(p.authorId));
  const phase = eventPhase(spot);
  const comments = spot.comments.filter((c) => !blocked.includes(c.authorId));

  const send = () => {
    if (!text.trim()) return;
    comment(spot.id, text.trim());
    setText("");
    haptic.soft();
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90} style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: community?.name ?? "" }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 40, gap: 20 }} keyboardShouldPersistTaps="handled">
        {spot.photo != null && <Image source={spot.photo} style={{ width: "100%", aspectRatio: 4 / 3, backgroundColor: C.card }} contentFit="cover" transition={150} />}
        <View style={{ paddingHorizontal: 20, gap: 20 }}>
          {fresh && (
            <Animated.View entering={FadeInDown.springify().damping(18)} style={{ backgroundColor: C.forest, borderRadius: R.lg, padding: 16, flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Icon name="checkSeal" size={20} color={C.lime} />
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, color: C.white }}>{spot.pending ? t("community.spot.posting") : t("community.spot.posted")}</Text>
            </Animated.View>
          )}
          {spot.isExample && (
            <View style={{ backgroundColor: C.card, borderRadius: R.md, padding: 14, flexDirection: "row", gap: 10 }}>
              <Icon name="info" size={15} color={C.ink2} />
              <Text style={[T.callout, { flex: 1 }]}>{t("community.spot.exampleNote")}</Text>
            </View>
          )}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <CategoryTag category={spot.category} />
              <View style={{ flex: 1 }} />
              <StatusBadge spot={spot} />
            </View>
            <Text style={T.hero}>{title}</Text>
            {!!body && <Text style={T.body}>{body}</Text>}
          </View>

          {/* Trust: who said so, and how fresh it is. */}
          <View style={{ backgroundColor: C.card, borderRadius: R.md, padding: 14, gap: 8 }}>
            <Press
              disabled={spot.isExample}
              onPress={() => router.push({ pathname: "/member/[id]", params: { id: spot.authorId, community: spot.communityId } })}
              accessibilityLabel={who}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Avatar name={who} size={30} />
              <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 14, color: C.ink2 }}>{t("community.spot.addedOn", { name: who, date: dateText(language, spot.createdAt) })}</Text>
            </Press>
            {spot.updatedAt - spot.createdAt > 60e3 && <Text style={T.caption}>{t("community.spot.updated", { date: dateText(language, spot.updatedAt) })}</Text>}
            <Text style={[T.caption, { color: spot.verifiedAt ? C.leaf : spot.status === "toVerify" ? C.amber : C.mute }]}>
              {spot.verifiedAt
                ? t("community.spot.verifiedOn", { date: dateText(language, spot.verifiedAt) })
                : spot.status === "toVerify"
                  ? t("community.spot.toVerifyNote")
                  : t("community.spot.unverified")}
            </Text>
          </View>

          {spot.kind === "event" && spot.startsAt && (
            <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="calendar" size={15} color={C.ink} />
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink }}>{whenText(language, spot.startsAt, spot.endsAt)}</Text>
              </View>
              <Text style={T.caption}>{phase === "ended" ? t("community.spot.eventEnded") : t("community.spot.goingCount", { count: spot.going })}</Text>
              {phase !== "ended" && member && !spot.isExample && (
                <Button label={going ? t("community.spot.going") : t("community.spot.join")} kind={going ? "secondary" : "green"} icon={going ? "check" : "plus"} size="md" onPress={() => toggleGoing(spot.id)} />
              )}
            </View>
          )}

          {(spot.address || spot.lat != null) && (
            <View style={{ gap: 10 }}>
              {!!spot.address && (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <Icon name="pin" size={15} color={C.ink2} />
                  <Text style={[T.callout, { flex: 1 }]}>{spot.address}</Text>
                </View>
              )}
              {spot.lat != null && !spot.precise && <Text style={T.caption}>{t("community.spot.approxNote")}</Text>}
              {spot.lat != null && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button label={t("community.spot.onMapShort")} icon="map" size="md" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/map/[id]", params: { id: spot.communityId, spot: spot.id } })} />
                  {!spot.isExample && <Button label={t("community.spot.directions")} icon="directions" size="md" kind="ghost" onPress={() => openDirections(spot.lat!, spot.lon!, spot.address || title)} />}
                </View>
              )}
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <LoveButton spot={spot} />
            <SaveButton spot={spot} />
            <View style={{ flex: 1 }} />
            {!spot.isExample && (
              <Press onPress={() => Share.share({ message: t("community.spot.shareText", { title, name: community?.name ?? "" }) })} accessibilityLabel={t("common.share")} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="share" size={15} color={C.ink2} />
                <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{t("common.share")}</Text>
              </Press>
            )}
          </View>
          {!spot.isExample && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              {REACTIONS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    haptic.tap();
                    react(spot.id, e);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("post.reactEmoji", { emoji: e })}
                  style={{ paddingHorizontal: 10, height: 34, borderRadius: R.pill, backgroundColor: reacted === e ? C.mint2 : C.card, flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text style={{ fontSize: 15 }}>{e}</Text>
                  {!!spot.reactions[e] && <Text style={{ fontFamily: F.monoMedium, fontSize: 11, color: C.ink2 }}>{spot.reactions[e]}</Text>}
                </Pressable>
              ))}
            </View>
          )}

          {/* The map and the feed work together: proofs taken here. */}
          {!spot.isExample && (
            <View style={{ gap: 12 }}>
              <SectionHeader title={t("community.spot.proofs")} action={linked.length ? String(linked.length) : undefined} />
              {linked.map((p) => (
                <ProofRow key={p.id} post={p} />
              ))}
              {linked.length === 0 && <Text style={T.caption}>{t("community.spot.noProofs")}</Text>}
              <Button label={t("community.spot.addProof")} icon="camera" size="md" kind="ghost" onPress={() => router.push({ pathname: "/capture", params: { spot: spot.id } })} />
            </View>
          )}

          {!spot.isExample && (
            <View style={{ gap: 12 }}>
              <SectionHeader title={t("post.commentsCount", { count: comments.length })} />
              {comments.map((c) => {
                const a = author(c.authorId);
                return (
                  <View key={c.id} style={{ flexDirection: "row", gap: 10 }}>
                    <Avatar name={a.name} size={30} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>
                        {a.name} <Text style={{ fontFamily: F.regular, color: C.mute }}>· {timeAgo(c.createdAt, language)}</Text>
                      </Text>
                      <Text style={T.callout}>{c.text}</Text>
                    </View>
                  </View>
                );
              })}
              {member && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderRadius: R.pill, paddingLeft: 16, padding: 4 }}>
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    onSubmitEditing={send}
                    placeholder={t("community.spot.commentPh")}
                    placeholderTextColor={C.mute}
                    maxLength={500}
                    style={{ flex: 1, height: 42, fontFamily: F.regular, fontSize: 15, color: C.ink }}
                    accessibilityLabel={t("community.spot.commentPh")}
                  />
                  <Press onPress={send} disabled={!text.trim()} accessibilityLabel={t("post.sendComment")} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="send" size={15} color={C.lime} />
                  </Press>
                </View>
              )}
            </View>
          )}

          {/* Keeping it right */}
          {!spot.isExample && (
            <View style={{ gap: 10, paddingTop: 6 }}>
              <Mono>{t("community.spot.keepRight")}</Mono>
              {mine && spot.kind === "report" && spot.status !== "resolved" && (
                <Button label={t("community.spot.markResolved")} icon="checkSeal" size="md" kind="secondary" onPress={() => editSpot(spot.id, { status: "resolved" })} />
              )}
              {mine && spot.kind === "challenge" && spot.status !== "done" && (
                <Button label={t("community.spot.markDone")} icon="checkSeal" size="md" kind="secondary" onPress={() => editSpot(spot.id, { status: "done" })} />
              )}
              {mine && spot.status === "toVerify" && <Button label={t("community.spot.stillValid")} icon="check" size="md" kind="secondary" onPress={() => editSpot(spot.id, {})} />}
              {!mine && member && spot.kind === "report" && spot.status !== "resolved" && (
                <Button
                  label={myFlags.includes("resolved") ? t("community.spot.resolvedSent") : t("community.spot.seemsResolved")}
                  icon="checkSeal"
                  size="md"
                  kind="secondary"
                  disabled={myFlags.includes("resolved")}
                  onPress={() => {
                    flag(spot.id, "resolved", "");
                    haptic.success();
                  }}
                />
              )}
              {!mine && member && (
                <Button label={t("community.spot.report")} icon="flag" size="md" kind="ghost" onPress={() => router.push({ pathname: "/flag-spot", params: { id: spot.id } })} />
              )}
              {mod && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {!spot.verifiedAt && <Button label={t("community.spot.verify")} icon="shield" size="md" kind="green" style={{ flex: 1 }} onPress={() => verify(spot.id)} />}
                  <Button label={spot.hidden ? t("community.spot.unhide") : t("community.spot.hide")} icon="block" size="md" kind="ghost" onPress={() => hide(spot.id, !spot.hidden)} />
                </View>
              )}
              {(mine || mod) && (
                <Button
                  label={t("community.spot.delete")}
                  size="md"
                  kind="ghost"
                  onPress={() =>
                    Alert.alert(t("community.spot.deleteTitle"), t("community.spot.deleteBody"), [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("community.spot.delete"),
                        style: "destructive",
                        onPress: () => {
                          removeSpot(spot.id);
                          router.back();
                        },
                      },
                    ])
                  }
                />
              )}
              <Text style={T.caption}>{t("community.spot.trustNote")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
