import { ACTIONS, type ActionId } from "@/data/actions";

// A route can contain repeated or unknown query parameters. Never index the
// action catalog with an unchecked value from a shared/deep link.
export function guideAction(value: unknown): ActionId {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && Object.hasOwn(ACTIONS, candidate) ? candidate as ActionId : "move";
}

export const GUIDE_FEATURED: readonly ActionId[] = ["move", "refill", "pickup", "sort"];
