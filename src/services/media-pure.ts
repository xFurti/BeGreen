type Media = number | string;

export const MAX_PHOTO_SIDE = 1280;
/** Soft cap for library proof clips before upload — keeps Cached Egress per play bounded. */
export const MAX_PROOF_BYTES = Math.floor(1.5 * 1024 * 1024);

export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } | null {
  if (width <= max && height <= max) return null;
  const scale = max / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Unknown size is allowed (camera recordings); known oversize is rejected. */
export function proofWithinBudget(bytes: number | null | undefined, max = MAX_PROOF_BYTES): boolean {
  if (bytes == null || !Number.isFinite(bytes)) return true;
  return bytes <= max;
}

export function preferLocal<T extends { id: string; photo: Media; proof: Media }>(
  posts: T[],
  local: Record<string, { photo?: Media; proof?: Media }>,
  exists: (m: Media | undefined) => string | null = () => null,
): T[] {
  return posts.map((post) => {
    const saved = local[post.id];
    if (!saved) return post;
    const photo = exists(saved.photo);
    const proof = exists(saved.proof);
    if (!photo && !proof) return post;
    return { ...post, ...(photo ? { photo } : {}), ...(proof ? { proof } : {}) };
  });
}
