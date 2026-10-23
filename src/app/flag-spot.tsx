import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { Button, Mono } from "@/components/ui";
import type { FlagReason } from "@/data/community";
import { useKeyboardCover } from "@/hooks/use-keyboard-cover";
import { useI18n } from "@/i18n/use-i18n";
import { scrollPaddingBottom } from "@/services/keyboard-inset";
import { useAuthor } from "@/store/app-store";
import { NO_FLAGS, useCommunity, useSpot } from "@/store/community-store";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

const REASONS: { reason: Exclude<FlagReason, "resolved">; icon: IconName }[] = [
  { reason: "outdated", icon: "calendar" },
  { reason: "wrong", icon: "pencil" },
  { reason: "inappropriate", icon: "alert" },
];

// Something's off with a place: out of date, wrong, or not OK. Optionally, stop seeing this person.
export default function FlagSpot() {
  const { C, T } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const spot = useSpot(id);
  const { t } = useI18n();
  const author = useAuthor();
  const flag = useCommunity((s) => s.flag);
  const block = useCommunity((s) => s.block);
  const mine = useCommunity((s) => s.myFlags[spot?.id ?? id]) ?? NO_FLAGS;
  const { ref: keyboardRoot, cover, scrollerRef, scrollProps } = useKeyboardCover();
  const [reason, setReason] = useState<Exclude<FlagReason, "resolved"> | null>(null);
  const [note, setNote] = useState("");
  if (!spot) return null;
  const name = author(spot.authorId).name;

  return (
    <View ref={keyboardRoot} collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        ref={scrollerRef}
        {...scrollProps}
        nestedScrollEnabled={process.env.EXPO_OS === "android"}
        contentContainerStyle={{ padding: 20, paddingTop: 28, gap: 14, paddingBottom: scrollPaddingBottom(40, cover) }}
        keyboardShouldPersistTaps="handled"
      >
      <Mono color={C.leaf}>{t("community.flag.kicker")}</Mono>
      <Text style={T.title}>{t("community.flag.title")}</Text>
      {REASONS.map((r) => {
        const done = mine.includes(r.reason);
        return (
          <Pressable
            key={r.reason}
            disabled={done}
            onPress={() => setReason(r.reason)}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === r.reason, disabled: done }}
            style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: reason === r.reason ? C.leaf : C.line, opacity: done ? 0.45 : 1 }}
          >
            <Icon name={r.icon} size={17} color={C.forest} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 16, color: C.ink }}>{t(`community.flag.${r.reason}`)}</Text>
              <Text style={T.caption}>{done ? t("community.flag.sent") : t(`community.flag.${r.reason}Hint`)}</Text>
            </View>
          </Pressable>
        );
      })}
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={300}
        multiline
        placeholder={reason === "wrong" || reason === "outdated" ? t("community.flag.correctionPh") : t("community.flag.notePh")}
        placeholderTextColor={C.mute}
        style={{ minHeight: 80, borderRadius: R.md, backgroundColor: C.card, padding: 14, fontFamily: F.regular, fontSize: 15, color: C.ink, textAlignVertical: "top" }}
        accessibilityLabel={t("community.flag.notePh")}
      />
      <Button
        label={t("community.flag.send")}
        kind="green"
        disabled={!reason}
        onPress={() => {
          if (!reason) return;
          flag(spot.id, reason, note.trim());
          haptic.success();
          Alert.alert(t("community.flag.thanks"), t("community.flag.thanksBody"));
          router.back();
        }}
      />
      <Text style={T.caption}>{t("community.flag.how")}</Text>
      <Button
        label={t("community.flag.block", { name })}
        kind="ghost"
        size="md"
        icon="block"
        onPress={() =>
          Alert.alert(t("community.flag.blockTitle", { name }), t("community.flag.blockBody"), [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("community.flag.blockConfirm"),
              style: "destructive",
              onPress: () => {
                block(spot.authorId, true);
                router.back();
              },
            },
          ])
        }
      />
      </ScrollView>
    </View>
  );
}
