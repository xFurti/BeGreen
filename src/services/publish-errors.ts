export type PublishFailure = "offline" | "auth" | "upload" | "server";

export const PUBLISH_MESSAGES = {
  offline: "shared.savedLocally", auth: "shared.publishAuth", upload: "shared.publishUpload", server: "shared.publishServer",
} as const;

export class UploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

export function classifyPublishError(error: unknown): PublishFailure {
  const e = error as { name?: string; code?: string; message?: string; status?: number; statusCode?: number | string; cause?: { code?: string } } | null;
  const message = e?.message ?? "";
  const code = e?.code ?? e?.cause?.code ?? "";
  const status = Number(e?.status ?? e?.statusCode);
  if (["AbortError", "TimeoutError"].includes(e?.name ?? "") ||
      /^(ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ERR_INTERNET_DISCONNECTED)$/.test(code) ||
      /network request failed|failed to fetch|fetch failed|networkerror|internet.disconnected/i.test(message)) return "offline";
  if (status === 401 || code === "PGRST301" || code === "PGRST303" ||
      /no session|jwt.*(expired|invalid)|session.*(expired|missing)|refresh.token|auth.*session.*missing/i.test(message)) return "auth";
  if (e?.name === "UploadError" || e?.name === "StorageApiError" || /upload failed/i.test(message)) return "upload";
  return "server";
}

export async function withAuthRetry<T>(send: () => Promise<T>, renew: () => Promise<void>): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (classifyPublishError(error) !== "auth") throw error;
    await renew();
    return send(); // one retry; never loop on a permanent auth failure
  }
}
