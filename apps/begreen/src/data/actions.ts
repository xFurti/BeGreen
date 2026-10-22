import type { IconName } from "@/components/icon";

// The trace's scope: air, water, soil, biodiversity, consumption, mobility, community.
export type Domain = "air" | "water" | "soil" | "nature" | "consumption" | "mobility" | "community";

export const DOMAINS: Record<Domain, { label: string; icon: IconName }> = {
  air: { label: "Air", icon: "air" },
  water: { label: "Water", icon: "drop" },
  soil: { label: "Soil & land", icon: "soil" },
  nature: { label: "Nature", icon: "nature" },
  consumption: { label: "Consumption", icon: "recycle" },
  mobility: { label: "Mobility", icon: "bike" },
  community: { label: "Community", icon: "people" },
};

export type ActionId = "move" | "sort" | "pickup" | "refill" | "plant" | "spot" | "plate" | "rewear" | "save" | "crew";

export type GreenAction = {
  id: ActionId;
  label: string;
  verb: string; // used in "Today I ___"
  icon: IconName;
  domains: Domain[];
  seeds: number;
  // Agenda 2030 goals this act moves.
  sdgs: number[];
  // Three steps for people who don't know where to start.
  howto: string[];
  // Caption starters. Half of BeGreen is the meme.
  captions: string[];
  // What the proof clip should show. Shown on the camera while recording.
  proofHint: string;
  // Conservative per-act estimate shown on profiles. Always labelled as an estimate.
  impact: { value: number; unit: "kg CO₂e" | "items" | "litres" | "records" | "m²"; note: string };
};

export const ACTIONS: Record<ActionId, GreenAction> = {
  move: {
    id: "move",
    label: "Car-free trip",
    verb: "went car-free",
    icon: "bike",
    domains: ["mobility", "air"],
    seeds: 20,
    sdgs: [11, 13, 3],
    howto: [
      "Pick a trip you'd normally do by car: school, gym, a friend's place.",
      "Walk, bike, scooter or take the bus/metro. Under 3 km, walking is often just as fast.",
      "Film 5 seconds of the ride, the walk or the bus pulling in.",
    ],
    captions: [
      "told my mom no lift today",
      "faster than the car, not even close",
      "the 90 bus is lowkey a vibe",
      "my legs filed a complaint",
    ],
    proofHint: "Film the ride, the walk or the bus pulling in.",
    impact: { value: 0.8, unit: "kg CO₂e", note: "≈ a 5 km petrol-car trip avoided (~0.16 kg CO₂e/km)." },
  },
  sort: {
    id: "sort",
    label: "Sorted right",
    verb: "sorted it right",
    icon: "recycle",
    domains: ["consumption", "soil"],
    seeds: 10,
    sdgs: [12, 11],
    howto: [
      "Check what it's made of: plastic, metal, paper, glass, food or mixed.",
      "Empty and quickly rinse it. Flatten boxes and bottles to save space.",
      "Not sure? Search it in the guide. Rules vary by Comune, so check yours.",
    ],
    captions: [
      "caps stay ON. you're welcome",
      "did not know this went in carta",
      "sorting > scrolling",
      "my bin, my rules (the Comune's rules)",
    ],
    proofHint: "Film it going into the right bin.",
    impact: { value: 1, unit: "items", note: "1 item kept out of mixed waste." },
  },
  pickup: {
    id: "pickup",
    label: "Litter pick",
    verb: "picked up litter",
    icon: "trash",
    domains: ["soil", "water", "nature"],
    seeds: 25,
    sdgs: [14, 15, 11],
    howto: [
      "Grab gloves or a reusable bag. Never pick up needles or broken glass by hand.",
      "Choose a spot: a park, the canal, the street outside school.",
      "Bin what you collect, sorted if you can. Film the pick-up and the bin.",
    ],
    captions: [
      "the park is cleaner than my room now",
      "3 bags in 40 min. who's in saturday",
      "found: 1 shoe, 0 owners",
      "free gym, outdoor edition",
    ],
    proofHint: "Film the pick-up and the bin it ends in.",
    impact: { value: 5, unit: "items", note: "Counted per bag of ~5 pieces removed from the ground." },
  },
  refill: {
    id: "refill",
    label: "Refill, not landfill",
    verb: "refilled instead of buying",
    icon: "bottle",
    domains: ["consumption", "water"],
    seeds: 10,
    sdgs: [12, 6],
    howto: [
      "Carry a bottle you already own. No need to buy a new fancy one.",
      "Fill up at home, at school or at a public fountain (Milano has hundreds).",
      "Film the refill in action.",
    ],
    captions: ["fountain water hits different", "1 bottle down, many to go", "hydrated and smug", "plastic who?"],
    proofHint: "Film the refill at a fountain or tap.",
    impact: { value: 1, unit: "items", note: "1 single-use bottle avoided." },
  },
  plant: {
    id: "plant",
    label: "Plant something",
    verb: "planted something",
    icon: "plant",
    domains: ["soil", "nature", "air"],
    seeds: 30,
    sdgs: [15, 13],
    howto: [
      "Start small: herbs, a pot of basil, bee-friendly flowers like lavender.",
      "Use soil with drainage and pick a spot with enough light.",
      "Film hands in the soil, then the plant. Water it.",
    ],
    captions: [
      "plant parent era",
      "update in 2 weeks if it survives",
      "bees, the buffet is open",
      "grew this myself (with help from the sun)",
    ],
    proofHint: "Film hands in the soil, then the plant.",
    impact: { value: 0.25, unit: "m²", note: "Area greened, as declared by you." },
  },
  spot: {
    id: "spot",
    label: "Spot a species",
    verb: "spotted a species",
    icon: "binoculars",
    domains: ["nature"],
    seeds: 20,
    sdgs: [15, 14],
    howto: [
      "Look up and down: birds, bugs, plants on walls, trees in parks.",
      "Keep your distance. Don't touch, chase or pick.",
      "Film it in its habitat, then try to name it with Leaf or iNaturalist.",
    ],
    captions: [
      "new friend unlocked",
      "what is this guy. pls identify",
      "nature documentary narrator voice",
      "spotted in the wild (the park)",
    ],
    proofHint: "Film it in its habitat. No touching, no chasing.",
    impact: { value: 1, unit: "records", note: "1 biodiversity observation you can share with citizen-science projects." },
  },
  plate: {
    id: "plate",
    label: "Zero-waste plate",
    verb: "ate zero-waste",
    icon: "fork",
    domains: ["consumption"],
    seeds: 10,
    sdgs: [12, 2, 13],
    howto: [
      "Cook with what's already in the fridge before buying more.",
      "Try one plant-based meal today.",
      "Save leftovers in a box and film it.",
    ],
    captions: [
      "fridge-clearing risotto",
      "nothing wasted this week",
      "leftovers are just food with a past",
      "plant-based and plot-twisted",
    ],
    proofHint: "Film the leftovers being saved or the plant-based plate.",
    impact: { value: 0.5, unit: "kg CO₂e", note: "Typical saving of a plant-based meal vs. a meat-based one." },
  },
  rewear: {
    id: "rewear",
    label: "Thrift / repair",
    verb: "thrifted or repaired",
    icon: "shirt",
    domains: ["consumption"],
    seeds: 15,
    sdgs: [12, 8],
    howto: [
      "Before buying new: swap, thrift, borrow or repair.",
      "Sew a button, patch a hole, fix a zip. Plenty of 2-minute tutorials out there.",
      "Film the find, the fix or the swap.",
    ],
    captions: ["full fit for 11€", "new clothes are a scam", "fixed it myself, no regrets", "vintage is just clothes with lore"],
    proofHint: "Film the find, the fix or the swap.",
    impact: { value: 1, unit: "items", note: "1 garment kept in use instead of bought new." },
  },
  save: {
    id: "save",
    label: "Save water / energy",
    verb: "saved water or energy",
    icon: "bulb",
    domains: ["water", "air"],
    seeds: 10,
    sdgs: [6, 7, 13],
    howto: [
      "Shorten your shower by 2 minutes. A song is a good timer.",
      "Switch off lights, chargers and screens you're not using.",
      "Film the switch-off or the shower timer.",
    ],
    captions: ["4-minute shower speedrun", "lights off, vibes on", "my electricity bill is shaking", "saved water, earned smugness"],
    proofHint: "Film the switch-off or the 4-minute shower timer.",
    impact: { value: 20, unit: "litres", note: "≈ cutting a shower by 2 minutes (~10 L/min)." },
  },
  crew: {
    id: "crew",
    label: "Squad action",
    verb: "acted with the squad",
    icon: "people",
    domains: ["community"],
    seeds: 40,
    sdgs: [17, 11, 4],
    howto: [
      "Get 3+ people: your class, team or friends.",
      "Pick one thing: a clean-up, a swap party, a bin audit at school.",
      "Film the crew in action and post it to your squad.",
    ],
    captions: ["the squad showed up", "group project but make it useful", "4B carried the planet today", "teamwork makes the earth work"],
    proofHint: "Film the crew in action.",
    impact: { value: 10, unit: "items", note: "Group actions are counted per participant." },
  },
};

export const ACTION_LIST = Object.values(ACTIONS);
