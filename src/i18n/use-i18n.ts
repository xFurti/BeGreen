import { useCallback } from "react";

import { translate, type MessageKey, type Translator } from "@/i18n/catalog";
import type { Language } from "@/i18n/schema";
import { useApp } from "@/store/app-store";

export function useI18n(): { language: Language; setLanguage: (language: Language) => void; t: Translator } {
  const language = useApp((s) => s.language);
  const setLanguage = useApp((s) => s.setLanguage);
  const t = useCallback<Translator>((key: MessageKey, params) => translate(language, key, params), [language]);
  return { language, setLanguage, t };
}
