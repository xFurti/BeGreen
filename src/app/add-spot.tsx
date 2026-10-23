import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CommunityMap, type MapHandle } from "@/components/community-map";
import { CategoryChip, whenText } from "@/components/community-ui";
import { Icon } from "@/components/icon";
import { Button, Chip, Mono, Press, Segmented } from "@/components/ui";
import { CATEGORY_LIST, KIND_LIST, KINDS, dayKey, promptOf, type SpotCategory, type SpotKind } from "@/data/community";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { requestMyLocation } from "@/hooks/use-my-location";
import { intlLocale } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { approximate, inBBox, type LatLon } from "@/services/geo";
import { scrollPaddingBottom } from "@/services/keyboard-inset";
import { useCommunity, useCommunityById } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

type Step = "what" | "photo" | "details" | "where" | "share";
const STEPS: Step[] = ["what", "photo", "details", "where", "share"];

const DAYS = 21;
const TIMES = Array.from({ length: 29 }, (_, i) => 7 * 60 + i * 30); // 07:00 → 21:00
const DURATIONS = [60, 120, 180, 0]; // 0: all day

// Add a place or an experience to the community map. Quick and photo-first: what, a photo, a few words,
// where (always confirmed by you), who sees it.
export default function AddSpot() {
  const { C, T } = useTheme();
  const params = useLocalSearchParams<{ community?: string; kind?: SpotKind; prompt?: string; challenge?: string; category?: SpotCategory }>();
  const { top, bottom } = useSafeAreaInsets();
  const { ref: keyboardRoot, cover, scrollerRef, scrollProps } = useKeyboardCover();
  const { t, language } = useI18n();
  const primary = useCommunity((s) => s.primary);
  const community = useCommunityById(params.community ?? primary);
  const member = useCommunity((s) => (community ? !!s.roles[community.id] : false));
  const addSpot = useCommunity((s) => s.addSpot);
  const map = useRef<MapHandle>(null);

  const startKind = params.kind && KINDS[params.kind] ? params.kind : undefined;
  const [step, setStep] = useState<Step>(startKind ? "photo" : "what");
  const [kind, setKind] = useState<SpotKind>(startKind ?? "discovery");
  const [category, setCategory] = useState<SpotCategory>(params.category ?? KINDS[startKind ?? "discovery"].category);
  const [photo, setPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [address, setAddress] = useState("");
  const [family, setFamily] = useState(false);
  const [done, setDone] = useState(false);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState(10 * 60);
  const [duration, setDuration] = useState(120);
  const [point, setPoint] = useState<LatLon | null>(null);
  const [onMap, setOnMap] = useState(startKind !== "moment");
  const [precise, setPrecise] = useState(startKind !== "moment" && startKind !== "report");
  const [visibility, setVisibility] = useState<"public" | "community">("public");
  const [confirmed, setConfirmed] = useState(false);
  const [locating, setLocating] = useState(false);

  if (!community || !member) {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: top + 60, gap: 14, backgroundColor: C.bg }}>
        <Text style={T.title}>{t("community.add.joinFirst")}</Text>
        <Text style={T.callout}>{t("community.add.joinFirstBody")}</Text>
        <Button label={t("community.hub.findCity")} onPress={() => router.replace("/communities")} />
        <Button label={t("common.close")} kind="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const idx = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(STEPS.length - 1, idx + 1)]);
  const back = () => (idx === 0 || (startKind && step === "photo") ? router.back() : setStep(STEPS[idx - 1]));

  const pick = async (camera: boolean) => {
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8 };
      let r: ImagePicker.ImagePickerResult;
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        r = perm.granted ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      } else r = await ImagePicker.launchImageLibraryAsync(opts);
      if (!r.canceled && r.assets[0]) {
        setPhoto(r.assets[0].uri);
        haptic.soft();
        next();
      }
    } catch {
      // Simulator or web without a camera: the library still works.
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 }).catch(() => null);
      if (r && !r.canceled && r.assets[0]) {
        setPhoto(r.assets[0].uri);
        next();
      }
    }
  };

  const startsAt = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + day);
    return d.getTime() + time * 60e3;
  })();
  const endsAt = duration ? startsAt + duration * 60e3 : undefined;

  const useMine = async () => {
    setLocating(true);
    const p = await requestMyLocation();
    setLocating(false);
    if (!p) return Alert.alert(t("community.add.noLocation"), t("community.add.noLocationBody"));
    if (!inBBox(p, community.bbox)) return Alert.alert(t("community.add.outside"), t("community.add.outsideBody", { name: community.name }));
    map.current?.focus(p, 4);
  };

  const publish = () => {
    const where = onMap && point ? (precise ? point : approximate(point)) : null;
    const spot = addSpot({
      communityId: community.id,
      kind,
      category,
      title: title.trim(),
      body: body.trim(),
      photo: photo ?? undefined,
      lat: where?.lat,
      lon: where?.lon,
      precise: !!where && precise,
      address: address.trim(),
      status: kind === "challenge" && done ? "done" : "active",
      startsAt: kind === "event" ? startsAt : undefined,
      endsAt: kind === "event" ? endsAt : undefined,
      family,
      visibility,
      promptDay: params.prompt ? dayKey() : undefined,
      challengeId: params.challenge,
    });
    haptic.success();
    router.replace({ pathname: "/spot/[id]", params: { id: spot.id, fresh: "1" } });
  };

  const canDetails = title.trim().length >= 2;
  const canShare = !onMap || !!point;
  const needsConfirm = onMap && precise && visibility === "public";

  const header = (
    <View style={{ paddingTop: top + 6, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: step === "where" ? "transparent" : C.bg }}>
      <Press onPress={back} accessibilityLabel={t("community.map.back")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", boxShadow: step === "where" ? "0 2px 10px rgba(0,0,0,0.14)" : undefined }}>
        <Icon name={idx === 0 ? "close" : "back"} size={17} color={C.ink} />
      </Press>
      <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= idx ? C.leaf : C.mint2 }} />
        ))}
      </View>
      <Mono>{`${idx + 1}/${STEPS.length}`}</Mono>
    </View>
  );

  if (step === "where") {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <CommunityMap ref={map} community={community} spots={[]} picker initial={point} onCenterChange={setPoint} insets={{ top: top + 140, bottom: bottom + 230 }} />
        <View style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
          {header}
          <View style={{ marginHorizontal: 16, backgroundColor: C.veil, borderRadius: R.lg, padding: 14, gap: 4 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 18, letterSpacing: -0.4, color: C.ink }}>{t("community.add.whereTitle")}</Text>
            <Text style={T.caption}>{t("community.add.whereBody")}</Text>
          </View>
        </View>
        <View style={{ position: "absolute", left: 16, right: 16, bottom: bottom + 16, backgroundColor: C.bg, borderRadius: R.xl, padding: 16, gap: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
          {kind === "moment" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink }}>{t("community.add.onMap")}</Text>
              <Switch value={onMap} onValueChange={setOnMap} trackColor={{ true: C.leaf, false: C.card2 }} />
            </View>
          )}
          {onMap && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.ink }}>{t("community.add.precise")}</Text>
                  <Text style={T.caption}>{precise ? t("community.add.preciseOn") : t("community.add.preciseOff")}</Text>
                </View>
                <Switch value={precise} onValueChange={setPrecise} trackColor={{ true: C.leaf, false: C.card2 }} />
              </View>
              <Button label={t("community.add.useMine")} kind="ghost" size="sm" icon="locate" loading={locating} onPress={useMine} />
            </>
          )}
          {kind === "report" && <Text style={T.caption}>{t("community.add.reportSafety")}</Text>}
          <Button label={t("community.add.confirmPlace")} kind="green" disabled={!canShare} onPress={next} />
        </View>
      </View>
    );
  }

  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      {header}
      <ScrollView
        ref={scrollerRef}
        {...scrollProps}
        contentContainerStyle={{ padding: 20, paddingBottom: scrollPaddingBottom(bottom + 40, cover), gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        {params.prompt && (
          <View style={{ backgroundColor: C.forest, borderRadius: R.md, padding: 14, gap: 4 }}>
            <Mono color={C.lime}>{t("community.prompt.kicker")}</Mono>
            <Text style={{ fontFamily: F.medium, fontSize: 18, color: C.white }}>{t(`community.prompt.items.${promptOf()}`)}</Text>
          </View>
        )}

        {step === "what" && (
          <Animated.View entering={FadeIn} style={{ gap: 14 }}>
            <Text style={T.display}>{t("community.add.whatTitle")}</Text>
            <Text style={T.callout}>{t("community.add.whatBody", { name: community.name })}</Text>
            {KIND_LIST.map((k) => (
              <Press
                key={k}
                scale={0.985}
                onPress={() => {
                  setKind(k);
                  setCategory(params.category ?? KINDS[k].category);
                  setPrecise(k !== "moment" && k !== "report");
                  setOnMap(k !== "moment");
                  next();
                }}
                accessibilityLabel={t(`community.kinds.${k}.label`)}
                style={{ flexDirection: "row", gap: 14, alignItems: "center", padding: 14, borderRadius: R.lg, borderWidth: 1, borderColor: kind === k ? C.leaf : C.line }}
              >
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={KINDS[k].icon} size={18} color={C.forest} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 17, letterSpacing: -0.3, color: C.ink }}>{t(`community.kinds.${k}.label`)}</Text>
                  <Text style={T.caption}>{t(`community.kinds.${k}.hint`)}</Text>
                </View>
                <Icon name="chevron" size={14} color={C.faint} />
              </Press>
            ))}
          </Animated.View>
        )}

        {step === "photo" && (
          <Animated.View entering={FadeInRight.springify().damping(20)} style={{ gap: 14 }}>
            <Text style={T.display}>{t("community.add.photoTitle")}</Text>
            <Text style={T.callout}>{kind === "report" ? t("community.add.photoReport") : t("community.add.photoBody")}</Text>
            {photo && <Image source={photo} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: R.lg }} contentFit="cover" />}
            <Button label={t("community.add.camera")} icon="camera" kind="green" onPress={() => pick(true)} />
            <Button label={t("community.add.library")} icon="photo" kind="secondary" onPress={() => pick(false)} />
            <Button label={photo ? t("common.next") : t("community.add.noPhoto")} kind="ghost" onPress={next} />
          </Animated.View>
        )}

        {step === "details" && (
          <Animated.View entering={FadeInRight.springify().damping(20)} style={{ gap: 16 }}>
            <Text style={T.display}>{t("community.add.detailsTitle")}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              placeholder={t(`community.kinds.${kind}.titlePh`)}
              placeholderTextColor={C.mute}
              style={{ height: 52, borderRadius: R.md, backgroundColor: C.card, paddingHorizontal: 16, fontFamily: F.medium, fontSize: 17, color: C.ink }}
              accessibilityLabel={t("community.add.titleA11y")}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              maxLength={600}
              multiline
              placeholder={t("community.add.bodyPh")}
              placeholderTextColor={C.mute}
              style={{ minHeight: 100, borderRadius: R.md, backgroundColor: C.card, padding: 16, fontFamily: F.regular, fontSize: 15, color: C.ink, textAlignVertical: "top" }}
              accessibilityLabel={t("community.add.bodyA11y")}
            />
            <Mono>{t("community.add.category")}</Mono>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {CATEGORY_LIST.map((c) => (
                <CategoryChip key={c} category={c} active={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>

            {kind === "event" && (
              <View style={{ gap: 10 }}>
                <Mono>{t("community.add.when")}</Mono>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {Array.from({ length: DAYS }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const label = i === 0 ? t("community.add.today") : i === 1 ? t("community.add.tomorrow") : new Intl.DateTimeFormat(intlLocale(language), { weekday: "short", day: "numeric" }).format(d);
                    return <Chip key={i} label={label} active={day === i} onPress={() => setDay(i)} />;
                  })}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {TIMES.map((m) => (
                    <Chip key={m} label={`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`} active={time === m} onPress={() => setTime(m)} />
                  ))}
                </ScrollView>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {DURATIONS.map((m) => (
                    <Chip key={m} label={m ? t("community.add.hours", { n: m / 60 }) : t("community.add.allDay")} active={duration === m} onPress={() => setDuration(m)} />
                  ))}
                </View>
                <Text style={T.caption}>{whenText(language, startsAt, endsAt)}</Text>
              </View>
            )}

            <TextInput
              value={address}
              onChangeText={setAddress}
              maxLength={160}
              placeholder={kind === "event" ? t("community.add.meetingPh") : t("community.add.addressPh")}
              placeholderTextColor={C.mute}
              style={{ height: 48, borderRadius: R.md, backgroundColor: C.card, paddingHorizontal: 16, fontFamily: F.regular, fontSize: 15, color: C.ink }}
              accessibilityLabel={t("community.add.addressA11y")}
            />
            {(kind === "discovery" || kind === "useful" || kind === "event") && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.ink }}>{t("community.add.family")}</Text>
                  <Text style={T.caption}>{t("community.add.familyHint")}</Text>
                </View>
                <Switch value={family} onValueChange={setFamily} trackColor={{ true: C.leaf, false: C.card2 }} />
              </View>
            )}
            {kind === "challenge" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink }}>{t("community.add.alreadyDone")}</Text>
                <Switch value={done} onValueChange={setDone} trackColor={{ true: C.leaf, false: C.card2 }} />
              </View>
            )}
            {kind === "useful" && <Text style={T.caption}>{t("community.add.usefulHint")}</Text>}
            <Button label={t("common.next")} disabled={!canDetails} onPress={next} />
          </Animated.View>
        )}

        {step === "share" && (
          <Animated.View entering={FadeInRight.springify().damping(20)} style={{ gap: 16 }}>
            <Text style={T.display}>{t("community.add.shareTitle")}</Text>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: C.card, borderRadius: R.lg, padding: 12 }}>
              {photo ? (
                <Image source={photo} style={{ width: 60, height: 60, borderRadius: 12 }} contentFit="cover" />
              ) : (
                <View style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={KINDS[kind].icon} size={22} color={C.forest} />
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 17, color: C.ink }}>
                  {title}
                </Text>
                <Text style={T.caption}>
                  {t(`community.categories.${category}`)} · {onMap ? (precise ? t("community.add.exactSpot") : t("community.spot.approx")) : t("community.add.offMap")}
                </Text>
              </View>
            </View>
            <Mono>{t("community.add.who")}</Mono>
            <Segmented<"public" | "community">
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: "public", label: t("community.add.everyone") },
                { value: "community", label: t("community.add.membersOnly") },
              ]}
            />
            <Text style={T.caption}>
              {visibility === "public" && community.visibility === "public" ? t("community.add.everyoneNote", { name: community.name }) : t("community.add.membersNote", { name: community.name })}
            </Text>
            {needsConfirm && (
              <Pressable
                onPress={() => setConfirmed((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmed }}
                style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: C.mint, borderRadius: R.md, padding: 14 }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.forest, backgroundColor: confirmed ? C.forest : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {confirmed && <Icon name="check" size={12} color={C.lime} />}
                </View>
                <Text style={[T.callout, { flex: 1 }]}>{t("community.add.confirmPrecise")}</Text>
              </Pressable>
            )}
            <Text style={T.caption}>{t("community.add.rules")}</Text>
            <Button label={t("community.add.publish")} kind="green" icon="send" disabled={needsConfirm && !confirmed} onPress={publish} />
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
