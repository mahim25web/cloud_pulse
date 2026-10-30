export type LogLevel = "debug" | "info" | "warn" | "error";
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
// Cloud Logging reads the `severity` field from JSON written to stdout.
const SEVERITY: Record<LogLevel, string> = { debug: "DEBUG", info: "INFO", warn: "WARNING", error: "ERROR" };

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

export function createLogger(base: Record<string, unknown> = {}, level: LogLevel = "info"): Logger {
  const emit = (lvl: LogLevel, message: string, fields?: Record<string, unknown>) => {
    if (ORDER[lvl] < ORDER[level]) return;
    process.stdout.write(
      `${JSON.stringify({ severity: SEVERITY[lvl], message, timestamp: new Date().toISOString(), ...base, ...fields })}\n`,
    );
  };
  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    child: (fields) => createLogger({ ...base, ...fields }, level),
  };
}
