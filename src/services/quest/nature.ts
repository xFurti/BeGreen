import type { Sentence } from "../../data/quest/types";
import type { Area, NatureData, Species } from "../env";

// The last stop of the Caccia verde is built from live open data around the player:
// species observed within 10 km in the last 30 days (iNaturalist, research grade)
// and the nearest protected area (OpenStreetMap). Every sentence names its source;
// numbers come only from the data, never from a model.

export const INAT = "src-inaturalist";
export const OSM = "src-osm";

export type NatureStop = {
  target: Species;
  /** 3 choices (target included), in a stable order; fewer only if the data has fewer species */
  options: Species[];
  question: string;
  sentences: Sentence[];
  curiosity: { text: string; sourceIds: string[] };
};

export const speciesLabel = (s: Species) => (s.common ? `${s.common} (${s.name})` : s.name);

export function buildNatureStop(nature: NatureData | undefined, areas: Area[] | undefined, placeName: string): NatureStop | null {
  const ranked = [...(nature?.top ?? [])].filter((s) => s.name && s.count > 0).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  if (!nature || !ranked.length) return null;
  const target = ranked[0];
  const options = ranked.slice(0, 3).sort((a, b) => a.name.localeCompare(b.name));
  const area = areas?.[0];

  const sentences: Sentence[] = [
    { text: "Non serve andare lontano: la natura vive anche tra le case, basta saperla guardare.", flavor: true },
    {
      text: `La specie osservata più spesso è ${speciesLabel(target)}: ${target.count} osservazioni verificate entro 10 km negli ultimi 30 giorni.`,
      sourceId: INAT,
    },
    { text: `In tutto, intorno a ${placeName} sono state registrate ${nature.speciesCount} specie nello stesso periodo.`, sourceId: INAT },
    ...(area ? [{ text: `L'area protetta o riserva naturale più vicina è ${area.name}, a ${area.km} km.`, sourceId: OSM }] : []),
    { text: "Attenzione: dove passano più persone arrivano più segnalazioni. Meno avvistamenti non vuol dire meno natura.", sourceId: INAT },
  ];

  return {
    target,
    options,
    question: `Quale specie è stata osservata più spesso entro 10 km da ${placeName} negli ultimi 30 giorni?`,
    sentences,
    curiosity: {
      text: "Questi dati li raccolgono persone come te: qualcuno fotografa una pianta o un animale e la comunità di iNaturalist conferma la specie. Anche una tua foto può diventare un dato.",
      sourceIds: [INAT],
    },
  };
}
