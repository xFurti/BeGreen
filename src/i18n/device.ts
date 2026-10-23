import { getLocales } from "expo-localization";

import { languageFromTag } from "@/i18n/locale";
import type { Language } from "@/i18n/schema";

export function deviceLanguage(): Language {
  try {
    const locale = getLocales()[0];
    return languageFromTag(locale?.languageCode ?? locale?.languageTag);
  } catch {
    return "en";
  }
}
