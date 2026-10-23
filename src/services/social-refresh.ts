export const MEDIA_LIFETIME = { expiresInSeconds: 300, renewEveryMs: 120e3, reuseForMs: 120e3 };

export function socialRefresh(sync: () => void, active: () => boolean) {
  const refresh = setInterval(() => { if (active()) sync(); }, MEDIA_LIFETIME.renewEveryMs);
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    soon: () => {
      clearTimeout(timer);
      timer = setTimeout(sync, 800);
    },
    stop: () => {
      clearTimeout(timer);
      clearInterval(refresh);
    },
  };
}
