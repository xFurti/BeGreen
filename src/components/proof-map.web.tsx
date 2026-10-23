import { useI18n } from "@/i18n/use-i18n";
import { useTheme } from "@/theme/use-theme";
import { Asset } from "expo-asset";
import { useEffect, useRef, useState } from "react";

import type { ProofMapProps } from "@/components/proof-map.types";
import "./proof-map.web.css";

// Expo Maps has no web view. The web preview uses the same pins and post links.
export default function ProofMap({ pins, initialCamera, onCameraMove, onOpenPost }: ProofMapProps) {
  const { C } = useTheme();
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    let map: import("leaflet").Map | undefined;
    let observer: ResizeObserver | undefined;
    import("leaflet")
      .then((L) => {
        if (!active || !container.current) return;
        map = L.map(container.current, { zoomControl: false, attributionControl: true }).setView(
          [initialCamera.latitude, initialCamera.longitude],
          initialCamera.zoom,
        );
        map.attributionControl.setPrefix(false);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        for (const pin of pins) {
          const photo = document.createElement("img");
          photo.src = Asset.fromModule(pin.photo).uri;
          photo.alt = "";
          Object.assign(photo.style, {
            width: "52px",
            height: "52px",
            objectFit: "cover",
            border: `3px solid ${C.white}`,
            borderRadius: "15px",
            boxSizing: "border-box",
            background: C.forest,
          });
          const marker = L.marker([pin.latitude, pin.longitude], {
            icon: L.divIcon({ html: photo, className: "proof-map-photo", iconSize: [52, 52], iconAnchor: [26, 26] }),
            alt: t("profile.openProof"),
            keyboard: true,
          })
            .addTo(map)
            .on("click", () => onOpenPost(pin.id));
          marker.getElement()?.setAttribute("aria-label", t("profile.openProof"));
        }
        map.on("moveend", () => {
          const center = map!.getCenter();
          onCameraMove({ latitude: center.lat, longitude: center.lng, zoom: map!.getZoom() });
        });
        observer = new ResizeObserver(() => map?.invalidateSize());
        observer.observe(container.current);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      observer?.disconnect();
      map?.remove();
    };
  }, [pins, initialCamera, onCameraMove, onOpenPost, C, t]);

  return failed ? (
    <div role="alert" style={{ padding: 24, color: C.ink }}>
      {t("profile.mapFailed")}
    </div>
  ) : (
    <div
      ref={container}
      aria-label={t("profile.mapLabel")}
      style={{ position: "absolute", inset: 0, isolation: "isolate", background: C.card }}
    />
  );
}
