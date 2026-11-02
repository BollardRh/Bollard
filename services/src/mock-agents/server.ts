import { Hono } from "hono";
import type { BatpRequest } from "../harness/batp.ts";
import { AGENTS } from "./agents.ts";

/**
 * Serves the mock agents over BATP/1 at /<name>/batp/v1/step (naive, hardened, flaky).
 *   bun src/mock-agents/server.ts            # listens on PORT or 8787
 */
export function mockAgentApp(token?: string) {
  const app = new Hono();
  for (const [name, agent] of Object.entries(AGENTS)) {
    app.post(`/${name}/batp/v1/step`, async (c) => {
      if (token && c.req.header("authorization") !== `Bearer ${token}`) return c.json({ error: "unauthorized" }, 401);
      const req = (await c.req.json()) as BatpRequest;
      if (req?.protocol !== "batp/1") return c.json({ error: "unsupported protocol" }, 400);
      return c.json(agent(req));
    });
  }
  return app;
}

/** Starts the server on an ephemeral port. */
export function serveMockAgents(token?: string, port = 0) {
  const server = Bun.serve({ port, hostname: "127.0.0.1", fetch: mockAgentApp(token).fetch });
  return { url: `http://127.0.0.1:${server.port}`, stop: () => server.stop(true) };
}

if (import.meta.main) {
  const { url } = serveMockAgents(process.env.BATP_TOKEN, Number(process.env.PORT ?? 8787));
  console.log(`mock agents on ${url}/{naive,hardened,flaky}`);
}
