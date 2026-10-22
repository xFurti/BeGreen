import type { ActionId } from "@/data/actions";
import type { Post, Squad, User } from "@/data/types";

// Demo content so the app feels alive on first launch.
// Photos: Unsplash licence. Avatars: randomuser.me. Proof clips rendered from those photos.

const H = 60 * 60 * 1000;
const now = Date.now();

export const ME_ID = "me";

export const USERS: Record<string, User> = {
  giulia: { id: "giulia", name: "Giulia", handle: "giuliaaa", avatar: require("../../assets/avatars/a1.jpg"), tag: "Liceo Volta · 4B" },
  marco: { id: "marco", name: "Marco", handle: "marcoverde", avatar: require("../../assets/avatars/a2.jpg"), tag: "Liceo Volta · 4B" },
  sofia: { id: "sofia", name: "Sofia", handle: "sofi.sea", avatar: require("../../assets/avatars/a3.jpg"), tag: "Plastic Free Navigli" },
  luca: { id: "luca", name: "Luca", handle: "lucaa", avatar: require("../../assets/avatars/a4.jpg"), tag: "ITIS Feltrinelli" },
  aisha: { id: "aisha", name: "Aisha", handle: "aisha.grows", avatar: require("../../assets/avatars/a5.jpg"), tag: "Liceo Volta · 4B" },
  tommaso: {
    id: "tommaso",
    name: "Tommaso",
    handle: "tommy.thrift",
    avatar: require("../../assets/avatars/a6.jpg"),
    tag: "Liceo Volta · 5A",
  },
  elena: { id: "elena", name: "Elena", handle: "elena_eats", avatar: require("../../assets/avatars/a7.jpg"), tag: "Liceo Carducci" },
  nico: { id: "nico", name: "Nico", handle: "nicobus", avatar: require("../../assets/avatars/a8.jpg"), tag: "Liceo Volta · 4B" },
  bea: { id: "bea", name: "Bea", handle: "bea.wild", avatar: require("../../assets/avatars/a9.jpg"), tag: "WWF Young" },
};

const img = {
  bikeWhite: require("../../assets/demo/bike-white.jpg"),
  bus: require("../../assets/demo/bus.jpg"),
  recycle: require("../../assets/demo/recycle-blue.jpg"),
  beachLitter: require("../../assets/demo/beach-litter.jpg"),
  bottleGreen: require("../../assets/demo/bottle-green.jpg"),
  seedpots: require("../../assets/demo/seedpots.jpg"),
  thriftFlat: require("../../assets/demo/thrift-flatlay.jpg"),
  veggies: require("../../assets/demo/veggies.jpg"),
  ecosign: require("../../assets/demo/ecosign.jpg"),
  fern: require("../../assets/demo/fern-hands.jpg"),
};

const clip = {
  bike: require("../../assets/proof/bike-black.mp4"),
  bins: require("../../assets/proof/bins-color.mp4"),
  cleanup: require("../../assets/proof/beach-cleanup.mp4"),
  bottle: require("../../assets/proof/bottle-green.mp4"),
  soil: require("../../assets/proof/soil.mp4"),
  thrift: require("../../assets/proof/thrift-rack.mp4"),
  leftovers: require("../../assets/proof/leftovers.mp4"),
  bales: require("../../assets/proof/plastic-bales.mp4"),
  recycle: require("../../assets/proof/recycle-blue.mp4"),
  forest: require("../../assets/proof/forest.mp4"),
};

export const DEMO_PHOTO = require("../../assets/demo/bins-park.jpg");
export const DEMO_CLIP = clip.recycle;

// Used by the demo capture on simulators, so the demo matches the chosen act.
export const DEMO_BY_ACTION: Record<ActionId, { photo: number; clip: number }> = {
  move: { photo: img.bikeWhite, clip: clip.bike },
  sort: { photo: DEMO_PHOTO, clip: clip.recycle },
  pickup: { photo: img.beachLitter, clip: clip.cleanup },
  refill: { photo: img.bottleGreen, clip: clip.bottle },
  plant: { photo: img.seedpots, clip: clip.soil },
  spot: { photo: img.fern, clip: clip.forest },
  plate: { photo: img.veggies, clip: clip.leftovers },
  rewear: { photo: img.thriftFlat, clip: clip.thrift },
  save: { photo: require("../../assets/demo/sprig.jpg"), clip: clip.bottle },
  crew: { photo: img.ecosign, clip: clip.bales },
};
export const HERO_PHOTOS = [img.fern, img.bikeWhite, img.seedpots, img.beachLitter];

export const SEED_POSTS: Post[] = [
  {
    id: "p1",
    authorId: "giulia",
    action: "move",
    photo: img.bikeWhite,
    proof: clip.bike,
    caption: "air was trash this morning so i biked. 14 min door to door, faster than the car lol",
    place: "Città Studi, Milano",
    createdAt: now - 0.6 * H,
    verifiedBy: ["marco", "aisha", "nico"],
    reactions: { "💚": 24, "🔥": 11, "🚲": 6 },
    isDrop: true,
    audience: "friends",
    squadId: "s-4b",
    comments: [
      { id: "c1", authorId: "marco", text: "the hill on via Celoria tho 💀", createdAt: now - 0.4 * H },
      { id: "c2", authorId: "aisha", text: "tomorrow we ride together", createdAt: now - 0.3 * H },
    ],
  },
  {
    id: "p2",
    authorId: "sofia",
    action: "pickup",
    photo: img.beachLitter,
    proof: clip.cleanup,
    caption: "Idroscalo shore after the weekend. 3 bags in 40 min. Bring gloves Saturday 🧤",
    place: "Idroscalo, Segrate",
    createdAt: now - 1.5 * H,
    verifiedBy: ["bea", "luca", "elena", "giulia"],
    reactions: { "💚": 61, "😮": 14, "👏": 22 },
    audience: "public",
    comments: [{ id: "c3", authorId: "bea", text: "I'm in for Saturday", createdAt: now - 1.2 * H }],
  },
  {
    id: "p3",
    authorId: "marco",
    action: "sort",
    photo: img.recycle,
    proof: clip.bins,
    caption: "PSA: caps stay ON the bottle in Milano. you're welcome",
    place: "Liceo Volta",
    createdAt: now - 2.2 * H,
    verifiedBy: ["giulia"],
    reactions: { "💚": 9, "🧠": 7 },
    audience: "squad",
    squadId: "s-4b",
    comments: [],
  },
  {
    id: "p4",
    authorId: "aisha",
    action: "plant",
    photo: img.seedpots,
    proof: clip.soil,
    caption: "basil + bee-friendly lavender on the balcony. update in 2 weeks 🌱",
    place: "NoLo, Milano",
    createdAt: now - 3.4 * H,
    verifiedBy: ["giulia", "nico", "tommaso"],
    reactions: { "💚": 33, "🐝": 12 },
    audience: "friends",
    comments: [],
  },
  {
    id: "p5",
    authorId: "bea",
    action: "spot",
    photo: img.fern,
    proof: clip.forest,
    caption: "Common polypody growing on the old wall in Parco Nord. Logged it for the city's species map.",
    place: "Parco Nord Milano",
    createdAt: now - 4.1 * H,
    verifiedBy: ["sofia", "elena", "luca"],
    reactions: { "💚": 18, "🔎": 5 },
    isDrop: false,
    audience: "public",
    comments: [],
  },
  {
    id: "p6",
    authorId: "tommaso",
    action: "rewear",
    photo: img.thriftFlat,
    proof: clip.thrift,
    caption: "full fit for 11€ at the Isola market. new clothes are a scam",
    place: "Isola, Milano",
    createdAt: now - 29 * H,
    verifiedBy: ["marco", "giulia"],
    reactions: { "🔥": 41, "💚": 15 },
    audience: "friends",
    comments: [],
  },
  {
    id: "p7",
    authorId: "nico",
    action: "move",
    photo: img.bus,
    proof: clip.bike,
    caption: "told mom no lift today. the 90 bus is lowkey a vibe",
    place: "Piazzale Loreto",
    createdAt: now - 6 * H,
    verifiedBy: ["giulia", "aisha", "marco"],
    reactions: { "💚": 12, "🚌": 8 },
    isDrop: true,
    audience: "squad",
    squadId: "s-4b",
    comments: [],
  },
  {
    id: "p8",
    authorId: "elena",
    action: "plate",
    photo: img.veggies,
    proof: clip.leftovers,
    caption: "fridge-clearing risotto. nothing wasted this week ✌️",
    place: "Porta Romana",
    createdAt: now - 7.5 * H,
    verifiedBy: ["sofia"],
    reactions: { "💚": 20, "😋": 9 },
    audience: "friends",
    comments: [],
  },
  {
    id: "p9",
    authorId: "luca",
    action: "refill",
    photo: img.bottleGreen,
    proof: clip.bottle,
    caption: "vedovelle > plastic. there's one every 300m in this city",
    place: "Corso Buenos Aires",
    createdAt: now - 31 * H,
    verifiedBy: ["nico", "marco", "sofia"],
    reactions: { "💚": 14, "💧": 6 },
    audience: "public",
    comments: [],
  },
  {
    id: "p10",
    authorId: "giulia",
    action: "crew",
    photo: img.ecosign,
    proof: clip.bales,
    caption: "4B waste audit: 62% of our class bin was recyclable 😳 sending the numbers to the Comune",
    place: "Liceo Volta",
    createdAt: now - 26 * H,
    verifiedBy: ["marco", "aisha", "nico", "tommaso"],
    reactions: { "💚": 52, "📊": 13 },
    audience: "squad",
    squadId: "s-4b",
    comments: [],
  },
];

export const SEED_SQUADS: Squad[] = [
  {
    id: "s-4b",
    name: "Classe 4B",
    kind: "class",
    place: "Liceo Volta · Milano",
    memberIds: ["giulia", "marco", "aisha", "nico"],
    memberCount: 24,
    code: "VOLTA4B",
    points: 4820,
    quest: { title: "Car-free week", action: "move", goal: 120, progress: 87, endsInDays: 3 },
    monthly: { move: 214, sort: 96, refill: 71, plant: 12, crew: 4, plate: 33, rewear: 19 },
  },
  {
    id: "s-navigli",
    name: "Plastic Free Navigli",
    kind: "association",
    place: "Milano",
    memberIds: ["sofia", "bea", "luca"],
    memberCount: 312,
    code: "NAVIGLI",
    points: 18940,
    quest: { title: "1,000 pieces out of the canal", action: "pickup", goal: 1000, progress: 642, endsInDays: 9 },
    monthly: { pickup: 642, sort: 120, refill: 210, crew: 18 },
  },
  {
    id: "s-milano",
    name: "Comune di Milano · Municipio 3",
    kind: "comune",
    place: "Città Studi · Lambrate · Venezia",
    memberIds: ["giulia", "aisha", "elena", "nico"],
    memberCount: 2140,
    code: "MI-MUN3",
    points: 96310,
    quest: { title: "Breathe Better October", action: "move", goal: 10000, progress: 7421, endsInDays: 9 },
    monthly: { move: 7421, sort: 3302, pickup: 812, refill: 2190, plant: 340, spot: 506, plate: 1290, rewear: 610, save: 1880, crew: 77 },
  },
];

export const FRIENDS = ["giulia", "marco", "aisha", "tommaso", "elena", "nico", "luca"];

// Seeds each friend earned this week (demo). Spaced so a single proof can move you up a place.
export const WEEKLY: Record<string, number> = {
  giulia: 345,
  aisha: 270,
  elena: 205,
  marco: 160,
  nico: 105,
  tommaso: 80,
  luca: 50,
};

export const LEAGUE = [
  { id: "l1", name: "Liceo Volta", city: "Milano", points: 24310, delta: +3 },
  { id: "l2", name: "Liceo Carducci", city: "Milano", points: 22870, delta: -1 },
  { id: "l3", name: "ITIS Feltrinelli", city: "Milano", points: 19440, delta: 0 },
  { id: "l4", name: "Liceo Parini", city: "Milano", points: 17105, delta: +1 },
  { id: "l5", name: "Liceo Einstein", city: "Milano", points: 15980, delta: -2 },
];
