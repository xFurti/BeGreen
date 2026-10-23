import type { Translator } from "@/i18n/catalog";
import { hasMessage, translate } from "@/i18n/catalog";
import { HIDDEN_PLACE, normalizeQuestTitle } from "@/i18n/persist";
import type { Language } from "@/i18n/schema";
import { ACTIONS, type ActionId, type Domain } from "@/data/actions";
import type { BinId } from "@/data/guide";
import type { SourceId, SourceKind } from "@/data/sources";
import type { SquadKind } from "@/data/types";

const HOWTO = ["a", "b", "c"] as const;
const CAPTIONS = ["a", "b", "c", "d"] as const;

const UNIT_KEY = {
  "kg CO₂e": "kg",
  items: "items",
  litres: "litres",
  records: "records",
  "m²": "m2",
} as const;

export function actionCopy(t: Translator, id: ActionId) {
  const base = ACTIONS[id];
  return {
    ...base,
    label: t(`actions.${id}.label`),
    verb: t(`actions.${id}.verb`),
    proofHint: t(`actions.${id}.proofHint`),
    howto: HOWTO.map((key) => t(`actions.${id}.howto.${key}`)),
    captions: CAPTIONS.map((key) => t(`actions.${id}.captions.${key}`)),
    impact: {
      ...base.impact,
      unitLabel: t(`ref.units.${UNIT_KEY[base.impact.unit]}`),
      note: t(`actions.${id}.impactNote`),
    },
  };
}

export function domainLabel(t: Translator, id: Domain) {
  return t(`ref.domains.${id}`);
}

export function sdgTitle(t: Translator, goal: number) {
  const key = `ref.sdgs.n${goal}`;
  return hasMessage(key) ? t(key) : `SDG ${goal}`;
}

export function squadKindLabel(t: Translator, kind: SquadKind) {
  return t(`ref.squadKinds.${kind}`);
}

export function questTitle(t: Translator, stored: string) {
  const key = normalizeQuestTitle(stored);
  const path = `ref.quests.${key}`;
  return hasMessage(path) ? t(path) : stored;
}

export function sourceKindCopy(t: Translator, kind: SourceKind) {
  return {
    label: t(`ref.sourceKinds.${kind}.label`),
    short: t(`ref.sourceKinds.${kind}.short`),
    what: t(`ref.sourceKinds.${kind}.what`),
    goodFor: t(`ref.sourceKinds.${kind}.goodFor`),
    careful: t(`ref.sourceKinds.${kind}.careful`),
  };
}

export function sourceCopy(t: Translator, id: SourceId) {
  return {
    name: t(`ref.sources.${id}.name`),
    provider: t(`ref.sources.${id}.provider`),
    terms: t(`ref.sources.${id}.terms`),
  };
}

export function binCopy(t: Translator, id: BinId) {
  return {
    name: t(`bins.${id}.name`),
    yes: t(`bins.${id}.yes`),
    no: t(`bins.${id}.no`),
  };
}

export function itemCopy(t: Translator, id: string) {
  const nameKey = `items.${id}.name`;
  const tipKey = `items.${id}.tip`;
  return {
    name: hasMessage(nameKey) ? t(nameKey) : id,
    tip: hasMessage(tipKey) ? t(tipKey) : "",
  };
}

export function textOf(fallback: string, key: string | undefined, lang: Language) {
  if (key && hasMessage(key)) return translate(lang, key);
  return fallback;
}

export function placeLabel(name: string, t: Translator) {
  if (!name || name === "Your area") return t("common.yourArea");
  if (name === HIDDEN_PLACE || name === "Somewhere green") return t("capture.somewhere");
  return name;
}

export function profileName(name: string, t: Translator) {
  return name.trim() || t("common.you");
}
