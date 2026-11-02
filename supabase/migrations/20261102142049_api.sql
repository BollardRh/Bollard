-- Phase 6 API state. Runs, co-signatures and posting are tracked as table state (idempotent, easy to
-- inspect); pgmq carries alerts.

-- Harness nodes announce themselves (signed by the enclave key) before and after on-chain registration.
create table node_registrations (
  key          text primary key,
  attester     text        not null,
  public_key   text        not null,
  compose_hash text        not null,
  quote        text        not null,
  event_log    jsonb       not null,
  app_compose  text        not null,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);

-- Per-run bearer token the harness presents to the builder's BATP endpoint (doc §5.1).
alter table run_requests add column run_token  text;
alter table run_requests add column updated_at timestamptz not null default now();

-- The report every signer signs, and the postRating transaction once sent.
alter table run_bundles add column report        jsonb;
alter table run_bundles add column report_digest text;
alter table run_bundles add column posted_tx     text;
alter table run_bundles add column posted_at     timestamptz;

-- A co-signer that refuses records why (doc §11: inspect the diff, never force).
create table cosign_refusals (
  bundle_hash text        not null,
  enclave_key text        not null,
  problems    jsonb       not null,
  created_at  timestamptz not null default now(),
  primary key (bundle_hash, enclave_key)
);

-- One row per alert already sent, so scheduled scans never notify twice.
create table alert_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);

create index run_bundles_unposted on run_bundles (chain_id, created_at) where posted_tx is null;
create index node_registrations_seen on node_registrations (last_seen);

-- same lockout as every other table
alter table node_registrations enable row level security;
alter table cosign_refusals    enable row level security;
alter table alert_log          enable row level security;
revoke all on table node_registrations, cosign_refusals, alert_log from anon, authenticated;
