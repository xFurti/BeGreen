import type { Language } from "@/i18n/schema";

export const HIDDEN_PLACE = "hidden";

const QUEST_TITLES: Record<string, string> = {
  "Car-free week": "carFreeWeek",
  "1,000 pieces out of the canal": "canalPieces",
  "Breathe Better October": "breatheOctober",
  "First 10 proofs": "firstProofs",
  carFreeWeek: "carFreeWeek",
  canalPieces: "canalPieces",
  breatheOctober: "breatheOctober",
  firstProofs: "firstProofs",
};

export function normalizeQuestTitle(title: string) {
  return QUEST_TITLES[title] ?? title;
}

type ProfileLike = { name?: string; handle?: string; role?: string };
type PlaceLike = { name?: string; lat?: number; lon?: number };
type SquadLike = { quest?: { title?: string } };

// Fills a missing language from the device rule and rewrites known app copy to stable keys.
// Posts, streaks, squads and verifications stay as they were saved.
export function applyPersisted<T extends Record<string, unknown>>(
  raw: T,
  fallback: Language,
): Omit<T, "language"> & { language: Language } {
  const language: Language = raw.language === "it" || raw.language === "en" ? raw.language : fallback;

  const profile = raw.profile as ProfileLike | undefined;
  const nextProfile =
    profile && profile.name === "You" && profile.handle === "you" ? { ...profile, name: "" } : profile;

  const place = raw.place as PlaceLike | undefined;
  const nextPlace =
    place && place.name === "Your area" ? { ...place, name: "" } : place && place.name === "Somewhere green" ? { ...place, name: HIDDEN_PLACE } : place;

  const squads = Array.isArray(raw.squads)
    ? (raw.squads as SquadLike[]).map((squad) =>
        squad.quest?.title
          ? { ...squad, quest: { ...squad.quest, title: normalizeQuestTitle(squad.quest.title) } }
          : squad,
      )
    : raw.squads;

  return {
    ...raw,
    language,
    ...(profile ? { profile: nextProfile } : {}),
    ...(place ? { place: nextPlace } : {}),
    ...(Array.isArray(raw.squads) ? { squads } : {}),
  };
}
