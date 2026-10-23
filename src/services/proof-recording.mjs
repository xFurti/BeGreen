// The proof clip is at most 5 seconds and cannot be stopped before 2.
// Those 2 seconds are native recorder time, not the time since the tap:
// the on-screen interval can run ahead of the encoder, and stopping then
// makes Android reject the file (often before any frames were written).

export const PROOF_SECONDS = 5;
export const MIN_PROOF = 2;

export function noteProgress(clock, progress) {
  const duration = finiteSeconds(progress.duration);
  const fileSize = finiteBytes(progress.fileSize);
  if (clock.nativeSeconds == null && duration <= 0 && fileSize <= 0) return clock;
  return { nativeSeconds: Math.max(clock.nativeSeconds ?? 0, duration) };
}

export function canStopProof(clock, minSeconds = MIN_PROOF) {
  return clock.nativeSeconds != null && clock.nativeSeconds >= minSeconds;
}

export function displaySeconds(clock, maxSeconds = PROOF_SECONDS) {
  if (clock.nativeSeconds == null) return 0;
  return Math.min(maxSeconds, Math.floor(clock.nativeSeconds));
}

// A resolved recording carries `uri`. A rejection usually does not: expo-camera
// drops the file on a failed finalize. If a uri is still attached, keep the clip.
export function outcomeFromRecording(result, error) {
  const uri = readUri(result) ?? (error === undefined ? null : readUri(error));
  if (uri) return { kind: "saved", uri };
  return { kind: "failed" };
}

function finiteSeconds(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function finiteBytes(value) {
  return Number.isFinite(value) ? value : 0;
}

function readUri(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 2) return null;
  for (const key of ["uri", "outputUri", "fileUri"]) {
    const found = value[key];
    if (typeof found === "string" && found.length > 0) return found;
  }
  for (const key of ["userInfo", "cause", "nativeError"]) {
    const nested = readUri(value[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}
