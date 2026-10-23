import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui";
import ProofMap from "@/components/proof-map";
import { Image } from "expo-image";
import { useI18n } from "@/i18n/use-i18n";
import { intlLocale } from "@/i18n/format";
import { useTheme } from "@/theme/use-theme";
import type { Post } from "@/data/types";
import { type Palette } from "@/theme/tokens";
import { profileMapCamera, profileMapPins } from "@/utils/profile";

export function ProfileMap({ posts }: { posts: Post[] }) {
  const pins = useMemo(() => profileMapPins(posts), [posts]);
  const areasKey = pins.map((p) => `${p.id}:${p.latitude}:${p.longitude}`).join("|");
  return <LocatedMap key={areasKey} posts={posts} pins={pins} />;
}
function LocatedMap({ posts, pins }: { posts: Post[]; pins: ReturnType<typeof profileMapPins> }) {
  const { C, T } = useTheme();
  const s = styles(C);
  const { t, language } = useI18n();
  const [initialCamera, setInitialCamera] = useState(() => profileMapCamera(pins));
  const camera = useRef(initialCamera);
  const [expanded, setExpanded] = useState(false);
  const openPost = useCallback((id: string) => {
    setInitialCamera(camera.current);
    setExpanded(false);
    router.push({ pathname: "/post/[id]", params: { id } });
  }, []);
  const moveCamera = useCallback((next: typeof initialCamera) => {
    camera.current = next;
  }, []);
  const expand = useCallback(() => {
    setInitialCamera(camera.current);
    setExpanded(true);
  }, []);
  const close = useCallback(() => {
    setInitialCamera(camera.current);
    setExpanded(false);
  }, []);
  const mapProps = { pins, initialCamera, onCameraMove: moveCamera, onOpenPost: openPost };
  if (!pins.length)
    return (
      <View style={{ padding: 24, gap: 12, backgroundColor: C.card, borderRadius: 20 }}>
        <Text style={T.title}>{t("profile.emptyMap")}</Text>
        <Text style={T.callout}>{t("profile.emptyMapBody")}</Text>
      </View>
    );
  return (
    <View style={{ gap: 16 }}>
      <Text style={T.callout}>{t("profile.mapNote")}</Text>
      {expanded ? <View style={s.preview} /> : <MapFrame {...mapProps} onToggle={expand} />}
      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={close}
      >
        {expanded && <MapFrame {...mapProps} fullscreen onToggle={close} />}
      </Modal>
      <ScrollView horizontal contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
        {posts
          .filter((p) => pins.some((pin) => pin.id === p.id))
          .map((post) => (
            <Pressable
              key={post.id}
              accessibilityRole="button"
              accessibilityLabel={t("profile.openMemory", {
                act: t(`actions.${post.action}.label`),
                date: new Date(post.createdAt).toLocaleDateString(intlLocale(language)),
              })}
              onPress={() => openPost(post.id)}
              style={{ width: 104, gap: 6 }}
            >
              <Image source={post.photo} style={{ width: 104, height: 104, borderRadius: 14 }} contentFit="cover" />
              <Text style={T.caption}>{t(`actions.${post.action}.label`)}</Text>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = (C: Palette) =>
  StyleSheet.create({
    preview: { height: 340, borderRadius: 20, overflow: "hidden", backgroundColor: C.card },
    fullscreen: { flex: 1, backgroundColor: C.card },
    control: { position: "absolute", top: 12, right: 12, zIndex: 1000 },
  });

function MapFrame({
  fullscreen = false,
  onToggle,
  ...props
}: import("@/components/proof-map.types").ProofMapProps & { fullscreen?: boolean; onToggle: () => void }) {
  const { C } = useTheme();
  const s = styles(C);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={fullscreen ? s.fullscreen : s.preview}>
      <ProofMap {...props} />
      <View style={[s.control, fullscreen && { top: insets.top + 12, right: Math.max(insets.right, 4) + 12 }]}>
        <IconButton
          icon={fullscreen ? "close" : "expand"}
          label={t(fullscreen ? "profile.closeMap" : "profile.openMap")}
          size={48}
          bg={C.raised}
          color={C.ink}
          onPress={onToggle}
        />
      </View>
    </View>
  );
}
