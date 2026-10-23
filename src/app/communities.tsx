import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { Mono, Press } from "@/components/ui";
import { isCity, type Community } from "@/data/community";
import type { Comune } from "@/data/types";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { normalize } from "@/services/community-search";
import { comuneLabel, searchComuni } from "@/services/comuni";
import { useApp } from "@/store/app-store";
import { comuneCommunity, previewCity, suggestedCommunity, syncCommunity, useCommunity } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// Find a city: any real Italian Comune (and territories like Alto Vicentino). Tap one to look at its
// map and what's happening, then join. A Comune nobody has started yet starts with you.

type Row = { key: string; title: string; detail: string; community?: Community; comune?: Comune; members?: number };

export default function FindCity() {
  const { C, T } = useTheme();
  const { t, language } = useI18n();
  const catalog = useCommunity((s) => s.catalog);
  const roles = useCommunity((s) => s.roles);
  const comune = useApp((s) => s.comune);
  const [q, setQ] = useState("");
  // Search results for one query at a time; anything else on screen is derived from them.
  const [result, setResult] = useState<{ q: string; found: Comune[]; offline: boolean }>({ q: "", found: [], offline: false });
  const name = q.trim();
  const current = result.q === name;
  const found = useMemo(() => (current ? result.found : []), [current, result.found]);
  const offline = current && result.offline;
  const loading = name.length >= 2 && !current;

  useEffect(() => {
    void syncCommunity();
  }, []);

  useEffect(() => {
    if (name.length < 2) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      searchComuni(name, ctrl.signal)
        .then((list) => setResult({ q: name, found: list, offline: false }))
        .catch(() => !ctrl.signal.aborted && setResult({ q: name, found: [], offline: true }));
    }, 300);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [name]);

  const cities = useMemo(() => catalog.filter(isCity), [catalog]);
  const rows = useMemo((): Row[] => {
    const n = normalize(q);
    const of = (c: Community): Row => ({ key: c.id, title: c.name, detail: c.area, community: c, members: c.memberCount });
    if (!n) {
      // Before typing: your Comune's city, then the ones people already started.
      const s = suggestedCommunity(comune, catalog);
      const first = s ? [s.exists ? of(s.community) : { key: s.community.id, title: s.community.name, detail: s.community.area, comune: comune! }] : [];
      return [...first, ...cities.filter((c) => c.id !== s?.community.id).map(of)];
    }
    const known = cities.filter((c) => normalize(`${c.name} ${c.comuni.join(" ")}`).includes(n)).map(of);
    const ids = new Set(known.map((r) => r.key));
    const fresh = found
      .filter((c) => !ids.has(comuneCommunity(c).id))
      .map((c): Row => {
        const existing = catalog.find((x) => x.id === comuneCommunity(c).id);
        return existing ? of(existing) : { key: comuneCommunity(c).id, title: c.name, detail: comuneLabel(c), comune: c };
      });
    return [...known, ...fresh];
  }, [q, found, cities, catalog, comune]);

  const openRow = (r: Row) => {
    const c = r.community ?? (r.comune ? previewCity(r.comune) : undefined);
    if (c) router.push({ pathname: "/community/[id]", params: { id: c.id } });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 36, gap: 16, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
      <Text style={T.display}>{t("community.findCity.title")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 16, height: 50 }}>
        <Icon name="search" size={16} color={C.mute} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("community.findCity.search")}
          placeholderTextColor={C.mute}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, fontFamily: F.regular, fontSize: 16, color: C.ink, height: 50 }}
          accessibilityLabel={t("community.findCity.search")}
        />
        {loading ? (
          <ActivityIndicator size="small" color={C.mute} />
        ) : (
          !!q && (
            <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("guide.clear")}>
              <Icon name="close" size={14} color={C.mute} />
            </Pressable>
          )
        )}
      </View>

      <View>
        {rows.map((r) => {
          const joined = r.community && roles[r.community.id];
          return (
            <Press
              key={r.key}
              scale={0.99}
              onPress={() => openRow(r)}
              accessibilityLabel={r.title}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
                <Icon name="map" size={19} color={C.forest} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.4, color: C.ink }}>
                  {r.title}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 13, color: C.mute }}>
                  {r.detail}
                  {r.members ? ` · ${t("community.members", { count: formatNumber(r.members, language) })}` : ""}
                </Text>
              </View>
              {joined ? <Mono color={C.leaf}>{t("community.joined")}</Mono> : !r.community && <Mono>{t("community.findCity.new")}</Mono>}
              <Icon name="chevron" size={14} color={C.faint} />
            </Press>
          );
        })}
        {!!q.trim() && !loading && rows.length === 0 && (
          <Text style={[T.callout, { paddingVertical: 12 }]}>{offline ? t("community.findCity.offline") : t("community.findCity.none", { q: q.trim() })}</Text>
        )}
      </View>
    </ScrollView>
  );
}
