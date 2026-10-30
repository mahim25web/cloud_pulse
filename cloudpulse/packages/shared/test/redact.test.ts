import { describe, expect, it } from "vitest";
import { categorizeError } from "../src/errors";
import { redactText, redactUrl } from "../src/redact";
import { SsrfError } from "../src/ssrf";

describe("redactText", () => {
  it.each([
    ["Authorization: Bearer abcdef1234567890", "abcdef1234567890"],
    ["curl -H 'Authorization: Basic dXNlcjpwYXNz'", "dXNlcjpwYXNz"],
    ["failed with api_key=sk_live_1234567890abcdef", "sk_live_1234567890abcdef"],
    ["token=abc123 password: hunter2", "hunter2"],
    ["jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk", "eyJhbGciOiJIUzI1NiJ9"],
    ["key AKIAIOSFODNN7EXAMPLE leaked", "AKIAIOSFODNN7EXAMPLE"],
    ["resend re_1234567890abcdefghij", "re_1234567890abcdefghij"],
    ["contact admin@example.com for help", "admin@example.com"],
    ["GET https://user:secretpw@host.example.com/x", "secretpw"],
  ])("removes secrets from %s", (input, secret) => {
    const out = redactText(input);
    expect(out).not.toContain(secret);
    expect(out).toContain("[REDACTED");
  });

  it("truncates long text and strips control characters", () => {
    const out = redactText("a\u0000b".repeat(1000), 100);
    expect(out.length).toBeLessThanOrEqual(101);
    expect(out).not.toContain("\u0000");
  });

  it("leaves harmless text untouched", () => {
    expect(redactText("Connection timed out after 10000ms")).toBe("Connection timed out after 10000ms");
  });
});

describe("redactUrl", () => {
  it("masks sensitive params, removes userinfo and fragment", () => {
    const out = redactUrl("https://u:p@example.com/a?token=abc&page=2&api_key=zzz#frag");
    expect(out).toContain("page=2");
    expect(out).not.toMatch(/abc|zzz|u:p|frag/);
    expect(out).toContain("token=[REDACTED]");
  });
  it("never throws on garbage", () => {
    expect(() => redactUrl("::::")).not.toThrow();
  });
});

describe("categorizeError", () => {
  it.each([
    [{ code: "ENOTFOUND" }, "dns_failure"],
    [{ code: "ECONNREFUSED" }, "connection_refused"],
    [{ code: "ECONNRESET" }, "connection_reset"],
    [{ code: "ETIMEDOUT" }, "timeout"],
    [{ name: "TimeoutError" }, "timeout"],
    [{ code: "CERT_HAS_EXPIRED" }, "tls_error"],
    [new SsrfError("blocked_ip", "x"), "blocked_target"],
    [new Error("weird"), "unknown"],
    [null, "unknown"],
  ])("maps %j", (err, expected) => expect(categorizeError(err)).toBe(expected));
});
