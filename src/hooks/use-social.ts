import { useEffect } from "react";
import { AppState } from "react-native";

import { subscribeFeed } from "@/services/social";
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
    const refresh = setInterval(() => { if (AppState.currentState === "active") void syncAll(); }, 120e3);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      clearInterval(refresh);
      timer = setTimeout(syncAll, 800);
    };
    const unsubscribe = subscribeFeed(soon);
    const sub = AppState.addEventListener("change", (s) => s === "active" && syncAll());
    return () => {
      clearTimeout(timer);
      unsubscribe();
      sub.remove();
    };
  }, [onboarded, comuneId]);
}
