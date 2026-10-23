import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown } from "react-native-reanimated";

import { CommunityMap, type MapHandle } from "@/components/community-map";
import { CategoryChip, CategoryTag, LoveButton, SaveButton, spotText, StatusBadge } from "@/components/community-ui";
import { Icon, type IconName } from "@/components/icon";
import { LoveHeart } from "@/components/love-your-city";
import { PAST } from "@/components/spot-pin";
import { Button, Mono, Press } from "@/components/ui";
import { CATEGORIES, CATEGORY_LIST, type Community, type Spot } from "@/data/community";
import type { MessageKey } from "@/i18n/catalog";
import { timeAgo } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { requestMyLocation, useMyLocation } from "@/hooks/use-my-location";
import { useNow } from "@/hooks/use-now";
import { activeFilterCount, applyFilters, searchSpots, type MapFilters } from "@/services/community-search";
import { distanceKm } from "@/services/geo";
import { searchPlaces, type PlaceHit } from "@/services/places";
import { useAuthor } from "@/store/app-store";
import { useCommunity, useCommunitySpots, useFriendIds } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { openDirections } from "@/utils/directions";

// The community map as a screen: search, layers, filters, a legend, and a card for the place you tap.

function Summary({ spot, onClose }: { spot: Spot; onClose: () => void }) {
  const { C, T } = useTheme();
  const { t, language } = useI18n();
  const author = useAuthor();
  const { title, body } = spotText(t, spot);
  const who = spot.isExample ? t("community.examples.author") : author(spot.authorId).name;
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20)}
      exiting={FadeOut.duration(150)}
      style={{ backgroundColor: C.bg, borderRadius: R.xl, borderCurve: "continuous", padding: 16, gap: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        {spot.photo != null && <Image source={spot.photo} style={{ width: 84, height: 84, borderRadius: 14, backgroundColor: C.card }} contentFit="cover" />}
        <View style={{ flex: 1, gap: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CategoryTag category={spot.category} />
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("common.close")}>
              <Icon name="close" size={16} color={C.mute} />
            </Pressable>
          </View>
          <Text numberOfLines={2} style={{ fontFamily: F.medium, fontSize: 19, lineHeight: 23, letterSpacing: -0.5, color: C.ink }}>
            {title}
          </Text>
          <StatusBadge spot={spot} />
        </View>
      </View>
      {!!body && (
        <Text numberOfLines={2} style={T.callout}>
          {body}
        </Text>
      )}
      <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 12.5, color: C.mute }}>
        {t("community.spot.addedBy", { name: who, time: timeAgo(spot.createdAt, language) })}
        {!spot.precise ? ` · ${t("community.spot.approx")}` : ""}
      </Text>
      {!!spot.address && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="pin" size={13} color={C.ink2} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.regular, fontSize: 13.5, color: C.ink2 }}>
            {spot.address}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <LoveButton spot={spot} />
        <SaveButton spot={spot} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="chatOutline" size={15} color={C.ink2} />
          <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.ink2 }}>{spot.comments.length}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {spot.lat != null && !spot.isExample && (
          <Press
            onPress={() => openDirections(spot.lat!, spot.lon!, spot.address || title)}
            accessibilityLabel={t("community.spot.directions")}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="directions" size={16} color={C.forest} />
          </Press>
        )}
      </View>
      <Button label={t("community.spot.open")} size="md" onPress={() => router.push({ pathname: "/spot/[id]", params: { id: spot.id } })} />
    </Animated.View>
  );
}

function Toggle({ label, hint, value, onChange, icon }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; icon: IconName }) {
  const { C, T } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <Icon name={icon} size={17} color={C.forest} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 15.5, color: C.ink }}>{label}</Text>
        {hint && <Text style={T.caption}>{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.leaf, false: C.card2 }} />
    </View>
  );
}

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: C.scrim }} onPress={onClose} accessibilityLabel={t("common.close")} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, gap: 6, maxHeight: "82%" }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Text style={[T.title, { flex: 1 }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("common.close")}>
            <Icon name="close" size={18} color={C.ink} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function MapScreen({
  community,
  initialSpotId,
  top,
  bottom,
  onBack,
  canAdd,
}: {
  community: Community;
  initialSpotId?: string;
  top: number;
  bottom: number;
  onBack?: () => void;
  canAdd: boolean;
}) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const { ref: keyboardRoot, cover } = useKeyboardCover();
  const map = useRef<MapHandle>(null);
  const filters = useCommunity((s) => s.filters);
  const setFilters = useCommunity((s) => s.setFilters);
  const friendIds = useFriendIds();
  const { loc, status: locStatus } = useMyLocation();
  const { spots: all, real } = useCommunitySpots(community);
  const [selected, setSelected] = useState<string | null>(initialSpotId ?? null);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<"filters" | "legend" | null>(null);
  const [locNote, setLocNote] = useState(false);
  const author = useAuthor();
  const [placeHits, setPlaceHits] = useState<{ q: string; hits: PlaceHit[] }>({ q: "", hits: [] });

  const now = useNow();
  const ctx = useMemo(() => ({ now, friendIds, me: loc }), [now, friendIds, loc]);
  const visible = useMemo(() => applyFilters(all, filters, ctx), [all, filters, ctx]);
  const results = useMemo(
    () => (query.trim() ? searchSpots(all, query, ctx, (s) => `${spotText(t, s).title} ${spotText(t, s).body} ${s.address} ${t(`community.categories.${s.category}`)} ${author(s.authorId).name}`) : []),
    [all, query, ctx, t, author],
  );

  // Real streets and places in the area, next to BeGreen's own. Debounced; offline just finds nothing.
  const places = placeHits.q === query.trim() ? placeHits.hits : [];
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      searchPlaces(q, community.bbox, loc, ctrl.signal)
        .then((hits) => setPlaceHits({ q, hits }))
        .catch(() => setPlaceHits({ q, hits: [] }));
    }, 350);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [query, community.bbox, loc]);
  const spot = all.find((s) => s.id === selected);

  // Open on a given place.
  useEffect(() => {
    if (!initialSpotId) return;
    const s = all.find((x) => x.id === initialSpotId);
    if (s?.lat != null) setTimeout(() => map.current?.focus({ lat: s.lat!, lon: s.lon! }, 3), 350);
    // Only when arriving with a place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpotId]);

  const select = (s: Spot) => {
    setSelected(s.id);
    setQuery("");
    if (s.lat != null) map.current?.focus({ lat: s.lat, lon: s.lon! });
  };

  const locate = async () => {
    const p = await requestMyLocation();
    if (!p) {
      setLocNote(true);
      return;
    }
    map.current?.focus(p, 3);
  };

  const count = activeFilterCount(filters);
  const toggleCat = (c: (typeof CATEGORY_LIST)[number]) =>
    setFilters({ categories: filters.categories.includes(c) ? filters.categories.filter((x) => x !== c) : [...filters.categories, c] });
  const headerH = 118;

  const quickNear = async (km: number | null) => {
    if (km == null) return setFilters({ nearKm: null });
    const p = await requestMyLocation();
    if (!p) {
      setLocNote(true);
      return;
    }
    setFilters({ nearKm: km });
  };

  const toggles: { key: keyof MapFilters; label: MessageKey; hint?: MessageKey; icon: IconName }[] = [
    { key: "upcoming", label: "community.filters.upcoming", icon: "calendar" },
    { key: "popular", label: "community.filters.popular", icon: "bookmarkFill" },
    { key: "fresh", label: "community.filters.fresh", icon: "sparkle" },
    { key: "openReports", label: "community.filters.openReports", icon: "alert" },
    { key: "friends", label: "community.filters.friends", hint: "community.filters.friendsHint", icon: "people" },
    { key: "family", label: "community.filters.family", hint: "community.filters.familyHint", icon: "family" },
  ];

  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1 }}>
      <CommunityMap
        ref={map}
        community={community}
        spots={visible}
        selectedId={selected}
        onSelect={select}
        me={loc}
        insets={{ top: top + headerH, bottom: bottom + (spot ? 270 : 66) }}
      />

      {/* Search and layers */}
      <View style={{ position: "absolute", left: 0, right: 0, top: top + 8, gap: 8 }} pointerEvents="box-none">
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12 }}>
          {onBack && (
            <Press onPress={onBack} accessibilityLabel={t("community.map.back")} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}>
              <Icon name="back" size={18} color={C.ink} />
            </Press>
          )}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 23, backgroundColor: C.bg, paddingHorizontal: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}>
            <Icon name="search" size={16} color={C.mute} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("community.map.search")}
              placeholderTextColor={C.mute}
              returnKeyType="search"
              style={{ flex: 1, fontFamily: F.regular, fontSize: 15, color: C.ink, height: 46 }}
              accessibilityLabel={t("community.map.searchA11y")}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("guide.clear")}>
                <Icon name="close" size={14} color={C.mute} />
              </Pressable>
            )}
          </View>
          <Press onPress={() => setSheet("filters")} accessibilityLabel={t("community.filters.title")} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: count ? C.forest : C.card, alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}>
            <Icon name="filter" size={17} color={count ? C.lime : C.ink} />
            {count > 0 && (
              <View style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.monoMedium, fontSize: 10, color: C.forest }}>{count}</Text>
              </View>
            )}
          </Press>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Press
            onPress={() => setSheet("legend")}
            accessibilityLabel={t("community.legend.title")}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
          >
            <Icon name="layers" size={13} color={C.ink} />
            <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: C.ink }}>{t("community.legend.short")}</Text>
          </Press>
          {CATEGORY_LIST.map((c) => (
            <CategoryChip key={c} category={c} active={filters.categories.includes(c)} onPress={() => toggleCat(c)} />
          ))}
        </ScrollView>

        {/* Search results */}
        {!!query.trim() && (
          <Animated.View
            entering={FadeInDown.duration(160)}
            style={{
              marginHorizontal: 12,
              backgroundColor: C.bg,
              borderRadius: R.lg,
              padding: 6,
              maxHeight: cover > 0 ? 220 : 330,
              boxShadow: "0 6px 24px rgba(0,0,0,0.16)",
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={process.env.EXPO_OS === "android"}>
              {places.map((pl) => (
                <Pressable
                  key={pl.id}
                  onPress={() => {
                    setQuery("");
                    map.current?.focus({ lat: pl.lat, lon: pl.lon }, 4);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}
                  accessibilityRole="button"
                >
                  <Icon name="pin" size={15} color={C.ink2} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, color: C.ink }}>
                      {pl.name}
                    </Text>
                    {!!pl.detail && (
                      <Text numberOfLines={1} style={T.caption}>
                        {pl.detail}
                      </Text>
                    )}
                  </View>
                  <Mono>{t("community.map.area")}</Mono>
                </Pressable>
              ))}
              {results.slice(0, 8).map((s) => (
                <Pressable key={s.id} onPress={() => select(s)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }} accessibilityRole="button">
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CATEGORIES[s.category].color }} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, color: C.ink }}>
                      {spotText(t, s).title}
                    </Text>
                    <Text numberOfLines={1} style={T.caption}>
                      {t(`community.categories.${s.category}`)}
                      {loc && s.lat != null ? ` · ${t("common.km", { km: distanceKm(loc, { lat: s.lat, lon: s.lon! }).toFixed(1) })}` : ""}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {!places.length && !results.length && (
                <View style={{ padding: 12, gap: 4 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.ink }}>{t("community.map.noResults")}</Text>
                  <Text style={T.caption}>{t("community.map.searchHint")}</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        )}

        {!query.trim() && (real === 0 || locNote || (filters.nearKm != null && !loc)) && (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 12, backgroundColor: C.veil, borderRadius: R.md, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
            <LoveHeart size={18} />
            <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.ink2 }}>
              {locNote || (filters.nearKm != null && !loc)
                ? locStatus === "denied"
                  ? t("community.map.locDenied")
                  : t("community.map.locUnavailable")
                : t("community.map.empty")}
            </Text>
            {locNote && (
              <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={() => setLocNote(false)}>
                <Mono color={C.forest}>{t("common.close")}</Mono>
              </Pressable>
            )}
          </Animated.View>
        )}
      </View>

      {/* The place you tapped, or the actions */}
      <View style={{ position: "absolute", left: 12, right: 12, bottom: bottom + 12 }} pointerEvents="box-none">
        {spot ? (
          <Summary spot={spot} onClose={() => setSelected(null)} />
        ) : (
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }} pointerEvents="box-none">
            <Press onPress={locate} accessibilityLabel={t("community.map.locate")} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}>
              <Icon name="locate" size={18} color={loc ? C.blue : C.ink} />
            </Press>
            {canAdd && (
              <Button
                label={t("community.add.cta")}
                icon="plus"
                kind="green"
                size="md"
                onPress={() => router.push({ pathname: "/add-spot", params: { community: community.id } })}
                style={{ boxShadow: "0 4px 14px rgba(11,61,42,0.35)" }}
              />
            )}
          </View>
        )}
      </View>

      <Sheet visible={sheet === "filters"} onClose={() => setSheet(null)} title={t("community.filters.title")}>
        <Mono style={{ marginTop: 6, marginBottom: 8 }}>{t("community.filters.layers")}</Mono>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {CATEGORY_LIST.map((c) => (
            <CategoryChip key={c} category={c} active={filters.categories.includes(c)} onPress={() => toggleCat(c)} />
          ))}
        </View>
        <Mono style={{ marginTop: 18, marginBottom: 8 }}>{t("community.filters.distance")}</Mono>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {[null, 1, 3, 10].map((km) => {
            const on = filters.nearKm === km;
            return (
              <Press
                key={String(km)}
                onPress={() => quickNear(km)}
                accessibilityLabel={km == null ? t("community.filters.anywhere") : t("community.filters.within", { km })}
                style={{ height: 34, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: on ? C.forest : C.card, justifyContent: "center" }}
              >
                <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: on ? C.white : C.ink }}>
                  {km == null ? t("community.filters.anywhere") : t("community.filters.within", { km })}
                </Text>
              </Press>
            );
          })}
        </View>
        <Text style={[T.caption, { marginTop: 6 }]}>{t("community.filters.distanceHint")}</Text>
        <Mono style={{ marginTop: 18 }}>{t("community.filters.show")}</Mono>
        {toggles.map((x) => (
          <Toggle key={x.key} icon={x.icon} label={t(x.label)} hint={x.hint ? t(x.hint) : undefined} value={!!filters[x.key]} onChange={(v) => setFilters({ [x.key]: v })} />
        ))}
        <Button
          label={t("community.filters.reset")}
          kind="ghost"
          size="md"
          style={{ marginTop: 16 }}
          onPress={() => setFilters({ categories: [], upcoming: false, popular: false, fresh: false, openReports: false, friends: false, family: false, nearKm: null })}
        />
        <Text style={[T.caption, { textAlign: "center", marginTop: 10 }]}>{t("community.filters.showing", { count: visible.length })}</Text>
      </Sheet>

      <Sheet visible={sheet === "legend"} onClose={() => setSheet(null)} title={t("community.legend.title")}>
        {CATEGORY_LIST.map((c) => (
          <View key={c} style={{ flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, alignItems: "center" }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: CATEGORIES[c].color, alignItems: "center", justifyContent: "center" }}>
              <Icon name={CATEGORIES[c].icon} size={15} color={C.white} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 15.5, color: C.ink }}>{t(`community.categories.${c}`)}</Text>
              <Text style={T.caption}>{t(`community.categoryHints.${c}`)}</Text>
            </View>
          </View>
        ))}
        <Mono style={{ marginTop: 18, marginBottom: 6 }}>{t("community.legend.trust")}</Mono>
        {(
          [
            { swatch: <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.leaf, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={9} color={C.onLeaf} /></View>, label: "community.legend.verified" },
            { swatch: <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: CATEGORIES.discover.color }} />, label: "community.legend.community" },
            { swatch: <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: PAST }} />, label: "community.legend.past" },
            { swatch: <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.forest }} />, label: "community.legend.cluster" },
          ] as { swatch: React.ReactNode; label: MessageKey }[]
        ).map((x) => (
          <View key={x.label} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8 }}>
            <View style={{ width: 34, alignItems: "center" }}>{x.swatch}</View>
            <Text style={[T.callout, { flex: 1 }]}>{t(x.label)}</Text>
          </View>
        ))}
        <Text style={[T.caption, { marginTop: 12 }]}>{t("community.legend.base")}</Text>
        <Text style={[T.caption, { marginTop: 6 }]}>{t("community.legend.privacy")}</Text>
      </Sheet>
    </View>
  );
}
