import { router } from "expo-router";

import { Tag } from "@/components/ui";
import type { Post } from "@/data/types";
import { usePulse } from "@/hooks/use-pulse";
import { useI18n } from "@/i18n/use-i18n";
import { isCurrentDrop } from "@/services/drop-tag";

export function DropTag({ post }: { post: Post }) {
  const { drop } = usePulse();
  const { t } = useI18n();
  const today = isCurrentDrop(post, drop.id);
  return <Tag label={t("common.drop")} solid={today} onPress={today ? () => router.push("/drop") : undefined}
    accessibilityLabel={today ? t("post.openDrop", { title: drop.title }) : undefined} />;
}
