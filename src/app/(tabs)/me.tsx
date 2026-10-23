import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/icon";
import { ImpactPanel, MemoriesPanel } from "@/components/profile-panels";
import { ProfileMap } from "@/components/profile-map";
import { LanguageSwitch } from "@/components/language-switch";
import { GrowthCard, SeedPicker } from "@/components/seed-ui";
import { TitledName } from "@/components/titled-name";
import { Avatar, Button, IconButton, Press, Segmented, toast } from "@/components/ui";
import type { Explain, Role } from "@/data/types";
import { profileName } from "@/i18n/content";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/use-i18n";
import { HandleTaken } from "@/services/social";
import { supabase } from "@/services/supabase";
import { badgeStatsOf, dropStaleBadge, seedsOf, streakOf, useApp, useMyPosts, type ThemePref } from "@/store/app-store";
import { useCommunity } from "@/store/community-store";
import { earnedBadges } from "@/data/badges";
import { plantStage, seedOf } from "@/data/seeds";
import { F, type Palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";
import { cleanProfile, validProfile } from "@/utils/profile";
type ProfileTab = "impact" | "memories" | "map";
const TABS = [
  { id: "impact", label: "me.impact", icon: "leaf" },
  { id: "memories", label: "me.memories", icon: "calendar" },
  { id: "map", label: "profile.map", icon: "map" },
] as const;
const ROLE_ICON: Record<Role, IconName> = { student: "school", teacher: "book", association: "people", comune: "building" };
export default function Me() {
  const { C } = useTheme();
  const s = styles(C);
  const { t } = useI18n();
  const { top } = useSafeAreaInsets();
  const profile = useApp((s) => s.profile);
  const posts = useMyPosts();
  const verifications = useApp((s) => s.verifiedCount);
  const comune = useApp((s) => s.comune);
  const [tab, setTab] = useState<ProfileTab>("impact");
  const [sheet, setSheet] = useState<"edit" | "settings" | null>(null);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const streak = streakOf(posts);
  const verified = posts.filter((p) => p.verifiedBy.length >= 3).length;
  const place = comune?.name ?? t("comune.yours");
  const userId = useApp((s) => s.userId);
  const seed = seedOf(userId, profile.seed);
  const seeds = seedsOf(posts, verifications);
  const earnedKey = earnedBadges(badgeStatsOf(posts, verifications)).join();
  useEffect(() => {
    dropStaleBadge();
  }, [profile.badgeId, earnedKey]);
  const share = async () => {
    try {
      await Share.share({ message: t("groups.profileShare", { streak, count: posts.length, place }) });
    } catch {
      toast(t("profile.shareFailed"));
    }
  };
  return (
    <View style={s.root}>
      <ScrollView
        aria-hidden={sheet !== null || badgeOpen}
        accessibilityElementsHidden={sheet !== null || badgeOpen}
        importantForAccessibility={sheet !== null || badgeOpen ? "no-hide-descendants" : "auto"}
        contentContainerStyle={{ paddingTop: top + 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.page}>
          <View style={s.cover}>
            <Image
              source={require("../../../assets/demo/forest.jpg")}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessible={false}
            />
            <View style={s.coverActions}>
              <IconButton
                icon="gear"
                label={t("profile.settings")}
                bg={C.forest}
                color={C.white}
                size={44}
                onPress={() => setSheet("settings")}
              />
              <IconButton icon="share" label={t("me.share")} bg={C.forest} color={C.white} size={44} onPress={share} />
            </View>
          </View>
          <View style={s.identity}>
            <View style={s.avatarFrame}>
              <Avatar name={profileName(profile.name, t)} seed={seed} seeds={seeds} size={80} />
            </View>
            <View style={s.nameBlock}>
              <TitledName name={profileName(profile.name, t)} badgeId={profile.badgeId} align="center" lines={2} style={s.name} />
              <Text style={s.subline}>
                @{profile.handle} · {t("groups.profilePlace", { place })}
              </Text>
            </View>
            <View style={s.identityTags}>
              <View style={s.role}>
                <Icon name={ROLE_ICON[profile.role]} size={14} color={C.forestInk} />
                <Text style={s.roleText}>{t(`roles.${profile.role}`)}</Text>
              </View>
              <View style={s.city}>
                <Icon name="location" size={13} color={C.mute} />
                <Text numberOfLines={1} style={s.subline}>
                  {place}
                </Text>
              </View>
            </View>
          </View>
          <View style={s.stats}>
            <Stat value={streak} label={t("me.streak")} />
            <Stat value={seeds} label={t("common.seeds")} middle />
            <Stat value={verified} label={t("me.verified")} />
          </View>
          <View style={s.growth}>
            <GrowthCard seed={seed} seeds={seeds} streak={streak} />
          </View>
          <View accessibilityRole="tablist" style={s.tabs}>
            {TABS.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === item.id }}
                aria-selected={tab === item.id}
                accessibilityLabel={t(item.label)}
                onPress={() => {
                  haptic.tap();
                  setTab(item.id);
                }}
                style={[s.tab, tab === item.id && s.activeTab]}
              >
                <Icon name={item.icon} size={17} color={tab === item.id ? C.leaf : C.mute} />
                <Text style={[s.tabText, tab === item.id && { color: C.leaf, fontFamily: F.semibold }]}>{t(item.label)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.panel}>
            {tab === "impact" && <ImpactPanel posts={posts} verifications={verifications} onBadgeOpen={setBadgeOpen} />}
            {tab === "memories" && <MemoriesPanel posts={posts} />}
            {tab === "map" && <ProfileMap posts={posts} />}
          </View>
        </View>
      </ScrollView>
      {sheet !== null && (
        <Sheet key={sheet} title={t(sheet === "edit" ? "profile.edit" : "profile.settings")} onClose={() => setSheet(null)}>
          {sheet === "edit" ? (
            <EditProfile onClose={() => setSheet(null)} />
          ) : (
            <Settings onClose={() => setSheet(null)} onEdit={() => setSheet("edit")} />
          )}
        </Sheet>
      )}
    </View>
  );
}

function Stat({ value, label, middle }: { value: number; label: string; middle?: boolean }) {
  const { C } = useTheme();
  const s = styles(C);
  const { language } = useI18n();
  return (
    <View style={[s.stat, middle && s.middleStat]}>
      <Text style={s.statValue}>{formatNumber(value, language)}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { C } = useTheme();
  const s = styles(C);
  const { top, bottom } = useSafeAreaInsets();
  const { t } = useI18n();
  const ref = useRef<ComponentRef<typeof View>>(null);
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        if (ref.current) {
          if (Platform.OS === "web") ref.current.focus();
          else AccessibilityInfo.sendAccessibilityEvent(ref.current, "focus");
        }
      }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[s.modalRoot, { paddingTop: top + 12 }]}>
        <View accessible={false} style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} onResponderRelease={onClose} />
        <View
          role="dialog"
          aria-modal
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[s.sheet, { maxHeight: "94%", paddingBottom: Math.max(bottom, 20) }]}
        >
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View ref={ref} accessible tabIndex={-1} accessibilityRole="header" accessibilityLabel={title} style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>{title}</Text>
            </View>
            <IconButton icon="close" label={t("common.close")} onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, gap: 20, paddingBottom: 8 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function EditProfile({ onClose }: { onClose: () => void }) {
  const { C } = useTheme();
  const s = styles(C);
  const { t } = useI18n();
  const profile = useApp((s) => s.profile);
  const update = useApp((s) => s.updateProfile);
  const setSeedOf = useApp((s) => s.setSeed);
  const userId = useApp((s) => s.userId);
  const myPosts = useMyPosts();
  const verifiedCount = useApp((s) => s.verifiedCount);
  const [seed, setSeed] = useState(seedOf(userId, profile.seed));
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [role, setRole] = useState(profile.role);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const save = async () => {
    if (busy) return;
    const next = cleanProfile(name, handle, role);
    if (!validProfile(next)) {
      setError(t("profile.invalid"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await update(next);
      if (seed !== profile.seed) setSeedOf(seed);
      if (mounted.current) {
        haptic.success();
        onClose();
        toast(t("profile.saved"));
      }
    } catch (e) {
      if (mounted.current)
        setError(e instanceof HandleTaken ? t("onboarding.handleTaken", { handle: next.handle }) : t("onboarding.offline"));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <>
      <View style={{ alignItems: "center" }}>
        <Avatar name={name || t("common.you")} seed={seed} seeds={seedsOf(myPosts, verifiedCount)} size={72} />
      </View>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t("seed.growth.change")}</Text>
        <SeedPicker value={seed} onChange={setSeed} stage={plantStage(seedsOf(myPosts, verifiedCount))} />
      </View>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t("onboarding.name")}</Text>
        <TextInput
          accessibilityLabel={t("onboarding.name")}
          value={name}
          onChangeText={setName}
          editable={!busy}
          maxLength={50}
          autoCapitalize="words"
          style={s.input}
        />
      </View>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t("onboarding.handle")}</Text>
        <TextInput
          accessibilityLabel={t("onboarding.handleA11y")}
          value={handle}
          onChangeText={setHandle}
          editable={!busy}
          maxLength={25}
          autoCapitalize="none"
          autoCorrect={false}
          style={s.input}
        />
        <Text style={s.subline}>{t("onboarding.handleHint")}</Text>
      </View>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t("onboarding.joining")}</Text>
        <View role="radiogroup" accessibilityLabel={t("onboarding.joining")} style={s.roles}>
          {(Object.keys(ROLE_ICON) as Role[]).map((r) => (
            <Pressable
              key={r}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === r, disabled: busy }}
              aria-checked={role === r}
              accessibilityLabel={t(`roles.${r}`)}
              onPress={() => setRole(r)}
              style={[s.roleOption, role === r && { backgroundColor: C.mint, borderColor: C.leaf }]}
            >
              <Icon name={ROLE_ICON[r]} size={18} color={C.leaf} />
              <Text style={s.fieldLabel}>{t(`roles.${r}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={[s.subline, { color: C.red }]}>
          {error}
        </Text>
      )}
      <Button label={t(busy ? "profile.saving" : "profile.save")} kind="green" disabled={busy} onPress={save} />
    </>
  );
}
function Settings({ onClose, onEdit }: { onClose: () => void; onEdit: () => void }) {
  const { C, T } = useTheme();
  const s = styles(C);
  const { t } = useI18n();
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const explain = useApp((s) => s.explain);
  const setExplain = useApp((s) => s.setExplain);
  const comune = useApp((s) => s.comune);
  const reset = useApp((s) => s.reset);
  const userId = useApp((s) => s.userId);
  const savedCount = useCommunity((s) => Object.keys(s.saved).length);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const go = (path: Href) => {
    onClose();
    router.push(path);
  };
  return (
    <>
      <SettingRow icon="me" label={t("profile.edit")} onPress={onEdit} />
      <View style={{ gap: 10 }}>
        <Text style={s.fieldLabel}>{t("me.appearance")}</Text>
        <Segmented<ThemePref>
          label={t("me.appearance")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t("me.themeSystem") },
            { value: "light", label: t("me.themeLight") },
            { value: "dark", label: t("me.themeDark") },
          ]}
        />
      </View>
      <View style={{ gap: 10 }}>
        <Text style={s.fieldLabel}>{t("common.explainFor")}</Text>
        <Segmented<Explain>
          label={t("common.explainFor")}
          value={explain}
          onChange={setExplain}
          options={[
            { value: "me", label: t("common.me") },
            { value: "class", label: t("common.myClass") },
            { value: "comune", label: t("common.comune") },
          ]}
        />
        <Text style={T.caption}>{t("me.explainHint")}</Text>
      </View>
      <SettingRow icon="location" label={`${t("common.comune")}${comune ? ` · ${comune.name}` : ""}`} onPress={() => go("/comune")} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={s.fieldLabel}>{t("language.row")}</Text>
        <LanguageSwitch />
      </View>
      <View>
        <SettingRow icon="bookmarkFill" label={`${t("community.me.saved")}${savedCount ? ` · ${savedCount}` : ""}`} onPress={() => go("/saved")} />
        <SettingRow icon="pin" label={t("community.me.contributions")} onPress={() => go({ pathname: "/member/[id]", params: { id: userId } })} />
        <SettingRow icon="book" label={t("me.guide")} onPress={() => go("/guide")} />
        <SettingRow icon="shield" label={t("me.sources")} onPress={() => go("/sources")} />
        <SettingRow icon="sparkle" label={t("common.askLeaf")} onPress={() => go("/leaf")} />
      </View>
      {confirm ? (
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={s.fieldLabel}>
            {t("me.signOutTitle")}
          </Text>
          <Text style={T.callout}>{t(supabase ? "me.signOutBody" : "me.signOutLocal")}</Text>
          {error && (
            <Text accessibilityRole="alert" style={{ color: C.red }}>
              {t("onboarding.offline")}
            </Text>
          )}
          <Button
            label={t("me.signOutConfirm")}
            disabled={busy}
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              try {
                const result = await supabase?.auth.signOut();
                if (result?.error) throw result.error;
                reset();
                useCommunity.getState().reset();
                onClose();
                router.replace("/onboarding");
              } catch {
                setError(true);
                setBusy(false);
              }
            }}
          />
          <Button label={t("common.cancel")} onPress={() => setConfirm(false)} disabled={busy} />
        </View>
      ) : (
        <SettingRow icon="refresh" label={t("me.signOut")} onPress={() => setConfirm(true)} />
      )}
      <Text style={T.caption}>{t("me.tagline")}</Text>
    </>
  );
}
function SettingRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { C } = useTheme();
  const s = styles(C);
  return (
    <Press onPress={onPress} accessibilityLabel={label} style={s.settingRow}>
      <Icon name={icon} size={19} color={C.mute} />
      <Text style={[s.fieldLabel, { flex: 1 }]}>{label}</Text>
      <Icon name="chevron" size={14} color={C.mute} />
    </Press>
  );
}
const styles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    page: { width: "100%", maxWidth: 620, alignSelf: "center" },
    cover: { height: 132, marginHorizontal: 16, borderRadius: 24, overflow: "hidden", backgroundColor: C.forest },
    coverActions: { position: "absolute", right: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 8 },
    identity: { alignItems: "center", marginTop: -44, paddingHorizontal: 20, gap: 10 },
    avatarFrame: { borderRadius: 60, padding: 5, backgroundColor: C.bg },
    nameBlock: { width: "100%", alignItems: "center", gap: 4 },
    name: { fontFamily: F.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -1, color: C.ink, textAlign: "center" },
    identityTags: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", alignItems: "center", gap: 12 },
    role: {
      backgroundColor: C.mint,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    roleText: { fontFamily: F.medium, fontSize: 12, color: C.forestInk },
    city: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "55%" },
    subline: { fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: C.mute },
    growth: { marginHorizontal: 20, marginTop: 12 },
    stats: { flexDirection: "row", paddingVertical: 16, marginHorizontal: 20, marginTop: 16, backgroundColor: C.card, borderRadius: 20 },
    stat: { flex: 1, alignItems: "center", gap: 4 },
    middleStat: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.line },
    statValue: { fontFamily: F.medium, fontSize: 28, letterSpacing: -0.8, color: C.ink, fontVariant: ["tabular-nums"] },
    statLabel: { fontFamily: F.regular, fontSize: 12, color: C.mute },
    tabs: { flexDirection: "row", marginHorizontal: 20, marginTop: 12, borderBottomWidth: 1, borderBottomColor: C.line },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      height: 52,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    activeTab: { borderBottomColor: C.leaf, backgroundColor: C.mint, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    tabText: { fontFamily: F.medium, fontSize: 14, color: C.mute },
    panel: { paddingHorizontal: 20, paddingTop: 24 },
    modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: C.scrim },
    sheet: {
      width: "100%",
      maxWidth: 620,
      alignSelf: "center",
      backgroundColor: C.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      flexShrink: 1,
    },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: "center", marginTop: 10 },
    sheetHeader: {
      paddingHorizontal: 24,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sheetTitle: { fontFamily: F.semibold, fontSize: 23, letterSpacing: -0.6, color: C.ink },
    field: { gap: 9 },
    fieldLabel: { fontFamily: F.medium, fontSize: 15, color: C.ink },
    input: {
      backgroundColor: C.card,
      borderRadius: 14,
      paddingHorizontal: 16,
      height: 50,
      fontFamily: F.regular,
      fontSize: 16,
      color: C.ink,
      borderWidth: 1,
      borderColor: C.line,
    },
    roles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    roleOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexBasis: "46%",
      flexGrow: 1,
      paddingHorizontal: 12,
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.line,
    },
    settingRow: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 58, borderBottomWidth: 1, borderBottomColor: C.line },
  });
