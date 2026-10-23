// Optimistic follow list: newest first, one id per account.

export function nextFollowing(following: string[], userId: string, on: boolean): string[] {
  const rest = following.filter((id) => id !== userId);
  return on ? [userId, ...rest] : rest;
}

// A failed request undoes only that account. A newer follow or unfollow for the same
// account already replaced this one, so the list is left as the later tap set it.
export function followingAfterFailedFollow(
  following: string[],
  userId: string,
  attemptedOn: boolean,
  stillLatest: boolean,
): string[] | null {
  if (!stillLatest) return null;
  return nextFollowing(following, userId, !attemptedOn);
}
