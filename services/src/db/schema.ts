import {
  bigint,
  bigserial,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Typed mirror of supabase/migrations/*.sql for the API and workers. The SQL migrations are the source of
 * truth; services/test/db.test.ts fails if this file and the migrated database disagree.
 * numeric(78,0) holds uint256 values and maps to string.
 */

const u256 = (name: string) => numeric(name, { precision: 78, scale: 0 });
const ts = (name: string) => timestamp(name, { withTimezone: true });
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const agents = pgTable(
  "agents",
  {
    chainId: integer("chain_id").notNull(),
    agentRegistry: text("agent_registry").notNull(),
    agentId: u256("agent_id").notNull(),
    owner: text("owner"),
    agentWallet: text("agent_wallet"),
    name: text("name"),
    agentUri: text("agent_uri"),
    currentVersion: text("current_version"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.agentRegistry, t.agentId] })],
);

export const runRequests = pgTable(
  "run_requests",
  {
    chainId: integer("chain_id").notNull(),
    requestId: u256("request_id").notNull(),
    agentRegistry: text("agent_registry").notNull(),
    agentId: u256("agent_id").notNull(),
    versionHash: text("version_hash").notNull(),
    payer: text("payer").notNull(),
    fee: u256("fee").notNull(),
    status: text("status", { enum: ["open", "running", "rated", "refunded"] }).notNull(),
    requestBlock: bigint("request_block", { mode: "bigint" }).notNull(),
    seedKey: text("seed_key"),
    endpoint: text("endpoint"),
    assignedLead: text("assigned_lead"),
    assignedCosigners: text("assigned_cosigners").array(),
    createdAt: ts("created_at").notNull().defaultNow(),
    runToken: text("run_token"),
    assignRound: integer("assign_round").notNull().default(0),
    stalledLeads: text("stalled_leads").array().notNull().default([]),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    endpointSignedAt: bigint("endpoint_signed_at", { mode: "number" }), // issuedAt (unix s) of the last accepted SetEndpoint signature
  },
  (t) => [primaryKey({ columns: [t.chainId, t.requestId] })],
);

export const runBundles = pgTable("run_bundles", {
  bundleHash: text("bundle_hash").primaryKey(),
  chainId: integer("chain_id").notNull(),
  requestId: u256("request_id").notNull(),
  leadKey: text("lead_key").notNull(),
  corpusRoot: text("corpus_root").notNull(),
  holdoutCommit: text("holdout_commit").notNull(),
  runsRoot: text("runs_root").notNull(),
  seeds: integer("seeds").notNull(),
  score: integer("score").notNull(),
  grade: integer("grade").notNull(),
  testedMask: integer("tested_mask").notNull(),
  failedMask: integer("failed_mask").notNull(),
  publicUri: text("public_uri").notNull(),
  holdoutCiphertextUri: text("holdout_ciphertext_uri"),
  createdAt: ts("created_at").notNull().defaultNow(),
  report: jsonb("report"),
  reportDigest: text("report_digest"),
  postedTx: text("posted_tx"),
  postedAt: ts("posted_at"),
});

export const runReceipts = pgTable(
  "run_receipts",
  {
    bundleHash: text("bundle_hash")
      .notNull()
      .references(() => runBundles.bundleHash),
    caseId: text("case_id").notNull(),
    family: integer("family").notNull(),
    seed: integer("seed").notNull(),
    variantHash: text("variant_hash").notNull(),
    transcriptHash: text("transcript_hash").notNull(),
    losses: text("losses").array().notNull(),
    holdout: boolean("holdout").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bundleHash, t.caseId, t.seed] })],
);

export const cosignatures = pgTable(
  "cosignatures",
  {
    bundleHash: text("bundle_hash").notNull(),
    chainId: integer("chain_id").notNull(),
    enclaveKey: text("enclave_key").notNull(),
    attester: text("attester").notNull(),
    digest: text("digest").notNull(),
    signature: text("signature").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.bundleHash, t.chainId, t.enclaveKey] })],
);

export const ratings = pgTable(
  "ratings",
  {
    chainId: integer("chain_id").notNull(),
    ratingId: u256("rating_id").notNull(),
    requestId: u256("request_id").notNull(),
    agentRegistry: text("agent_registry").notNull(),
    agentId: u256("agent_id").notNull(),
    versionHash: text("version_hash").notNull(),
    score: integer("score").notNull(),
    grade: integer("grade").notNull(),
    testedMask: integer("tested_mask").notNull(),
    failedMask: integer("failed_mask").notNull(),
    issuedAt: ts("issued_at"),
    expiresAt: ts("expires_at").notNull(),
    digest: text("digest").notNull(),
    attesters: text("attesters").array().notNull(),
    status: text("status", { enum: ["active", "disputed", "void"] }).notNull(),
    disputeDeadline: ts("dispute_deadline"),
    feesReleased: boolean("fees_released").notNull().default(false),
    txHash: text("tx_hash").notNull(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.chainId, t.ratingId] }),
    index("ratings_agent").on(t.chainId, t.agentRegistry, t.agentId, t.ratingId.desc()),
  ],
);

export const attesters = pgTable(
  "attesters",
  {
    chainId: integer("chain_id").notNull(),
    address: text("address").notNull(),
    bond: u256("bond").notNull(),
    unbonding: u256("unbonding").notNull(),
    withdrawableAt: ts("withdrawable_at"),
    jailed: boolean("jailed").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.address] })],
);

export const enclaveKeys = pgTable(
  "enclave_keys",
  {
    chainId: integer("chain_id").notNull(),
    key: text("key").notNull(),
    attester: text("attester").notNull(),
    osMeasurement: text("os_measurement").notNull(),
    composeHash: text("compose_hash").notNull(),
    rtmr3Hash: text("rtmr3_hash").notNull(),
    quoteHash: text("quote_hash").notNull(),
    rawQuote: bytea("raw_quote").notNull(),
    eventLog: jsonb("event_log"),
    activeAt: ts("active_at").notNull(),
    revoked: boolean("revoked").notNull().default(false),
    challenger: text("challenger"),
    watcherVerdict: text("watcher_verdict", { enum: ["pass", "fail", "pending"] }),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.key] })],
);

export const corpusVersions = pgTable("corpus_versions", {
  root: text("root").primaryKey(),
  holdoutCommit: text("holdout_commit").notNull(),
  uri: text("uri").notNull(),
  caseCount: integer("case_count").notNull(),
  publishedAt: ts("published_at"),
  retired: boolean("retired").notNull().default(false),
});

export const attackCases = pgTable(
  "attack_cases",
  {
    id: text("id").notNull(),
    corpusRoot: text("corpus_root")
      .notNull()
      .references(() => corpusVersions.root),
    family: integer("family").notNull(),
    body: jsonb("body").notNull(),
    leaf: text("leaf").notNull(),
  },
  (t) => [primaryKey({ columns: [t.id, t.corpusRoot] })],
);

export const corpusCandidates = pgTable("corpus_candidates", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  source: text("source").notNull(),
  arenaId: u256("arena_id"),
  attacker: text("attacker"),
  transcript: jsonb("transcript").notNull(),
  familyGuess: integer("family_guess"),
  status: text("status", { enum: ["pending", "public", "holdout", "rejected"] }).notNull().default("pending"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const arenas = pgTable(
  "arenas",
  {
    chainId: integer("chain_id").notNull(),
    arenaId: u256("arena_id").notNull(),
    funder: text("funder").notNull(),
    token: text("token").notNull(),
    bounty: u256("bounty").notNull(),
    canary: text("canary").notNull(),
    agentKey: text("agent_key").notNull(),
    houseAgentId: u256("house_agent_id"),
    endsAt: ts("ends_at").notNull(),
    status: text("status").notNull(),
    winner: text("winner"),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.arenaId] })],
);

export const arenaAttempts = pgTable(
  "arena_attempts",
  {
    chainId: integer("chain_id").notNull(),
    arenaId: u256("arena_id").notNull(),
    attacker: text("attacker").notNull(),
    openedBlock: bigint("opened_block", { mode: "bigint" }).notNull(),
    expiresAt: ts("expires_at").notNull(),
    commit: text("commit").notNull(),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.arenaId, t.attacker, t.openedBlock] })],
);

export const arenaMessages = pgTable("arena_messages", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  sessionId: text("session_id").notNull(),
  chainId: integer("chain_id").notNull(),
  arenaId: u256("arena_id").notNull(),
  attacker: text("attacker").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  actions: jsonb("actions"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const houseAgents = pgTable(
  "house_agents",
  {
    chainId: integer("chain_id").notNull(),
    agentId: u256("agent_id").notNull(),
    label: text("label").notNull(),
    endpoint: text("endpoint").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    agentKey: text("agent_key"),
    funder: text("funder"),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.agentId] })],
);

export const arenaSessions = pgTable("arena_sessions", {
  sessionId: text("session_id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  arenaId: u256("arena_id").notNull(),
  attacker: text("attacker").notNull(),
  openedBlock: bigint("opened_block", { mode: "bigint" }).notNull(),
  expiresAt: ts("expires_at").notNull(),
  commit: text("commit").notNull(),
  transcriptHash: text("transcript_hash").notNull(),
  messages: integer("messages").notNull().default(0),
  status: text("status", { enum: ["open", "won", "closed"] }).notNull().default("open"),
  winTx: text("win_tx"),
  busyUntil: ts("busy_until"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const jobLocks = pgTable("job_locks", {
  job: text("job").primaryKey(),
  lockedUntil: ts("locked_until").notNull(),
});

export const apiKeys = pgTable("api_keys", {
  keyHash: text("key_hash").primaryKey(),
  plan: text("plan").notNull().default("free"),
  paidUntil: ts("paid_until"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const watches = pgTable(
  "watches",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    telegramChatId: bigint("telegram_chat_id", { mode: "bigint" }).notNull(),
    chainId: integer("chain_id").notNull(),
    agentRegistry: text("agent_registry").notNull(),
    agentId: u256("agent_id").notNull(),
  },
  (t) => [unique().on(t.telegramChatId, t.chainId, t.agentRegistry, t.agentId)],
);

export const watchedSafes = pgTable(
  "watched_safes",
  {
    chainId: integer("chain_id").notNull(),
    safe: text("safe").notNull(),
    delegate: text("delegate").notNull(),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.safe, t.delegate] })],
);

export const chainEvents = pgTable(
  "chain_events",
  {
    chainId: integer("chain_id").notNull(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    logIndex: integer("log_index").notNull(),
    txHash: text("tx_hash").notNull(),
    address: text("address").notNull(),
    name: text("name").notNull(),
    args: jsonb("args").notNull(),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.txHash, t.logIndex] })],
);

export const cursors = pgTable(
  "cursors",
  {
    chainId: integer("chain_id").notNull(),
    stream: text("stream").notNull(),
    block: bigint("block", { mode: "bigint" }).notNull(),
    blockHash: text("block_hash"),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.stream] })],
);

// platform tables (migration 0002)
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  tokens: numeric("tokens").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const nodeAuthNonces = pgTable(
  "node_auth_nonces",
  {
    key: text("key").notNull(),
    nonce: text("nonce").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.key, t.nonce] })],
);

// API state (migration api)
export const nodeRegistrations = pgTable("node_registrations", {
  key: text("key").primaryKey(),
  attester: text("attester").notNull(),
  publicKey: text("public_key").notNull(),
  composeHash: text("compose_hash").notNull(),
  quote: text("quote").notNull(),
  eventLog: jsonb("event_log").notNull(),
  appCompose: text("app_compose").notNull(),
  firstSeen: ts("first_seen").notNull().defaultNow(),
  lastSeen: ts("last_seen").notNull().defaultNow(),
});

export const cosignRefusals = pgTable(
  "cosign_refusals",
  {
    bundleHash: text("bundle_hash").notNull(),
    enclaveKey: text("enclave_key").notNull(),
    problems: jsonb("problems").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.bundleHash, t.enclaveKey] })],
);

export const alertLog = pgTable("alert_log", {
  key: text("key").primaryKey(),
  sentAt: ts("sent_at").notNull().defaultNow(),
});
