import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export type SsrfErrorCode =
  | "invalid_url"
  | "unsupported_protocol"
  | "credentials_in_url"
  | "blocked_host"
  | "blocked_ip"
  | "blocked_port"
  | "dns_failure";

export class SsrfError extends Error {
  constructor(
    public readonly code: SsrfErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SsrfError";
  }
}

function parseIPv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

// [base, prefix length]
const V4_BLOCKS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local incl. cloud metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function isBlockedV4Number(n: number): boolean {
  return V4_BLOCKS.some(([base, bits]) => {
    const b = parseIPv4(base)!;
    const size = 2 ** (32 - bits);
    return Math.floor(n / size) === Math.floor(b / size);
  });
}

function parseIPv6(input: string): number[] | null {
  let s = input.split("%")[0]!.toLowerCase();
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail);
    if (v4 === null) return null;
    s = `${s.slice(0, lastColon + 1)}${((v4 >>> 16) & 0xffff).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  let groups: string[];
  if (halves.length === 2) {
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...Array<string>(missing).fill("0"), ...rest];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out;
}

/** True if the address must never be contacted. Fails closed on anything unparseable. */
export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const n = parseIPv4(ip);
    return n === null || isBlockedV4Number(n);
  }
  if (version === 6) {
    const g = parseIPv6(ip);
    if (!g) return true;
    const [g0, g1, g2, g3, g4, g5, g6, g7] = g as [number, number, number, number, number, number, number, number];
    const v4From = (hi: number, lo: number) => isBlockedV4Number(hi * 65536 + lo);

    if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0) {
      // ::, ::1, IPv4-compatible (::a.b.c.d) -> block; IPv4-mapped (::ffff:a.b.c.d) -> judge by v4.
      if (g5 === 0xffff) return v4From(g6, g7);
      if (g5 === 0) return true;
    }
    if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) return v4From(g6, g7); // NAT64
    if (g0 === 0x2002) return v4From(g1, g2); // 6to4
    if ((g0 & 0xffc0) === 0xfe80) return true; // link-local
    if ((g0 & 0xffc0) === 0xfec0) return true; // deprecated site-local
    if ((g0 & 0xfe00) === 0xfc00) return true; // unique local
    if ((g0 & 0xff00) === 0xff00) return true; // multicast
    if (g0 === 0x2001 && g1 === 0x0db8) return true; // documentation
    if (g0 === 0x0100 && g1 === 0 && g2 === 0 && g3 === 0) return true; // discard prefix
    return false;
  }
  return true;
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa"];
// Common non-HTTP service ports: reduces use of CloudPulse as an internal port scanner.
export const DEFAULT_BLOCKED_PORTS: ReadonlySet<number> = new Set([
  21, 22, 23, 25, 110, 111, 135, 139, 143, 445, 465, 587, 993, 995, 1433, 2049, 3306, 3389, 5432, 5900, 6379, 9200, 11211, 27017,
]);

export type Resolver = (hostname: string) => Promise<string[]>;

export const defaultResolver: Resolver = async (hostname) => {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => r.address);
};

export interface SafeUrlOptions {
  resolver?: Resolver;
  blockedPorts?: ReadonlySet<number>;
}

export interface SafeTarget {
  url: URL;
  /** Every validated address. Connect to one of these directly (pin the IP) to defeat DNS rebinding. */
  addresses: string[];
}

/**
 * Validates a user-supplied URL for outbound requests. Call it again for every
 * redirect hop. The caller MUST connect to one of `addresses` rather than
 * resolving the hostname a second time.
 */
export async function assertSafeUrl(raw: string, opts: SafeUrlOptions = {}): Promise<SafeTarget> {
  const resolver = opts.resolver ?? defaultResolver;
  const blockedPorts = opts.blockedPorts ?? DEFAULT_BLOCKED_PORTS;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("invalid_url", "URL could not be parsed");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("unsupported_protocol", "Only http and https URLs are supported");
  }
  if (url.username || url.password) {
    throw new SsrfError("credentials_in_url", "Credentials in URLs are not allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (!hostname) throw new SsrfError("invalid_url", "URL has no host");
  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new SsrfError("blocked_host", "Host is not allowed");
  }
  if (url.port && blockedPorts.has(Number(url.port))) {
    throw new SsrfError("blocked_port", "Port is not allowed");
  }

  // WHATWG URL normalises decimal/hex/octal IPv4 forms to dotted quad, so this covers 2130706433 etc.
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new SsrfError("blocked_ip", "Address is not allowed");
    return { url, addresses: [hostname] };
  }

  let addresses: string[];
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new SsrfError("dns_failure", "Host could not be resolved");
  }
  if (addresses.length === 0) throw new SsrfError("dns_failure", "Host could not be resolved");
  // One bad record poisons the host: attackers mix public and private A records.
  if (addresses.some(isBlockedIp)) {
    throw new SsrfError("blocked_ip", "Host resolves to a disallowed address");
  }
  return { url, addresses };
}
