import { useEffect } from "react";
import { AppState } from "react-native";

import { subscribeFeed } from "@/services/social";
import { hasBackend } from "@/services/supabase";
import { syncSocial, useApp } from "@/store/app-store";

// Keeps the shared feed fresh: on open, when the app comes back, and live on new activity.
export function useSocialSync() {
  const comuneId = useApp((s) => s.comune?.id);
  const onboarded = useApp((s) => s.onboarded);

  useEffect(() => {
    if (!hasBackend || !onboarded || !comuneId) return;
    syncSocial();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(syncSocial, 800);
    };
    const unsubscribe = subscribeFeed(soon);
    const sub = AppState.addEventListener("change", (s) => s === "active" && syncSocial());
    return () => {
      clearTimeout(timer);
      unsubscribe();
      sub.remove();
    };
  }, [onboarded, comuneId]);
}
