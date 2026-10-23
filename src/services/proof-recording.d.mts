export const PROOF_SECONDS: number;
export const MIN_PROOF: number;

export type ProofClock = {
  /** Seconds reported by the native recorder. Null until it reports time or bytes. */
  nativeSeconds: number | null;
};

export type RecordingProgress = {
  duration: number;
  fileSize: number;
};

export type RecordingOutcome = { kind: "saved"; uri: string } | { kind: "failed" };

export function noteProgress(clock: ProofClock, progress: RecordingProgress): ProofClock;
export function canStopProof(clock: ProofClock, minSeconds?: number): boolean;
export function displaySeconds(clock: ProofClock, maxSeconds?: number): number;
export function outcomeFromRecording(result: unknown, error?: unknown): RecordingOutcome;
