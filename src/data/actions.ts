import type { IconName } from "@/components/icon";

// The trace's scope: air, water, soil, biodiversity, consumption, mobility, community.
export type Domain = "air" | "water" | "soil" | "nature" | "consumption" | "mobility" | "community";

export const DOMAINS: Record<Domain, { icon: IconName }> = {
  air: { icon: "air" },
  water: { icon: "drop" },
  soil: { icon: "soil" },
  nature: { icon: "nature" },
  consumption: { icon: "recycle" },
  mobility: { icon: "bike" },
  community: { icon: "people" },
};

export type ActionId = "move" | "sort" | "pickup" | "refill" | "plant" | "spot" | "plate" | "rewear" | "save" | "crew";

export type ImpactUnit = "kg CO₂e" | "items" | "litres" | "records" | "m²";

export type GreenAction = {
  id: ActionId;
  icon: IconName;
  domains: Domain[];
  seeds: number;
  sdgs: number[];
  impact: { value: number; unit: ImpactUnit };
};

export const ACTIONS: Record<ActionId, GreenAction> = {
  move: { id: "move", icon: "bike", domains: ["mobility", "air"], seeds: 20, sdgs: [11, 13, 3], impact: { value: 0.8, unit: "kg CO₂e" } },
  sort: { id: "sort", icon: "recycle", domains: ["consumption", "soil"], seeds: 10, sdgs: [12, 11], impact: { value: 1, unit: "items" } },
  pickup: { id: "pickup", icon: "trash", domains: ["soil", "water", "nature"], seeds: 25, sdgs: [14, 15, 11], impact: { value: 5, unit: "items" } },
  refill: { id: "refill", icon: "bottle", domains: ["consumption", "water"], seeds: 10, sdgs: [12, 6], impact: { value: 1, unit: "items" } },
  plant: { id: "plant", icon: "plant", domains: ["soil", "nature", "air"], seeds: 30, sdgs: [15, 13], impact: { value: 0.25, unit: "m²" } },
  spot: { id: "spot", icon: "binoculars", domains: ["nature"], seeds: 20, sdgs: [15, 14], impact: { value: 1, unit: "records" } },
  plate: { id: "plate", icon: "fork", domains: ["consumption"], seeds: 10, sdgs: [12, 2, 13], impact: { value: 0.5, unit: "kg CO₂e" } },
  rewear: { id: "rewear", icon: "shirt", domains: ["consumption"], seeds: 15, sdgs: [12, 8], impact: { value: 1, unit: "items" } },
  save: { id: "save", icon: "bulb", domains: ["water", "air"], seeds: 10, sdgs: [6, 7, 13], impact: { value: 20, unit: "litres" } },
  crew: { id: "crew", icon: "people", domains: ["community"], seeds: 40, sdgs: [17, 11, 4], impact: { value: 10, unit: "items" } },
};

export const ACTION_LIST = Object.values(ACTIONS);
