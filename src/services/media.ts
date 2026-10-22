import { Directory, File, Paths } from "expo-file-system";

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
