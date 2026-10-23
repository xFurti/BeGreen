import { Linking } from "react-native";

// Opens the phone's maps app with directions to a place. The address is only a label.
export function openDirections(lat: number, lon: number, label?: string) {
  const q = encodeURIComponent(label ?? `${lat},${lon}`);
  const url =
    process.env.EXPO_OS === "ios"
      ? `http://maps.apple.com/?daddr=${lat},${lon}&q=${q}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  return Linking.openURL(url);
}
