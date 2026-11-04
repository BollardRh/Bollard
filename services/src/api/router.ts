import { initTRPC } from "@trpc/server";
import { z } from "zod";
import type { AppDeps } from "./context.ts";
import { checkOnChain, latestRating, ratingHistory, searchAgents } from "./ratings.ts";
import { fixList, requestCalldata, runStatus, setEndpoint, versionHash } from "./builder.ts";
import { corpusVersionList, families, nodeKey, nodeList } from "./reads.ts";
import { arenaDetails, arenaOverview, arenaWins, getSession, openSession, sendMessage } from "../arena/engine.ts";

/** tRPC v11 router (backend doc §8). All big numbers travel as decimal strings. */

const t = initTRPC.context<{ deps: AppDeps }>().create({
  isDev: false, // never send stack traces
  // unexpected errors (database, RPC, storage) keep their details server-side; expected ones say what is wrong
  errorFormatter: ({ shape, error }) =>
    error.code === "INTERNAL_SERVER_ERROR" ? { ...shape, message: "internal error", data: { ...shape.data, stack: undefined } } : shape,
});

const Addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const Hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/) as unknown as z.ZodType<`0x${string}`>;
const Sig = z.string().regex(/^0x[0-9a-fA-F]{130}$/) as unknown as z.ZodType<`0x${string}`>;
const Uint = z.union([z.string().regex(/^\d{1,78}$/), z.number().int().nonnegative()]).transform(String);
const AgentRef = z.object({ chainId: z.number().int(), agentRegistry: Addr, agentId: Uint });
const ArenaSession = z.object({ chainId: z.number().int(), arenaId: Uint, attacker: Addr, salt: Hex32 });

export const appRouter = t.router({
  rating: t.router({
    lookup: t.procedure.input(AgentRef).query(({ input, ctx }) => latestRating(ctx.deps, input)),
    search: t.procedure.input(z.object({ q: z.string().trim().min(1).max(100) })).query(({ input, ctx }) => searchAgents(ctx.deps, input.q)),
    history: t.procedure.input(AgentRef).query(({ input, ctx }) => ratingHistory(ctx.deps, input)),
    check: t.procedure
      .input(AgentRef.extend({ minGrade: z.number().int().min(1).max(5), mask: z.number().int().min(0).max(0xff) }))
      .query(({ input, ctx }) => checkOnChain(ctx.deps, input, input.minGrade, input.mask)),
  }),
  builder: t.router({
    versionHash: t.procedure
      .input(z.object({ imageDigest: Hex32, configHash: Hex32, modelId: z.string().min(1).max(200) }))
      .query(({ input }) => ({ versionHash: versionHash(input.imageDigest, input.configHash, input.modelId) })),
    requestCalldata: t.procedure
      .input(AgentRef.extend({ versionHash: Hex32, validationRequestHash: Hex32.optional() }))
      .query(({ input, ctx }) => requestCalldata(ctx.deps, input, input.versionHash, input.validationRequestHash)),
    runStatus: t.procedure
      .input(z.object({ chainId: z.number().int(), requestId: Uint }))
      .query(({ input, ctx }) => runStatus(ctx.deps, input.chainId, input.requestId)),
    setEndpoint: t.procedure
      .input(z.object({ chainId: z.number().int(), requestId: Uint, endpoint: z.string().max(500), issuedAt: z.number().int().nonnegative().max(2 ** 40), deadline: z.number().int().nonnegative().max(2 ** 40), signature: Sig }))
      .mutation(({ input, ctx }) => setEndpoint(ctx.deps, input)),
    fixList: t.procedure
      .input(z.object({ chainId: z.number().int(), ratingId: Uint, deadline: z.number().int().nonnegative().max(2 ** 40), signature: Sig }))
      .mutation(({ input, ctx }) => fixList(ctx.deps, input)), // owner-signed; POST keeps the signature out of URLs
  }),
  arena: t.router({
    list: t.procedure.query(({ ctx }) => arenaOverview(ctx.deps)),
    get: t.procedure.input(z.object({ arenaId: Uint })).query(({ input, ctx }) => arenaDetails(ctx.deps, input.arenaId)),
    wins: t.procedure.query(({ ctx }) => arenaWins(ctx.deps)),
    // the salt behind the attempt commit authenticates the attacker, so it travels in POST bodies only
    session: t.procedure.input(ArenaSession.extend({ resume: z.boolean().default(false) })).mutation(({ input, ctx }) =>
      input.resume ? getSession(ctx.deps, input) : openSession(ctx.deps, input),
    ),
    message: t.procedure
      .input(ArenaSession.extend({ content: z.string().min(1).max(2000) }))
      .mutation(({ input, ctx }) => sendMessage(ctx.deps, input)),
  }),
  corpus: t.router({
    families: t.procedure.query(({ ctx }) => families(ctx.deps)),
    versions: t.procedure.query(({ ctx }) => corpusVersionList(ctx.deps)),
  }),
  nodes: t.router({
    list: t.procedure.query(({ ctx }) => nodeList(ctx.deps)),
    key: t.procedure.input(z.object({ key: Addr })).query(({ input, ctx }) => nodeKey(ctx.deps, input.key)),
  }),
});

export type AppRouter = typeof appRouter;
