import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { Icon } from "@/components/icon";
import { Button, Mono, Press } from "@/components/ui";
import type { Comune } from "@/data/types";
import { comuneNearMe, searchComuni } from "@/services/comuni";
import { useApp } from "@/store/app-store";
import { F } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export default function ComunePicker() {
  const { C, T } = useTheme();
  const current = useApp((s) => s.comune);
  const setComune = useApp((s) => s.setComune);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ q: string; list: Comune[] }>({ q: "", list: [] });
  const [status, setStatus] = useState<"idle" | "searching" | "error" | "locating" | "noLocation">("idle");

  const answered = q.trim().length >= 2 && results.q === q.trim();
  const shown = answered ? results.list : [];

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setStatus("searching");
      searchComuni(q, ctrl.signal)
        .then((list) => {
          setResults({ q: q.trim(), list });
          setStatus("idle");
        })
        .catch(() => !ctrl.signal.aborted && setStatus("error"));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const choose = (c: Comune) => {
    haptic.success();
    setComune(c);
    router.back();
  };

  const nearMe = async () => {
    setStatus("locating");
    const c = await comuneNearMe().catch(() => null);
    if (c) choose(c);
    else setStatus("noLocation");
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 30, gap: 24 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 10 }}>
        <Mono>Your Comune</Mono>
        <Text style={[T.hero, { fontSize: 38, lineHeight: 40 }]}>Where do you go green?</Text>
        <Text style={T.callout}>
          Today’s challenge is built from this Comune’s live air, water, soil and nature data. Everyone here gets the same one, and sees
          each other’s proofs.
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: q ? C.leaf : C.line }}>
        <Icon name="search" size={18} color={C.mute} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search a Comune"
          placeholderTextColor={C.faint}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search a Comune"
          style={{ flex: 1, height: 60, fontSize: 26, fontFamily: F.medium, letterSpacing: -1, color: C.ink }}
        />
        {status === "searching" && <ActivityIndicator color={C.mute} />}
      </View>

      <Button
        label={status === "locating" ? "Finding your Comune…" : "Use my location"}
        icon="location"
        kind="ghost"
        disabled={status === "locating"}
        onPress={nearMe}
      />
      {status === "noLocation" && <Text style={T.caption}>Couldn’t find your Comune from your location. Search it by name instead.</Text>}
      {status === "error" && <Text style={T.caption}>Search is offline right now. Check your connection and try again.</Text>}

      <View>
        {shown.map((c) => {
          const on = c.id === current?.id;
          return (
            <View key={c.id}>
              <Press
                scale={0.99}
                onPress={() => choose(c)}
                accessibilityLabel={`${c.name}${c.province ? `, ${c.province}` : ""}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  minHeight: 64,
                  borderBottomWidth: 1,
                  borderBottomColor: C.line,
                }}
              >
                <Icon name="building" size={16} color={on ? C.leaf : C.mute} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3, color: C.ink }}>{c.name}</Text>
                  <Mono>{[c.province, c.region].filter(Boolean).join(" · ")}</Mono>
                </View>
                {on ? <Icon name="checkSeal" size={18} color={C.leaf} /> : <Icon name="chevron" size={12} color={C.faint} />}
              </Press>
            </View>
          );
        })}
        {answered && status === "idle" && shown.length === 0 && <Text style={T.caption}>No Comune called “{q.trim()}”.</Text>}
      </View>
    </ScrollView>
  );
}
