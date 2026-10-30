import { describe, expect, it } from "vitest";
import { applyCheck, DEFAULT_THRESHOLDS, initialHealth, type MonitorHealth, type Thresholds } from "../src/state-machine";

let seq = 0;
const mk = (success: boolean, responseTimeMs: number | null = 100) => {
  seq += 1;
  return { id: `c${seq}`, checkedAt: 1_000_000 + seq * 60_000, success, responseTimeMs };
};

function run(outcomes: Array<boolean | "slow">, t: Thresholds = DEFAULT_THRESHOLDS, start = initialHealth()) {
  let h: MonitorHealth = start;
  const actions: string[] = [];
  for (const o of outcomes) {
    const tr = applyCheck(h, o === "slow" ? mk(true, 5000) : mk(o), t);
    h = tr.next;
    actions.push(tr.action);
  }
  return { h, actions };
}

describe("incident thresholds", () => {
  it("a single failure does not change state", () => {
    const { h, actions } = run([false]);
    expect(h.state).toBe("healthy");
    expect(actions).toEqual(["none"]);
  });

  it("two consecutive failures open a minor (degraded) incident", () => {
    const tr = applyCheck(run([false]).h, mk(false), DEFAULT_THRESHOLDS);
    expect(tr.next.state).toBe("degraded");
    expect(tr.action).toBe("open_incident");
    expect(tr.severity).toBe("minor");
  });

  it("three consecutive failures escalate to down (critical)", () => {
    const { h, actions } = run([false, false, false]);
    expect(h.state).toBe("down");
    expect(actions).toEqual(["none", "open_incident", "escalate"]);
  });

  it("a success between failures resets the counter", () => {
    expect(run([false, true, false]).h.state).toBe("healthy");
  });

  it("downAfter=1 goes straight to down and opens an incident", () => {
    const { h, actions } = run([false], { ...DEFAULT_THRESHOLDS, degradedAfter: 1, downAfter: 1 });
    expect(h.state).toBe("down");
    expect(actions).toEqual(["open_incident"]);
  });

  it("slow checks degrade when slowMs is set", () => {
    const { h } = run(["slow", "slow"], { ...DEFAULT_THRESHOLDS, slowMs: 1000 });
    expect(h.state).toBe("degraded");
  });

  it("slow checks are ignored when slowMs is null", () => {
    expect(run(["slow", "slow", "slow"]).h.state).toBe("healthy");
  });
});

describe("recovery", () => {
  const down = run([false, false, false]).h;

  it("first success moves down -> recovering, not healthy", () => {
    const tr = applyCheck(down, mk(true), DEFAULT_THRESHOLDS);
    expect(tr.next.state).toBe("recovering");
    expect(tr.action).toBe("start_recovery");
  });

  it("recoverAfter consecutive successes resolve the incident", () => {
    const { h, actions } = run([true, true], DEFAULT_THRESHOLDS, down);
    expect(h.state).toBe("healthy");
    expect(actions).toEqual(["start_recovery", "resolve_incident"]);
  });

  it("recoverAfter=1 resolves immediately", () => {
    const { h, actions } = run([true], { ...DEFAULT_THRESHOLDS, recoverAfter: 1 }, down);
    expect(h.state).toBe("healthy");
    expect(actions).toEqual(["resolve_incident"]);
  });

  it("a failure while recovering relapses to degraded", () => {
    const { h, actions } = run([true, false], DEFAULT_THRESHOLDS, down);
    expect(h.state).toBe("degraded");
    expect(actions).toEqual(["start_recovery", "relapse"]);
  });

  it("a slow response while down de-escalates to degraded", () => {
    const tr = applyCheck(down, mk(true, 5000), { ...DEFAULT_THRESHOLDS, slowMs: 1000 });
    expect(tr.next.state).toBe("degraded");
    expect(tr.action).toBe("deescalate");
  });
});

describe("duplicate and out-of-order events", () => {
  it("re-delivery of the same check id is ignored and does not double count", () => {
    const check = mk(false);
    const first = applyCheck(initialHealth(), check, DEFAULT_THRESHOLDS);
    const again = applyCheck(first.next, check, DEFAULT_THRESHOLDS);
    expect(again.action).toBe("ignored");
    expect(again.next).toEqual(first.next);
    expect(again.next.consecutiveFailures).toBe(1);
  });

  it("a check older than the last processed one is ignored", () => {
    const newer = mk(false);
    const older = { id: "older", checkedAt: newer.checkedAt - 120_000, success: false, responseTimeMs: null };
    const first = applyCheck(initialHealth(), newer, DEFAULT_THRESHOLDS);
    const stale = applyCheck(first.next, older, DEFAULT_THRESHOLDS);
    expect(stale.action).toBe("ignored");
    expect(stale.next.consecutiveFailures).toBe(1);
  });

  it("replaying a whole stream twice yields the same final state", () => {
    const checks = [mk(false), mk(false), mk(false), mk(true), mk(true)];
    const play = (stream: typeof checks) => {
      let h = initialHealth();
      for (const c of stream) h = applyCheck(h, c, DEFAULT_THRESHOLDS).next;
      return h;
    };
    expect(play([...checks, ...checks])).toEqual(play(checks));
  });
});
