import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui";
import ProofMap from "@/components/proof-map";
import { SEED_POSTS } from "@/data/seed";
import type { Post } from "@/data/types";
import { C } from "@/theme/tokens";
import { profileMapCamera, profileMapPins } from "@/utils/profile";

export function ProfileMap({ posts }: { posts: Post[] }) {
  const insets = useSafeAreaInsets();
  const pins = useMemo(() => profileMapPins(posts, SEED_POSTS), [posts]);
  const [initialCamera, setInitialCamera] = useState(() => profileMapCamera(pins));
  const camera = useRef(initialCamera);
  const [expanded, setExpanded] = useState(false);
  const openPost = useCallback((id: string) => {
    setInitialCamera(camera.current);
    setExpanded(false);
    router.push({ pathname: "/post/[id]", params: { id } });
  }, []);
  const moveCamera = useCallback((next: typeof initialCamera) => { camera.current = next; }, []);
  const toggle = (fullscreen: boolean) => {
    setInitialCamera(camera.current);
    setExpanded(!fullscreen);
  };
  const map = (fullscreen: boolean) => <View style={fullscreen ? s.fullscreen : s.preview}>
    <ProofMap pins={pins} initialCamera={initialCamera} onCameraMove={moveCamera} onOpenPost={openPost} />
    <View style={[s.control, fullscreen && { top: insets.top + 12, right: Math.max(insets.right, 4) + 12 }]}>
      <IconButton icon={fullscreen ? "close" : "expand"} label={fullscreen ? "Close fullscreen map" : "Open map fullscreen"} size={48} bg={C.white} color={C.ink} onPress={() => toggle(fullscreen)} />
    </View>
  </View>;

  return <>
    {expanded ? <View style={s.preview} /> : map(false)}
    <Modal visible={expanded} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={() => toggle(true)}>
      {expanded && map(true)}
    </Modal>
  </>;
}

const s = StyleSheet.create({
  preview: { height: 340, borderRadius: 20, overflow: "hidden", backgroundColor: C.card },
  fullscreen: { flex: 1, backgroundColor: C.card },
  control: { position: "absolute", top: 12, right: 12, zIndex: 1000 },
});
