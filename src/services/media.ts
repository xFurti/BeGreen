import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import type { Media } from "@/data/types";
import { fitWithin, preferLocal as preferLocalPure } from "@/services/media-pure";

export { fitWithin, MAX_PHOTO_SIDE, MAX_PROOF_BYTES, proofWithinBudget } from "@/services/media-pure";

// Camera output lands in the cache, which iOS may purge.
// Move proofs into the documents folder so your Memories survive.
export function persistMedia(uri: string): string {
  if (process.env.EXPO_OS === "web" || !uri.startsWith("file:")) return uri;
  try {
    const dir = new Directory(Paths.document, "begreen");
    if (!dir.exists) dir.create();
    const name = `${Date.now()}-${uri.split("/").pop()}`;
    const dest = new File(dir, name);
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

// The feed never needs the camera original: a 1280 px JPEG is what gets uploaded.
export async function shrinkPhoto(uri: string): Promise<string> {
  if (process.env.EXPO_OS === "web" || !uri.startsWith("file:")) return uri;
  try {
    const source = await ImageManipulator.manipulate(uri).renderAsync();
    const target = fitWithin(source.width, source.height);
    const output = target ? await ImageManipulator.manipulate(source).resize(target).renderAsync() : source;
    try {
      return (await output.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 })).uri;
    } finally {
      if (output !== source) output.release();
      source.release();
    }
  } catch {
    return uri;
  }
}

export function existingLocal(m: Media | undefined): string | null {
  if (process.env.EXPO_OS === "web" || typeof m !== "string" || !m.startsWith("file:")) return null;
  try {
    return new File(m).exists ? m : null;
  } catch {
    return null;
  }
}

export function preferLocal<T extends { id: string; photo: Media; proof: Media }>(
  posts: T[],
  local: Record<string, { photo?: Media; proof?: Media }>,
  exists: (m: Media | undefined) => string | null = existingLocal,
): T[] {
  return preferLocalPure(posts, local, exists);
}
