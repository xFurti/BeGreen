import type { Media } from "@/data/types";
import { proofPath } from "@/services/storage-path";
import { SUPABASE_URL, supabase } from "@/services/supabase";

const cache = new Map<string, { url: string; until: number }>();
let accessVersion = 0;
export const mediaAccessVersion = () => accessVersion;

export async function signedMedia(values: Media[]): Promise<Map<Media, Media>> {
  const result = new Map(values.map((v) => [v, v]));
  if (!supabase) return result;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");
  const uid = session.user.id;
  const paths = [...new Set(values.flatMap((v) => typeof v === "string" ? proofPath(v, SUPABASE_URL) ?? [] : []))];
  const missing = paths.filter((p) => (cache.get(`${uid}:${p}`)?.until ?? 0) < Date.now());
  if (missing.length) {
    const { data, error } = await supabase.storage.from("proofs").createSignedUrls(missing, 300);
    if (error) throw error;
    if (cache.size > 1500) cache.clear();
    for (const item of data ?? []) {
      if (!item.path || !item.signedUrl || item.error) throw new Error("Media not accessible");
      cache.set(`${uid}:${item.path}`, { url: item.signedUrl, until: Date.now() + 240e3 });
    }
  }
  for (const value of values) {
    const path = typeof value === "string" ? proofPath(value, SUPABASE_URL) : null;
    if (path) {
      const entry = cache.get(`${uid}:${path}`);
      if (!entry) throw new Error("Media not accessible");
      result.set(value, entry.url);
    }
  }
  return result;
}

export function clearMediaAccess() {
  accessVersion += 1;
  cache.clear();
}
