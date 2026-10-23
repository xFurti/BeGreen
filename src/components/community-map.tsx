import { Image } from "expo-image";
import { memo, useCallback, useImperativeHandle, useMemo, useState, type ReactNode, type Ref } from "react";
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Icon } from "@/components/icon";
import { LoveYourCity } from "@/components/love-your-city";
import { ClusterPin, PIN, SpotDot, SpotPin } from "@/components/spot-pin";
import type { Community, Spot } from "@/data/community";
import { useI18n } from "@/i18n/use-i18n";
import { clusterPins, kmPerUnit, projector, TILE_MAX_ZOOM, tilesFor, tileZoom, type LatLon, type Projector } from "@/services/geo";
import { F, fixed, R } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/utils/format";

// The community's shared map: real OpenStreetMap cartography with BeGreen pins on top, pan and pinch.
// Pins are laid over the tiles rather than inside them, so they stay sharp at any zoom.

// OpenStreetMap's standard tiles: free, no key, for light use with caching and visible credit
// (operations.osmfoundation.org/policies/tiles). A production build swaps this for a keyed provider.
const TILE_URL = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
// The policy requires an HTTP User-Agent that identifies the app. On a phone the image loader otherwise sends a
// generic library one (okhttp, CFNetwork), which the tile servers block ("Access blocked"). Browsers send their
// own User-Agent and a Referer, and passing headers on web would switch expo-image to fetch, so web keeps none.
const TILE_HEADERS = Platform.OS === "web" ? undefined : { "User-Agent": "BeGreen/1.0 (app.begreen; community map)" };
export const MAP_ATTRIBUTION = "© OpenStreetMap contributors";
const LAND = fixed.mapLand;

export type MapHandle = {
  focus: (p: LatLon, zoom?: number) => void;
  zoomBy: (k: number) => void;
};

type Props = {
  community: Community;
  spots: Spot[];
  selectedId?: string | null;
  onSelect?: (s: Spot) => void;
  interactive?: boolean;
  // Your own position, shown only to you.
  me?: LatLon | null;
  // Picking a location: a fixed crosshair, and the point under it after every move.
  picker?: boolean;
  initial?: LatLon | null;
  onCenterChange?: (p: LatLon) => void;
  // Space covered by the screen's own controls (search on top, card at the bottom), so focus centres in what's visible.
  insets?: { top: number; bottom: number };
  ref?: Ref<MapHandle>;
};

const CELL = 42;
// Where a fresh map opens: close enough to read street names in a city.
const START_ZOOM = 13;

type View_ = { k: number; tx: number; ty: number };

// One layer of tiles, laid out at scale `k` (points per map unit) and moved with the gesture's transform.
// At rest the layer's scale equals the map's, so tiles render 1:1 and stay crisp.
const TileLayer = memo(function TileLayer({
  proj,
  z,
  k,
  view,
  s,
  tx,
  ty,
}: {
  proj: Projector;
  z: number;
  k: number;
  view: { x0: number; y0: number; x1: number; y1: number };
  s: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
}) {
  const tiles = useMemo(() => tilesFor(proj, z, view), [proj, z, view]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: s.get() / k }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible", transformOrigin: "0 0" }, style]}>
      {tiles.map((tl) => (
        <Image
          key={tl.key}
          source={{ uri: TILE_URL(tl.z, tl.x, tl.y), headers: TILE_HEADERS }}
          cachePolicy="memory-disk"
          transition={120}
          // A hair of overlap hides seams between neighbouring tiles.
          style={{ position: "absolute", left: tl.left * k, top: tl.top * k, width: tl.size * k + 0.5, height: tl.size * k + 0.5 }}
        />
      ))}
    </Animated.View>
  );
});

function Anchor({
  x,
  y,
  w,
  h,
  s,
  tx,
  ty,
  bottom,
  minScale = 0,
  children,
  pointerEvents = "box-none",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  s: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  bottom?: boolean;
  minScale?: number;
  children: ReactNode;
  pointerEvents?: "box-none" | "none";
}) {
  const style = useAnimatedStyle(() => {
    const k = s.get();
    return {
      opacity: k >= minScale ? 1 : 0,
      transform: [{ translateX: x * k + tx.get() - w / 2 }, { translateY: y * k + ty.get() - (bottom ? h : h / 2) }],
    };
  });
  return (
    <Animated.View pointerEvents={pointerEvents} style={[{ position: "absolute", left: 0, top: 0, width: w, height: h, alignItems: "center", justifyContent: "center" }, style]}>
      {children}
    </Animated.View>
  );
}

// The opening scale: between "all of it" and "filling the screen", never further out than a readable city view.
function openingScale(b: { w: number; h: number }, W: number, H: number, proj: Projector) {
  const contain = Math.min(b.w / W, b.h / H);
  const cover = Math.max(b.w / W, b.h / H);
  const top = (256 * 2 ** TILE_MAX_ZOOM) / proj.world;
  return Math.min(top, Math.max(contain, Math.sqrt(contain * cover) * 1.1, (256 * 2 ** START_ZOOM) / proj.world));
}

// Round distance for the scale bar.
function scaleBar(kmPerPt: number) {
  for (const km of [0.1, 0.25, 0.5, 1, 2, 5, 10]) if (km / kmPerPt >= 46) return { km, pt: km / kmPerPt };
  return { km: 10, pt: 10 / kmPerPt };
}

export function CommunityMap({ community, spots, selectedId, onSelect, interactive = true, me, picker, initial, onCenterChange, insets, ref }: Props) {
  const { C } = useTheme();
  const { t } = useI18n();
  const proj = useMemo(() => projector(community.bbox), [community.bbox]);
  const W = proj.w;
  const H = proj.h;
  const center = useMemo(() => proj.toXY(community.center.lat, community.center.lon), [proj, community.center]);

  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const s = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  // The view the tiles were last fetched for. Updated when a gesture or an animation settles.
  const [view, setView] = useState<View_>({ k: 1, tx: 0, ty: 0 });
  const zoom = view.k;

  // Zoom out until the whole area fits; zoom in to street level.
  const minS = box ? Math.min(box.w / W, box.h / H) : 1;
  const maxS = Math.max(minS, (256 * 2 ** TILE_MAX_ZOOM) / proj.world);
  const visibleTop = insets?.top ?? 0;
  const visibleBottom = insets?.bottom ?? 0;

  // The opening scale: the whole area, but never further out than a readable city view.
  const startK = box ? openingScale(box, W, H, proj) : 1;

  // Puts point `p` (map units) at the centre of the visible area, at scale `k`.
  const placeIn = useCallback(
    (b: { w: number; h: number }, p: { x: number; y: number }, k: number, animate: boolean) => {
      const cy = visibleTop + (b.h - visibleTop - visibleBottom) / 2;
      const clampT = (v: number, size: number, viewSize: number) => (size <= viewSize ? (viewSize - size) / 2 : Math.min(40, Math.max(viewSize - size - 40, v)));
      const nx = clampT(b.w / 2 - p.x * k, W * k, b.w);
      const ny = clampT(cy - p.y * k, H * k, b.h);
      if (animate) {
        s.set(withTiming(k, { duration: 380 }));
        tx.set(withTiming(nx, { duration: 380 }));
        ty.set(withTiming(ny, { duration: 380 }));
      } else {
        s.set(k);
        tx.set(nx);
        ty.set(ny);
      }
      setView({ k, tx: nx, ty: ny });
    },
    [W, H, s, tx, ty, visibleTop, visibleBottom],
  );
  const place = useCallback((p: { x: number; y: number }, k: number, animate: boolean) => box && placeIn(box, p, k, animate), [box, placeIn]);

  const centerOf = useCallback(
    (b: { w: number; h: number }) => {
      const cy = visibleTop + (b.h - visibleTop - visibleBottom) / 2;
      const x = (b.w / 2 - tx.get()) / s.get();
      const y = (cy - ty.get()) / s.get();
      return proj.toLatLon(Math.min(W, Math.max(0, x)), Math.min(H, Math.max(0, y)));
    },
    [proj, s, tx, ty, W, H, visibleTop, visibleBottom],
  );

  const reportCenter = useCallback(() => {
    setView({ k: s.get(), tx: tx.get(), ty: ty.get() });
    if (picker && box && onCenterChange) onCenterChange(centerOf(box));
  }, [picker, box, onCenterChange, centerOf, s, tx, ty]);

  const zoomAround = useCallback(
    (factor: number) => {
      if (!box) return;
      const cy = visibleTop + (box.h - visibleTop - visibleBottom) / 2;
      const c = { x: (box.w / 2 - tx.get()) / s.get(), y: (cy - ty.get()) / s.get() };
      place(c, Math.min(maxS, Math.max(minS, s.get() * factor)), true);
      setTimeout(reportCenter, 400);
    },
    [box, place, maxS, minS, s, tx, ty, reportCenter, visibleTop, visibleBottom],
  );

  useImperativeHandle(
    ref,
    () => ({
      // `z` is how far in, relative to the opening view (2.4 ≈ a neighbourhood).
      focus: (p, z) => {
        place(proj.toXY(p.lat, p.lon), Math.min(maxS, Math.max(s.get(), startK * (z ?? 2.4))), true);
        // A picker follows programmatic moves too, so "confirm" takes the point now under the crosshair.
        setTimeout(reportCenter, 400);
      },
      zoomBy: zoomAround,
    }),
    [place, proj, s, maxS, startK, zoomAround, reportCenter],
  );

  const bw = box?.w ?? 0;
  const bh = box?.h ?? 0;

  const pan = usePanGesture({
    enabled: interactive,
    onUpdate: (e) => {
      "worklet";
      const k = s.get();
      const clampX = (v: number) => (W * k <= bw ? (bw - W * k) / 2 : Math.min(40, Math.max(bw - W * k - 40, v)));
      const clampY = (v: number) => (H * k <= bh ? (bh - H * k) / 2 : Math.min(40, Math.max(bh - H * k - 40, v)));
      tx.set(clampX(tx.get() + e.changeX));
      ty.set(clampY(ty.get() + e.changeY));
    },
    onDeactivate: () => {
      "worklet";
      scheduleOnRN(reportCenter);
    },
  });

  const pinch = usePinchGesture({
    enabled: interactive,
    onUpdate: (e) => {
      "worklet";
      const k = s.get();
      const nk = Math.min(maxS, Math.max(minS, k * e.scaleChange));
      const r = nk / k;
      const clampX = (v: number) => (W * nk <= bw ? (bw - W * nk) / 2 : Math.min(40, Math.max(bw - W * nk - 40, v)));
      const clampY = (v: number) => (H * nk <= bh ? (bh - H * nk) / 2 : Math.min(40, Math.max(bh - H * nk - 40, v)));
      tx.set(clampX(e.focalX - (e.focalX - tx.get()) * r));
      ty.set(clampY(e.focalY - (e.focalY - ty.get()) * r));
      s.set(nk);
    },
    onDeactivate: () => {
      "worklet";
      scheduleOnRN(reportCenter);
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  // Tiles: a coarse layer over the whole area (so panning never shows a blank), and a sharp one for the view.
  const baseZ = box ? Math.max(0, tileZoom(proj, minS) - 1) : 0;
  const baseK = box ? (256 * 2 ** baseZ) / proj.world : 1;
  const whole = useMemo(() => ({ x0: 0, y0: 0, x1: W, y1: H }), [W, H]);
  const detailZ = tileZoom(proj, view.k);
  const visible = useMemo(() => {
    if (!box) return null;
    // A quarter of a screen of margin on every side, for small pans.
    const mx = (box.w * 0.25) / view.k;
    const my = (box.h * 0.25) / view.k;
    return {
      x0: Math.max(0, -view.tx / view.k - mx),
      y0: Math.max(0, -view.ty / view.k - my),
      x1: Math.min(W, (box.w - view.tx) / view.k + mx),
      y1: Math.min(H, (box.h - view.ty) / view.k + my),
    };
  }, [box, view, W, H]);

  const pins = useMemo(
    () =>
      spots
        .filter((sp) => sp.lat != null && sp.lon != null)
        .map((sp) => ({ ...proj.toXY(sp.lat!, sp.lon!), spot: sp }))
        .filter((p) => p.x >= -20 && p.y >= -20 && p.x <= W + 20 && p.y <= H + 20),
    [spots, proj, W, H],
  );
  // Selected pin never hides in a cluster.
  const clusters = useMemo(() => {
    const free = pins.filter((p) => p.spot.id !== selectedId);
    // Static previews show every pin as a dot: nothing to tap, nothing to cluster.
    const out = interactive ? clusterPins(free, CELL / Math.max(zoom, 0.0001), (p) => p.spot.id) : free.map((p) => ({ key: p.spot.id, x: p.x, y: p.y, items: [p] }));
    const sel = pins.find((p) => p.spot.id === selectedId);
    return sel ? [...out, { key: sel.spot.id, x: sel.x, y: sel.y, items: [sel] }] : out;
  }, [pins, zoom, selectedId, interactive]);

  const bar = scaleBar(kmPerUnit(proj, community.center.lat) / Math.max(zoom, 0.0001));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (box && Math.abs(box.w - width) <= 1 && Math.abs(box.h - height) <= 1) return;
    const b = { w: width, h: height };
    setBox(b);
    if (box) return;
    // First layout: open on the centre (or a given point) at a readable city scale, and tell a picker where it starts.
    const k0 = openingScale(b, W, H, proj);
    const top = (256 * 2 ** TILE_MAX_ZOOM) / proj.world;
    placeIn(b, initial ? proj.toXY(initial.lat, initial.lon) : center, initial ? Math.min(top, k0 * 2.2) : k0, false);
    if (picker && onCenterChange) onCenterChange(centerOf(b));
  };

  const content = box && (
    <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {interactive && <TileLayer proj={proj} z={baseZ} k={baseK} view={whole} s={s} tx={tx} ty={ty} />}
      {visible && <TileLayer proj={proj} z={detailZ} k={view.k} view={visible} s={s} tx={tx} ty={ty} />}

      {me && (
        <Anchor x={proj.toXY(me.lat, me.lon).x} y={proj.toXY(me.lat, me.lon).y} w={22} h={22} s={s} tx={tx} ty={ty} pointerEvents="none">
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.blue, borderWidth: 3, borderColor: C.white, boxShadow: "0 0 0 6px rgba(62,99,221,0.18)" }} />
        </Anchor>
      )}

      {clusters.map((c) =>
        c.items.length > 1 ? (
          <Anchor key={`c${c.key}`} x={c.x} y={c.y} w={44} h={44} s={s} tx={tx} ty={ty}>
            <Pressable
              disabled={!interactive}
              accessibilityRole="button"
              accessibilityLabel={t("community.map.cluster", { count: c.items.length })}
              onPress={() => {
                haptic.tap();
                place({ x: c.x, y: c.y }, Math.min(maxS, s.get() * 2.4), true);
              }}
            >
              <ClusterPin count={c.items.length} categories={c.items.map((p) => p.spot.category)} />
            </Pressable>
          </Anchor>
        ) : (
          <Anchor key={c.key} x={c.x} y={c.y} w={interactive ? PIN.w : 14} h={interactive ? PIN.h : 14} s={s} tx={tx} ty={ty} bottom={interactive}>
            {interactive ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("community.map.pin")}
                hitSlop={4}
                onPress={() => {
                  haptic.tap();
                  onSelect?.(c.items[0].spot);
                }}
              >
                <SpotPin spot={c.items[0].spot} selected={c.items[0].spot.id === selectedId} />
              </Pressable>
            ) : (
              <SpotDot spot={c.items[0].spot} />
            )}
          </Anchor>
        ),
      )}

      {picker && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: bw / 2 - 18, top: visibleTop + (bh - visibleTop - visibleBottom) / 2 - 44, width: 36, height: 46, alignItems: "center" }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              borderBottomRightRadius: 4,
              transform: [{ rotate: "45deg" }],
              backgroundColor: C.night,
              borderWidth: 2.5,
              borderColor: C.white,
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.lime }} />
          </View>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.scrim, marginTop: 4 }} />
        </View>
      )}

      {interactive ? (
        <>
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 12, bottom: visibleBottom + 12, gap: 6, backgroundColor: C.veil, borderRadius: R.sm, paddingHorizontal: 9, paddingVertical: 7 }}
          >
            <LoveYourCity height={24} />
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
              <View style={{ width: bar.pt, height: 6, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.ink }} />
              <Text style={{ fontFamily: F.monoMedium, fontSize: 9.5, color: C.ink }}>{bar.km < 1 ? `${bar.km * 1000} m` : `${bar.km} km`}</Text>
            </View>
            <Text style={{ fontFamily: F.mono, fontSize: 8.5, color: C.ink2 }}>{MAP_ATTRIBUTION}</Text>
          </View>
          <View style={{ position: "absolute", right: 12, bottom: visibleBottom + 12, borderRadius: R.md, backgroundColor: C.bg, boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}>
            {(["plus", "minus"] as const).map((icon, i) => (
              <Pressable
                key={icon}
                accessibilityRole="button"
                accessibilityLabel={icon === "plus" ? t("community.map.zoomIn") : t("community.map.zoomOut")}
                onPress={() => {
                  haptic.tap();
                  zoomAround(icon === "plus" ? 2 : 0.5);
                }}
                style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}
              >
                <Icon name={icon} size={16} color={C.ink} />
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text pointerEvents="none" style={{ position: "absolute", right: 6, bottom: 4, fontFamily: F.mono, fontSize: 8, color: C.ink2, backgroundColor: C.veil, paddingHorizontal: 4, borderRadius: 4 }}>
          {MAP_ATTRIBUTION}
        </Text>
      )}
    </View>
  );

  return (
    <View onLayout={onLayout} style={{ flex: 1, overflow: "hidden", backgroundColor: LAND }} accessibilityLabel={t("community.map.a11y", { name: community.name })}>
      {interactive ? <GestureDetector gesture={gesture}>{content || <View style={{ flex: 1 }} />}</GestureDetector> : content}
    </View>
  );
}
