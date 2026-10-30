import { z } from "zod";

export const baseEnvSchema = z.object({
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

/**
 * Parses and validates environment variables once at startup. The error lists variable
 * names and problem types only, never values, so misconfigured secrets can't leak into logs.
 */
export function loadEnv<S extends z.ZodTypeAny>(
  schema: S,
  source: Record<string, string | undefined> = process.env,
): z.infer<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => {
      const detail = i.code === "invalid_type" ? `expected ${i.expected}` : i.code.replace(/_/g, " ");
      return `  - ${i.path.join(".") || "(root)"}: ${detail}`;
    });
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return result.data;
}
