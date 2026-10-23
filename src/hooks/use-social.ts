import { useEffect } from "react";
import { AppState } from "react-native";

import { subscribeFeed } from "@/services/social";
import { socialRefresh } from "@/services/social-refresh";
import { hasBackend } from "@/services/supabase";
import { syncSocial, useApp } from "@/store/app-store";
import { syncCommunity } from "@/store/community-store";

// The feed first (it may register the profile), then the communities you're in.
const syncAll = () => syncSocial().then(() => syncCommunity());

// Keeps the shared feed and community maps fresh: on open, when the app comes back, and live on new activity.
export function useSocialSync() {
  const comuneId = useApp((s) => s.comune?.id);
  const onboarded = useApp((s) => s.onboarded);

  useEffect(() => {
    if (!onboarded || !comuneId) return;
    if (!hasBackend) {
      void syncCommunity();
      return;
    }
    syncAll();
    const refresh = socialRefresh(syncAll, () => AppState.currentState === "active");
    const unsubscribe = subscribeFeed(refresh.soon);
    const sub = AppState.addEventListener("change", (s) => s === "active" && syncAll());
    return () => {
      refresh.stop();
      unsubscribe();
      sub.remove();
    };
  }, [onboarded, comuneId]);
}
