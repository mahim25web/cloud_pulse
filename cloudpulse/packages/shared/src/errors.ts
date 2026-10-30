import { SsrfError } from "./ssrf";

export const ERROR_CATEGORIES = [
  "dns_failure",
  "connection_refused",
  "connection_reset",
  "timeout",
  "tls_error",
  "blocked_target",
  "too_many_redirects",
  "response_too_large",
  "unexpected_status",
  "body_mismatch",
  "unknown",
] as const;
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

/** Maps a low-level error to a coarse category. Raw error text is never persisted or shown. */
export function categorizeError(err: unknown): ErrorCategory {
  if (err instanceof SsrfError) return "blocked_target";
  const e = err as { code?: unknown; name?: unknown } | null;
  const code = typeof e?.code === "string" ? e.code : "";
  const name = typeof e?.name === "string" ? e.name : "";

  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "EAI_NODATA") return "dns_failure";
  if (code === "ECONNREFUSED") return "connection_refused";
  if (code === "ECONNRESET" || code === "EPIPE" || code === "UND_ERR_SOCKET") return "connection_reset";
  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKETTIMEDOUT" ||
    code === "ABORT_ERR" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    name === "TimeoutError" ||
    name === "AbortError"
  ) {
    return "timeout";
  }
  if (
    code.startsWith("ERR_TLS") ||
    code.startsWith("CERT_") ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "ERR_SSL_PROTOCOL_ERROR"
  ) {
    return "tls_error";
  }
  return "unknown";
}
