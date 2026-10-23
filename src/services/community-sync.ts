export type CommunitySyncOptions = { throwOnError?: boolean };

// Share the actual request, including its rejection. Each caller then chooses whether
// it needs the error for a visible retry state or is just refreshing in the background.
export function createCommunitySync({
  refresh,
  hasSynced,
  onError,
}: {
  refresh: (extra?: string) => Promise<void>;
  hasSynced: (id: string) => boolean;
  onError: (error: unknown) => void;
}) {
  let syncing: Promise<void> | null = null;

  function run(extra?: string): Promise<void> {
    if (syncing) return syncing.then(() => extra && !hasSynced(extra) ? run(extra) : undefined);
    syncing = Promise.resolve()
      .then(() => refresh(extra))
      .catch((error) => { onError(error); throw error; })
      .finally(() => { syncing = null; });
    return syncing;
  }

  return (extra?: string, options: CommunitySyncOptions = {}): Promise<void> => {
    const pending = run(extra);
    return options.throwOnError ? pending : pending.catch(() => {});
  };
}
