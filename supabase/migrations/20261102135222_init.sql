-- Bollard core schema: backend doc §9, unchanged apart from the extension living in `extensions`.
-- Chain data is indexed from Robinhood Chain testnet (46630); every table keys on chain_id so mainnet and
-- other chains are added without a migration.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ------------------------------------------------------------------ agents
create table agents (
  chain_id        integer      not null,
  agent_registry  text         not null,
  agent_id        numeric(78,0) not null,
  owner           text,
  agent_wallet    text,
  name            text,
  agent_uri       text,
  current_version text,
  updated_at      timestamptz  not null default now(),
  primary key (chain_id, agent_registry, agent_id)
);
create index agents_name_trgm on agents using gin (name extensions.gin_trgm_ops);

-- ------------------------------------------------------------------ rating runs
create table run_requests (
  chain_id          integer       not null,
  request_id        numeric(78,0) not null,
  agent_registry    text          not null,
  agent_id          numeric(78,0) not null,
  version_hash      text          not null,
  payer             text          not null,
  fee               numeric(78,0) not null,
  status            text          not null, -- open|running|rated|refunded
  request_block     bigint        not null,
  seed_key          text,
  endpoint          text,
  assigned_lead     text,
  assigned_cosigners text[],
  created_at        timestamptz   not null default now(),
  primary key (chain_id, request_id)
);

create table run_bundles (
  bundle_hash            text primary key,
  chain_id               integer       not null,
  request_id             numeric(78,0) not null,
  lead_key               text          not null,
  corpus_root            text          not null,
  holdout_commit         text          not null,
  runs_root              text          not null,
  seeds                  integer       not null,
  score                  integer       not null,
  grade                  integer       not null,
  tested_mask            integer       not null,
  failed_mask            integer       not null,
  public_uri             text          not null,
  holdout_ciphertext_uri text,
  created_at             timestamptz   not null default now()
);

create table run_receipts (
  bundle_hash     text    not null references run_bundles (bundle_hash),
  case_id         text    not null,
  family          integer not null,
  seed            integer not null,
  variant_hash    text    not null,
  transcript_hash text    not null,
  losses          text[]  not null,
  holdout         boolean not null,
  primary key (bundle_hash, case_id, seed)
);

create table cosignatures (
  bundle_hash text        not null,
  chain_id    integer     not null,
  enclave_key text        not null,
  attester    text        not null,
  digest      text        not null,
  signature   text        not null,
  created_at  timestamptz not null default now(),
  primary key (bundle_hash, chain_id, enclave_key)
);

-- ------------------------------------------------------------------ ratings (indexed from RatingRegistry)
create table ratings (
  chain_id         integer       not null,
  rating_id        numeric(78,0) not null,
  request_id       numeric(78,0) not null,
  agent_registry   text          not null,
  agent_id         numeric(78,0) not null,
  version_hash     text          not null,
  score            integer       not null,
  grade            integer       not null,
  tested_mask      integer       not null,
  failed_mask      integer       not null,
  issued_at        timestamptz,
  expires_at       timestamptz   not null,
  digest           text          not null,
  attesters        text[]        not null,
  status           text          not null, -- active|disputed|void
  dispute_deadline timestamptz,
  fees_released    boolean       not null default false,
  tx_hash          text          not null,
  block_number     bigint        not null,
  primary key (chain_id, rating_id)
);
create index ratings_agent on ratings (chain_id, agent_registry, agent_id, rating_id desc);

-- ------------------------------------------------------------------ attesters and enclave keys
create table attesters (
  chain_id        integer       not null,
  address         text          not null,
  bond            numeric(78,0) not null,
  unbonding       numeric(78,0) not null,
  withdrawable_at timestamptz,
  jailed          boolean       not null default false,
  primary key (chain_id, address)
);

create table enclave_keys (
  chain_id        integer     not null,
  key             text        not null,
  attester        text        not null,
  os_measurement  text        not null,
  compose_hash    text        not null,
  rtmr3_hash      text        not null,
  quote_hash      text        not null,
  raw_quote       bytea       not null,
  event_log       jsonb,
  active_at       timestamptz not null,
  revoked         boolean     not null default false,
  challenger      text,
  watcher_verdict text, -- pass|fail|pending
  primary key (chain_id, key)
);

-- ------------------------------------------------------------------ corpus
create table corpus_versions (
  root           text primary key,
  holdout_commit text        not null,
  uri            text        not null,
  case_count     integer     not null,
  published_at   timestamptz,
  retired        boolean     not null default false
);

create table attack_cases (
  id          text    not null,
  corpus_root text    not null references corpus_versions (root),
  family      integer not null,
  body        jsonb   not null,
  leaf        text    not null,
  primary key (id, corpus_root)
);

create table corpus_candidates (
  id           bigserial primary key,
  source       text          not null,
  arena_id     numeric(78,0),
  attacker     text,
  transcript   jsonb         not null,
  family_guess integer,
  status       text          not null default 'pending', -- pending|public|holdout|rejected
  created_at   timestamptz   not null default now()
);

-- ------------------------------------------------------------------ arena
create table arenas (
  chain_id       integer       not null,
  arena_id       numeric(78,0) not null,
  funder         text          not null,
  token          text          not null,
  bounty         numeric(78,0) not null,
  canary         text          not null,
  agent_key      text          not null,
  house_agent_id numeric(78,0),
  ends_at        timestamptz   not null,
  status         text          not null,
  winner         text,
  primary key (chain_id, arena_id)
);

create table arena_attempts (
  chain_id     integer       not null,
  arena_id     numeric(78,0) not null,
  attacker     text          not null,
  opened_block bigint        not null,
  expires_at   timestamptz   not null,
  commit       text          not null,
  primary key (chain_id, arena_id, attacker, opened_block)
);

create table arena_messages (
  id         bigserial primary key,
  session_id text          not null,
  chain_id   integer       not null,
  arena_id   numeric(78,0) not null,
  attacker   text          not null,
  role       text          not null,
  content    text          not null,
  actions    jsonb,
  created_at timestamptz   not null default now()
);

-- ------------------------------------------------------------------ API plans, bot, Safe watches
create table api_keys (
  key_hash   text primary key,
  plan       text        not null default 'free',
  paid_until timestamptz,
  created_at timestamptz not null default now()
);

create table watches (
  id               bigserial primary key,
  telegram_chat_id bigint        not null,
  chain_id         integer       not null,
  agent_registry   text          not null,
  agent_id         numeric(78,0) not null,
  unique (telegram_chat_id, chain_id, agent_registry, agent_id)
);

create table watched_safes (
  chain_id integer not null,
  safe     text    not null,
  delegate text    not null,
  primary key (chain_id, safe, delegate)
);

-- ------------------------------------------------------------------ indexer
create table chain_events (
  chain_id     integer not null,
  block_number bigint  not null,
  log_index    integer not null,
  tx_hash      text    not null,
  address      text    not null,
  name         text    not null,
  args         jsonb   not null,
  primary key (chain_id, tx_hash, log_index)
);

create table cursors (
  chain_id integer not null,
  stream   text    not null,
  block    bigint  not null,
  primary key (chain_id, stream)
);
