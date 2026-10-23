// One catalog, two languages. A key that exists on only one side is a type error.

export type Language = "it" | "en";

export type MessageTree = { readonly [key: string]: string | MessageTree };

// Extra or missing keys at any depth make the Italian argument `never`, so tsc rejects it.
type Exact<Expected, Actual> = [keyof Actual] extends [keyof Expected]
  ? [keyof Expected] extends [keyof Actual]
    ? {
        readonly [K in keyof Expected]: Expected[K] extends string
          ? Actual[K & keyof Actual] extends string
            ? Actual[K & keyof Actual]
            : never
          : Expected[K] extends MessageTree
            ? Actual[K & keyof Actual] extends MessageTree
              ? Exact<Expected[K], Actual[K & keyof Actual]>
              : never
            : never;
      }
    : never
  : never;

export function defineMessages<const E extends MessageTree, const I extends MessageTree>(en: E, it: I & Exact<E, I>): {
  readonly en: E;
  readonly it: I;
} {
  return { en, it };
}

export type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends MessageTree ? `${K}.${Leaves<T[K]>}` : never;
}[keyof T & string];

export function flatten(tree: MessageTree, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else flatten(value, path, out);
  }
  return out;
}

export function fill(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (params[key] == null ? "" : String(params[key])));
}
