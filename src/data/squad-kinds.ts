import type { IconName } from "@/components/icon";
import type { SquadKind } from "@/data/types";

export const KIND: Record<SquadKind, { icon: IconName }> = {
  class: { icon: "school" },
  association: { icon: "people" },
  comune: { icon: "building" },
  friends: { icon: "squadsFill" },
};
