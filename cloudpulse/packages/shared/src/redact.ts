const SENSITIVE_NAME =
  /(token|secret|password|passwd|pwd|api[-_]?key|apikey|auth|signature|sig|session|credential|key|code)/i;

const NAME_BODY = String.raw`[\w-]*(?:token|secret|password|passwd|pwd|api[-_]?key|apikey|auth|signature|session|credential)[\w-]*`;

const RULES: Array<[RegExp, string]> = [
  // URL userinfo first, before e-mail matching can eat it.
  [/(https?:\/\/)[^\s/:@]+(?::[^\s/@]*)?@/gi, "$1[REDACTED]@"],
  [/(authorization\s*[:=]\s*)(?:bearer\s+|basic\s+)?[^\s,;"']+/gi, "$1[REDACTED]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, "[REDACTED_JWT]"],
  [/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "[REDACTED_AWS_KEY]"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, "[REDACTED_GOOGLE_KEY]"],
  [/\bre_[A-Za-z0-9_]{16,}\b/g, "[REDACTED_API_KEY]"],
  [/\b(?:sk|pk|ghp|gho|ghs|xox[abpr])[-_][A-Za-z0-9_-]{16,}/g, "[REDACTED_API_KEY]"],
  [new RegExp(String.raw`(${NAME_BODY})(\s*[=:]\s*)("?)[^\s&"',;]+`, "gi"), "$1$2$3[REDACTED]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]"],
];

/** Redacts credentials and personal data from free text and truncates it. */
export function redactText(input: string, maxLength = 500): string {
  let out = input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
  for (const [re, replacement] of RULES) out = out.replace(re, replacement);
  return out.length > maxLength ? `${out.slice(0, maxLength)}…` : out;
}

/** Removes userinfo and masks sensitive query parameter values. Never throws. */
export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.username = "";
    u.password = "";
    for (const name of [...u.searchParams.keys()]) {
      if (SENSITIVE_NAME.test(name)) u.searchParams.set(name, "[REDACTED]");
    }
    u.hash = "";
    return u.toString().replace(/%5BREDACTED%5D/g, "[REDACTED]");
  } catch {
    return redactText(raw, 200);
  }
}
