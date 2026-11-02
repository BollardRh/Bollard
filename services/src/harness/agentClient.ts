import { BatpResponse, NO_ACTION, TURN_TIMEOUT_MS, type AgentClient, type BatpRequest } from "./batp.ts";

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
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const r = await fetch(`${this.endpoint.replace(/\/$/, "")}/batp/v1/step`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
        body: JSON.stringify(req),
        signal: ctrl.signal,
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
