/*
 * Bollard dashboard: live data from the Bollard API (same origin) on Robinhood Chain testnet.
 * Hash routes: #overview, #lookup, #agent/<chainId>/<agentId>, #families, #builders, #nodes, #arena.
 * Wallet actions load dist/assets/wallet/wallet.mjs on demand (built from services/src/web/wallet.ts).
 */
(() => {
  "use strict";

  const view = document.querySelector("#view");
  const TITLES = {
    overview: "Overview",
    lookup: "Rating lookup",
    agent: "Agent rating",
    families: "Attack families",
    builders: "For builders",
    nodes: "Test nodes",
    arena: "Arena",
  };
  const FAMILY_NOTES = [
    "Hidden or encoded instructions",
    "Instructions passed between agents",
    "Tokens mistaken for authority",
    "Instructions planted in shared memory",
    "Unexpected amounts or units",
    "Persuasion that changes an approval",
    "Untrusted control-plane instructions",
    "Attempts to extract secrets",
  ];
  const DRAFT_KEY = "bollard-builder";

  // ------------------------------------------------------------------ helpers
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const short = (h) => (h && h.length > 14 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h || "");
  const date = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");
  const dateTime = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
  const units = (raw, decimals) => {
    if (raw === null || raw === undefined) return "—";
    const n = Number(BigInt(raw) / 10n ** BigInt(Math.max(0, decimals - 4))) / 1e4;
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };
  const icon = (d) =>
    `<svg class="dash-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    doc: '<path d="M5 5h14v14H5zM8 9h8M8 12h8M8 15h5"/>',
    cube: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3zM12 3v18M4 7.5l8 4.5 8-4.5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 11v2M11 12h2"/>',
    node: '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01"/>',
  };

  const header = (title, desc, action = "") =>
    `<div class="view-heading"><div><p class="overline">BOLLARD / ${esc(title.toUpperCase())}</p><h1>${esc(title)}</h1><p>${desc}</p></div>${action}</div>`;
  const empty = (title, body) => `<div class="empty">${icon(ICONS.target)}<strong>${esc(title)}</strong><p>${body}</p></div>`;
  const loading = (what = "Loading") => `<div class="loading" role="status">${esc(what)}…</div>`;
  const errorBox = (e) => `<div class="error-box" role="alert"><strong>Could not load this.</strong><p>${esc(e?.message || e)}</p></div>`;
  const pill = (text, kind = "muted") => `<span class="pill ${kind}">${esc(text)}</span>`;

  // ------------------------------------------------------------------ API
  const api = {
    async get(path) {
      const r = await fetch(path, { headers: { accept: "application/json" } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.error || `HTTP ${r.status}`), { status: r.status });
      return j;
    },
    async query(proc, input) {
      const q = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify(input))}`;
      const r = await fetch(`/api/trpc/${proc}${q}`);
      const j = await r.json().catch(() => ({}));
      if (j.error) throw new Error(j.error.message || "request failed");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return j.result.data;
    },
    async mutate(proc, input) {
      const r = await fetch(`/api/trpc/${proc}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const j = await r.json().catch(() => ({}));
      if (j.error) throw new Error(j.error.message || "request failed");
      return j.result.data;
    },
  };

  let configPromise;
  const config = () => (configPromise ??= api.get("/api/v1/config"));
  const explorer = async (kind, value) => {
    const c = await config();
    return c.explorer ? `<a href="${esc(`${c.explorer}/${kind}/${value}`)}" target="_blank" rel="noopener" class="mono">${esc(short(value))} ↗</a>` : `<span class="mono">${esc(short(value))}</span>`;
  };

  const draft = {
    read() {
      try {
        const v = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
        return v && typeof v === "object" && !Array.isArray(v) ? v : {};
      } catch {
        return {};
      }
    },
    merge(patch) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft.read(), ...patch }));
      } catch {
        /* storage blocked: the flow still works for this visit */
      }
    },
  };

  let wallet;
  const loadWallet = async () => (wallet ??= await import("./assets/wallet/wallet.mjs"));

  // ------------------------------------------------------------------ shared pieces
  const gradeBadge = (grade, size = "") => `<span class="grade-badge g${Number(grade) || 0} ${size}" aria-label="Grade ${esc(grade)} of 5"><b>${esc(grade)}</b><small>/5</small></span>`;

  const ratingState = (r) => {
    if (r.status === "disputed") return pill("Disputed", "bad");
    if (r.status === "void") return pill("Void", "bad");
    if (r.stale) return pill("Stale version", "warn");
    if (r.expired) return pill("Expired", "warn");
    return pill("Usable", "ok");
  };

  const ratingRow = (r) => `
    <a class="row" href="#agent/${esc(r.chainId)}/${esc(r.agentId)}">
      ${gradeBadge(r.grade, "sm")}
      <span class="row-main"><strong>Agent ${esc(r.agentId)}</strong><small>Score ${esc(r.score)} · rating #${esc(r.ratingId)} · expires ${esc(date(r.expiresAt))}</small></span>
      ${ratingState(r)}
    </a>`;

  // ------------------------------------------------------------------ views
  async function overview() {
    const [cfg, stats, recent] = await Promise.all([config(), api.get("/api/v1/stats"), api.get("/api/v1/recent")]);
    const stat = (label, ic, value, note) =>
      `<article class="glass stat"><div class="stat-top"><span>${esc(label)}</span>${icon(ic)}</div><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
    return (
      header("Agent ratings", `Live crash ratings on ${esc(cfg.network)}.`, '<a class="primary" href="#lookup">Look up an agent ↗</a>') +
      `<div class="stats">
        ${stat("Usable ratings", ICONS.grid, stats.activeRatings, "Active and not expired")}
        ${stat("Attack families", ICONS.doc, 8, stats.corpus ? `${stats.corpus.caseCount} cases in the live corpus` : "Corpus not published")}
        ${stat("Network", ICONS.cube, cfg.testnet ? "Testnet" : "Mainnet", `${cfg.network} · chain ${cfg.chainId}`)}
        ${stat("Test nodes", ICONS.node, stats.activeKeys, `${stats.attesters} bonded attester${stats.attesters === 1 ? "" : "s"}`)}
      </div>
      <div class="content-grid">
        <section class="glass panel activity"><div class="panel-head"><div><h2>Rating activity</h2><p>Latest ratings posted on-chain</p></div>${pill(`${stats.runsOpen} run${stats.runsOpen === 1 ? "" : "s"} in progress`)}</div>
          ${recent.length ? `<div class="rows">${recent.map(ratingRow).join("")}</div>` : empty("No ratings yet", "Posted ratings appear here within a minute of landing on-chain.")}
        </section>
        <section class="glass panel guide"><div class="panel-head"><div><h2>Read the evidence</h2><p>A rating is a dated test result</p></div><span>↗</span></div><div class="guide-list"><div><span>01</span><p>Confirm the agent version</p></div><div><span>02</span><p>Review the families tested</p></div><div><span>03</span><p>Check expiry and dispute status</p></div></div><a href="#families" class="panel-link">Explore attack families <span>↗</span></a></section>
      </div>
      <section class="glass notice"><div><span class="notice-dot"></span><strong>Designed for evidence, not assurances.</strong><p>A rating cannot predict future behavior or cover losses. Keep your own limits.</p></div><a href="details.html">Full methodology ↗</a></section>`
    );
  }

  async function lookup() {
    const cfg = await config();
    return (
      header("Rating lookup", "Search by agent id, owner or wallet address.") +
      `<section class="glass panel search-panel"><div class="panel-head"><div><h2>Find an agent</h2><p>Latest versioned rating on ${esc(cfg.network)}.</p></div>${pill("Live", "ok")}</div>
        <form id="search-form" class="search-row"><label><span>Agent</span><input name="query" placeholder="ERC-8004 id or 0x address" required autocomplete="off"></label><button class="primary">Search ↗</button></form>
        <div id="search-result"></div>
      </section>`
    );
  }

  function bindLookup() {
    const form = document.querySelector("#search-form");
    const out = document.querySelector("#search-result");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const q = form.elements.query.value.trim();
      out.innerHTML = loading("Searching");
      try {
        const hits = await api.get(`/v1/search?q=${encodeURIComponent(q)}`);
        out.innerHTML = hits.length
          ? `<div class="rows">${hits
              .map(
                (h) => `<a class="row" href="#agent/${esc(h.chainId)}/${esc(h.agentId)}">${h.latestGrade ? gradeBadge(h.latestGrade, "sm") : '<span class="grade-badge sm none">–</span>'}
                  <span class="row-main"><strong>Agent ${esc(h.agentId)}${h.name ? ` · ${esc(h.name)}` : ""}</strong><small>Owner ${esc(short(h.owner))}${h.expiresAt ? ` · expires ${esc(date(h.expiresAt))}` : ""}</small></span>
                  ${h.latestStatus ? pill(h.latestStatus, h.latestStatus === "active" ? "ok" : "bad") : pill("Not rated")}</a>`,
              )
              .join("")}</div>`
          : /^\d+$/.test(q)
            ? empty("No rated agent with that id", `<a href="#agent/${(await config()).chainId}/${esc(q)}">Open agent ${esc(q)} anyway ↗</a>`)
            : empty("No match", "Try an ERC-8004 agent id or the owner's 0x address.");
      } catch (err) {
        out.innerHTML = errorBox(err);
      }
    };
  }

  async function agentView(chainId, agentId) {
    const cfg = await config();
    let r;
    try {
      r = await api.get(`/v1/rating/${encodeURIComponent(chainId)}/${encodeURIComponent(agentId)}`);
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    const head = header(`Agent ${agentId}`, `ERC-8004 agent on ${esc(cfg.network)}.`, '<a class="secondary" href="#lookup">← Back to search</a>');
    if (!r) return head + `<section class="glass panel">${empty("No rating yet", "This agent has no posted rating. Builders can request a run from the Builders page.")}</section>`;

    const history = await api.query("rating.history", { chainId: Number(chainId), agentRegistry: r.agentRegistry, agentId: String(agentId) }).catch(() => []);
    const signers = await Promise.all(r.attesters.map((a) => explorer("address", a)));
    const kv = (k, v) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
    return (
      head +
      `<div class="agent-grid">
        <section class="glass panel grade-panel">
          ${gradeBadge(r.grade, "lg")}
          <div><p class="overline">SCORE</p><strong class="score">${esc(r.score)}<small>/100</small></strong></div>
          <div class="state">${ratingState(r)}<small>Expires ${esc(dateTime(r.expiresAt))}</small></div>
        </section>
        <section class="glass panel"><div class="panel-head"><div><h2>Families</h2><p>Bit i of the tested and failed masks</p></div></div>
          <div class="fam-grid">${r.families
            .map(
              (f) => `<div class="fam ${f.failed ? "failed" : f.tested ? "passed" : "untested"}"><span>${String(f.index + 1).padStart(2, "0")}</span><strong>${esc(f.title)}</strong>${f.critical ? '<em>critical</em>' : ""}${pill(
                f.failed ? "Failed" : f.tested ? "Passed" : "Not tested",
                f.failed ? "bad" : f.tested ? "ok" : "muted",
              )}</div>`,
            )
            .join("")}</div>
        </section>
      </div>
      <div class="content-grid">
        <section class="glass panel"><div class="panel-head"><div><h2>Evidence</h2><p>What was tested, when, and who signed</p></div></div>
          <dl class="kv">
            ${kv("Version tested", `<span class="mono" title="${esc(r.versionHash)}">${esc(short(r.versionHash))}</span>`)}
            ${kv("Current version", r.currentVersion ? `<span class="mono" title="${esc(r.currentVersion)}">${esc(short(r.currentVersion))}</span>${r.stale ? " " + pill("newer", "warn") : ""}` : "—")}
            ${kv("Issued", esc(dateTime(r.issuedAt)))}
            ${kv("Rating / request", `#${esc(r.ratingId)} / #${esc(r.requestId)}`)}
            ${kv("Posted in", await explorer("tx", r.txHash))}
            ${kv("Signers", signers.join(" "))}
            ${kv("Run bundle", r.bundle ? `<a href="${esc(r.bundle.url)}" target="_blank" rel="noopener" class="mono">${esc(short(r.bundle.hash))} ↗</a>` : "—")}
            ${kv("Dispute window ends", esc(dateTime(r.disputeDeadline)))}
          </dl>
        </section>
        <section class="glass panel"><div class="panel-head"><div><h2>Gate check</h2><p>The same check wallets and policies run on-chain</p></div></div>
          <form id="gate-form" class="form-grid">
            <label>Minimum grade<select name="min">${[1, 2, 3, 4, 5].map((g) => `<option${g === 3 ? " selected" : ""}>${g}</option>`).join("")}</select></label>
            <label>Families that must pass<select name="mask"><option value="0">None required</option><option value="183">Critical families</option><option value="255">All eight</option></select></label>
            <div class="wide form-actions"><button class="primary">Run check ↗</button><span id="gate-out" role="status"></span></div>
          </form>
        </section>
      </div>
      ${history.length > 1 ? `<section class="glass panel"><div class="panel-head"><div><h2>History</h2><p>Every rating this agent has received</p></div></div><div class="rows">${history.map(ratingRow).join("")}</div></section>` : ""}`
    );
  }

  function bindAgent(chainId, agentId) {
    const form = document.querySelector("#gate-form");
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const out = document.querySelector("#gate-out");
      out.textContent = "Checking…";
      try {
        const c = await api.get(`/v1/check/${encodeURIComponent(chainId)}/${encodeURIComponent(agentId)}?min=${form.elements.min.value}&mask=${form.elements.mask.value}`);
        out.innerHTML = c.ok ? `${pill("Pass", "ok")} valid until ${esc(dateTime(new Date(Number(c.validUntil) * 1000).toISOString()))}` : `${pill("Fail", "bad")} ${esc(c.codeName)}`;
      } catch (err) {
        out.textContent = err.message;
      }
    };
  }

  async function families() {
    const fams = await api.query("corpus.families");
    const list = (filter = "") =>
      fams
        .filter((f) => `${f.title} ${FAMILY_NOTES[f.index]}`.toLowerCase().includes(filter.toLowerCase()))
        .map(
          (f) =>
            `<article class="family-item"><div class="family-icon">${String(f.index + 1).padStart(2, "0")}</div><div><strong>${esc(f.title)}</strong><p>${esc(FAMILY_NOTES[f.index])} · ${f.cases} cases</p></div><span class="tag">${f.critical ? "Critical" : "Standard"}</span></article>`,
        )
        .join("");
    families.list = list;
    return (
      header("Attack families", "The eight families in the live corpus.") +
      `<section class="glass panel"><div class="panel-head"><div><h2>Explore the corpus</h2><p>Cases use simulated wallets and machine-checkable loss rules.</p></div><label class="filter"><span class="sr-only">Filter families</span><input id="filter" placeholder="Filter families…"></label></div><div class="family-grid" id="family-grid">${list()}</div><p class="fine-print">A test cannot cover every possible attack or predict future behavior.</p></section>`
    );
  }

  function bindFamilies() {
    const filter = document.querySelector("#filter");
    filter.oninput = () => {
      document.querySelector("#family-grid").innerHTML = families.list(filter.value) || '<p class="fine-print">No matching attack families.</p>';
    };
  }

  async function nodes() {
    const [cfg, list] = await Promise.all([config(), api.query("nodes.list")]);
    const rows = await Promise.all(
      list.map(async (a) => {
        const keys = a.keys
          .map((k) => {
            const active = !k.revoked && !k.challenged && new Date(k.activeAt) <= new Date();
            const state = k.revoked ? pill("Revoked", "bad") : k.challenged ? pill("Challenged", "warn") : active ? pill("Active", "ok") : pill("In challenge window", "warn");
            const verdict = k.watcherVerdict === "pass" ? pill("Watcher: pass", "ok") : k.watcherVerdict === "fail" ? pill("Watcher: fail", "bad") : pill("Watcher: pending");
            return `<li><span class="mono" title="${esc(k.key)}">${esc(short(k.key))}</span>${state}${verdict}<small>${k.lastSeen ? `seen ${esc(dateTime(k.lastSeen))}` : "not seen"}</small></li>`;
          })
          .join("");
        return `<article class="glass panel node-card"><div class="panel-head"><div><h2>Attester ${await explorer("address", a.address)}</h2><p>Bond ${esc(units(a.bond, 18))} tBLRD${a.unbonding !== "0" ? ` · unbonding ${esc(units(a.unbonding, 18))}` : ""}</p></div>${a.jailed ? pill("Jailed", "bad") : pill("Bonded", "ok")}</div><ul class="key-list">${keys || "<li>No enclave keys</li>"}</ul></article>`;
      }),
    );
    return (
      header("Test nodes", `Bonded attesters and their attested enclave keys on ${esc(cfg.network)}.`) +
      (rows.length ? `<div class="node-grid">${rows.join("")}</div>` : `<section class="glass panel">${empty("No attesters yet", "Attesters appear here once they bond.")}</section>`) +
      `<section class="glass notice"><div><strong>${cfg.testnet ? "Testnet nodes use the dev attestor." : "Nodes run in Intel TDX enclaves."}</strong><p>${cfg.testnet ? "Their quotes are synthetic and only allowed on testnet. Mainnet nodes run in Intel TDX confidential VMs." : "Each key is bound to an allowed OS image and harness build."}</p></div><a href="system.html">How the system works ↗</a></section>`
    );
  }

  const fmt = (raw, decimals, symbol) => `${units(raw, decimals)} ${symbol}`;
  const arenaState = (s) => pill(s === "open" ? "Open" : s === "won" ? "Won" : s === "ended" ? "Ended" : "Closed", s === "open" ? "ok" : s === "won" ? "warn" : "muted");

  async function arena() {
    const [list, wins] = await Promise.all([api.query("arena.list"), api.query("arena.wins").catch(() => [])]);
    const winRows = await Promise.all(
      wins.map(
        async (w) =>
          `<div class="row"><span class="row-main"><strong>Arena #${esc(w.arenaId)} · ${esc(fmt(w.paid, w.tokenDecimals, w.tokenSymbol))} paid</strong><small>Winner ${esc(short(w.winner))}${w.messages ? ` · ${esc(w.messages)} message${w.messages === 1 ? "" : "s"}` : ""}</small></span>${w.winTx ? await explorer("tx", w.winTx) : ""}</div>`,
      ),
    );
    return (
      header("Arena", "Talk a house test agent into paying you. A canary transfer to your attempt wallet pays the bounty on-chain.") +
      `<section class="glass panel"><div class="panel-head"><div><h2>Arenas</h2><p>Each arena escrows a bounty. Winners get 90%; 10% goes to the fee router.</p></div></div>
        ${list.length
          ? `<div class="rows">${list
              .map(
                (a) => `<a class="row" href="#arena/${esc(a.arenaId)}"><span class="row-main"><strong>Arena #${esc(a.arenaId)}${a.houseAgent ? ` · ${esc(a.houseAgent)}` : ""}</strong><small>Bounty ${esc(fmt(a.bounty, a.tokenDecimals, a.tokenSymbol))} · ${a.status === "open" ? `ends ${esc(date(a.endsAt))}` : a.status === "won" ? "bounty paid" : `ended ${esc(date(a.endsAt))}`}</small></span>${arenaState(a.status)}</a>`,
              )
              .join("")}</div>`
          : empty("No arenas open yet", "Arenas appear here once a funder opens one on-chain.")}
      </section>
      <section class="glass panel"><div class="panel-head"><div><h2>Wins</h2><p>Every win is settled on-chain and its chat becomes a corpus candidate.</p></div></div>
        ${winRows.length ? `<div class="rows">${winRows.join("")}</div>` : empty("No wins yet", "The first successful attack will show up here.")}
      </section>
      <section class="glass notice"><div><strong>From challenge to corpus</strong><p>Winning attacks become candidates for future test cases, subject to review.</p></div><a href="#families">Explore the corpus ↗</a></section>`
    );
  }

  async function arenaDetail(id) {
    const [cfg, a] = await Promise.all([config(), api.query("arena.get", { arenaId: String(id) })]);
    const back = '<a class="secondary" href="#arena">← All arenas</a>';
    if (!a) return header(`Arena ${id}`, "Not found.", back) + `<section class="glass panel">${empty("No such arena", "It may not be indexed yet. Try again in a minute.")}</section>`;
    const canary = a.canaryBalances.length ? a.canaryBalances.map((b) => esc(fmt(b.raw, b.decimals, b.symbol))).join(", ") : "empty";
    const kv = (k, v) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
    const open = a.status === "open" && new Date(a.endsAt) > new Date();
    return (
      header(`Arena ${a.arenaId}`, a.houseAgent ? `House agent: ${esc(a.houseAgent.label)}.` : "House agent not configured.", back) +
      `<div class="arena-grid">
        <section class="glass panel"><div class="panel-head"><div><h2>Bounty</h2><p>Paid automatically by ArenaBounty</p></div>${arenaState(open ? "open" : a.status === "open" ? "ended" : a.status)}</div>
          <strong class="bounty">${esc(units(a.payout, a.tokenDecimals))} <small>${esc(a.tokenSymbol)} to the winner</small></strong>
          <dl class="kv">
            ${kv("Escrowed", esc(fmt(a.bounty, a.tokenDecimals, a.tokenSymbol)))}
            ${kv("Canary wallet", `${await explorer("address", a.canary)} · ${canary}`)}
            ${kv(a.status === "open" ? "Ends" : "Ended", esc(dateTime(a.endsAt)))}
            ${kv("Attempt cost", `${esc(units(a.attemptBurn, 18))} tBLRD burned · lasts ${esc(Math.round(a.attemptWindowSec / 60))} min`)}
            ${kv("Limits", `${esc(a.limits.messages)} messages per attempt · 1 attempt per wallet per ${esc(a.limits.cooldownMin)} min`)}
            ${kv("Activity", `${esc(a.stats.attempts)} attempts · ${esc(a.stats.messages)} messages`)}
            ${a.winner ? kv("Winner", await explorer("address", a.winner)) : ""}
          </dl>
          ${a.houseAgent ? `<details class="prompt"><summary>Published system prompt</summary><p>${esc(a.houseAgent.systemPrompt)}</p></details>` : ""}
        </section>
        <section class="glass panel"><div class="panel-head"><div><h2>Your attempt</h2><p>Win by getting the agent to send canary funds to your wallet.</p></div></div>
          ${open
            ? `<div class="step-row"><button class="primary" type="button" data-arena="connect">Connect wallet</button><span id="arena-wallet" class="step-status">Not connected</span></div>
               <div class="step-row" id="attempt-row" hidden>${cfg.testnet ? `<button class="secondary" type="button" data-arena="faucet">Get test tBLRD</button>` : ""}<button class="primary" type="button" data-arena="attempt">Open attempt</button></div>
               <div id="chat" class="chat" hidden>
                 <div class="chat-head"><span id="chat-status" class="step-status"></span></div>
                 <div id="chat-log" class="chat-log" aria-live="polite"></div>
                 <form id="chat-form" class="chat-form"><label class="sr-only" for="chat-input">Message</label><textarea id="chat-input" rows="2" maxlength="2000" placeholder="Write to the house agent…"></textarea><button class="primary">Send</button></form>
               </div>
               <p id="arena-log" class="builder-log" role="status" aria-live="polite"></p>`
            : empty(a.status === "won" ? "This arena was won" : "This arena is closed", a.status === "won" ? "The bounty has been paid. Look for an open arena." : "Attempts can no longer be opened.")}
        </section>
      </div>`
    );
  }

  function bindArena(id) {
    if (!document.querySelector("[data-arena]")) return;
    const log = (msg, kind = "") => {
      const el = document.querySelector("#arena-log");
      if (!el) return;
      el.className = `builder-log ${kind}`;
      el.textContent = msg;
    };
    const saltKey = (cfg, who) => `bollard-arena:${cfg.chainId}:${id}:${who.toLowerCase()}`;
    const readSalt = (cfg, who) => {
      try {
        return localStorage.getItem(saltKey(cfg, who));
      } catch {
        return null;
      }
    };
    const writeSalt = (cfg, who, salt) => {
      try {
        localStorage.setItem(saltKey(cfg, who), salt);
      } catch {
        /* storage blocked: the session works for this visit only */
      }
    };
    let salt = null;
    let who = null;

    const renderMessage = async (m) => {
      const actions = await Promise.all(
        (m.actions || []).map(async (x) =>
          x.executed
            ? `<li>${pill(x.won ? "Bounty paid" : x.counted ? "Counted" : "Sent", x.won ? "warn" : "ok")} ${esc(x.tool)} ${esc(x.args.amount ?? "")} ${esc(x.args.token ?? "")} → <span class="mono">${esc(short(String(x.args.to ?? "")))}</span> ${x.tx ? await explorer("tx", x.tx) : ""}</li>`
            : `<li>${pill("Not executed", "muted")} ${esc(x.tool)}: ${esc(x.error || "")}</li>`,
        ),
      );
      return `<div class="msg ${m.role === "attacker" ? "me" : "agent"}"><small>${m.role === "attacker" ? "You" : "House agent"}</small><p>${esc(m.content || "(no reply)")}</p>${actions.length ? `<ul class="msg-actions">${actions.join("")}</ul>` : ""}</div>`;
    };
    const setStatus = (s) => {
      const won = s.status === "won";
      document.querySelector("#chat-status").innerHTML = won
        ? `${pill("You won", "warn")} ${s.winTx ? `<span class="mono">${esc(short(s.winTx))}</span>` : ""}`
        : `${pill(`${s.messagesLeft} messages left`, s.messagesLeft ? "ok" : "bad")} attempt ends ${esc(dateTime(s.expiresAt))}`;
      const form = document.querySelector("#chat-form");
      form.hidden = won || !s.messagesLeft || new Date(s.expiresAt) <= new Date();
    };
    const showSession = async (s) => {
      document.querySelector("#attempt-row").hidden = true;
      document.querySelector("#chat").hidden = false;
      const logEl = document.querySelector("#chat-log");
      logEl.innerHTML = (await Promise.all(s.messages.map(renderMessage))).join("") || '<p class="fine-print">Session open. The house agent sees your messages as coming from an outside party.</p>';
      logEl.scrollTop = logEl.scrollHeight;
      setStatus(s);
    };
    const openSession = async (cfg, retries = 20) => {
      for (let i = 0; ; i++) {
        try {
          const s = await api.mutate("arena.session", { chainId: cfg.chainId, arenaId: String(id), attacker: who, salt });
          await showSession(s);
          log("");
          return s;
        } catch (err) {
          if (!/not settled yet/.test(err.message) || i >= retries) throw err;
          log("Waiting for the attempt to settle…");
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    };

    const busy = async (btn, fn) => {
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Working…";
      try {
        await fn();
      } catch (err) {
        log(err?.shortMessage || err?.message || String(err), "bad");
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    };

    const actions = {
      async connect() {
        const cfg = await config();
        const w = await loadWallet();
        if (!w.hasWallet()) throw new Error("No browser wallet found. Install MetaMask or another EVM wallet to continue.");
        who = await w.connect({ chainId: cfg.chainId, network: cfg.network, rpcUrl: cfg.rpcUrl, explorer: cfg.explorer });
        document.querySelector("#arena-wallet").innerHTML = `${pill("Connected", "ok")} <span class="mono">${esc(short(who))}</span>`;
        salt = readSalt(cfg, who);
        if (salt) {
          try {
            await openSession(cfg, 0);
            return;
          } catch (err) {
            log(`${err.message}. Open a new attempt to play again.`);
          }
        }
        document.querySelector("#attempt-row").hidden = false;
      },
      async faucet() {
        const a = await api.query("arena.get", { arenaId: String(id) });
        const w = await loadWallet();
        await w.mintTestTokens(a.blrd, BigInt(a.attemptBurn) * 5n);
        log(`Minted test tBLRD. Balance: ${units(String(await w.tokenBalance(a.blrd)), 18)}.`, "ok");
      },
      async attempt() {
        const cfg = await config();
        const a = await api.query("arena.get", { arenaId: String(id) });
        const w = await loadWallet();
        const burn = BigInt(a.attemptBurn);
        if (burn > 0n) {
          if ((await w.tokenBalance(a.blrd)) < burn) throw new Error(`You need ${units(a.attemptBurn, 18)} tBLRD to open an attempt.`);
          if ((await w.allowance(a.blrd, cfg.contracts.arenaBounty)) < burn) {
            log("Approve the tBLRD burn in your wallet…");
            await w.approve(a.blrd, cfg.contracts.arenaBounty, burn);
          }
        }
        log("Confirm the attempt in your wallet…");
        const r = await w.enterAttempt(cfg.contracts.arenaBounty, String(id));
        salt = r.salt;
        writeSalt(cfg, who, salt);
        await openSession(cfg);
      },
    };

    document.querySelector(".arena-grid").onclick = (e) => {
      const btn = e.target.closest("button[data-arena]");
      if (btn) busy(btn, actions[btn.dataset.arena]);
    };
    const form = document.querySelector("#chat-form");
    const input = document.querySelector("#chat-input");
    input.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const content = input.value.trim();
      if (!content) return;
      const btn = form.querySelector("button");
      const logEl = document.querySelector("#chat-log");
      await busy(btn, async () => {
        const cfg = await config();
        logEl.insertAdjacentHTML("beforeend", await renderMessage({ role: "attacker", content }));
        input.value = "";
        logEl.scrollTop = logEl.scrollHeight;
        const r = await api.mutate("arena.message", { chainId: cfg.chainId, arenaId: String(id), attacker: who, salt, content });
        logEl.insertAdjacentHTML("beforeend", await renderMessage({ role: "agent", content: r.reply, actions: r.actions }));
        logEl.scrollTop = logEl.scrollHeight;
        const s = await api.mutate("arena.session", { chainId: cfg.chainId, arenaId: String(id), attacker: who, salt, resume: true });
        setStatus(s);
        if (r.won) log("The bounty was paid to your wallet.", "ok");
      });
    };
  }

  // ------------------------------------------------------------------ builder flow
  async function builders() {
    const cfg = await config();
    const d = draft.read();
    const fee = cfg.runFee ? units(cfg.runFee, cfg.feeDecimals) : "300";
    const field = (name, label, ph = "", extra = "") => `<label>${esc(label)}<input name="${name}" value="${esc(d[name] || "")}" placeholder="${esc(ph)}" ${extra}></label>`;
    return (
      header("For builders", "Request a crash rating for one version of your agent.") +
      `<div class="builder-grid">
        <section class="glass panel"><div class="panel-head"><div><h2>Request a rating run</h2><p>${esc(cfg.network)} · fee ${esc(fee)} tUSDG</p></div>${pill(cfg.testnet ? "Testnet" : "Live", cfg.testnet ? "warn" : "ok")}</div>
          <form id="builder-form" class="steps" autocomplete="off">
            <fieldset class="step"><legend><span>01</span> Wallet</legend>
              <div class="step-row"><button class="primary" type="button" data-act="connect">Connect wallet</button><span id="wallet-status" class="step-status">Not connected</span></div>
            </fieldset>
            <fieldset class="step"><legend><span>02</span> Agent</legend>
              <div class="form-grid">${field("agentId", "ERC-8004 agent id", "e.g. 291", 'inputmode="numeric"')}
              <label>New agent URI<input name="agentURI" placeholder="https://… (only to register a new agent)"></label>
              <div class="wide form-actions"><button class="secondary" type="button" data-act="register">Register a new agent</button></div></div>
            </fieldset>
            <fieldset class="step"><legend><span>03</span> Version</legend>
              <div class="form-grid">${field("imageDigest", "Image digest (bytes32)", "0x…")}${field("configHash", "Config hash (bytes32)", "0x…")}${field("modelId", "Model id", "e.g. my-model-2026-10")}
              ${field("versionHash", "Version hash", "computed, or paste one")}
              <div class="wide form-actions"><button class="secondary" type="button" data-act="version">Compute version hash</button></div></div>
            </fieldset>
            <fieldset class="step"><legend><span>04</span> Pay and request</legend>
              <div class="step-row">${cfg.testnet ? `<button class="secondary" type="button" data-act="faucet">Get ${esc(fee)} test tUSDG</button>` : ""}<button class="primary" type="button" data-act="request">Approve fee and request run</button></div>
            </fieldset>
            <fieldset class="step"><legend><span>05</span> Test endpoint</legend>
              <div class="form-grid">${field("requestId", "Request id", "from step 04", 'inputmode="numeric"')}${field("endpoint", "BATP endpoint", "https://…", 'type="url"')}
              <div class="wide form-actions"><button class="primary" type="button" data-act="endpoint">Sign and set endpoint</button></div></div>
              <div id="token-box"></div>
            </fieldset>
            <fieldset class="step"><legend><span>06</span> Status</legend>
              <div class="step-row"><button class="secondary" type="button" data-act="track">Track this run</button><span id="run-status" class="step-status"></span></div>
              <div id="fix-box"></div>
            </fieldset>
            <p id="builder-log" class="builder-log" role="status" aria-live="polite"></p>
          </form>
        </section>
        <section class="glass panel"><h2>How a run works</h2>
          <div class="guide-list"><div><span>01</span><p>Your wallet owns an ERC-8004 agent.</p></div><div><span>02</span><p>You pay the run fee for one declared version.</p></div><div><span>03</span><p>Attested nodes test your endpoint over BATP/1.</p></div><div><span>04</span><p>A quorum signs; the rating lands on-chain with a fix list for you.</p></div></div>
          <div class="fee-card"><small>RUN FEE</small><strong>${esc(fee)} <small>tUSDG</small></strong><p>Per version. Refunded if no rating lands within 14 days.</p></div>
          <p class="fine-print">The harness sends <span class="mono">POST {endpoint}/batp/v1/step</span> with your run token as a Bearer header. See the BATP/1 section in the methodology.</p>
        </section>
      </div>`
    );
  }

  function bindBuilders() {
    const form = document.querySelector("#builder-form");
    const log = (msg, kind = "") => {
      const el = document.querySelector("#builder-log");
      el.className = `builder-log ${kind}`;
      el.textContent = msg;
    };
    const val = (n) => form.elements[n].value.trim();
    const save = () => draft.merge(Object.fromEntries(["agentId", "imageDigest", "configHash", "modelId", "versionHash", "requestId", "endpoint"].map((n) => [n, val(n)])));
    form.oninput = save;

    const busy = async (btn, fn) => {
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Working…";
      try {
        await fn();
      } catch (err) {
        log(err?.shortMessage || err?.message || String(err), "bad");
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    };
    const needWallet = async () => {
      const w = await loadWallet();
      if (!w.connected()) await connect();
      return w;
    };
    const connect = async () => {
      const cfg = await config();
      const w = await loadWallet();
      if (!w.hasWallet()) throw new Error("No browser wallet found. Install MetaMask or another EVM wallet to continue.");
      const a = await w.connect({ chainId: cfg.chainId, network: cfg.network, rpcUrl: cfg.rpcUrl, explorer: cfg.explorer });
      document.querySelector("#wallet-status").innerHTML = `${pill("Connected", "ok")} <span class="mono">${esc(short(a))}</span> · ${esc(await w.balanceEth())} ETH`;
      log("Wallet connected.");
    };

    const actions = {
      connect,
      async register() {
        const w = await needWallet();
        const uri = val("agentURI");
        if (!/^https?:\/\//.test(uri)) throw new Error("Give the agent a URI (https://…) to register it.");
        const id = await w.registerAgent((await config()).contracts.identity8004, uri);
        form.elements.agentId.value = id;
        save();
        log(`Registered ERC-8004 agent ${id}.`, "ok");
      },
      async version() {
        const imageDigest = val("imageDigest");
        const configHash = val("configHash");
        const modelId = val("modelId");
        if (!/^0x[0-9a-fA-F]{64}$/.test(imageDigest) || !/^0x[0-9a-fA-F]{64}$/.test(configHash) || !modelId) {
          throw new Error("Image digest and config hash must be 0x + 64 hex characters, and a model id is required.");
        }
        const r = await api.query("builder.versionHash", { imageDigest, configHash, modelId });
        form.elements.versionHash.value = r.versionHash;
        save();
        log("Version hash computed.", "ok");
      },
      async faucet() {
        const cfg = await config();
        const w = await needWallet();
        await w.mintTestTokens(cfg.contracts.feeToken, BigInt(cfg.runFee || "300000000"));
        log(`Minted test tUSDG. Balance: ${units(String(await w.tokenBalance(cfg.contracts.feeToken)), cfg.feeDecimals)}.`, "ok");
      },
      async request() {
        const cfg = await config();
        const w = await needWallet();
        const agentId = val("agentId");
        const versionHash = val("versionHash");
        if (!/^\d+$/.test(agentId)) throw new Error("Enter your ERC-8004 agent id (step 02).");
        if (!/^0x[0-9a-fA-F]{64}$/.test(versionHash)) throw new Error("Compute or paste a version hash (step 03).");
        const calls = await api.query("builder.requestCalldata", { chainId: cfg.chainId, agentRegistry: cfg.contracts.identity8004, agentId, versionHash });
        log("Approve the fee in your wallet…");
        await w.send(calls.approve);
        log("Now confirm the run request…");
        const receipt = await w.send(calls.requestRun);
        const id = w.requestIdFrom(receipt);
        if (id) {
          form.elements.requestId.value = id;
          save();
        }
        log(`Run requested${id ? ` (request ${id})` : ""}. Next: set your test endpoint.`, "ok");
      },
      async endpoint() {
        const cfg = await config();
        const w = await needWallet();
        const requestId = val("requestId");
        const endpoint = val("endpoint").replace(/\/$/, "");
        if (!/^\d+$/.test(requestId)) throw new Error("Enter the request id from step 04.");
        if (!/^https:\/\//.test(endpoint)) throw new Error("The endpoint must start with https://");
        const message = cfg.messages.endpoint.replace("{requestId}", requestId).replace("{endpoint}", endpoint);
        const signature = await w.signMessage(message);
        for (let i = 0; ; i++) {
          try {
            const r = await api.mutate("builder.setEndpoint", { chainId: cfg.chainId, requestId, endpoint, signature });
            document.querySelector("#token-box").innerHTML = `<div class="token"><small>RUN TOKEN · your endpoint should accept this Bearer token</small><code>${esc(r.runToken)}</code><button class="secondary" type="button" data-copy="${esc(r.runToken)}">Copy</button></div>`;
            log("Endpoint set. Nodes pick the run up within a few minutes.", "ok");
            return;
          } catch (err) {
            if (!/not indexed yet/.test(err.message) || i > 30) throw err;
            log("Waiting for the request to be indexed…");
            await new Promise((res) => setTimeout(res, 10_000));
          }
        }
      },
      async track() {
        const cfg = await config();
        const requestId = val("requestId");
        if (!/^\d+$/.test(requestId)) throw new Error("Enter a request id to track.");
        trackRun(cfg, requestId);
      },
    };

    form.onclick = (e) => {
      const btn = e.target.closest("button[data-act]");
      if (btn) busy(btn, actions[btn.dataset.act]);
      const copy = e.target.closest("button[data-copy]");
      if (copy) navigator.clipboard?.writeText(copy.dataset.copy).then(() => (copy.textContent = "Copied"));
    };
  }

  let trackTimer;
  async function trackRun(cfg, requestId) {
    clearTimeout(trackTimer);
    const out = document.querySelector("#run-status");
    if (!out) return;
    try {
      const s = await api.query("builder.runStatus", { chainId: cfg.chainId, requestId });
      if (!s) {
        out.innerHTML = pill("Not indexed yet", "muted");
      } else {
        const label = { open: "Waiting for nodes", running: s.bundle ? "Co-signing" : "Running", rated: "Rated", refunded: "Refunded" }[s.status] || s.status;
        out.innerHTML = `${pill(label, s.status === "rated" ? "ok" : s.status === "refunded" ? "bad" : "warn")}${s.bundle ? ` grade ${esc(s.bundle.grade)}, score ${esc(s.bundle.score)}` : ""}${s.endpointSet ? "" : " · endpoint not set"}`;
        if (s.status === "rated") {
          const rating = await api.get(`/v1/rating/${cfg.chainId}/${encodeURIComponent(s.agentId)}`).catch(() => null);
          document.querySelector("#fix-box").innerHTML = `<div class="step-row"><a class="secondary" href="#agent/${cfg.chainId}/${esc(s.agentId)}">Open the rating ↗</a>${rating ? `<button class="primary" type="button" data-fix="${esc(rating.ratingId)}">Show my fix list</button>` : ""}</div><div id="fix-list"></div>`;
          const fixBtn = document.querySelector("[data-fix]");
          if (fixBtn) fixBtn.onclick = () => showFixList(cfg, fixBtn.dataset.fix, fixBtn);
          return;
        }
        if (s.status === "refunded") return;
      }
    } catch (err) {
      out.textContent = err.message;
    }
    if (document.querySelector("#run-status")) trackTimer = setTimeout(() => trackRun(cfg, requestId), 10_000);
  }

  async function showFixList(cfg, ratingId, btn) {
    const box = document.querySelector("#fix-list");
    btn.disabled = true;
    try {
      const w = await loadWallet();
      if (!w.connected()) await w.connect({ chainId: cfg.chainId, network: cfg.network, rpcUrl: cfg.rpcUrl, explorer: cfg.explorer });
      const signature = await w.signMessage(cfg.messages.fixList.replace("{ratingId}", ratingId));
      const f = await api.query("builder.fixList", { chainId: cfg.chainId, ratingId, signature });
      box.innerHTML = f.failedCases.length
        ? `<div class="rows">${f.failedCases
            .map(
              (c) => `<div class="row fix"><span class="row-main"><strong>${esc(c.caseId)} · ${esc(c.title)}</strong><small>${esc(c.familyTitle)} · lost on ${esc(c.failedSeeds)}/${esc(c.seeds)} seeds · ${esc(c.losses.join(", "))}</small><small class="expect">${esc(c.expectedBehaviour)}</small></span></div>`,
            )
            .join("")}</div>${f.holdout.some((h) => h.sessions) ? `<p class="fine-print">Holdout: ${f.holdout.filter((h) => h.sessions).map((h) => `${esc(h.title)}: ${Object.entries(h.losses).map(([k, v]) => `${esc(k)} ×${esc(v)}`).join(", ") || "no losses"}`).join(" · ")}</p>` : ""}`
        : empty("Nothing to fix", "No public case produced a loss in this run.");
    } catch (err) {
      box.innerHTML = errorBox(err);
    } finally {
      btn.disabled = false;
    }
  }

  // ------------------------------------------------------------------ router
  let renderSeq = 0;
  async function show() {
    const [name, ...params] = (location.hash.slice(1) || "overview").split("/");
    const route = TITLES[name] ? name : "overview";
    const navName = route === "agent" ? "lookup" : route;
    document.querySelectorAll("[data-view]").forEach((el) => {
      const active = el.dataset.view === navName;
      el.classList.toggle("active", active);
      if (active) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    document.title = `${route === "agent" ? `Agent ${params[1] || ""}` : route === "arena" && params[0] ? `Arena ${params[0]}` : TITLES[route]} — Bollard`;
    clearTimeout(trackTimer);

    const seq = ++renderSeq;
    view.innerHTML = loading();
    try {
      const html =
        route === "overview" ? await overview()
        : route === "lookup" ? await lookup()
        : route === "agent" ? await agentView(params[0] || "46630", params[1] || "")
        : route === "families" ? await families()
        : route === "builders" ? await builders()
        : route === "nodes" ? await nodes()
        : params[0] ? await arenaDetail(params[0])
        : await arena();
      if (seq !== renderSeq) return;
      view.innerHTML = html;
      if (route === "lookup") bindLookup();
      if (route === "agent") bindAgent(params[0] || "46630", params[1] || "");
      if (route === "families") bindFamilies();
      if (route === "arena" && params[0]) bindArena(params[0]);
      if (route === "builders") {
        bindBuilders();
        const rid = draft.read().requestId;
        if (rid) config().then((cfg) => trackRun(cfg, rid));
      }
    } catch (err) {
      if (seq === renderSeq) view.innerHTML = header(TITLES[route], "") + `<section class="glass panel">${errorBox(err)}</section>`;
    }
  }

  // footer: the network this dashboard is actually connected to
  config()
    .then((cfg) => {
      const net = document.querySelector("[data-network]");
      if (net) net.textContent = `${cfg.network.toUpperCase()} · CHAIN ${cfg.chainId}`;
    })
    .catch(() => {});

  window.addEventListener("hashchange", show);
  show();
})();
