export const HANDLE_RE = /^[a-z0-9._]{2,24}$/;

export const isHandle = (handle: string) => HANDLE_RE.test(handle);

export const toHandle = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);

export function handleVariants(base: string): string[] {
  const suffixes = [".green", "26", ".bg", "2030"];
  const variants = suffixes.map((suffix) => `${base.slice(0, 24 - suffix.length)}${suffix}`);
  variants.push(`green.${base.slice(0, 24 - "green.".length)}`);
  return [...new Set(variants)].filter((variant) => variant !== base && isHandle(variant)).slice(0, 5);
}
