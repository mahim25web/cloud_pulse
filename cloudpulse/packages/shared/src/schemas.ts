import { z } from "zod";
import { ERROR_CATEGORIES } from "./errors";

export const HTTP_METHODS = ["GET", "HEAD", "POST"] as const;
export const MIN_INTERVAL_SECONDS = 60; // Cloud Scheduler's finest cron granularity is 1 minute
export const MAX_INTERVAL_SECONDS = 86_400;
export const MIN_TIMEOUT_MS = 1_000;
export const MAX_TIMEOUT_MS = 30_000;

export const monitorStatusSchema = z.enum(["unknown", "healthy", "degraded", "down", "recovering", "paused"]);
export const incidentStatusSchema = z.enum(["open", "acknowledged", "recovering", "resolved"]);
export const incidentSeveritySchema = z.enum(["minor", "critical"]);
export const errorCategorySchema = z.enum(ERROR_CATEGORIES);

export const thresholdsSchema = z
  .object({
    degradedAfter: z.number().int().min(1).max(10).default(2),
    downAfter: z.number().int().min(1).max(20).default(3),
    recoverAfter: z.number().int().min(1).max(10).default(2),
    slowMs: z.number().int().min(100).max(60_000).nullable().default(null),
  })
  .refine((t) => t.downAfter >= t.degradedAfter, {
    message: "downAfter must be greater than or equal to degradedAfter",
    path: ["downAfter"],
  });

const targetUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return (u.protocol === "http:" || u.protocol === "https:") && !u.username && !u.password;
      } catch {
        return false;
      }
    },
    { message: "Must be an http(s) URL without embedded credentials" },
  );

// The max timeout (30s) is always below the min interval (60s), so no timeout/interval cross-check is needed.
// Static validation only. The SSRF guard (DNS + IP checks) runs server-side at save time AND at check time.
export const monitorBaseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: targetUrl,
  method: z.enum(HTTP_METHODS).default("GET"),
  expectedStatusMin: z.number().int().min(100).max(599).default(200),
  expectedStatusMax: z.number().int().min(100).max(599).default(299),
  intervalSeconds: z.number().int().min(MIN_INTERVAL_SECONDS).max(MAX_INTERVAL_SECONDS).default(300),
  timeoutMs: z.number().int().min(MIN_TIMEOUT_MS).max(MAX_TIMEOUT_MS).default(10_000),
  expectedText: z.string().trim().max(200).nullable().default(null),
  thresholds: thresholdsSchema.default({}),
});

function crossFieldChecks(
  v: { expectedStatusMin?: number; expectedStatusMax?: number },
  ctx: z.RefinementCtx,
) {
  if (v.expectedStatusMin !== undefined && v.expectedStatusMax !== undefined && v.expectedStatusMin > v.expectedStatusMax) {
    ctx.addIssue({ code: "custom", path: ["expectedStatusMax"], message: "Must be >= expectedStatusMin" });
  }
}

export const monitorInputSchema = monitorBaseSchema.superRefine(crossFieldChecks);
export const monitorUpdateSchema = monitorBaseSchema.partial().superRefine(crossFieldChecks);
export type MonitorInput = z.infer<typeof monitorInputSchema>;
export type MonitorUpdate = z.infer<typeof monitorUpdateSchema>;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(256).optional(),
});

export const checkResultSchema = z.object({
  monitorId: z.string().min(1),
  workspaceId: z.string().min(1),
  checkedAt: z.string().datetime(),
  success: z.boolean(),
  statusCode: z.number().int().min(100).max(599).nullable(),
  responseTimeMs: z.number().int().min(0).nullable(),
  errorCategory: errorCategorySchema.nullable(),
});
export type CheckResult = z.infer<typeof checkResultSchema>;

// Pub/Sub message payloads
export const checkRequestedSchema = z.object({
  monitorId: z.string().min(1),
  workspaceId: z.string().min(1),
  scheduledFor: z.string().datetime(),
});
export const checkCompletedSchema = z.object({
  checkId: z.string().min(1),
  monitorId: z.string().min(1),
  workspaceId: z.string().min(1),
  checkedAt: z.string().datetime(),
});

/** Gemini output contract. Strict: unknown keys are rejected. */
export const aiAnalysisSchema = z
  .object({
    summary: z.string().min(1).max(800),
    hypotheses: z
      .array(
        z.object({
          cause: z.string().min(1).max(300),
          likelihood: z.enum(["low", "medium", "high"]),
          evidence: z.array(z.string().max(300)).max(5),
        }),
      )
      .min(1)
      .max(5),
    diagnosticSteps: z.array(z.string().min(1).max(300)).min(1).max(8),
    remediationActions: z.array(z.string().min(1).max(300)).min(1).max(8),
    confidence: z.enum(["low", "medium", "high"]),
    uncertainty: z.string().min(1).max(500),
  })
  .strict();
export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;
