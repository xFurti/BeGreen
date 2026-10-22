import type { IconName } from "@/components/icon";
import type { SquadKind } from "@/data/types";

export const KIND: Record<SquadKind, { label: string; icon: IconName }> = {
  class: { label: "Class", icon: "school" },
  association: { label: "Association", icon: "people" },
  comune: { label: "Comune", icon: "building" },
  friends: { label: "Friends", icon: "squadsFill" },
};
