import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { Blobs, LeafScatter } from "@/components/nature";
import { Avatar, Button, Chip, Logo, Mono, Press } from "@/components/ui";
import { HERO_PHOTOS } from "@/data/demo";
import { SDG_LIST } from "@/data/sdgs";
import { SOURCE_KINDS } from "@/data/sources";
import type { Role } from "@/data/types";
import { comuneLabel } from "@/services/comuni";
import { HandleTaken } from "@/services/social";
import { hasBackend } from "@/services/supabase";
import { registerProfile, useApp } from "@/store/app-store";
import { C, F, R, T } from "@/theme/tokens";
import { haptic } from "@/utils/format";

const HANDLE = /^[a-z0-9._]{2,24}$/;
const toHandle = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);

const ROLES: { value: Role; label: string; icon: IconName; hint: string }[] = [
  { value: "student", label: "Student", icon: "school", hint: "Short, direct, with something to do." },
  { value: "teacher", label: "Teacher", icon: "doc", hint: "Lesson ideas and class activities." },
  { value: "association", label: "Association", icon: "people", hint: "Ready for group actions." },
  { value: "comune", label: "Comune", icon: "building", hint: "Units, caveats and community numbers." },
];

function Tile({ src, rotate, x, y, z, w }: { src: number; rotate: string; x: number; y: number; z: number; w: number }) {
  return (
    <View
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: z,
        width: w,
        aspectRatio: 4 / 5,
        borderRadius: 22,
        borderCurve: "continuous",
        overflow: "hidden",
        transform: [{ rotate }],
        boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
        borderWidth: 3,
        borderColor: C.white,
      }}
    >
      <Image source={src} style={{ flex: 1 }} contentFit="cover" />
    </View>
  );
}

function HeroCollage({ width }: { width: number }) {
  const w = width * 0.5;
  return (
    <View style={{ height: w * 1.45, width: "100%" }}>
      <View style={{ position: "absolute", inset: -20, borderRadius: 48, overflow: "hidden" } as never}>
        <Blobs colors={[C.mint2, C.mint2]} opacity={0.7} size={width * 0.75} />
      </View>
      <LeafScatter style={{ position: "absolute", right: 4, bottom: 0, zIndex: 6 }} />
      <Tile src={HERO_PHOTOS[2]} rotate="-8deg" x={width * 0.02} y={34} z={1} w={w * 0.84} />
      <Tile src={HERO_PHOTOS[3]} rotate="7deg" x={width * 0.5} y={18} z={1} w={w * 0.84} />
      <View style={{ position: "absolute", left: (width - w) / 2, top: 40, zIndex: 3, width: w, aspectRatio: 4 / 5 }}>
        <Tile src={HERO_PHOTOS[1]} rotate="-1deg" x={0} y={0} z={3} w={w} />
        <View
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 4,
            width: w * 0.32,
            aspectRatio: 4 / 5,
            borderRadius: 12,
            overflow: "hidden",
            borderWidth: 2,
            borderColor: C.white,
          }}
        >
          <Image source={HERO_PHOTOS[0]} style={{ flex: 1 }} contentFit="cover" />
        </View>
        <View
          style={{
            position: "absolute",
            zIndex: 5,
            bottom: -14,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: C.forest,
            paddingHorizontal: 12,
            height: 30,
            borderRadius: R.pill,
          }}
        >
          <Icon name="checkSeal" size={13} color={C.lime} />
          <Text style={{ color: C.white, fontFamily: F.medium, fontSize: 13 }}>Verified by 3</Text>
        </View>
      </View>
    </View>
  );
}

function DataPreview() {
  const rows = [
    { label: "Air", value: "24", unit: "Fair", kind: "model" as const },
    { label: "Species nearby", value: "287", unit: "30 days", kind: "citizen" as const },
    { label: "Dry days", value: "6", unit: "in a row", kind: "model" as const },
    { label: "Parco Nord", value: "9", unit: "km", kind: "map" as const },
  ];
  return (
    <View style={{ paddingTop: 10 }}>
      {rows.map((r, i) => (
        <Animated.View
          key={r.label}
          entering={FadeInDown.delay(120 + i * 90).springify().damping(18)}
          style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.line }}
        >
          <Mono style={{ width: 20 }}>{String(i + 1).padStart(2, "0")}</Mono>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3 }}>{r.label}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: SOURCE_KINDS[r.kind].color }} />
              <Mono>{SOURCE_KINDS[r.kind].short}</Mono>
            </View>
          </View>
          <Text style={{ fontFamily: F.medium, fontSize: 40, letterSpacing: -2, fontVariant: ["tabular-nums"] }}>{r.value}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.mute, width: 58 }}>{r.unit}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

// You start last, then climb. Competition, explained in one animation.
function RacePreview({ active }: { active: boolean }) {
  const base = [
    { id: "a", name: "A classmate", pts: 345 },
    { id: "b", name: "A neighbour", pts: 270 },
    { id: "c", name: "Your teacher", pts: 205 },
    { id: "d", name: "A squad mate", pts: 160 },
  ];
  const [mine, setMine] = useState(120);
  useEffect(() => {
    if (!active) return;
    const a = setTimeout(() => {
      haptic.soft();
      setMine(230);
    }, 900);
    const b = setTimeout(() => {
      haptic.success();
      setMine(360);
    }, 2000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [active]);
  const rows = [...base.map((b) => ({ ...b, me: false })), { id: "me", name: "You", pts: mine, me: true }].sort((x, y) => y.pts - x.pts);
  return (
    <View style={{ paddingTop: 10 }}>
      {rows.map((r, i) => (
        <Animated.View
          key={r.id}
          layout={LinearTransition.springify().damping(16)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            height: 62,
            paddingHorizontal: r.me ? 14 : 0,
            marginHorizontal: r.me ? -14 : 0,
            borderRadius: r.me ? R.md : 0,
            backgroundColor: r.me ? C.forest : "transparent",
            borderBottomWidth: r.me ? 0 : 1,
            borderBottomColor: C.line,
          }}
        >
          <Mono color={r.me ? C.lime : C.mute} style={{ width: 20 }}>
            {String(i + 1).padStart(2, "0")}
          </Mono>
          <Avatar name={r.me ? "You" : (r.name.split(" ").pop() ?? r.name)} size={34} invert={r.me} />
          <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 16, letterSpacing: -0.3, color: r.me ? C.white : C.ink }}>{r.name}</Text>
          {r.me && i === 0 && <Icon name="crown" size={14} color={C.lime} />}
          <Text style={{ fontFamily: F.medium, fontSize: 17, color: r.me ? C.white : C.ink, fontVariant: ["tabular-nums"] }}>{r.pts}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function GoalCell({ g, on, delay, size }: { g: number; on: boolean; delay: number; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(on ? withDelay(delay, withSpring(1, { damping: 14 })) : 0);
  }, [on, delay, t]);
  const fill = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.6 + t.value * 0.4 }] }));
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: C.mint, overflow: "hidden" }}>
      <Text style={{ position: "absolute", top: 8, left: 9, fontFamily: F.medium, fontSize: 18, letterSpacing: -0.6, color: C.forestMute }}>{g}</Text>
      <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: C.leaf, borderRadius: 12 } as never, fill]}>
        <Text style={{ position: "absolute", top: 8, left: 9, fontFamily: F.medium, fontSize: 18, letterSpacing: -0.6, color: C.white }}>{g}</Text>
      </Animated.View>
    </View>
  );
}

function GoalsPreview({ active, width }: { active: boolean; width: number }) {
  const size = Math.floor((width - 5 * 6) / 6);
  const lit = [3, 6, 11, 12, 13, 14, 15, 17];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 10 }}>
      {SDG_LIST.map((g) => (
        <GoalCell key={g} g={g} size={size} on={active && lit.includes(g)} delay={lit.indexOf(g) * 140} />
      ))}
      <View style={{ width: size, height: size, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: F.medium, fontSize: 13, letterSpacing: -0.4 }}>2030</Text>
      </View>
    </View>
  );
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finish = useApp((s) => s.finishOnboarding);
  const comune = useApp((s) => s.comune);
  const inner = width - 40;
  const h = handleEdited ? handle : toHandle(name);
  const canStart = name.trim().length > 0 && HANDLE.test(h) && !!comune && !busy;

  const go = (i: number) => {
    haptic.tap();
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  const start = async () => {
    if (!canStart) return;
    const profile = { name: name.trim(), handle: h, role };
    setBusy(true);
    setError(null);
    try {
      await registerProfile(profile, comune);
      haptic.success();
      finish(profile);
      router.replace("/");
    } catch (e) {
      setError(
        e instanceof HandleTaken ? `@${h} is taken. Try another handle.` : "Couldn’t reach BeGreen. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const slides = [
    {
      kicker: "The app for doing, not posting about doing",
      title: "Proof,\nnot promises.",
      body: "Snap the thing. Film 5 seconds of you doing it. Friends verify. That’s a BeGreen.",
      visual: <HeroCollage width={inner} />,
    },
    {
      kicker: "Local data, human words",
      title: "Your city,\ndecoded.",
      body: "Live air, water, soil and nature around you. Explained for you, your class or your Comune, always with the source.",
      visual: <DataPreview />,
    },
    {
      kicker: "Friends · squads · schools",
      title: "Beat your friends.\nSave the planet.",
      body: "(In that order.) A weekly race with everyone in your Comune, streaks, nudges for slackers, and squads for your class or crew.",
      visual: <RacePreview key={page === 2 ? "on" : "off"} active={page === 2} />,
    },
    {
      kicker: "UN Agenda 2030",
      title: "17 goals.\nOne tiny act\nat a time.",
      body: "Every proof is tagged with the Sustainable Development Goals it moves. Collect all 17.",
      visual: <GoalsPreview active={page === 3} width={inner} />,
    },
  ];
  const last = slides.length;

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: top + 10, paddingHorizontal: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Logo size={24} sway />
          {page < last ? (
            <Pressable onPress={() => go(last)} hitSlop={10} accessibilityRole="button">
              <Mono color={C.ink}>Skip</Mono>
            </Pressable>
          ) : (
            <Mono>
              {String(page + 1).padStart(2, "0")} / {String(last + 1).padStart(2, "0")}
            </Mono>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {Array.from({ length: last + 1 }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= page ? C.leaf : C.mint2 }} />
          ))}
        </View>
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        keyboardShouldPersistTaps="handled"
      >
        {slides.map((s, i) => (
          <ScrollView key={i} style={{ width }} contentContainerStyle={{ padding: 20, paddingTop: 24, gap: 26 }} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.delay(80)}>{s.visual}</Animated.View>
            <View style={{ gap: 12, paddingTop: 6 }}>
              <Mono color={C.leaf}>{s.kicker}</Mono>
              <Text style={[T.hero, { fontSize: 42, lineHeight: 43 }]}>{s.title}</Text>
              <Text style={[T.body, { fontSize: 17, lineHeight: 25, color: C.ink2 }]}>{s.body}</Text>
            </View>
          </ScrollView>
        ))}

        <ScrollView style={{ width }} contentContainerStyle={{ padding: 20, paddingTop: 28, gap: 30 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 10 }}>
            <Mono color={C.leaf}>Last step</Mono>
            <Text style={[T.hero, { fontSize: 42, lineHeight: 43 }]}>Who’s going green?</Text>
          </View>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={C.faint}
            autoCorrect={false}
            returnKeyType="done"
            style={{
              height: 64,
              borderBottomWidth: 1,
              borderBottomColor: name ? C.leaf : C.line,
              fontSize: 30,
              fontFamily: F.medium,
              letterSpacing: -1.1,
              color: C.ink,
            }}
          />

          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                borderBottomWidth: 1,
                borderBottomColor: HANDLE.test(h) ? C.line : C.red,
              }}
            >
              <Text style={{ fontFamily: F.monoMedium, fontSize: 17, color: C.mute }}>@</Text>
              <TextInput
                value={h}
                onChangeText={(t) => {
                  setHandleEdited(true);
                  setHandle(
                    t
                      .toLowerCase()
                      .replace(/[^a-z0-9._]/g, "")
                      .slice(0, 24),
                  );
                }}
                placeholder="handle"
                placeholderTextColor={C.faint}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Your handle"
                style={{ flex: 1, height: 46, fontSize: 17, fontFamily: F.monoMedium, color: C.ink }}
              />
            </View>
            <Text style={T.caption}>
              Your public name on proofs, verifications and the league. 2–24 letters, numbers, dots or underscores.
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Mono color={C.forest}>I’m joining as</Mono>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {ROLES.map((r) => (
                <Chip key={r.value} label={r.label} icon={r.icon} active={role === r.value} onPress={() => setRole(r.value)} />
              ))}
            </View>
            <Text style={T.caption}>Explanations: {ROLES.find((r) => r.value === role)?.hint}</Text>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
            <Press
              scale={0.99}
              onPress={() => router.push("/comune")}
              accessibilityLabel={comune ? `Your Comune: ${comune.name}. Change` : "Choose your Comune"}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.line,
              }}
            >
              <Icon name="location" size={17} color={C.leaf} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 16, letterSpacing: -0.2 }}>
                  {comune ? comuneLabel(comune) : "Your Comune"}
                </Text>
                <Text style={{ fontFamily: F.regular, color: C.mute, fontSize: 13 }}>
                  {comune ? "Today’s challenge comes from its live data." : "Pick where you live or study. Needed for the daily challenge."}
                </Text>
              </View>
              {comune ? <Icon name="checkSeal" size={20} color={C.leaf} /> : <Mono color={C.ink}>Choose</Mono>}
            </Press>
          </View>
          {!hasBackend && (
            <Text style={T.caption}>Offline prototype: no BeGreen server is configured, so your proofs stay on this phone.</Text>
          )}
        </ScrollView>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: bottom + 12, paddingTop: 8, gap: 10 }}>
        {page === last && error && <Text style={[T.caption, { color: C.red, textAlign: "center" }]}>{error}</Text>}
        {page < last ? (
          <Button label={page === 0 ? "Let’s go" : "Next"} onPress={() => go(page + 1)} />
        ) : (
          <Button label={busy ? "Joining…" : "Start BeGreen"} kind="green" icon="leaf" disabled={!canStart} onPress={start} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
