import { fill, flatten, type Language, type Leaves } from "@/i18n/schema";
import { actionMessages } from "@/i18n/messages/actions";
import { generatedMessages } from "@/i18n/messages/generated";
import { guideMessages } from "@/i18n/messages/guide";
import { referenceMessages } from "@/i18n/messages/reference";
import { seedMessages } from "@/i18n/messages/seed";
import { uiMessages } from "@/i18n/messages/ui";

const en = {
  ...uiMessages.en,
  actions: actionMessages.en,
  ref: referenceMessages.en,
  bins: guideMessages.en.bins,
  items: guideMessages.en.items,
  seed: seedMessages.en,
  drop: generatedMessages.en.drop,
  insights: generatedMessages.en.insights,
  answers: generatedMessages.en.leaf,
};

const it = {
  ...uiMessages.it,
  actions: actionMessages.it,
  ref: referenceMessages.it,
  bins: guideMessages.it.bins,
  items: guideMessages.it.items,
  seed: seedMessages.it,
  drop: generatedMessages.it.drop,
  insights: generatedMessages.it.insights,
  answers: generatedMessages.it.leaf,
};

export const messages = { en, it };

export type MessageKey = Leaves<typeof en>;

const flat = {
  en: flatten(en),
  it: flatten(it),
};

const enKeys = Object.keys(flat.en).sort();
const itKeys = Object.keys(flat.it).sort();
const onlyEn = enKeys.filter((key) => !(key in flat.it));
const onlyIt = itKeys.filter((key) => !(key in flat.en));
if (onlyEn.length || onlyIt.length) {
  throw new Error(`i18n key mismatch\nen only: ${onlyEn.join(", ")}\nit only: ${onlyIt.join(", ")}`);
}

export type Translator = (key: MessageKey, params?: Record<string, string | number>) => string;

export function translate(lang: Language, key: MessageKey, params?: Record<string, string | number>) {
  const template = flat[lang][key];
  if (template == null) throw new Error(`Missing translation ${lang}:${key}`);
  return fill(template, params);
}

export function hasMessage(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(flat.en, key);
}

export function translator(lang: Language): Translator {
  return (key, params) => translate(lang, key, params);
}
