// "Where does it go?" — a pocket guide to sorting waste in Italy.
// Names, yes/no and tips live in the language catalog. Search checks both languages.

import { messages } from "@/i18n/catalog";

export type BinId = "plastic" | "paper" | "glass" | "organic" | "residual" | "special";

export const BINS: Record<BinId, { swatch: string; examples: readonly GuideItemId[] }> = {
  plastic: { swatch: "#F2C230", examples: ["plasticBottle", "drinkCan", "yogurtPot"] },
  paper: { swatch: "#3E63DD", examples: ["cardboardBox", "notebook", "pizzaBox"] },
  glass: { swatch: "#1F9D55", examples: ["glassBottle", "glassJar"] },
  organic: { swatch: "#8B5E3C", examples: ["coffeeGrounds", "eggshells", "leftovers"] },
  residual: { swatch: "#8E8E93", examples: ["receipt", "toothbrush", "pen"] },
  special: { swatch: "#0A0A0A", examples: ["battery", "medicines", "oil"] },
};

export type GuideItemId = keyof typeof messages.en.items;

export type GuideItem = { id: GuideItemId; bin: BinId; keys?: string };

export const ITEMS: GuideItem[] = [
  { id: "plasticBottle", bin: "plastic", keys: "water bottle pet bottiglia" },
  { id: "yogurtPot", bin: "plastic", keys: "yoghurt yogurt vasetto" },
  { id: "crispBag", bin: "plastic", keys: "chips snack wrapper patatine sacchetto" },
  { id: "clingFilm", bin: "plastic", keys: "plastic wrap pellicola" },
  { id: "drinkCan", bin: "plastic", keys: "aluminium aluminum soda coke lattina" },
  { id: "foil", bin: "plastic", keys: "tin foil alluminio" },
  { id: "polystyrene", bin: "plastic", keys: "styrofoam polistirolo vassoio" },
  { id: "jarLid", bin: "plastic", keys: "cap metal tappo" },
  { id: "pizzaBox", bin: "paper", keys: "cardboard pizza scatola" },
  { id: "cardboardBox", bin: "paper", keys: "amazon package cartone scatola" },
  { id: "notebook", bin: "paper", keys: "paper school quaderno" },
  { id: "tetraPak", bin: "paper", keys: "tetra pak milk juice carton latte succo" },
  { id: "glassBottle", bin: "glass", keys: "wine beer bottiglia vetro" },
  { id: "glassJar", bin: "glass", keys: "jam vasetto" },
  { id: "drinkingGlass", bin: "residual", keys: "cup broken bicchiere" },
  { id: "ceramicMug", bin: "residual", keys: "plate cup tazza ceramica" },
  { id: "mirror", bin: "residual", keys: "specchio" },
  { id: "coffeeGrounds", bin: "organic", keys: "moka fondi caffè" },
  { id: "teaBag", bin: "organic", keys: "tè tea bustina" },
  { id: "eggshells", bin: "organic", keys: "egg uovo gusci" },
  { id: "napkin", bin: "organic", keys: "tissue kitchen roll tovagliolo fazzoletto" },
  { id: "leftovers", bin: "organic", keys: "food scraps avanzi cibo" },
  { id: "receipt", bin: "residual", keys: "scontrino ticket receipt" },
  { id: "toothbrush", bin: "residual", keys: "spazzolino" },
  { id: "pen", bin: "residual", keys: "marker penna" },
  { id: "toy", bin: "residual", keys: "lego giocattolo" },
  { id: "cigarette", bin: "residual", keys: "cigarette mozzicone sigaretta" },
  { id: "capsule", bin: "residual", keys: "pod nespresso cialda capsula" },
  { id: "battery", bin: "special", keys: "batteries aa batteria pile" },
  { id: "phone", bin: "special", keys: "electronics charger cable telefono" },
  { id: "bulb", bin: "special", keys: "led lamp lampadina" },
  { id: "oil", bin: "special", keys: "frying olio" },
  { id: "medicines", bin: "special", keys: "pills drugs farmaci medicine" },
  { id: "clothes", bin: "special", keys: "clothes shoes textile vestiti abiti" },
];

function haystack(item: GuideItem) {
  return [
    messages.en.items[item.id].name,
    messages.it.items[item.id].name,
    messages.en.items[item.id].tip,
    messages.it.items[item.id].tip,
    messages.en.bins[item.bin].name,
    messages.it.bins[item.bin].name,
    item.keys ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function searchItems(q: string): GuideItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return ITEMS.filter((item) => haystack(item).includes(s)).slice(0, 8);
}
