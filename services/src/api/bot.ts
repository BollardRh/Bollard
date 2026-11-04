import { Bot } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { and, eq } from "drizzle-orm";
import { watches } from "../db/schema.ts";
import type { AppDeps } from "./context.ts";
import { latestRating, searchAgents, type RatingView } from "./ratings.ts";

/**
 * Telegram bot (doc §8, grammY, webhook mode): /rating <query>, /watch <agent id>, /unwatch <agent id>.
 * Alerts for watched agents come from the alerts worker. Replies state what a rating is: a dated test
 * result for one version.
 */

const BOT_INFO = {
  id: 9297305941,
  is_bot: true,
  first_name: "bollard",
  username: "bollardrh_bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
} as unknown as UserFromGetMe;

export function formatRating(v: RatingView): string {
  const failed = v.families.filter((f) => f.failed).map((f) => f.title);
  const state = v.usable ? "usable" : v.stale ? "stale (newer version declared)" : v.expired ? "expired" : v.status;
  return [
    `Agent ${v.agentId} — grade ${v.grade}/5, score ${v.score} (${state})`,
    `Version ${v.versionHash.slice(0, 10)}…, expires ${v.expiresAt.slice(0, 10)}`,
    failed.length ? `Failed families: ${failed.join(", ")}` : "No family failed.",
    "A rating is a dated test result for one agent version.",
  ].join("\n");
}

export function createBot(deps: AppDeps, token: string) {
  const bot = new Bot(token, { botInfo: BOT_INFO });
  const registry = deps.chain.contracts.identity8004.toLowerCase();

  const help = [
    "Bollard crash ratings on " + deps.chain.name + ".",
    "/rating <name, address or agent id> — latest rating",
    "/watch <agent id> — alerts when it is disputed, expiring or stale",
    "/unwatch <agent id>",
  ].join("\n");

  bot.command(["start", "help"], (ctx) => ctx.reply(help));

  bot.command("rating", async (ctx) => {
    const q = ctx.match.trim();
    if (!q || (q.length < 2 && !/^\d+$/.test(q))) return ctx.reply("Usage: /rating <name, address or agent id>");
    const hits = await searchAgents(deps, q);
    if (!hits.length) return ctx.reply("No rated agent matches that.");
    const top = hits[0]!;
    const v = await latestRating(deps, { chainId: top.chainId, agentRegistry: top.agentRegistry, agentId: top.agentId });
    return ctx.reply(v ? formatRating(v) : `Agent ${top.agentId} has no rating yet.`);
  });

  bot.command("watch", async (ctx) => {
    const id = ctx.match.trim();
    if (!/^\d+$/.test(id)) return ctx.reply("Usage: /watch <agent id>");
    await deps.db
      .insert(watches)
      .values({ telegramChatId: BigInt(ctx.chat.id), chainId: deps.chain.chainId, agentRegistry: registry, agentId: id })
      .onConflictDoNothing();
    return ctx.reply(`Watching agent ${id}. You will hear when its rating is disputed, close to expiry, or stale.`);
  });

  bot.command("unwatch", async (ctx) => {
    const id = ctx.match.trim();
    if (!/^\d+$/.test(id)) return ctx.reply("Usage: /unwatch <agent id>");
    await deps.db
      .delete(watches)
      .where(and(eq(watches.telegramChatId, BigInt(ctx.chat.id)), eq(watches.chainId, deps.chain.chainId), eq(watches.agentRegistry, registry), eq(watches.agentId, id)));
    return ctx.reply(`Stopped watching agent ${id}.`);
  });

  return bot;
}
