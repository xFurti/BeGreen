import { useEffect, useState } from "react";

// The current time, refreshed every minute: for "ends in", "upcoming" and "past" without impure renders.
export function useNow(everyMs = 60e3) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
