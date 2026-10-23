import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { GuideButton, GuideIcon, GuideProgress, GuideReveal } from "@/components/guide/controls";
import { Icon, type IconName } from "@/components/icon";
import { Mono, SdgTags } from "@/components/ui";
import { ACTIONS, ACTION_LIST, type ActionId } from "@/data/actions";
import { actionCopy } from "@/i18n/content";
import { useI18n } from "@/i18n/use-i18n";
import { GUIDE_FEATURED } from "@/services/guide";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

export function GuideGestures({ initialAction, initialFocus, fromCapture, onDoIt, onFocus }: {
  initialAction: ActionId; initialFocus: boolean; fromCapture: boolean; onDoIt: (id: ActionId) => void; onFocus: () => void;
}) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const [selected, setSelected] = useState(initialAction);
  const [focused, setFocused] = useState(initialFocus);
  const [showMore, setShowMore] = useState(false);
  const [guided, setGuided] = useState(false);
  const [step, setStep] = useState(0);
  const action = ACTIONS[selected];
  const copy = actionCopy(t, selected);
  const choose = (id: ActionId, focus = false) => {
    haptic.tap(); setSelected(id); setStep(0); setGuided(false); setFocused(focus);
    if (focus) { setShowMore(false); onFocus(); }
  };
  const stepIcons: IconName[] = ["location", action.icon, "camera"];
  return (
    <View style={{ gap: 17 }}>
      {focused || guided ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t("guide.allGestures")} onPress={() => { setFocused(false); setGuided(false); onFocus(); }} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Icon name="back" color={C.mute} size={15} /><Text style={T.callout}>{t("guide.allGestures")}</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
            {GUIDE_FEATURED.map(id => {
              const on = selected === id;
              return (
                <Pressable key={id} accessibilityRole="button" accessibilityState={process.env.EXPO_OS === "web" ? undefined : { selected: on }} aria-pressed={process.env.EXPO_OS === "web" ? on : undefined} accessibilityLabel={`${actionCopy(t, id).label}, ${t("guide.seeds", { n: ACTIONS[id].seeds })}`} onPress={() => choose(id)}
                  style={({ pressed }) => ({ flexBasis: "46%", flexGrow: 1, minHeight: 114, padding: 14, justifyContent: "space-between", gap: 15, borderRadius: R.md, backgroundColor: on ? C.mint : C.card, borderWidth: 1, borderColor: on ? C.leaf : "transparent", opacity: pressed ? 0.75 : 1 })}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 5 }}>
                    <GuideIcon name={ACTIONS[id].icon} selected={on} color={C.forestInk} />
                    <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.forestInk }}>{t("guide.seeds", { n: ACTIONS[id].seeds })}</Text>
                  </View>
                  <Text style={[T.headline, { fontSize: 14 }]}>{actionCopy(t, id).label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <GuideReveal key={selected} style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <Text accessibilityRole="header" style={[T.title, { flex: 1 }]}>{copy.label}</Text>
          {focused && <Mono color={C.forestInk}>{t("guide.seeds", { n: action.seeds })}</Mono>}
        </View>
        {guided ? (
          <View style={{ gap: 16 }}>
            <View accessibilityRole="progressbar" accessibilityLabel={t("guide.step", { n: step + 1, total: copy.howto.length })} accessibilityValue={{ min: 1, max: copy.howto.length, now: step + 1 }} style={{ flexDirection: "row", gap: 7 }}>
              {copy.howto.map((_, i) => <GuideProgress key={i} filled={i <= step} />)}
            </View>
            <View style={{ flexDirection: "row", gap: 9, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
              <Mono>{t("guide.step", { n: step + 1, total: copy.howto.length })}</Mono>
              <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); setGuided(false); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={[T.caption, { color: C.forestInk }]}>{t("guide.overview")}</Text></Pressable>
            </View>
            <GuideReveal key={`${selected}-${step}`} style={{ gap: 20 }}>
              <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height: 145, borderRadius: R.lg, backgroundColor: C.mint, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22 }}>
                <Icon name={step === 1 && selected === "move" ? "walk" : stepIcons[step]} size={58} color={C.forestInk} /><Icon name="arrowRight" size={22} color={C.forestInk} /><Icon name={step === 2 ? "video" : action.icon} size={40} color={C.forestInk} />
              </View>
              <Text accessibilityLiveRegion="polite" style={[T.body, { minHeight: 80 }]}>{copy.howto[step]}</Text>
            </GuideReveal>
            {step < copy.howto.length - 1 ? <GuideButton label={t("guide.next")} icon="arrowRight" onPress={() => setStep(i => Math.min(i + 1, copy.howto.length - 1))} /> : <GuideButton label={fromCapture ? t("guide.gotIt") : t("guide.doIt")} icon={fromCapture ? "check" : "camera"} onPress={() => onDoIt(selected)} />}
            {step > 0 && <GuideButton secondary label={t("guide.previous")} icon="back" onPress={() => setStep(i => Math.max(0, i - 1))} />}
            <Text style={[T.caption, { textAlign: "center" }]}>{t("guide.ready")}</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {copy.howto.slice(0, 2).map((instruction, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 11 }}>
                <View style={{ paddingTop: 2 }}><Icon name={stepIcons[i]} color={C.forestInk} size={19} /></View>
                <Text style={[T.callout, { flex: 1, fontSize: 14, lineHeight: 21 }]}>{instruction}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.mint, borderRadius: R.md, padding: 14 }}>
              <Icon name="camera" color={C.forestInk} size={19} /><View style={{ flex: 1, gap: 5 }}><Text style={{ fontFamily: F.medium, fontSize: 13, color: C.forestInk }}>{t("guide.proof")}</Text><Text style={[T.callout, { fontSize: 13, lineHeight: 19 }]}>{copy.proofHint}</Text></View>
            </View>
            <GuideButton label={fromCapture ? t("guide.gotIt") : t("guide.doIt")} icon={fromCapture ? "check" : "camera"} onPress={() => onDoIt(selected)} />
            <GuideButton secondary label={t("guide.walkthrough")} icon="book" onPress={() => { setStep(0); setGuided(true); onFocus(); }} />
          </View>
        )}
        <SdgTags goals={action.sdgs} />
      </GuideReveal>
      {!focused && <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t(showMore ? "guide.less" : "guide.more")} accessibilityState={{ expanded: showMore }} onPress={() => { haptic.tap(); setShowMore(!showMore); }} style={{ minHeight: 50, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <Text style={T.callout}>{t(showMore ? "guide.less" : "guide.more")}</Text><Icon name={showMore ? "minus" : "plus"} size={18} color={C.mute} />
        </Pressable>
        {showMore && <GuideReveal style={{ gap: 6 }}>
          {ACTION_LIST.filter(a => !GUIDE_FEATURED.includes(a.id)).map(a => <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={actionCopy(t, a.id).label} onPress={() => choose(a.id, true)} style={{ minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: C.card, borderRadius: R.sm }}>
            <Icon name={a.icon} color={C.forestInk} size={20} /><Text style={[T.body, { fontSize: 14, flex: 1 }]}>{actionCopy(t, a.id).label}</Text><Mono color={C.forestInk}>+{a.seeds}</Mono>
          </Pressable>)}
        </GuideReveal>}
      </View>}
    </View>
  );
}
