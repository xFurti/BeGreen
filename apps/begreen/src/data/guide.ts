// "Where does it go?" — a pocket guide to sorting waste in Italy.
// Rules differ between Comuni (Tetra Pak and cans are the usual suspects),
// so every answer says when to double-check locally.

export type BinId = "plastic" | "paper" | "glass" | "organic" | "residual" | "special";

export const BINS: Record<BinId, { name: string; it: string; swatch: string; yes: string; no: string }> = {
  plastic: {
    name: "Plastic & metal",
    it: "Plastica e metalli",
    swatch: "#F2C230",
    yes: "Packaging only: bottles, tubs, wrappers, crisp bags, cans, tins, foil.",
    no: "Toys, pens, toothbrushes, buckets. Plastic that isn't packaging goes in general waste.",
  },
  paper: {
    name: "Paper & card",
    it: "Carta e cartone",
    swatch: "#3E63DD",
    yes: "Newspapers, notebooks, cardboard boxes (flattened), paper bags, pizza boxes without food.",
    no: "Receipts, used tissues, greasy paper, baking paper.",
  },
  glass: {
    name: "Glass",
    it: "Vetro",
    swatch: "#1F9D55",
    yes: "Bottles and jars. Empty them; lids go in plastic & metal.",
    no: "Drinking glasses, ceramics, mirrors, Pyrex, light bulbs.",
  },
  organic: {
    name: "Food & organic",
    it: "Umido / organico",
    swatch: "#8B5E3C",
    yes: "Food scraps, coffee grounds, tea bags, eggshells, used paper napkins.",
    no: "Liquids, cooking oil, nappies, cigarette butts.",
  },
  residual: {
    name: "General waste",
    it: "Indifferenziato",
    swatch: "#8E8E93",
    yes: "What can't be recycled: receipts, ceramics, pens, toothbrushes, cigarette butts.",
    no: "Anything that fits another bin. This is the last resort.",
  },
  special: {
    name: "Drop-off point",
    it: "Isola ecologica / punti di raccolta",
    swatch: "#0A0A0A",
    yes: "Batteries, electronics (RAEE), bulbs, cooking oil, medicines, paint.",
    no: "Never in the home bins. Shops and pharmacies often collect them.",
  },
};

export type GuideItem = { name: string; bin: BinId; tip: string; keys?: string };

export const ITEMS: GuideItem[] = [
  { name: "Plastic bottle", bin: "plastic", tip: "Empty, squash it, keep the cap on.", keys: "water bottle pet" },
  { name: "Yogurt pot", bin: "plastic", tip: "Scrape it out, a quick rinse is enough." },
  { name: "Crisp bag", bin: "plastic", tip: "It's packaging, so it goes with plastic.", keys: "chips snack wrapper" },
  { name: "Cling film", bin: "plastic", tip: "Only if clean. Food-covered → general waste.", keys: "plastic wrap" },
  { name: "Drink can", bin: "plastic", tip: "Plastic & metal in most Comuni. Check yours.", keys: "aluminium aluminum soda coke" },
  { name: "Aluminium foil", bin: "plastic", tip: "Ball it up, clean of food.", keys: "tin foil" },
  { name: "Polystyrene food tray", bin: "plastic", tip: "Rinse it. Packaging only.", keys: "styrofoam" },
  { name: "Jar lid", bin: "plastic", tip: "Metal lids go with plastic & metal, not glass.", keys: "cap metal" },
  { name: "Pizza box", bin: "paper", tip: "Paper, if it's just a bit greasy. Scrape off food; soaked bits → general waste.", keys: "cardboard" },
  { name: "Cardboard box", bin: "paper", tip: "Flatten it. Remove tape if you can.", keys: "amazon package" },
  { name: "Notebook", bin: "paper", tip: "Remove spirals and plastic covers.", keys: "paper school" },
  { name: "Tetra Pak carton", bin: "paper", tip: "Paper in many Comuni (e.g. Milano), plastic in others. Check yours.", keys: "milk juice carton" },
  { name: "Glass bottle", bin: "glass", tip: "Empty. No need to remove labels.", keys: "wine beer" },
  { name: "Glass jar", bin: "glass", tip: "Empty and rinse. The lid goes in plastic & metal.", keys: "jam" },
  { name: "Drinking glass", bin: "residual", tip: "Not packaging glass, it melts differently. General waste.", keys: "cup broken" },
  { name: "Ceramic mug", bin: "residual", tip: "Ceramics ruin glass recycling.", keys: "plate cup" },
  { name: "Mirror", bin: "residual", tip: "Wrap it so nobody gets cut." },
  { name: "Coffee grounds", bin: "organic", tip: "Great for compost.", keys: "moka" },
  { name: "Tea bag", bin: "organic", tip: "Remove the staple if there is one." },
  { name: "Eggshells", bin: "organic", tip: "Straight into the organic bin.", keys: "egg" },
  { name: "Used paper napkin", bin: "organic", tip: "Dirty paper goes with food, not paper.", keys: "tissue kitchen roll" },
  { name: "Food leftovers", bin: "organic", tip: "Better: save them for tomorrow. 😉", keys: "food scraps" },
  { name: "Receipt", bin: "residual", tip: "Thermal paper isn't recyclable.", keys: "scontrino ticket" },
  { name: "Toothbrush", bin: "residual", tip: "Not packaging, so not plastic." },
  { name: "Pen", bin: "residual", tip: "General waste. Some shops collect them for recycling.", keys: "marker" },
  { name: "Plastic toy", bin: "residual", tip: "Not packaging. Better still: donate it.", keys: "lego" },
  { name: "Cigarette butt", bin: "residual", tip: "Never on the ground: one butt pollutes litres of water.", keys: "cigarette" },
  { name: "Coffee capsule", bin: "residual", tip: "General waste, unless it's labelled compostable or the brand collects them.", keys: "pod nespresso" },
  { name: "Battery", bin: "special", tip: "Collection boxes at supermarkets and electronics shops.", keys: "batteries aa" },
  { name: "Old phone", bin: "special", tip: "Electronics (RAEE). Shops must take small ones back for free.", keys: "electronics charger cable" },
  { name: "Light bulb", bin: "special", tip: "LED and energy-saving bulbs are electronics.", keys: "led lamp" },
  { name: "Cooking oil", bin: "special", tip: "Never down the sink. Collect it in a bottle and take it to a drop-off point.", keys: "frying" },
  { name: "Medicines", bin: "special", tip: "Pharmacies have collection bins.", keys: "pills drugs" },
  { name: "Old clothes", bin: "special", tip: "Textile collection bins, or better: swap and thrift.", keys: "clothes shoes textile" },
];

export function searchItems(q: string): GuideItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return ITEMS.filter((i) => `${i.name} ${i.keys ?? ""} ${BINS[i.bin].name}`.toLowerCase().includes(s)).slice(0, 8);
}
