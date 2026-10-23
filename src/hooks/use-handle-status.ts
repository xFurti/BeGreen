import { useEffect, useState } from "react";

import { handleVariants, isHandle } from "@/services/handles";
import { handleFree } from "@/services/social";
import { ensureSession, hasBackend } from "@/services/supabase";

export type HandleStatus = { state: "idle" | "checking" | "free" | "taken" | "unknown"; suggestions: string[] };

export function useHandleStatus(handle: string, enabled: boolean): HandleStatus {
  const [status, setStatus] = useState<HandleStatus>({ state: "idle", suggestions: [] });
  const [statusHandle, setStatusHandle] = useState("");
  const valid = enabled && hasBackend && isHandle(handle);

  useEffect(() => {
    let current = true;
    if (!valid) return () => void (current = false);
    const timeout = setTimeout(() => {
      setStatusHandle(handle);
      setStatus({ state: "checking", suggestions: [] });
      void (async () => {
        try {
          const uid = await ensureSession();
          if (!uid) throw new Error("No session");
          const free = await handleFree(handle, uid);
          if (!current) return;
          if (free) {
            setStatus({ state: "free", suggestions: [] });
            return;
          }
          const suggestions: string[] = [];
          for (const variant of handleVariants(handle)) {
            if (await handleFree(variant, uid)) suggestions.push(variant);
            if (suggestions.length === 3) break;
          }
          if (current) setStatus({ state: "taken", suggestions });
        } catch {
          if (current) setStatus({ state: "unknown", suggestions: [] });
        }
      })();
    }, 450);
    return () => {
      current = false;
      clearTimeout(timeout);
    };
  }, [handle, valid]);

  if (!valid) return { state: "idle", suggestions: [] };
  return statusHandle === handle ? status : { state: "checking", suggestions: [] };
}
