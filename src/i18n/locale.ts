import type { Language } from "@/i18n/schema";

// Italian if the device language is Italian. English, and every other language, stay on the current English copy.
export function languageFromTag(tag: string | null | undefined): Language {
  const code = (tag ?? "").trim().toLowerCase().replace(/_/g, "-").split("-")[0];
  return code === "it" ? "it" : "en";
}
