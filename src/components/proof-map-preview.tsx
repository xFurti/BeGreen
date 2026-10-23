import { Image } from "expo-image";
import { useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { ProofMapProps } from "@/components/proof-map.types";
import { type Palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { useI18n } from "@/i18n/use-i18n";
import { mapPreview } from "@/utils/profile";

// Compatibility preview for Expo Go; Expo Maps itself requires a native build.
export default function ProofMapPreview({ pins, initialCamera, onOpenPost }: ProofMapProps) {
  const { C } = useTheme();
  const s = styles(C);
  const { t } = useI18n();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const zoom = Math.floor(initialCamera.zoom);
  const world = 256 * 2 ** zoom;
  const project = (latitude: number, longitude: number) => {
    const sin = Math.sin((latitude * Math.PI) / 180);
    return { x: ((longitude + 180) / 360) * world, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world };
  };
  const center = project(initialCamera.latitude, initialCamera.longitude);
  return (
    <View style={StyleSheet.absoluteFill} onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {size.width > 0 &&
        mapPreview(initialCamera.latitude, initialCamera.longitude, size.width, size.height, zoom).map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.url, ...(Platform.OS !== "web" ? { headers: { "User-Agent": "BeGreen/1.0 (hackathon prototype)" } } : {}) }}
            cachePolicy="disk"
            style={{ position: "absolute", left: tile.left, top: tile.top, width: 256, height: 256 }}
          />
        ))}
      {size.width > 0 &&
        pins.map((pin) => {
          const point = project(pin.latitude, pin.longitude);
          return (
            <Pressable
              key={pin.id}
              accessibilityRole="button"
              accessibilityLabel={t("profile.openProof")}
              onPress={() => onOpenPost(pin.id)}
              style={[s.pin, { left: size.width / 2 + point.x - center.x - 26, top: size.height / 2 + point.y - center.y - 26 }]}
            >
              <Image source={pin.photo} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          );
        })}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="OpenStreetMap attribution"
        onPress={() => Linking.openURL("https://www.openstreetmap.org/copyright").catch(() => {})}
        style={s.attribution}
      >
        <Text style={{ fontSize: 11, color: C.ink }}>© OpenStreetMap</Text>
      </Pressable>
    </View>
  );
}

const styles = (C: Palette) =>
  StyleSheet.create({
    pin: {
      position: "absolute",
      width: 52,
      height: 52,
      borderRadius: 15,
      borderWidth: 3,
      borderColor: C.white,
      overflow: "hidden",
      backgroundColor: C.leaf,
    },
    attribution: { position: "absolute", bottom: 0, right: 0, padding: 6, backgroundColor: C.raised },
  });
