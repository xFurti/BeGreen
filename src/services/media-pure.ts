type Media = number | string;

export const MAX_PHOTO_SIDE = 1280;

export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } | null {
  if (width <= max && height <= max) return null;
  const scale = max / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
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
