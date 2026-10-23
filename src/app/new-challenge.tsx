import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { Button, Chip, Mono, Press } from "@/components/ui";
import { CHALLENGE_TEMPLATE_LIST, CHALLENGE_TEMPLATES, type ChallengeTemplateId } from "@/data/community";
import { useI18n } from "@/i18n/use-i18n";
import { useCommunity, useCommunityById } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const GOALS = [1, 3, 5, 10, 20, 50];
const DAYS = [7, 14, 21, 30];

// Launch a collective challenge: a starter idea or your own. A shared goal and a deadline, no scores.
export default function NewChallenge() {
  const { C, T } = useTheme();
  const { community: id } = useLocalSearchParams<{ community: string }>();
  const community = useCommunityById(id);
  const member = useCommunity((s) => !!s.roles[id]);
  const launch = useCommunity((s) => s.launch);
  const { t } = useI18n();
  const [template, setTemplate] = useState<ChallengeTemplateId | "custom">("fivePlaces");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [goal, setGoal] = useState(CHALLENGE_TEMPLATES.fivePlaces.goal);
  const [days, setDays] = useState(CHALLENGE_TEMPLATES.fivePlaces.days);
  const [busy, setBusy] = useState(false);
  if (!community) return null;
  const custom = template === "custom";

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 28, gap: 16, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
      <Mono color={C.leaf}>{t("community.newChallenge.kicker", { name: community.name })}</Mono>
      <Text style={T.display}>{t("community.newChallenge.title")}</Text>
      <Text style={T.callout}>{t("community.newChallenge.body")}</Text>
      {[...CHALLENGE_TEMPLATE_LIST, "custom" as const].map((k) => (
        <Press
          key={k}
          scale={0.99}
          onPress={() => {
            setTemplate(k);
            if (k !== "custom") {
              setGoal(CHALLENGE_TEMPLATES[k].goal);
              setDays(CHALLENGE_TEMPLATES[k].days);
            }
          }}
          accessibilityLabel={k === "custom" ? t("community.newChallenge.custom") : t(`community.templates.${k}.title`)}
          style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: template === k ? C.leaf : C.line }}
        >
          <Icon name={k === "custom" ? "pencil" : CHALLENGE_TEMPLATES[k].icon} size={17} color={C.forest} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 16, color: C.ink }}>{k === "custom" ? t("community.newChallenge.custom") : t(`community.templates.${k}.title`)}</Text>
            <Text style={T.caption}>{k === "custom" ? t("community.newChallenge.customHint") : t(`community.templates.${k}.body`)}</Text>
          </View>
        </Press>
      ))}
      {custom && (
        <>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            placeholder={t("community.newChallenge.titlePh")}
            placeholderTextColor={C.mute}
            style={{ height: 50, borderRadius: R.md, backgroundColor: C.card, paddingHorizontal: 16, fontFamily: F.medium, fontSize: 16, color: C.ink }}
            accessibilityLabel={t("community.newChallenge.titlePh")}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            maxLength={400}
            multiline
            placeholder={t("community.newChallenge.bodyPh")}
            placeholderTextColor={C.mute}
            style={{ minHeight: 80, borderRadius: R.md, backgroundColor: C.card, padding: 14, fontFamily: F.regular, fontSize: 15, color: C.ink, textAlignVertical: "top" }}
            accessibilityLabel={t("community.newChallenge.bodyPh")}
          />
        </>
      )}
      <Mono>{t("community.newChallenge.goal")}</Mono>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {GOALS.map((g) => (
          <Chip key={g} label={String(g)} active={goal === g} onPress={() => setGoal(g)} />
        ))}
      </View>
      <Mono>{t("community.newChallenge.days")}</Mono>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {DAYS.map((d) => (
          <Chip key={d} label={t("community.newChallenge.daysN", { n: d })} active={days === d} onPress={() => setDays(d)} />
        ))}
      </View>
      {!member && <Text style={T.caption}>{t("community.add.joinFirstBody")}</Text>}
      <Button
        label={t("community.challenges.launch")}
        kind="green"
        icon="flag"
        loading={busy}
        disabled={!member || (custom && title.trim().length < 3)}
        onPress={async () => {
          setBusy(true);
          try {
            await launch({
              communityId: community.id,
              template: custom ? undefined : template,
              title: custom ? title.trim() : t(`community.templates.${template}.title`),
              body: custom ? body.trim() : "",
              goal,
              days,
            });
            router.back();
          } catch {
            Alert.alert(t("community.newChallenge.fail"), t("shared.checkConnection"));
          } finally {
            setBusy(false);
          }
        }}
      />
      <Text style={T.caption}>{t("community.newChallenge.note")}</Text>
    </ScrollView>
  );
}
