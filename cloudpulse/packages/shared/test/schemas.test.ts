import { describe, expect, it } from "vitest";
import { loadEnv, baseEnvSchema } from "../src/env";
import { aiAnalysisSchema, monitorInputSchema, monitorUpdateSchema } from "../src/schemas";

const valid = { name: "API", url: "https://example.com/health" };

describe("monitorInputSchema", () => {
  it("applies defaults", () => {
    const m = monitorInputSchema.parse(valid);
    expect(m).toMatchObject({ method: "GET", expectedStatusMin: 200, expectedStatusMax: 299, intervalSeconds: 300, timeoutMs: 10000 });
    expect(m.thresholds).toEqual({ degradedAfter: 2, downAfter: 3, recoverAfter: 2, slowMs: null });
  });

  it.each([
    ["ftp url", { url: "ftp://example.com" }],
    ["javascript url", { url: "javascript:alert(1)" }],
    ["credentials in url", { url: "https://a:b@example.com" }],
    ["empty name", { name: "  " }],
    ["interval under 60s", { intervalSeconds: 30 }],
    ["timeout over 30s", { timeoutMs: 60000 }],
    ["inverted status range", { expectedStatusMin: 300, expectedStatusMax: 200 }],
    ["bad method", { method: "DELETE" }],
    ["downAfter < degradedAfter", { thresholds: { degradedAfter: 5, downAfter: 2 } }],
    ["oversized url", { url: `https://example.com/${"a".repeat(3000)}` }],
  ])("rejects %s", (_, patch) => {
    expect(monitorInputSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("monitorUpdateSchema", () => {
  it("allows partial updates", () => {
    expect(monitorUpdateSchema.safeParse({ name: "New" }).success).toBe(true);
  });
  it("still validates provided fields", () => {
    expect(monitorUpdateSchema.safeParse({ url: "gopher://x" }).success).toBe(false);
  });
});

describe("aiAnalysisSchema", () => {
  const ok = {
    summary: "Elevated 5xx responses.",
    hypotheses: [{ cause: "Upstream database saturation (hypothesis)", likelihood: "medium", evidence: ["3 consecutive 503s"] }],
    diagnosticSteps: ["Check database connection pool metrics"],
    remediationActions: ["Scale the service after confirming load"],
    confidence: "low",
    uncertainty: "Only HTTP-level evidence is available.",
  };
  it("accepts a valid analysis", () => expect(aiAnalysisSchema.safeParse(ok).success).toBe(true));
  it("rejects extra keys (e.g. injected fields)", () => {
    expect(aiAnalysisSchema.safeParse({ ...ok, runCommand: "rm -rf /" }).success).toBe(false);
  });
  it("rejects empty hypotheses and bad enums", () => {
    expect(aiAnalysisSchema.safeParse({ ...ok, hypotheses: [] }).success).toBe(false);
    expect(aiAnalysisSchema.safeParse({ ...ok, confidence: "certain" }).success).toBe(false);
  });
});

describe("loadEnv", () => {
  it("parses valid env", () => {
    expect(loadEnv(baseEnvSchema, { GOOGLE_CLOUD_PROJECT: "p" })).toMatchObject({ APP_ENV: "development", LOG_LEVEL: "info" });
  });
  it("reports names but never values", () => {
    expect(() => loadEnv(baseEnvSchema, { APP_ENV: "super-secret-value" })).toThrow(/GOOGLE_CLOUD_PROJECT/);
    try {
      loadEnv(baseEnvSchema, { APP_ENV: "super-secret-value" });
    } catch (e) {
      expect(String(e)).not.toContain("super-secret-value");
    }
  });
});
