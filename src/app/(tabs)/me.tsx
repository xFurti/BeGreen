import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { ImpactPanel, MapPanel, MemoriesPanel, PROFILE_MUTED } from "@/components/profile-panels";
import { Avatar, IconButton, Press, toast } from "@/components/ui";
import type { Role } from "@/data/types";
import { seedsOf, streakOf, useApp } from "@/store/app-store";
import { C, F } from "@/theme/tokens";
import { haptic } from "@/utils/format";
import { cleanProfile, ROLE_LABEL, validProfile } from "@/utils/profile";

type ProfileTab = "impact" | "memories" | "map";
const TABS: { id: ProfileTab; label: string; icon: IconName }[] = [
  { id: "impact", label: "Impact", icon: "leaf" },
  { id: "memories", label: "Memories", icon: "calendar" },
  { id: "map", label: "Map", icon: "map" },
];
const ROLE_ICON: Record<Role, IconName> = { student: "school", teacher: "book", association: "people", comune: "building" };

export default function Me() {
  const { top } = useSafeAreaInsets();
  const profile = useApp((s) => s.profile);
  const posts = useApp((s) => s.myPosts);
  const bonus = useApp((s) => s.bonusSeeds);
  const verifications = useApp((s) => Object.keys(s.verified).length);
  const place = useApp((s) => s.place);
  const [tab, setTab] = useState<ProfileTab>("impact");
  const [sheet, setSheet] = useState<"edit" | "settings" | null>(null);
  const streak = streakOf(posts);
  const verified = posts.filter((p) => p.verifiedBy.length >= 3).length;

  const share = async () => {
    try {
      await Share.share({ message: `${profile.name || "I"} on BeGreen: ${verified} verified green acts and a ${streak}-day streak. Proof, not promises. #BeGreen` });
    } catch { toast("Sharing isn’t available right now."); }
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: top + 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={s.page}>
          <View style={s.cover}>
            <Image source={require("../../../assets/demo/forest.jpg")} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="A green forest canopy" />
            <View style={s.coverActions}>
              <IconButton icon="gear" label="Profile settings" bg={C.forest} color={C.white} size={44} onPress={() => setSheet("settings")} />
              <IconButton icon="share" label="Share profile" bg={C.forest} color={C.white} size={44} onPress={share} />
            </View>
          </View>
          <View style={s.identity}>
            <View style={s.avatarFrame}><Avatar name={profile.name || "You"} size={80} /></View>
            <View style={s.nameBlock}>
              <Text accessibilityRole="header" numberOfLines={2} style={s.name}>{profile.name || "You"}</Text>
            </View>
            <View style={s.identityTags}>
              <View style={s.role}>
                <Icon name={ROLE_ICON[profile.role]} size={14} color={C.forest} />
                <Text style={s.roleText}>{ROLE_LABEL[profile.role]}</Text>
              </View>
              <View style={s.city}>
                <Icon name="location" size={13} color={PROFILE_MUTED} />
                <Text numberOfLines={1} style={s.subline}>{place.name}</Text>
              </View>
            </View>
          </View>
          <View style={s.stats}>
            <Stat value={streak} label="Day streak" />
            <Stat value={seedsOf(posts, bonus)} label="Seeds" middle />
            <Stat value={verified} label="Verified" />
          </View>
          <View accessibilityRole="tablist" style={s.tabs}>
            {TABS.map((item) => <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item.id }}
              accessibilityLabel={item.label}
              onPress={() => { haptic.tap(); setTab(item.id); }}
              style={[s.tab, tab === item.id && s.activeTab]}
            >
              <Icon name={item.icon} size={17} color={tab === item.id ? C.leaf : PROFILE_MUTED} />
              <Text style={[s.tabText, tab === item.id && { color: C.leaf, fontFamily: F.semibold }]}>{item.label}</Text>
            </Pressable>)}
          </View>
          <View style={s.panel}>
            {tab === "impact" && <ImpactPanel posts={posts} verifications={verifications} />}
            {tab === "memories" && <MemoriesPanel posts={posts} />}
            {tab === "map" && <MapPanel posts={posts} />}
          </View>
        </View>
      </ScrollView>
      {sheet !== null && <Sheet title={sheet === "edit" ? "Edit profile" : "Settings"} onClose={() => setSheet(null)}>
        {sheet === "edit"
          ? <EditProfile onClose={() => setSheet(null)} />
          : <Settings onClose={() => setSheet(null)} onEdit={() => setSheet("edit")} />}
      </Sheet>}
    </View>
  );
}

function Stat({ value, label, middle }: { value: number; label: string; middle?: boolean }) {
  return <View style={[s.stat, middle && s.middleStat]}>
    <Text style={s.statValue}>{value.toLocaleString("en")}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { top, bottom } = useSafeAreaInsets();
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.modalRoot}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close dialog" />
      <View accessibilityViewIsModal style={[s.sheet, { maxHeight: "94%", marginTop: top + 12, paddingBottom: Math.max(bottom, 20) }]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text accessibilityRole="header" style={s.sheetTitle}>{title}</Text>
          <IconButton icon="close" label={`Close ${title.toLowerCase()}`} size={44} bg={C.card} color={C.ink} onPress={onClose} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, gap: 20, paddingBottom: 8 }}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function EditProfile({ onClose }: { onClose: () => void }) {
  const profile = useApp((s) => s.profile);
  const update = useApp((s) => s.updateProfile);
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [role, setRole] = useState(profile.role);
  const [error, setError] = useState("");
  const save = () => {
    const next = cleanProfile(name, handle, role);
    if (!validProfile(next)) { setError("Add your name and a username of 2–24 letters, numbers or underscores."); return; }
    update(next);
    haptic.success();
    onClose();
    toast("Profile saved");
  };
  return <>
    <View style={{ alignItems: "center", gap: 8 }}>
      <Avatar name={name || "You"} size={72} />
      <Text style={s.subline}>Make it yours.</Text>
    </View>
    <View style={s.field}>
      <Text style={s.fieldLabel}>Full name</Text>
      <TextInput accessibilityLabel="Full name" value={name} onChangeText={setName} maxLength={50} autoCapitalize="words" style={s.input} returnKeyType="next" />
    </View>
    <View style={s.field}>
      <Text style={s.fieldLabel}>Username</Text>
      <TextInput accessibilityLabel="Username" value={handle} onChangeText={setHandle} maxLength={25} autoCapitalize="none" autoCorrect={false} style={s.input} />
      <Text style={s.subline}>2–24 letters, numbers or underscores. Saved on this device.</Text>
    </View>
    <View style={s.field}>
      <Text style={s.fieldLabel}>I’m here as a</Text>
      <View style={s.roles}>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: role === r }} accessibilityLabel={ROLE_LABEL[r]} onPress={() => { setRole(r); haptic.tap(); }} style={[s.roleOption, role === r && { backgroundColor: C.mint, borderColor: C.leaf }]}>
          <Icon name={ROLE_ICON[r]} size={18} color={role === r ? C.leaf : PROFILE_MUTED} />
          <Text style={[s.fieldLabel, { flex: 1, fontSize: 14 }]}>{ROLE_LABEL[r]}</Text>
          {role === r && <Icon name="check" size={16} color={C.leaf} />}
        </Pressable>)}
      </View>
    </View>
    {!!error && <Text accessibilityRole="alert" style={[s.subline, { color: C.red }]}>{error}</Text>}
    <Press onPress={save} accessibilityLabel="Save profile changes" style={s.edit}><Text style={s.editText}>Save changes</Text></Press>
  </>;
}

function Settings({ onClose, onEdit }: { onClose: () => void; onEdit: () => void }) {
  const explain = useApp((s) => s.explain);
  const setExplain = useApp((s) => s.setExplain);
  const reset = useApp((s) => s.reset);
  const [confirmReset, setConfirmReset] = useState(false);
  const go = (path: "/guide" | "/sources" | "/leaf") => { onClose(); router.push(path); };
  return <>
    <SettingRow icon="me" label="Edit profile" onPress={onEdit} />
    <View style={{ gap: 6 }}>
      <Text style={s.fieldLabel}>Make BeGreen work for you</Text>
      <Text style={s.subline}>Choose who the environmental explanations are for.</Text>
      <View style={s.explanations}>
        {([['me', 'Me'], ['class', 'My class'], ['comune', 'Comune']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Explain for ${label}`} accessibilityState={{ checked: explain === value }} onPress={() => { setExplain(value); haptic.tap(); }} style={[s.explanation, explain === value && { backgroundColor: C.white }]}><Text style={[s.fieldLabel, { fontSize: 14 }]}>{label}</Text></Pressable>)}
      </View>
    </View>
    <View>
      <SettingRow icon="book" label="How-to guide" onPress={() => go("/guide")} />
      <SettingRow icon="shield" label="Data sources & trust" onPress={() => go("/sources")} />
      <SettingRow icon="sparkle" label="Ask Leaf" onPress={() => go("/leaf")} />
    </View>
    <View style={{ gap: 12, paddingTop: 8 }}>
      <Text style={s.fieldLabel}>Demo data</Text>
      <Text style={s.subline}>Reset clears your profile, posts and progress on this device and returns to onboarding.</Text>
      {confirmReset ? <View style={{ gap: 12 }}>
        <Text accessibilityRole="alert" style={s.fieldLabel}>Clear all your BeGreen demo data?</Text>
        <Press onPress={() => { reset(); onClose(); router.replace("/onboarding"); }} accessibilityLabel="Confirm reset of all demo data" style={[s.edit, { backgroundColor: C.ink }]}><Text style={s.editText}>Yes, reset demo</Text></Press>
        <Press onPress={() => setConfirmReset(false)} accessibilityLabel="Keep my data" style={s.cancel}><Text style={s.fieldLabel}>Keep my data</Text></Press>
      </View> : <Press onPress={() => setConfirmReset(true)} accessibilityLabel="Reset demo" style={s.cancel}><Text style={s.fieldLabel}>Reset demo</Text><Icon name="refresh" size={17} /></Press>}
    </View>
  </>;
}

function SettingRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return <Press onPress={onPress} accessibilityLabel={label} style={s.settingRow}>
    <Icon name={icon} size={19} color={PROFILE_MUTED} />
    <Text style={[s.fieldLabel, { flex: 1 }]}>{label}</Text>
    <Icon name="chevron" size={14} color={PROFILE_MUTED} />
  </Press>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  page: { width: "100%", maxWidth: 620, alignSelf: "center" },
  cover: { height: 132, marginHorizontal: 16, borderRadius: 24, overflow: "hidden", backgroundColor: C.forest },
  coverActions: { position: "absolute", right: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  identity: { alignItems: "center", marginTop: -44, paddingHorizontal: 20, gap: 10 },
  avatarFrame: { borderRadius: 60, padding: 5, backgroundColor: C.white },
  nameBlock: { alignItems: "center", gap: 4 },
  name: { fontFamily: F.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -1, color: C.ink, textAlign: "center" },
  identityTags: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", alignItems: "center", gap: 12 },
  role: { backgroundColor: C.mint, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  roleText: { fontFamily: F.medium, fontSize: 12, color: C.forest },
  city: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "55%" },
  subline: { fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: PROFILE_MUTED },
  stats: { flexDirection: "row", paddingVertical: 16, marginHorizontal: 20, marginTop: 16, backgroundColor: C.card, borderRadius: 20 },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  middleStat: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#DDE2DD" },
  statValue: { fontFamily: F.medium, fontSize: 28, letterSpacing: -0.8, color: C.ink, fontVariant: ["tabular-nums"] },
  statLabel: { fontFamily: F.regular, fontSize: 12, color: PROFILE_MUTED },
  edit: { flex: 1, minHeight: 48, paddingHorizontal: 22, borderRadius: 25, backgroundColor: C.forest, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  editText: { fontFamily: F.medium, fontSize: 14, color: C.white },
  tabs: { flexDirection: "row", marginHorizontal: 20, marginTop: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 52, borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: C.leaf, backgroundColor: C.mint, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  tabText: { fontFamily: F.medium, fontSize: 14, color: PROFILE_MUTED },
  panel: { paddingHorizontal: 20, paddingTop: 24 },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { width: "100%", maxWidth: 620, alignSelf: "center", backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, flexShrink: 1 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#DDE2DD", alignSelf: "center", marginTop: 10 },
  sheetHeader: { paddingHorizontal: 24, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetTitle: { fontFamily: F.semibold, fontSize: 23, letterSpacing: -0.6, color: C.ink },
  field: { gap: 9 },
  fieldLabel: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  input: { backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16, height: 50, fontFamily: F.regular, fontSize: 16, color: C.ink, borderWidth: 1, borderColor: "#DDE2DD" },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleOption: { flexDirection: "row", alignItems: "center", gap: 8, flexBasis: "46%", flexGrow: 1, paddingHorizontal: 12, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.line },
  explanations: { flexDirection: "row", padding: 4, backgroundColor: C.card, borderRadius: 16, marginTop: 10 },
  explanation: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  settingRow: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 58, borderBottomWidth: 1, borderBottomColor: C.line },
  cancel: { minHeight: 48, borderRadius: 25, backgroundColor: C.card, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
});
