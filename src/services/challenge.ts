import type { ActionId } from "@/data/actions";
import type { SourceId } from "@/data/sources";
import type { Comune } from "@/data/types";
import { saveComune } from "@/services/comuni";
import { buildDrop, challengeId, type Drop } from "@/services/drop";
import type { Pulse } from "@/services/env";
import { supabase } from "@/services/supabase";

type Row = {
  id: string;
  day: string;
  action: ActionId;
  title: string;
  why: string;
  metric: string;
  sources: SourceId[];
  data: Drop["data"];
};

const toDrop = (r: Row): Drop => ({ ...r, shared: true });

async function load(id: string): Promise<Drop | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("challenges")
    .select("id, day, action, title, why, metric, sources, data")
    .eq("id", id)
    .maybeSingle<Row>();
  if (error) throw error;
  return data ? toDrop(data) : null;
}

// Today's challenge for a Comune. The first person to open the app today builds it
// from the Comune's live readings; everyone after reads the same row.
// A sample (offline) Pulse never becomes the shared challenge.
export async function ensureChallenge(comune: Comune, pulse: Pulse): Promise<Drop> {
  const id = challengeId(comune.id);
  const built = { ...buildDrop(pulse, id), offline: pulse.sample };
  if (!supabase) return built;
  try {
    if (!(await supabase.auth.getSession()).data.session) return built;
    const existing = await load(id);
    if (existing) return existing;
    if (pulse.sample) return built;
    await saveComune(comune);
    const { error } = await supabase.from("challenges").upsert(
      {
        id,
        comune_id: comune.id,
        day: built.day,
        action: built.action,
        title: built.title,
        why: built.why,
        metric: built.metric,
        sources: built.sources,
        data: built.data,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return (await load(id)) ?? built;
  } catch {
    return built;
  }
}
