-- Arena engine (Phase 9): house agents, chat sessions, one corpus candidate per win.

-- The house agents arenas point at (ArenaOpened.houseAgentId). endpoint is an https BATP/1 endpoint, or
-- builtin:<name> for the testnet mock agents served in-process. The system prompt is published.
create table house_agents (
  chain_id      integer       not null,
  agent_id      numeric(78,0) not null,
  label         text          not null,
  endpoint      text          not null,
  system_prompt text          not null,
  primary key (chain_id, agent_id)
);

-- One chat session per on-chain attempt. Opened by revealing the salt behind AttemptOpened.transcriptCommit.
create table arena_sessions (
  session_id      text          primary key,
  chain_id        integer       not null,
  arena_id        numeric(78,0) not null,
  attacker        text          not null,
  opened_block    bigint        not null,
  expires_at      timestamptz   not null,
  commit          text          not null,
  transcript_hash text          not null,
  messages        integer       not null default 0,
  status          text          not null default 'open' check (status in ('open', 'won', 'closed')),
  win_tx          text,
  created_at      timestamptz   not null default now()
);
create index arena_sessions_attacker on arena_sessions (chain_id, attacker, created_at desc);
create index arena_sessions_arena on arena_sessions (chain_id, arena_id, attacker, opened_block desc);

create unique index corpus_candidates_arena_win on corpus_candidates (arena_id, attacker) where source = 'arena';

alter table house_agents enable row level security;
alter table arena_sessions enable row level security;
revoke all on table house_agents, arena_sessions from anon, authenticated;
