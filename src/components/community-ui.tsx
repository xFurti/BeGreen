import { Image } from "expo-image";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { CommunityMap } from "@/components/community-map";
import { Icon, type IconName } from "@/components/icon";
import { LoveYourCity } from "@/components/love-your-city";
import { PAST, pinColor } from "@/components/spot-pin";
import { AvatarStack, Bar, Button, Mono, Press, Tag } from "@/components/ui";
import {
  CATEGORIES,
  CHALLENGE_TEMPLATES,
  COMMUNITY_KIND_ICON,
  challengeProgress,
  dayKey,
  eventPhase,
  promptOf,
  type Community,
  type CommunityChallenge,
  type Spot,
  type SpotCategory,
} from "@/data/community";
import type { Post } from "@/data/types";
import type { MessageKey, Translator } from "@/i18n/catalog";
import { hasMessage } from "@/i18n/catalog";
import { actionCopy, placeLabel } from "@/i18n/content";
import { formatNumber, intlLocale, timeAgo } from "@/i18n/format";
import type { Language } from "@/i18n/schema";
import { useI18n } from "@/i18n/use-i18n";
import { useCommunity, useCommunitySpots } from "@/store/community-store";
import { useApp, useAuthor } from "@/store/app-store";
import { F, R, type Palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// ---------- text ----------

// Examples carry message keys instead of text, so they follow the app language.
export function spotText(t: Translator, s: Spot) {
  if (s.isExample && hasMessage(s.title) && hasMessage(s.body)) return { title: t(s.title as MessageKey), body: t(s.body as MessageKey) };
  return { title: s.title, body: s.body };
}

export function communityDescription(t: Translator, c: Community) {
  if (c.descriptionKey && hasMessage(c.descriptionKey)) return t(c.descriptionKey as MessageKey, { name: c.name });
  return c.description;
}

export function whenText(lang: Language, start: number, end?: number) {
  const loc = intlLocale(lang);
  const day = new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "short" }).format(start);
  const time = (t: number) => new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" }).format(t);
  if (!end) return `${day} · ${time(start)}`;
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
  return sameDay ? `${day} · ${time(start)}–${time(end)}` : `${day} ${time(start)} → ${new Intl.DateTimeFormat(loc, { day: "numeric", month: "short" }).format(end)}`;
}

export function dateText(lang: Language, t: number) {
  return new Intl.DateTimeFormat(intlLocale(lang), { day: "numeric", month: "short", year: "numeric" }).format(t);
}

export function challengeText(t: Translator, c: CommunityChallenge) {
  if (c.template) return { title: t(`community.templates.${c.template}.title`), body: t(`community.templates.${c.template}.body`), unit: t(`community.templates.${c.template}.unit`) };
  return { title: c.title, body: c.body, unit: t("community.challenges.contributions") };
}

// ---------- status ----------

type Status = { label: string; color: string; icon: IconName };

// What's true about a place right now. One badge, the most important first.
export function statusOf(t: Translator, s: Spot, lang: Language, C: Palette): Status | null {
  if (s.isExample) return { label: t("community.status.example"), color: C.mute, icon: "info" };
  if (s.hidden) return { label: t("community.status.hidden"), color: C.red, icon: "block" };
  if (s.kind === "event" && s.startsAt) {
    const phase = eventPhase(s);
    if (phase === "ended") return { label: t("community.status.ended"), color: PAST, icon: "calendar" };
    if (phase === "ongoing") return { label: t("community.status.ongoing"), color: CATEGORIES.events.color, icon: "calendar" };
    return { label: whenText(lang, s.startsAt, s.endsAt), color: CATEGORIES.events.color, icon: "calendar" };
  }
  if (s.status === "toVerify") return { label: t("community.status.toVerify"), color: C.amber, icon: "alert" };
  if (s.kind === "report") return s.status === "resolved" ? { label: t("community.status.resolved"), color: C.leaf, icon: "checkSeal" } : { label: t("community.status.open"), color: CATEGORIES.reports.color, icon: "alert" };
  if (s.kind === "challenge") return s.status === "done" ? { label: t("community.status.done"), color: C.leaf, icon: "checkSeal" } : { label: t("community.status.planned"), color: CATEGORIES.events.color, icon: "flag" };
  if (s.verifiedAt) return { label: t("community.status.verified"), color: C.leaf, icon: "checkSeal" };
  return { label: t("community.status.community"), color: C.mute, icon: "people" };
}

export function StatusBadge({ spot }: { spot: Spot }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const st = statusOf(t, spot, language, C);
  if (!st) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
      <Icon name={st.icon} size={11} color={st.color} />
      <Text numberOfLines={1} style={{ fontFamily: F.monoMedium, fontSize: 10.5, letterSpacing: 0.3, color: st.color, textTransform: "uppercase", flexShrink: 1 }}>
        {st.label}
      </Text>
    </View>
  );
}

export function CategoryTag({ category, muted }: { category: SpotCategory; muted?: boolean }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const c = CATEGORIES[category];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: muted ? PAST : c.color }} />
      <Text numberOfLines={1} style={{ fontFamily: F.monoMedium, fontSize: 10.5, letterSpacing: 0.3, color: C.ink2, textTransform: "uppercase" }}>
        {t(`community.categories.${category}`)}
      </Text>
    </View>
  );
}

// Filter chip in a layer's colour.
export function CategoryChip({ category, active, onPress }: { category: SpotCategory; active: boolean; onPress: () => void }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const c = CATEGORIES[category];
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={t(`community.categories.${category}`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: R.pill,
        backgroundColor: active ? c.color : C.white,
        borderWidth: 1,
        borderColor: active ? c.color : C.line,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <Icon name={c.icon} size={13} color={active ? C.white : c.color} />
      <Text style={{ fontFamily: F.medium, fontSize: 13.5, letterSpacing: -0.15, color: active ? C.white : C.ink }}>{t(`community.categories.${category}`)}</Text>
    </Press>
  );
}

// ---------- places ----------

export function SaveButton({ spot, dark }: { spot: Spot; dark?: boolean }) {
  const { C } = useTheme();
  const saved = useCommunity((s) => !!s.saved[spot.id]);
  const toggle = useCommunity((s) => s.toggleSave);
  const { t } = useI18n();
  return (
    <Press
      disabled={spot.isExample}
      onPress={() => {
        haptic.soft();
        toggle(spot.id);
      }}
      accessibilityLabel={saved ? t("community.spot.unsave") : t("community.spot.save")}
      style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32 }}
    >
      <Icon name={saved ? "bookmarkFill" : "bookmark"} size={16} color={saved ? C.leaf : dark ? C.white : C.ink2} />
      <Text style={{ fontFamily: F.medium, fontSize: 13, color: dark ? C.white : C.ink2, fontVariant: ["tabular-nums"] }}>
        {spot.saves > 0 ? spot.saves : saved ? t("community.spot.saved") : t("community.spot.saveShort")}
      </Text>
    </Press>
  );
}

export function LoveButton({ spot }: { spot: Spot }) {
  const { C } = useTheme();
  const mine = useCommunity((s) => s.reacted[spot.id]);
  const react = useCommunity((s) => s.react);
  const { t } = useI18n();
  const total = Object.values(spot.reactions).reduce((a, n) => a + n, 0);
  return (
    <Press
      disabled={spot.isExample}
      onPress={() => {
        haptic.soft();
        react(spot.id, "💚");
      }}
      accessibilityLabel={t("community.spot.love")}
      style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32 }}
    >
      <Text style={{ fontSize: 14, opacity: mine ? 1 : 0.55 }}>💚</Text>
      <Text style={{ fontFamily: F.medium, fontSize: 13, color: mine ? C.ink : C.ink2, fontVariant: ["tabular-nums"] }}>{total || t("community.spot.loveShort")}</Text>
    </Press>
  );
}

function Meta({ spot }: { spot: Spot }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const author = useAuthor();
  const who = spot.isExample ? t("community.examples.author") : author(spot.authorId).name;
  return (
    <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 12.5, color: C.mute }}>
      {who} · {timeAgo(spot.createdAt, language)}
      {spot.address ? ` · ${spot.address}` : ""}
    </Text>
  );
}

// A place or experience in the feed: what it is, where, and a way to the map.
export function SpotCard({ spot, index = 0 }: { spot: Spot; index?: number }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const { title, body } = spotText(t, spot);
  const ended = pinColor(spot) === PAST;
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 50).springify().damping(20)}
      style={{ borderRadius: R.xl, borderCurve: "continuous", borderWidth: 1, borderColor: spot.isExample ? C.faint : C.line, borderStyle: spot.isExample ? "dashed" : "solid", overflow: "hidden" }}
    >
      {/* The card opens the place; its actions sit outside the pressable, so buttons never nest. */}
      <Press scale={0.985} onPress={() => router.push({ pathname: "/spot/[id]", params: { id: spot.id } })} accessibilityLabel={title}>
        {spot.photo != null && <Image source={spot.photo} style={{ width: "100%", aspectRatio: 16 / 10, backgroundColor: C.card }} contentFit="cover" transition={150} />}
        <View style={{ padding: 16, paddingBottom: 6, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CategoryTag category={spot.category} muted={ended} />
            <View style={{ flex: 1 }} />
            <StatusBadge spot={spot} />
          </View>
          <Text style={{ fontFamily: F.medium, fontSize: 20, lineHeight: 24, letterSpacing: -0.6, color: C.ink }}>{title}</Text>
          {!!body && (
            <Text numberOfLines={3} style={T.callout}>
              {body}
            </Text>
          )}
          <Meta spot={spot} />
        </View>
      </Press>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 16, paddingBottom: 12 }}>
        <LoveButton spot={spot} />
        <SaveButton spot={spot} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="chatOutline" size={15} color={C.ink2} />
          <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{spot.comments.length}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {spot.lat != null && (
          <Press
            onPress={() => router.push({ pathname: "/map/[id]", params: { id: spot.communityId, spot: spot.id } })}
            accessibilityLabel={t("community.spot.onMap")}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32 }}
          >
            <Icon name="map" size={14} color={C.forest} />
            <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.forest }}>{t("community.spot.onMapShort")}</Text>
          </Press>
        )}
      </View>
    </Animated.View>
  );
}

// A compact row: lists, search results, saved places.
export function SpotRow({ spot, onPress, right }: { spot: Spot; onPress?: () => void; right?: React.ReactNode }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const { title } = spotText(t, spot);
  const c = CATEGORIES[spot.category];
  return (
    <Press
      scale={0.99}
      onPress={onPress ?? (() => router.push({ pathname: "/spot/[id]", params: { id: spot.id } }))}
      accessibilityLabel={title}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}
    >
      {spot.photo != null ? (
        <Image source={spot.photo} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: C.card }} contentFit="cover" />
      ) : (
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: spot.isExample ? C.card : `${pinColor(spot)}1A`, alignItems: "center", justifyContent: "center" }}>
          <Icon name={c.icon} size={19} color={pinColor(spot)} />
        </View>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: C.ink }}>
          {title}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <CategoryTag category={spot.category} />
          <StatusBadge spot={spot} />
        </View>
      </View>
      {right ?? <Icon name="chevron" size={14} color={C.faint} />}
    </Press>
  );
}

// A BeGreen proof taken in the community, in the community feed.
export function ProofRow({ post }: { post: Post }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  const author = useAuthor();
  const a = actionCopy(t, post.action);
  const spot = useCommunity((s) => (post.spotId ? s.spots.find((x) => x.id === post.spotId) : undefined));
  return (
    <Press
      scale={0.985}
      onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}
      accessibilityLabel={a.label}
      style={{ flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: C.card, borderRadius: R.lg, padding: 12 }}
    >
      <Image source={post.photo} style={{ width: 64, height: 80, borderRadius: 12, backgroundColor: C.card2 }} contentFit="cover" priority="low" />
      <View style={{ flex: 1, gap: 4 }}>
        <Mono color={C.leaf}>{t("community.feed.proof")}</Mono>
        <Text style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.4, color: C.ink }}>{a.label}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 12.5, color: C.mute }}>
          {author(post.authorId).name} · {timeAgo(post.createdAt, language)} · {spot ? spotText(t, spot).title : placeLabel(post.place, t)}
        </Text>
      </View>
      <Icon name="chevron" size={14} color={C.faint} />
    </Press>
  );
}

// ---------- community ----------

// The community's picture: the real map of its area, with the places people added.
export function CommunityCover({ community, height = 150, onPress, children }: { community: Community; height?: number; onPress?: () => void; children?: React.ReactNode }) {
  const { C } = useTheme();
  const { spots } = useCommunitySpots(community);
  const body = (
    <View style={{ height, borderRadius: R.xl, borderCurve: "continuous", overflow: "hidden", backgroundColor: C.card }}>
      <CommunityMap community={community} spots={spots} interactive={false} />
      <View pointerEvents="none" style={{ position: "absolute", left: 12, top: 12, backgroundColor: C.veil, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
        <LoveYourCity height={height >= 240 ? 30 : 22} />
      </View>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Press scale={0.985} onPress={onPress} accessibilityLabel={community.name}>
      {body}
    </Press>
  );
}

export function VisibilityNote({ community }: { community: Community }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const priv = community.visibility === "private";
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
      <Icon name={priv ? "lock" : "globe"} size={14} color={C.ink2} />
      <Text style={[T.caption, { flex: 1, color: C.ink2 }]}>{priv ? t("community.visibility.privateNote") : t("community.visibility.publicNote")}</Text>
    </View>
  );
}

export function CommunityRow({ community, right, onPress }: { community: Community; right?: React.ReactNode; onPress?: () => void }) {
  const { C } = useTheme();
  const { t, language } = useI18n();
  return (
    <Press
      scale={0.99}
      onPress={onPress ?? (() => router.push({ pathname: "/community/[id]", params: { id: community.id } }))}
      accessibilityLabel={community.name}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
        <Icon name={COMMUNITY_KIND_ICON[community.kind]} size={20} color={C.forest} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.4, color: C.ink }}>
          {community.name}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 12.5, color: C.mute }}>
          {t(`community.kinds2.${community.kind}`)} · {community.visibility === "private" ? t("community.visibility.private") : t("community.visibility.public")}
          {community.memberCount ? ` · ${t("community.members", { count: formatNumber(community.memberCount, language) })}` : ""}
        </Text>
      </View>
      {right ?? <Icon name="chevron" size={14} color={C.faint} />}
    </Press>
  );
}

// ---------- the daily prompt ----------

export function PromptCard({ community }: { community: Community }) {
  const { C } = useTheme();
  const { t } = useI18n();
  const prompt = promptOf();
  const today = dayKey();
  const all = useCommunity((s) => s.spots);
  const meId = useApp((s) => s.userId);
  const author = useAuthor();
  const answers = all.filter((s) => s.communityId === community.id && s.promptDay === today && !s.hidden);
  const answered = answers.some((s) => s.authorId === meId);
  return (
    <View style={{ backgroundColor: C.forest, borderRadius: R.xl, borderCurve: "continuous", padding: 18, gap: 14, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Mono color={C.lime} style={{ flex: 1 }}>
          {t("community.prompt.kicker")}
        </Mono>
        <Mono color={C.forestMute}>{t("community.prompt.optional")}</Mono>
      </View>
      <Text style={{ fontFamily: F.medium, fontSize: 26, lineHeight: 29, letterSpacing: -1, color: C.white }}>{t(`community.prompt.items.${prompt}`)}</Text>
      {answers.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {answers.slice(0, 4).map((a) => (
            <Press key={a.id} onPress={() => router.push({ pathname: "/spot/[id]", params: { id: a.id } })} accessibilityLabel={a.title} style={{ flex: 1, maxWidth: 80 }}>
              {a.photo != null ? (
                <Image source={a.photo} style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: C.forest2 }} contentFit="cover" />
              ) : (
                <View style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: C.forest2, padding: 8, justifyContent: "flex-end" }}>
                  <Text numberOfLines={3} style={{ fontFamily: F.regular, fontSize: 11, color: C.white }}>
                    {a.title}
                  </Text>
                </View>
              )}
              <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 11, color: C.forestMute, marginTop: 4 }}>
                {author(a.authorId).name}
              </Text>
            </Press>
          ))}
        </View>
      ) : (
        <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.forestMute }}>{t("community.prompt.empty")}</Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Button
          label={answered ? t("community.prompt.again") : t("community.prompt.answer")}
          kind="inverse"
          size="md"
          icon="camera"
          onPress={() => router.push({ pathname: "/add-spot", params: { community: community.id, kind: "moment", prompt: today } })}
          style={{ flex: 1 }}
        />
        <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 12, lineHeight: 16, color: C.forestMute }}>{t("community.prompt.noGuilt")}</Text>
      </View>
    </View>
  );
}

// ---------- challenges ----------

export function ChallengeCard({ challenge, index = 0 }: { challenge: CommunityChallenge; index?: number }) {
  const { C, T } = useTheme();
  const { t, language } = useI18n();
  const entries = useCommunity((s) => s.entries);
  const contribute = useCommunity((s) => s.contribute);
  const isMember = useCommunity((s) => !!s.roles[challenge.communityId]);
  const meId = useApp((s) => s.userId);
  const author = useAuthor();
  const p = challengeProgress(challenge, entries);
  const txt = challengeText(t, challenge);
  const icon = challenge.template ? CHALLENGE_TEMPLATES[challenge.template].icon : "flag";
  const mine = entries.filter((e) => e.challengeId === challenge.id && e.userId === meId).length;
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(20)} style={{ borderRadius: R.xl, borderCurve: "continuous", borderWidth: 1, borderColor: C.line, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name={icon} size={13} color={C.leaf} />
        <Mono style={{ flex: 1 }}>{p.open ? t("community.challenges.daysLeft", { days: p.daysLeft }) : t("community.challenges.ended", { date: dateText(language, challenge.endsAt) })}</Mono>
        {p.done && <Tag label={t("community.challenges.reached")} solid />}
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 21, lineHeight: 25, letterSpacing: -0.7, color: C.ink }}>{txt.title}</Text>
        {!!txt.body && <Text style={T.callout}>{txt.body}</Text>}
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 28, letterSpacing: -1, color: C.forest, fontVariant: ["tabular-nums"] }}>{p.count}</Text>
          <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 14, color: C.ink2 }}>
            / {challenge.goal} {txt.unit}
          </Text>
          <Mono color={C.ink}>{Math.round(p.pct * 100)}%</Mono>
        </View>
        <Bar value={p.pct} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AvatarStack people={p.contributors.slice(0, 4).map((c) => author(c.userId))} size={22} />
        <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 13, color: C.mute }}>
          {p.people === 0 ? t("community.challenges.nobodyYet") : p.people === 1 ? t("community.challenges.onePerson") : t("community.challenges.people", { count: p.people })}
          {mine ? ` · ${t("community.challenges.yours", { count: mine })}` : ""}
        </Text>
      </View>
      {p.open && isMember && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            label={t("community.challenges.addPlace")}
            size="md"
            kind="green"
            icon="pin"
            style={{ flex: 1 }}
            onPress={() =>
              router.push({
                pathname: "/add-spot",
                params: { community: challenge.communityId, challenge: challenge.id, ...(challenge.category ? { category: challenge.category } : {}) },
              })
            }
          />
          <Button
            label={t("community.challenges.didIt")}
            size="md"
            kind="secondary"
            icon="check"
            onPress={() => {
              haptic.success();
              contribute(challenge.id, {});
            }}
          />
        </View>
      )}
      {!p.open && (
        <Text style={T.caption}>
          {t("community.challenges.summary", { count: p.count, unit: txt.unit, people: p.people, places: p.places })}
        </Text>
      )}
    </Animated.View>
  );
}
