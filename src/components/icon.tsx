import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";

import { useTheme } from "@/theme/use-theme";

type Ion = ComponentProps<typeof Ionicons>["name"];

// One name, two renderings: SF Symbols on iOS, Ionicons elsewhere.
const MAP = {
  home: ["house", "home-outline"],
  homeFill: ["house.fill", "home"],
  pulse: ["waveform.path.ecg", "pulse-outline"],
  pulseFill: ["waveform.path.ecg", "pulse"],
  squads: ["person.3", "people-outline"],
  squadsFill: ["person.3.fill", "people"],
  me: ["person.crop.circle", "person-circle-outline"],
  meFill: ["person.crop.circle.fill", "person-circle"],
  plus: ["plus", "add"],
  close: ["xmark", "close"],
  back: ["chevron.left", "chevron-back"],
  chevron: ["chevron.right", "chevron-forward"],
  check: ["checkmark", "checkmark"],
  checkSeal: ["checkmark.seal.fill", "checkmark-circle"],
  flip: ["arrow.triangle.2.circlepath", "camera-reverse-outline"],
  bolt: ["bolt.fill", "flash"],
  boltOff: ["bolt.slash.fill", "flash-off"],
  photo: ["photo.on.rectangle", "images-outline"],
  sparkle: ["sparkles", "sparkles"],
  info: ["info.circle", "information-circle-outline"],
  location: ["location.fill", "location"],
  flame: ["flame.fill", "flame"],
  leaf: ["leaf.fill", "leaf"],
  air: ["wind", "cloudy-outline"],
  sun: ["sun.max.fill", "sunny"],
  drop: ["drop.fill", "water"],
  soil: ["square.stack.3d.down.forward.fill", "layers"],
  nature: ["leaf.fill", "leaf"],
  tree: ["tree.fill", "leaf"],
  people: ["person.2.fill", "people"],
  bike: ["bicycle", "bicycle"],
  bus: ["bus.fill", "bus"],
  recycle: ["arrow.3.trianglepath", "sync"],
  trash: ["trash.fill", "trash"],
  bottle: ["waterbottle.fill", "flask"],
  walk: ["figure.walk", "walk-outline"],
  plant: ["leaf.arrow.triangle.circlepath", "flower-outline"],
  binoculars: ["binoculars.fill", "eye"],
  fork: ["fork.knife", "restaurant"],
  shirt: ["tshirt.fill", "shirt"],
  bulb: ["lightbulb.fill", "bulb"],
  hands: ["hands.sparkles.fill", "hand-left"],
  chat: ["bubble.left.fill", "chatbubble"],
  chatOutline: ["bubble.left", "chatbubble-outline"],
  share: ["square.and.arrow.up", "share-outline"],
  send: ["arrow.up", "arrow-up"],
  lock: ["lock.fill", "lock-closed"],
  play: ["play.fill", "play"],
  trophy: ["trophy.fill", "trophy"],
  map: ["map.fill", "map"],
  expand: ["arrow.up.left.and.arrow.down.right", "expand-outline"],
  chart: ["chart.bar.fill", "bar-chart"],
  gear: ["gearshape.fill", "settings"],
  globe: ["globe.europe.africa.fill", "globe"],
  school: ["graduationcap.fill", "school"],
  building: ["building.columns.fill", "business"],
  ellipsis: ["ellipsis", "ellipsis-horizontal"],
  seed: ["circle.hexagongrid.fill", "ellipse"],
  calendar: ["calendar", "calendar-outline"],
  shield: ["checkmark.shield.fill", "shield-checkmark"],
  flag: ["flag", "flag-outline"],
  doc: ["doc.text.fill", "document-text"],
  link: ["arrow.up.right", "open-outline"],
  thermometer: ["thermometer.medium", "thermometer"],
  camera: ["camera.fill", "camera"],
  video: ["video.fill", "videocam"],
  refresh: ["arrow.clockwise", "refresh"],
  search: ["magnifyingglass", "search"],
  help: ["questionmark", "help"],
  book: ["book.closed.fill", "book"],
  hand: ["hand.point.right.fill", "hand-right"],
  bell: ["bell.fill", "notifications"],
  arrowUp: ["arrow.up", "arrow-up"],
  arrowRight: ["arrow.right", "arrow-forward"],
  crown: ["crown.fill", "trophy"],
  league: ["chart.bar.xaxis", "podium-outline"],
  leagueFill: ["chart.bar.xaxis", "podium"],
  heart: ["heart.fill", "heart"],
  community: ["person.3.sequence", "people-circle-outline"],
  communityFill: ["person.3.sequence.fill", "people-circle"],
  wrench: ["wrench.and.screwdriver.fill", "build"],
  swap: ["arrow.left.arrow.right", "swap-horizontal"],
  alert: ["exclamationmark.triangle.fill", "warning"],
  bookmark: ["bookmark", "bookmark-outline"],
  bookmarkFill: ["bookmark.fill", "bookmark"],
  filter: ["line.3.horizontal.decrease", "options-outline"],
  layers: ["square.3.layers.3d", "layers-outline"],
  directions: ["arrow.triangle.turn.up.right.diamond.fill", "navigate"],
  locate: ["location.circle", "locate"],
  minus: ["minus", "remove"],
  block: ["hand.raised.slash.fill", "ban"],
  pencil: ["pencil", "create-outline"],
  pin: ["mappin.and.ellipse", "pin"],
  family: ["figure.2.and.child.holdinghands", "people"],
} as const satisfies Record<string, readonly [string, Ion]>;

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 22, color: tint }: { name: IconName; size?: number; color?: string }) {
  const { C } = useTheme();
  const color = tint ?? C.ink;
  const [sf, ion] = MAP[name];
  if (process.env.EXPO_OS === "ios") {
    return <Image source={`sf:${sf}`} style={{ width: size, height: size }} tintColor={color} contentFit="contain" />;
  }
  return <Ionicons name={ion} size={size} color={color} />;
}
