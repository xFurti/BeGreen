import { Switch, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { Button, Press } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { type EventScheduleInput, parseEventSchedule } from "@/services/event-schedule";
import { F, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export const EMPTY_EVENT_SCHEDULE: EventScheduleInput = { date: "", time: "", duration: "", allDay: false };

export function EventScheduleFields({ value, onChange, showErrors }: {
  value: EventScheduleInput;
  onChange: (value: EventScheduleInput) => void;
  showErrors: boolean;
}) {
  const { C, T } = useTheme();
  const { t } = useI18n();
  const result = parseEventSchedule(value);
  const error = showErrors ? result.error : undefined;
  const field = (name: "date" | "time" | "duration", label: string, placeholder: string) => (
    <View style={{ gap: 6 }}>
      <Text style={[T.headline, { color: C.ink }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: error === name ? C.red : C.mute }}>
        <TextInput
          value={value[name]}
          onChangeText={(text) => onChange({ ...value, [name]: text })}
          accessibilityLabel={`${label}, ${placeholder}`}
          placeholder={placeholder}
          placeholderTextColor={C.mute}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType={name === "duration" ? "number-pad" : process.env.EXPO_OS === "ios" ? "numbers-and-punctuation" : "default"}
          style={{ flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: 14, fontFamily: F.regular, fontSize: 16, color: C.ink }}
        />
        {!!value[name] && (
          <Press onPress={() => onChange({ ...value, [name]: "" })} accessibilityLabel={t("community.add.clearField", { field: label })} style={{ width: 44, height: 48, alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={14} color={C.ink} />
          </Press>
        )}
      </View>
      {error === name && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[T.caption, { color: C.ink }]}>{t(`community.add.${name}Error`)}</Text>}
    </View>
  );

  return (
    <View style={{ gap: 14 }}>
      {field("date", t("community.add.date"), t("community.add.dateFormat"))}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={[T.body, { flex: 1 }]}>{t("community.add.allDay")}</Text>
        <Switch
          value={value.allDay}
          onValueChange={(allDay) => onChange({ ...value, allDay })}
          accessibilityLabel={t("community.add.allDay")}
          trackColor={{ true: C.leaf, false: C.card2 }}
        />
      </View>
      {!value.allDay && (
        <>
          {field("time", t("community.add.time"), "HH:MM")}
          {field("duration", t("community.add.duration"), t("community.add.durationHint"))}
        </>
      )}
      <Button label={t("community.add.resetSchedule")} kind="ghost" size="sm" onPress={() => onChange({ ...EMPTY_EVENT_SCHEDULE })} />
    </View>
  );
}
