import { BatpResponse, NO_ACTION, TURN_TIMEOUT_MS, type AgentClient, type BatpRequest } from "./batp.ts";

/**
 * True for hosts a builder-chosen endpoint must not reach from a harness node: loopback, private, link-local
 * (cloud metadata) and internal names. Literal addresses only; DNS answers are not checked here.
 */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (h.includes(":")) return h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h.startsWith("::ffff:");
  return false;
}

const allowPrivate = () => process.env.ALLOW_PRIVATE_ENDPOINTS === "1" || process.env.NODE_ENV === "test";

/**
 * Calls a builder-hosted BATP/1 endpoint. Inside the CVM this runs over TLS, so the transcript provably came
 * from the named endpoint (doc §4.3). A timeout, HTTP error or malformed body counts as "no action".
 */
export class HttpAgentClient implements AgentClient {
  constructor(
    private readonly endpoint: string,
    private readonly token: string,
    private readonly timeoutMs: number = TURN_TIMEOUT_MS,
  ) {}

  async step(req: BatpRequest) {
    if (!allowPrivate() && isPrivateHost(new URL(this.endpoint).hostname)) return { res: NO_ACTION, timedOut: false };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const r = await fetch(`${this.endpoint.replace(/\/$/, "")}/batp/v1/step`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
        body: JSON.stringify(req),
        signal: ctrl.signal,
        redirect: "error", // a redirect could point at a private host
      });
      if (!r.ok) return { res: NO_ACTION, timedOut: false };
      const parsed = BatpResponse.safeParse(await r.json());
      return { res: parsed.success ? parsed.data : NO_ACTION, timedOut: false };
    } catch (e) {
      return { res: NO_ACTION, timedOut: (e as Error).name === "AbortError" };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** In-process agent, for tests and for co-located mock agents. */
export class FunctionAgentClient implements AgentClient {
  constructor(private readonly fn: (req: BatpRequest) => BatpResponse | Promise<BatpResponse>) {}

  async step(req: BatpRequest) {
    return { res: BatpResponse.parse(await this.fn(req)), timedOut: false };
  }
}
