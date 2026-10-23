import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo";
import { Image, type ImageRef } from "expo-image";
import { useEffect, useState } from "react";
import { Platform, StyleSheet } from "react-native";

import { useTheme } from "@/theme/use-theme";
import ProofMapPreview from "@/components/proof-map-preview";
import type { ProofMapProps } from "@/components/proof-map.types";

// Expo Go and unsupported/unconfigured platforms use the tile preview.
// Check support before importing native view managers, including on older iOS.
const supported =
  (Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 18) ||
  (Platform.OS === "android" && Constants.expoConfig?.extra?.androidProofMap === true);
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go must not import absent native view managers.
const Maps: typeof import("expo-maps") | null = supported && requireOptionalNativeModule("ExpoMaps") ? require("expo-maps") : null;

export default function ProofMap({ pins, initialCamera, onCameraMove, onOpenPost }: ProofMapProps) {
  const { scheme } = useTheme();
  const [images, setImages] = useState<Record<string, ImageRef>>({});
  useEffect(() => {
    if (!Maps || !supported) return;
    let active = true;
    Promise.all(
      pins.map(async (pin) => {
        try {
          return [pin.id, await Image.loadAsync(pin.photo, { maxWidth: 56, maxHeight: 56 })] as const;
        } catch {
          return null;
        }
      }),
    ).then((loaded) => {
      if (active) setImages(Object.fromEntries(loaded.filter((image) => image !== null)));
    });
    return () => {
      active = false;
    };
  }, [pins]);

  if (!Maps || !supported)
    return <ProofMapPreview pins={pins} initialCamera={initialCamera} onCameraMove={onCameraMove} onOpenPost={onOpenPost} />;

  const cameraPosition = {
    coordinates: { latitude: initialCamera.latitude, longitude: initialCamera.longitude },
    zoom: initialCamera.zoom,
  };
  const move: NonNullable<import("expo-maps").AppleMaps.MapProps["onCameraMove"]> = (event) => {
    if (event.coordinates.latitude != null && event.coordinates.longitude != null) {
      onCameraMove({ latitude: event.coordinates.latitude, longitude: event.coordinates.longitude, zoom: event.zoom });
    }
  };
  const open = ({ id }: { id?: string }) => {
    if (id && pins.some((pin) => pin.id === id)) onOpenPost(id);
  };
  const markers = pins.map((pin) => ({ id: pin.id, coordinates: { latitude: pin.latitude, longitude: pin.longitude } }));

  if (Platform.OS === "ios")
    return (
      <Maps.AppleMaps.View
        style={StyleSheet.absoluteFill}
        colorScheme={scheme === "dark" ? Maps.AppleMaps.MapColorScheme.DARK : Maps.AppleMaps.MapColorScheme.LIGHT}
        cameraPosition={cameraPosition}
        annotations={markers
          .filter((marker) => images[marker.id])
          .map((marker) => ({ ...marker, icon: images[marker.id], anchor: { x: 0.5, y: 0.5 } }))}
        markers={markers.filter((marker) => !images[marker.id])}
        onAnnotationClick={open}
        onMarkerClick={open}
        onCameraMove={move}
        uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false, togglePitchEnabled: false }}
        properties={{ isMyLocationEnabled: false, selectionEnabled: false, pointsOfInterest: { including: [] } }}
      />
    );

  return (
    <Maps.GoogleMaps.View
      style={StyleSheet.absoluteFill}
      colorScheme={scheme === "dark" ? Maps.GoogleMaps.MapColorScheme.DARK : Maps.GoogleMaps.MapColorScheme.LIGHT}
      cameraPosition={cameraPosition}
      markers={markers.map((marker) => ({ ...marker, icon: images[marker.id], anchor: { x: 0.5, y: 0.5 }, showCallout: false }))}
      onMarkerClick={open}
      onCameraMove={move}
      uiSettings={{
        compassEnabled: false,
        myLocationButtonEnabled: false,
        scaleBarEnabled: false,
        zoomControlsEnabled: false,
        mapToolbarEnabled: false,
        indoorLevelPickerEnabled: false,
      }}
      properties={{ isMyLocationEnabled: false, selectionEnabled: false }}
    />
  );
}
