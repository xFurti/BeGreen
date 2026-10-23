import type { Language } from "@/i18n/schema";

export function intlLocale(lang: Language) {
  return lang === "it" ? "it-IT" : "en-US";
}

export function formatNumber(n: number, lang: Language, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale(lang), { useGrouping: true, ...options }).format(n);
}

export function formatDecimal(n: number, lang: Language, digits: number) {
  return formatNumber(n, lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function monthName(date: Date, lang: Language) {
  const name = new Intl.DateTimeFormat(intlLocale(lang), { month: "long" }).format(date);
  return name.charAt(0).toLocaleUpperCase(intlLocale(lang)) + name.slice(1);
}

// Monday first, matching the Memories grid. Italian initials are fixed by the product copy.
export function weekdayInitials(lang: Language): readonly string[] {
  return lang === "it" ? ["L", "M", "M", "G", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];
}

export function timeAgo(t: number, lang: Language, now = Date.now()) {
  const s = Math.max(1, Math.round((now - t) / 1000));
  if (s < 60) return lang === "it" ? "ora" : "now";
  const m = Math.round(s / 60);
  if (m < 60) return lang === "it" ? `${m} min` : `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return lang === "it" ? `${h} h` : `${h}h`;
  const d = Math.round(h / 24);
  return lang === "it" ? `${d} g` : `${d}d`;
}

export function compact(n: number, lang: Language) {
  if (n >= 1e6) return `${formatDecimal(n / 1e6, lang, 1).replace(/[,.]0$/, "")}M`;
  if (n >= 1e4) return `${formatNumber(Math.round(n / 1e3), lang)}k`;
  if (n >= 1e3) return `${formatDecimal(n / 1e3, lang, 1).replace(/[,.]0$/, "")}k`;
  return formatNumber(n, lang);
}
