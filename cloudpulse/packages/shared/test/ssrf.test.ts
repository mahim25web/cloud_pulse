import { describe, expect, it } from "vitest";
import { assertSafeUrl, isBlockedIp, SsrfError } from "../src/ssrf";

describe("isBlockedIp", () => {
  const blocked = [
    "127.0.0.1", "127.255.255.254", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "100.64.0.1", "0.0.0.0", "255.255.255.255", "224.0.0.1",
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254", "64:ff9b::7f00:1", "2002:7f00:1::",
    "2001:db8::1", "not-an-ip",
  ];
  const allowed = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"];

  it.each(blocked)("blocks %s", (ip) => expect(isBlockedIp(ip)).toBe(true));
  it.each(allowed)("allows %s", (ip) => expect(isBlockedIp(ip)).toBe(false));
});

describe("assertSafeUrl", () => {
  const publicResolver = async () => ["93.184.216.34"];
  const code = async (url: string, resolver = publicResolver) => {
    try {
      await assertSafeUrl(url, { resolver });
      return "ok";
    } catch (e) {
      return e instanceof SsrfError ? e.code : "other";
    }
  };

  it("accepts a public https URL and returns pinned addresses", async () => {
    const r = await assertSafeUrl("https://example.com/health", { resolver: publicResolver });
    expect(r.addresses).toEqual(["93.184.216.34"]);
  });

  it.each([
    ["ftp://example.com", "unsupported_protocol"],
    ["file:///etc/passwd", "unsupported_protocol"],
    ["https://user:pw@example.com", "credentials_in_url"],
    ["http://localhost/", "blocked_host"],
    ["http://app.localhost/", "blocked_host"],
    ["http://metadata.google.internal/computeMetadata/v1/", "blocked_host"],
    ["http://127.0.0.1/", "blocked_ip"],
    ["http://2130706433/", "blocked_ip"], // decimal 127.0.0.1
    ["http://0x7f.1/", "blocked_ip"],
    ["http://169.254.169.254/latest/meta-data/", "blocked_ip"],
    ["http://[::1]/", "blocked_ip"],
    ["http://[::ffff:10.0.0.1]/", "blocked_ip"],
    ["http://example.com:22/", "blocked_port"],
    ["not a url", "invalid_url"],
  ])("rejects %s", async (url, expected) => {
    expect(await code(url)).toBe(expected);
  });

  it("rejects hosts where any resolved record is private (rebinding mix)", async () => {
    expect(await code("https://evil.test", async () => ["93.184.216.34", "10.0.0.1"])).toBe("blocked_ip");
  });

  it("maps resolver failures to dns_failure", async () => {
    expect(await code("https://nope.test", async () => { throw new Error("ENOTFOUND"); })).toBe("dns_failure");
    expect(await code("https://empty.test", async () => [])).toBe("dns_failure");
  });
});
