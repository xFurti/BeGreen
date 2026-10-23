export function proofPath(value: string, origin: string): string | null {
  if (value.startsWith("storage:proofs/")) return value.slice(15);
  for (const kind of ["public", "sign", "authenticated"]) {
    const prefix = `${origin}/storage/v1/object/${kind}/proofs/`;
    if (origin && value.startsWith(prefix)) return decodeURIComponent(value.slice(prefix.length).split("?")[0]);
  }
  return null;
}
