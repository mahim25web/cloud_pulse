/**
 * Pure health state machine. No I/O: the incident processor loads the monitor's
 * health snapshot inside a Firestore transaction, calls applyCheck(), and persists
 * the result. Purity makes threshold and duplicate-handling behaviour easy to test.
 */
export type HealthState = "healthy" | "degraded" | "down" | "recovering";
export type CheckOutcome = "success" | "slow" | "failure";
export type Severity = "minor" | "critical";

export type TransitionAction =
  | "none"
  | "open_incident" // healthy -> degraded | down
  | "escalate" // degraded | recovering -> down
  | "deescalate" // down -> degraded (service answers, but slowly)
  | "start_recovery" // degraded | down -> recovering
  | "relapse" // recovering -> degraded
  | "resolve_incident" // recovering -> healthy
  | "ignored"; // duplicate or out-of-order check

export interface Thresholds {
  /** Consecutive failed OR slow checks before healthy -> degraded. */
  degradedAfter: number;
  /** Consecutive failed checks before -> down. Must be >= degradedAfter. */
  downAfter: number;
  /** Consecutive fully healthy checks before recovering -> healthy. */
  recoverAfter: number;
  /** A successful check slower than this counts as "slow". null disables. */
  slowMs: number | null;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  degradedAfter: 2,
  downAfter: 3,
  recoverAfter: 2,
  slowMs: null,
};

export interface MonitorHealth {
  state: HealthState;
  consecutiveFailures: number;
  consecutiveSlow: number;
  consecutiveSuccesses: number;
  lastCheckId: string | null;
  /** Epoch ms of the last check applied. */
  lastCheckedAt: number | null;
}

export interface CheckInput {
  id: string;
  /** Epoch ms. */
  checkedAt: number;
  success: boolean;
  responseTimeMs: number | null;
}

export interface Transition {
  previous: HealthState;
  next: MonitorHealth;
  changed: boolean;
  action: TransitionAction;
  /** Severity of the resulting state (null when healthy / recovering). */
  severity: Severity | null;
}

export function initialHealth(): MonitorHealth {
  return {
    state: "healthy",
    consecutiveFailures: 0,
    consecutiveSlow: 0,
    consecutiveSuccesses: 0,
    lastCheckId: null,
    lastCheckedAt: null,
  };
}

export function classify(check: CheckInput, t: Thresholds): CheckOutcome {
  if (!check.success) return "failure";
  if (t.slowMs !== null && check.responseTimeMs !== null && check.responseTimeMs > t.slowMs) {
    return "slow";
  }
  return "success";
}

export function severityFor(state: HealthState): Severity | null {
  if (state === "degraded") return "minor";
  if (state === "down") return "critical";
  return null;
}

export function applyCheck(health: MonitorHealth, check: CheckInput, t: Thresholds): Transition {
  // Duplicate delivery (same id) or stale/out-of-order check: never mutate state.
  const isDuplicate = health.lastCheckId === check.id;
  const isStale = health.lastCheckedAt !== null && check.checkedAt <= health.lastCheckedAt;
  if (isDuplicate || isStale) {
    return {
      previous: health.state,
      next: health,
      changed: false,
      action: "ignored",
      severity: severityFor(health.state),
    };
  }

  const outcome = classify(check, t);
  const failures = outcome === "failure" ? health.consecutiveFailures + 1 : 0;
  const slow = outcome === "slow" ? health.consecutiveSlow + 1 : 0;
  const successes = outcome === "success" ? health.consecutiveSuccesses + 1 : 0;

  const previous = health.state;
  let state: HealthState = previous;
  let action: TransitionAction = "none";

  if (outcome === "success") {
    if (state === "degraded" || state === "down") {
      state = "recovering";
      action = "start_recovery";
    }
    if (state === "recovering" && successes >= t.recoverAfter) {
      state = "healthy";
      action = "resolve_incident";
    }
  } else {
    if (state === "recovering") {
      state = "degraded";
      action = "relapse";
    }
    if (failures >= t.downAfter && state !== "down") {
      action = previous === "healthy" ? "open_incident" : "escalate";
      state = "down";
    } else if (state === "healthy" && (failures >= t.degradedAfter || slow >= t.degradedAfter)) {
      state = "degraded";
      action = "open_incident";
    } else if (state === "down" && outcome === "slow") {
      // The service is answering again, just slowly.
      state = "degraded";
      action = "deescalate";
    }
  }

  return {
    previous,
    changed: state !== previous,
    action,
    severity: severityFor(state),
    next: {
      state,
      consecutiveFailures: failures,
      consecutiveSlow: slow,
      consecutiveSuccesses: successes,
      lastCheckId: check.id,
      lastCheckedAt: check.checkedAt,
    },
  };
}
