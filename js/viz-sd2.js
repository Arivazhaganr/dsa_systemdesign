/* More system design simulators: Raft, sagas, auth flows, latency percentiles, LSM tree, and three case studies */
(function () {
  const { h, clear, rand, Timers, ArchDiagram, animatePacket } = L;
  const select = (opts) => h("select", null, opts.map(([v, t]) => h("option", { value: v, text: t })));
  const range = (label, min, max, val, step = 1) => { const inp = h("input", { type: "range", min, max, step, value: val }); const out = h("b", { text: val }); inp.addEventListener("input", () => (out.textContent = inp.value)); return { el: h("label", null, label, inp, out), inp }; };
  const kv = (pairs) => h("div", { class: "kv" }, pairs.flatMap(([a, b, col]) => [h("span", { text: a }), h("b", { text: b, style: col ? { color: col } : null })]));
  const legend = (items) => h("div", { class: "legend" }, items.map(([c, t]) => h("span", null, h("i", { style: { background: c } }), t)));

  /* ================= Raft consensus ================= */
  L.viz.raft = (root) => {
    const POS = [[50, 14], [84, 40], [71, 84], [29, 84], [16, 40]];
    const wrap = h("div", { class: "sd-canvas", style: { height: "400px" } });
    const out = h("div", { class: "side-panel" }), log = h("div", { class: "log" });
    let nodes, leader, term, nextVal, running = true;
    const pauseBtn = h("button", { class: "btn small", text: "⏸ Pause", onclick: () => { running = !running; pauseBtn.textContent = running ? "⏸ Pause" : "▶ Resume"; } });
    root.append(h("div", { class: "controls" },
      h("button", { class: "btn primary small", text: "✍️ Client write", onclick: write }),
      h("button", { class: "btn small", text: "💥 Crash the leader", onclick: () => { if (leader != null) crash(leader); } }),
      h("button", { class: "btn small", text: "💥 Crash a follower", onclick: () => { const f = nodes.filter((n) => n.up && n.id !== leader); if (f.length) crash(f[rand(0, f.length - 1)].id); } }),
      h("button", { class: "btn small", text: "🔧 Recover all", onclick: () => { nodes.forEach((n) => { if (!n.up) { n.up = true; say(`${n.name} is back as a follower with a stale log; the leader will bring it up to date.`); } }); render(); } }),
      pauseBtn, h("button", { class: "btn small", text: "♻ Reset", onclick: reset })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 300px" } }, h("div", { class: "stage", style: { padding: 0 } }, wrap), h("div", null, out, h("div", { style: { height: "10px" } }), log)),
      legend([["var(--good)", "committed entry (on a majority, safe forever)"], ["var(--yellow)", "uncommitted entry (may be lost)"]]));
    const alive = () => nodes.filter((n) => n.up);
    const say = (t, c = "") => { log.prepend(h("div", { class: c, text: t })); while (log.children.length > 40) log.lastChild.remove(); };
    function reset() {
      clear(wrap); clear(log);
      nodes = POS.map((p, i) => ({ id: i, name: "N" + (i + 1), up: true, log: [], commit: 0, box: h("div", { class: "sd-box", style: { left: p[0] + "%", top: p[1] + "%", minWidth: "120px" } }) }));
      nodes.forEach((n) => wrap.append(n.box));
      leader = null; term = 0; nextVal = 1;
      say("Cluster of 5 started. No leader yet: an election timeout will fire.");
      render();
    }
    function crash(id) { const n = nodes[id]; n.up = false; say(`${n.name} crashed${id === leader ? " (it was the leader!). Followers stop receiving heartbeats." : "."}`, "err"); if (id === leader) leader = null; render(); }
    function send(from, to, color, done) { animatePacket(wrap, POS[from], POS[to], color, 500, done); }
    function elect() {
      const up = alive();
      if (up.length < 3) { say(`Only ${up.length} of 5 nodes are up: no majority, so no leader can be elected. The cluster refuses writes rather than risk inconsistency.`, "err"); return; }
      // Raft's election restriction: only a candidate whose log is at least as up to date as a majority can win
      const best = Math.max(...up.map((n) => n.log.length)), cand = up.filter((n) => n.log.length === best)[rand(0, up.filter((n) => n.log.length === best).length - 1)];
      term++;
      say(`Election timeout on ${cand.name}: it becomes a candidate for term ${term} and requests votes.`, "miss");
      up.forEach((n) => { if (n !== cand) send(cand.id, n.id, "#f6ad55"); });
      setTimeout(() => { if (!wrap.isConnected || !cand.up || leader != null) return; leader = cand.id; say(`${cand.name} got ${up.length} of 5 votes (majority = 3) → leader for term ${term}.`, "hit"); render(); }, 650);
    }
    function replicate(quiet) {
      const L0 = nodes[leader], up = alive();
      up.forEach((n) => { if (n !== L0) send(L0.id, n.id, "#4fd1c5", () => { if (!n.up || leader !== L0.id) return; const stale = n.log.length !== L0.log.length || n.log.some((e, i) => e.v !== L0.log[i].v); if (stale && !quiet) say(`${n.name} appended the leader's entries.`); if (stale && n.log.length > L0.log.length) say(`${n.name} had entries the leader lacks: they were never committed, so they are overwritten.`, "miss"); n.log = L0.log.map((e) => ({ ...e })); n.commit = L0.commit; render(); }); });
      if (up.length >= 3) { if (L0.commit < L0.log.length) { L0.commit = L0.log.length; if (!quiet) say(`Entry is stored on a majority (${up.length}/5) → committed and acknowledged to the client.`, "hit"); } }
      else if (!quiet) say(`Only ${up.length}/5 nodes have the entry: not a majority, so it stays uncommitted and the client gets no acknowledgement.`, "err");
      render();
    }
    function write() {
      if (leader == null) { say("Write rejected: there is no leader right now. The client retries.", "err"); return; }
      const L0 = nodes[leader];
      L0.log.push({ t: term, v: "x=" + nextVal++ });
      say(`Client write → leader ${L0.name} appends [${L0.log[L0.log.length - 1].v}] and replicates it.`);
      replicate(false);
    }
    function render() {
      nodes.forEach((n) => {
        n.box.className = "sd-box" + (n.up ? (n.id === leader ? " active" : "") : " down");
        clear(n.box).append(h("span", { class: "em", text: !n.up ? "💀" : n.id === leader ? "👑" : "🖥️" }), n.name, h("small", { text: !n.up ? "DOWN" : n.id === leader ? `leader · term ${term}` : "follower" }),
          h("div", { style: { marginTop: "4px", minHeight: "22px" } }, n.log.slice(-4).map((e, i) => { const idx = n.log.length - Math.min(4, n.log.length) + i; return h("span", { class: "chip", style: { fontSize: "10px", padding: "1px 6px", borderColor: idx < n.commit ? "var(--good)" : "var(--yellow)", color: idx < n.commit ? "var(--good)" : "var(--yellow)" }, text: e.v }); })));
      });
      const up = alive().length;
      clear(out).append(h("h4", { text: "Cluster" }), kv([["term", term], ["leader", leader == null ? "none" : nodes[leader].name, leader == null ? "var(--bad)" : "var(--good)"], ["nodes up", `${up} / 5`, up < 3 ? "var(--bad)" : ""], ["majority needed", 3], ["committed entries", Math.max(...nodes.map((n) => n.commit))]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, text: "Try: write a few values, crash the leader, write again, then crash nodes until only 2 remain." }));
    }
    Timers.every(() => { if (!running || !wrap.isConnected) return; if (leader == null) elect(); else replicate(true); }, 1600);
    reset();
  };

  /* ================= Latency percentiles & error budget ================= */
  L.viz.percentiles = (root) => {
    const base = range("typical latency (ms)", 20, 200, 60, 5), slow = range("requests hitting a slow dependency (%)", 0, 20, 3), thr = range("SLO threshold (ms)", 100, 1000, 300, 25);
    const slo = select([["0.9", "SLO: 90% of requests under the threshold"], ["0.95", "SLO: 95%"], ["0.99", "SLO: 99%"], ["0.999", "SLO: 99.9%"]]); slo.value = "0.99";
    const bars = h("div", { class: "bars" }), out = h("div", { class: "side-panel" }), cap = h("div", { class: "caption" });
    let seeds = [];
    root.append(h("div", { class: "controls" }, base.el, slow.el), h("div", { class: "controls" }, thr.el, slo, h("button", { class: "btn small", text: "🎲 New sample", onclick: () => { seed(); draw(); } })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 290px" } }, h("div", { class: "stage" }, h("div", { class: "bars-wrap" }, bars)), out), cap,
      legend([["var(--accent)", "requests within the SLO threshold"], ["var(--bad)", "requests over the threshold"]]));
    const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += Math.random(); return (u - 3) / Math.SQRT1_2; };
    function seed() { seeds = Array.from({ length: 1000 }, () => [gauss(), Math.random(), 6 + Math.random() * 10]); }
    function draw() {
      const b = +base.inp.value, p = +slow.inp.value / 100, T = +thr.inp.value, target = +slo.value;
      const xs = seeds.map(([g, u, mult]) => b * Math.exp(0.35 * g) * (u < p ? mult : 1)).sort((x, y) => x - y);
      const pc = (q) => xs[Math.min(xs.length - 1, Math.floor(q * xs.length))], mean = xs.reduce((a, c) => a + c, 0) / xs.length;
      const maxX = Math.max(T * 1.3, pc(0.995)), B = 40, counts = new Array(B).fill(0);
      xs.forEach((x) => counts[Math.min(B - 1, Math.floor((x / maxX) * B))]++);
      const top = Math.max(...counts);
      clear(bars).append(...counts.map((c, i) => h("div", { class: "bar" + (((i + 0.5) / B) * maxX > T ? " c-swap" : ""), style: { height: (c / top) * 100 + "%" }, title: `${Math.round((i / B) * maxX)}–${Math.round(((i + 1) / B) * maxX)} ms: ${c} requests` }, i % 8 === 0 ? h("span", { text: Math.round((i / B) * maxX) + "ms" }) : null)));
      const bad = xs.filter((x) => x > T).length, allowed = Math.round((1 - target) * xs.length), left = allowed - bad;
      clear(out).append(h("h4", { text: "1,000 requests" }), kv([["mean", mean.toFixed(0) + " ms"], ["p50 (median)", pc(0.5).toFixed(0) + " ms"], ["p95", pc(0.95).toFixed(0) + " ms"], ["p99", pc(0.99).toFixed(0) + " ms", pc(0.99) > T ? "var(--bad)" : ""], ["max", xs[xs.length - 1].toFixed(0) + " ms"]]),
        h("h4", { text: "Error budget", style: { marginTop: "12px" } }), kv([["over threshold", `${bad} (${(bad / 10).toFixed(1)}%)`], ["allowed by SLO", allowed], ["budget left", left >= 0 ? `${left} requests` : `overspent by ${-left}`, left >= 0 ? "var(--good)" : "var(--bad)"]]));
      cap.innerHTML = p > 0 && pc(0.99) > 3 * pc(0.5) ? `The median says "${pc(0.5).toFixed(0)} ms, all fine" while the slowest 1% of requests take over <b>${pc(0.99).toFixed(0)} ms</b>. Averages and medians hide the tail; alert on <b>p95 / p99</b>. A page that makes 50 backend calls has roughly a 40% chance of hitting that tail at least once.` : `With no slow dependency the distribution is tight: p99 (${pc(0.99).toFixed(0)} ms) is close to the median (${pc(0.5).toFixed(0)} ms). Raise the "slow dependency" slider and watch the tail grow while the median barely moves.`;
    }
    [base, slow, thr].forEach((r) => r.inp.addEventListener("input", draw)); slo.addEventListener("change", draw);
    seed(); draw();
  };

  /* ================= LSM tree storage engine ================= */
  L.viz.lsm = (root) => {
    const CAP = 4;
    let mem, tables, seq, wal;
    const key = h("input", { type: "text", value: "k7", style: { width: "80px" } }), val = h("input", { type: "text", value: "v1", style: { width: "80px" } });
    const memEl = h("div"), diskEl = h("div"), log = h("div", { class: "log", style: { maxHeight: "260px" } }), out = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, h("label", null, "key", key), h("label", null, "value", val),
      h("button", { class: "btn primary small", text: "Put", onclick: () => put(key.value.trim(), val.value.trim()) }),
      h("button", { class: "btn small", text: "Get", onclick: () => get(key.value.trim()) }),
      h("button", { class: "btn small", text: "Delete", onclick: () => put(key.value.trim(), null) }),
      h("button", { class: "btn small", text: "🎲 6 random puts", onclick: () => { for (let i = 0; i < 6; i++) put("k" + rand(1, 12), "v" + seq, true); draw(); } }),
      h("button", { class: "btn small", text: "🧹 Compact", onclick: compact }),
      h("button", { class: "btn small", text: "♻ Reset", onclick: reset })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 320px" } },
        h("div", null, h("div", { class: "card", style: { marginBottom: "12px" } }, h("h3", { text: "🧠 Memory: memtable (sorted, holds " + CAP + " keys)", style: { margin: "0 0 8px", fontSize: "15px" } }), memEl),
          h("div", { class: "card" }, h("h3", { text: "💽 Disk: SSTables (immutable, sorted files; newest first)", style: { margin: "0 0 8px", fontSize: "15px" } }), diskEl)),
        h("div", null, out, h("div", { style: { height: "10px" } }), log)),
      legend([["var(--good)", "found here"], ["var(--yellow)", "searched, not here"], ["var(--bad)", "tombstone (delete marker)"]]));
    const say = (t, c = "") => { log.prepend(h("div", { class: c, text: t })); while (log.children.length > 60) log.lastChild.remove(); };
    const sorted = (m) => [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
    function reset() { mem = new Map(); tables = []; seq = 1; wal = 0; clear(log); say("Empty database. Writes go to memory first; nothing on disk yet."); draw(); }
    function put(k, v, quiet) {
      if (!k) return;
      wal++; mem.set(k, v); seq++;
      if (!quiet) say(v === null ? `delete(${k}): append to the WAL, write a tombstone to the memtable. Nothing on disk is modified.` : `put(${k}, ${v}): append to the write-ahead log (sequential), insert into the memtable. No random disk I/O.`);
      if (mem.size >= CAP) { tables.unshift({ id: tables.length ? Math.max(...tables.map((t) => t.id)) + 1 : 1, rows: sorted(mem) }); say(`Memtable is full → flush it to disk as SSTable #${tables[0].id} in one sequential write. WAL truncated.`, "miss"); mem = new Map(); wal = 0; }
      if (!quiet) draw();
    }
    function get(k) {
      if (!k) return;
      const path = [];
      let res, where = null;
      if (mem.has(k)) { res = mem.get(k); where = "mem"; }
      else for (const t of tables) { const row = t.rows.find((r) => r[0] === k); if (row) { res = row[1]; where = t.id; break; } path.push(t.id); }
      say(where == null ? `get(${k}): not in the memtable, not in ${tables.length} SSTable(s) → not found. Without Bloom filters this is the slowest read: every file is checked.`
        : res === null ? `get(${k}): found a tombstone in ${where === "mem" ? "the memtable" : "SSTable #" + where} → the key was deleted. Older values below it are ignored.`
          : `get(${k}) = ${res}, found in ${where === "mem" ? "the memtable" : "SSTable #" + where}${path.length ? ` after checking ${path.length} newer file(s)` : ""}. The newest version wins.`, where == null ? "err" : "hit");
      draw({ k, where, path });
    }
    function compact() {
      if (tables.length < 2) { say("Need at least two SSTables to compact."); return; }
      const merged = new Map(), before = tables.reduce((a, t) => a + t.rows.length, 0);
      [...tables].reverse().forEach((t) => t.rows.forEach(([k, v]) => merged.set(k, v)));
      const rows = sorted(merged).filter(([, v]) => v !== null);
      say(`Compaction: merge-sort ${tables.length} SSTables into one, keep only the newest version of each key, drop tombstones. ${before} entries → ${rows.length}.`, "hit");
      tables = [{ id: Math.max(...tables.map((t) => t.id)) + 1, rows }];
      draw();
    }
    function draw(hit) {
      const chip = (k, v, cls) => h("span", { class: "chip " + cls, style: v === null ? { borderColor: "var(--bad)", color: "var(--bad)" } : null, text: v === null ? `${k} ✕` : `${k}=${v}` });
      const cls = (k, id) => (hit && hit.k === k && hit.where === id ? "new" : "");
      clear(memEl).append(mem.size ? h("div", null, sorted(mem).map(([k, v]) => chip(k, v, cls(k, "mem")))) : h("span", { class: "topic-sub", text: "empty" }));
      clear(diskEl).append(tables.length ? h("div", null, tables.map((t) => h("div", { style: { marginBottom: "6px", opacity: hit && hit.where !== t.id && !hit.path.includes(t.id) && hit.where !== null && hit.where !== "mem" ? 0.45 : 1 } }, h("span", { class: "badge", style: hit && hit.path.includes(t.id) ? { borderColor: "var(--yellow)", color: "var(--yellow)" } : null, text: "SSTable #" + t.id }), " ", t.rows.map(([k, v]) => chip(k, v, cls(k, t.id)))))) : h("span", { class: "topic-sub", text: "no files yet" }));
      const entries = tables.reduce((a, t) => a + t.rows.length, 0), live = new Set(tables.flatMap((t) => t.rows.map((r) => r[0]))).size;
      clear(out).append(h("h4", { text: "Engine state" }), kv([["memtable keys", `${mem.size} / ${CAP}`], ["WAL records", wal], ["SSTables", tables.length], ["entries on disk", entries], ["distinct keys on disk", live], ["space wasted on old versions", entries - live]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, text: "Overwrite the same keys a few times, read one, then compact and read again." }));
    }
    reset();
    ["k3", "k7", "k1", "k9", "k7", "k2"].forEach((k, i) => put(k, "v" + (i + 1), true));
    draw();
  };

  /* ================= Distributed transactions: saga & 2PC ================= */
  L.viz.saga = (root) => ArchDiagram(root, {
    height: 380,
    intro: "An order touches three services, each with its own database. Trace how a saga keeps them consistent without a global transaction.",
    nodes: [
      { id: "client", x: 7, y: 50, em: "🧑", label: "Client", info: "Places an order. Expects either a confirmed order or a clean failure, never a charged card with no order." },
      { id: "orch", x: 30, y: 50, em: "🎼", label: "Order service", sub: "saga orchestrator", info: "Runs the saga as a state machine persisted in its own DB: which step are we on, what must be undone if a later step fails. It retries steps and survives restarts." },
      { id: "pay", x: 62, y: 14, em: "💳", label: "Payment service", info: "Local transaction: charge the card. Compensating action: refund. Must be idempotent because the orchestrator may retry." },
      { id: "inv", x: 80, y: 50, em: "📦", label: "Inventory service", info: "Local transaction: reserve stock. Compensating action: release the reservation." },
      { id: "ship", x: 62, y: 86, em: "🚚", label: "Shipping service", info: "Local transaction: create the shipment. Often the 'pivot' step: once a parcel is handed over it can't be undone, so it goes last." },
      { id: "bus", x: 30, y: 88, em: "📨", label: "Message broker", info: "Carries commands and events reliably (at-least-once). The outbox pattern makes 'update my DB' and 'publish the event' atomic." },
    ],
    edges: [["client", "orch"], ["orch", "pay"], ["orch", "inv"], ["orch", "ship"], ["orch", "bus", 1]],
    flows: {
      "Saga: happy path": { color: "#48bb78", path: ["client", "orch", "pay", "orch", "inv", "orch", "ship", "orch", "client"], steps: ["POST /orders (with an idempotency key)", "Order saved as PENDING. Step 1 → charge the card", "Payment committed in the payment DB", "Step 2 → reserve stock", "Reservation committed in the inventory DB", "Step 3 → create the shipment", "Shipment created", "All steps done → order CONFIRMED", "Client sees the confirmed order"] },
      "Saga: out of stock → compensate": { color: "#f56565", path: ["client", "orch", "pay", "orch", "inv", "orch", "pay", "orch", "client"], steps: ["POST /orders", "Order PENDING. Step 1 → charge the card", "Payment succeeded and is already committed", "Step 2 → reserve stock", "❌ Out of stock: the step fails", "No rollback is possible across services → run compensations in reverse order", "Compensate step 1: refund the payment", "Order marked CANCELLED", "Client is told the order failed; the charge is reversed"] },
      "Alternative: two-phase commit": { color: "#f6ad55", path: ["orch", "pay", "orch", "inv", "orch", "pay", "orch", "inv"], steps: ["Phase 1 (prepare): coordinator asks payment 'can you commit?'", "Payment locks the rows and votes YES", "Coordinator asks inventory 'can you commit?'", "Inventory locks the rows and votes YES", "All voted YES → Phase 2 (commit)", "Payment commits and releases its locks", "Coordinator tells inventory to commit", "Atomic, but everyone held locks the whole time, and a coordinator crash between phases leaves participants blocked"] },
    },
  });

  /* ================= Authentication: OAuth 2.0 + JWT ================= */
  L.viz.authFlow = (root) => ArchDiagram(root, {
    height: 380,
    intro: "Follow a login with 'Sign in with …' (OAuth 2.0 authorization code + PKCE), then an API call with the access token.",
    nodes: [
      { id: "user", x: 7, y: 50, em: "🧑", label: "User", sub: "browser", info: "The resource owner. Types their password only into the identity provider's page, never into the app." },
      { id: "app", x: 30, y: 50, em: "📱", label: "Client app", info: "Wants to act for the user. It never sees the password; it receives tokens. Public clients (SPAs, mobile) use PKCE instead of a client secret." },
      { id: "idp", x: 58, y: 14, em: "🪪", label: "Auth server", sub: "identity provider", info: "Authenticates the user (password, MFA, passkey), asks for consent, and issues tokens signed with its private key. Publishes its public keys at a JWKS URL." },
      { id: "gw", x: 60, y: 60, em: "🚪", label: "API gateway", info: "Validates the access token on every request: signature (using the provider's public key), expiry, issuer, audience. No database or network call needed for a JWT." },
      { id: "api", x: 85, y: 40, em: "🖥️", label: "API service", info: "Enforces authorization: is this user allowed to do this to this resource? Checks scopes/roles and ownership. Authentication alone is not enough." },
      { id: "db", x: 85, y: 84, em: "🗄️", label: "User & session store", info: "Password hashes (argon2/bcrypt, salted), refresh tokens, revocation lists. Never plain-text passwords." },
    ],
    edges: [["user", "app"], ["app", "idp"], ["user", "idp", 1], ["app", "gw"], ["gw", "api"], ["api", "db"], ["idp", "db", 1]],
    flows: {
      "1 · Log in (authorization code + PKCE)": { path: ["user", "app", "idp", "user", "idp", "app", "idp", "app"], steps: ["User clicks 'Sign in'", "App redirects the browser to the auth server with client_id, scopes and a PKCE code challenge", "Auth server shows its own login + consent page", "User enters credentials there (password, MFA)", "Auth server redirects back to the app with a one-time authorization code", "App exchanges the code (+ PKCE verifier) on a back channel", "Auth server returns a short-lived access token (JWT) and a refresh token", "Logged in. The app stores the tokens safely (httpOnly cookie or secure storage)"] },
      "2 · Call an API with the token": { color: "#48bb78", path: ["app", "gw", "api", "db", "api", "gw", "app"], steps: ["GET /orders with header Authorization: Bearer &lt;access token&gt;", "Gateway verifies the JWT's signature, expiry, issuer and audience locally", "Service checks authorization: scope orders:read, and the orders belong to this user", "Query the data", "Rows returned", "Response passes back", "App shows the data"] },
      "3 · Access token expired → refresh": { color: "#f6ad55", path: ["app", "gw", "app", "idp", "app", "gw"], steps: ["API call with an expired token", "Gateway rejects it: 401 Unauthorized", "App uses its refresh token", "Auth server checks the refresh token isn't revoked, rotates it, and issues a new access token", "New tokens stored", "Retry the API call: success"] },
    },
  });

  /* ================= Case study: video streaming ================= */
  L.viz.videoStreaming = (root) => ArchDiagram(root, {
    height: 390,
    nodes: [
      { id: "creator", x: 7, y: 22, em: "🎥", label: "Creator", info: "Uploads a large raw file (GBs). Uploads are chunked and resumable so a dropped connection doesn't restart from zero." },
      { id: "upload", x: 28, y: 22, em: "⬆️", label: "Upload service", info: "Hands out pre-signed URLs so the file goes straight to object storage, not through app servers. Records metadata and emits 'video uploaded'." },
      { id: "raw", x: 50, y: 10, em: "🪣", label: "Raw storage", sub: "object store", info: "Durable blob storage for the original file (kept so it can be re-encoded later with better codecs)." },
      { id: "queue", x: 50, y: 40, em: "📨", label: "Job queue", info: "Decouples upload from processing. Transcoding takes minutes; the queue absorbs bursts and retries failures." },
      { id: "trans", x: 74, y: 24, em: "🎞️", label: "Transcoders", sub: "worker fleet", info: "Split the video into segments of a few seconds and encode each at several resolutions and bitrates (240p … 4K). Segments are processed in parallel as a DAG of tasks." },
      { id: "store", x: 93, y: 50, em: "🗂️", label: "Encoded storage", info: "Holds the segments plus a manifest (HLS .m3u8 / DASH .mpd) listing every quality level. This is the CDN's origin." },
      { id: "cdn", x: 70, y: 78, em: "🌍", label: "CDN edge", info: "Caches segments close to viewers. Video is ~all of the bandwidth, so nearly every byte should be served from the edge." },
      { id: "viewer", x: 7, y: 78, em: "📺", label: "Viewer", sub: "player", info: "The player measures its own throughput and picks the quality for each next segment: adaptive bitrate streaming." },
      { id: "api", x: 32, y: 62, em: "🖥️", label: "API & metadata", info: "Titles, channels, view counts, recommendations. Read-heavy: cache aggressively. View counts are aggregated asynchronously." },
    ],
    edges: [["creator", "upload"], ["upload", "raw"], ["upload", "queue"], ["queue", "trans"], ["raw", "trans"], ["trans", "store"], ["store", "cdn"], ["cdn", "viewer"], ["viewer", "api"], ["api", "queue", 1]],
    flows: {
      "Upload & process": { color: "#f6ad55", path: ["creator", "upload", "raw", "upload", "queue", "trans", "store"], steps: ["Creator starts a resumable, chunked upload", "Chunks go directly to object storage via pre-signed URLs", "Raw file stored durably", "Upload complete → publish a 'transcode this' job", "A worker picks the job up", "Encode every segment at each quality level, in parallel", "Segments + manifest stored; video marked ready and creator notified"] },
      "Watch (adaptive bitrate)": { path: ["viewer", "api", "viewer", "cdn", "store", "cdn", "viewer"], steps: ["Open the watch page: fetch metadata", "API returns the title and the manifest URL", "Player downloads the manifest, starts at a low quality for a fast start", "Request segment 1 from the nearest CDN edge", "Cache miss on a rarely watched video: the edge pulls from the origin", "Edge caches the segment", "Segment plays. The player measures speed and requests the next one at higher or lower quality"] },
    },
  });

  /* ================= Case study: ride sharing ================= */
  L.viz.rideSharing = (root) => ArchDiagram(root, {
    height: 390,
    nodes: [
      { id: "driver", x: 8, y: 20, em: "🚗", label: "Driver app", info: "Sends its GPS position every ~4 seconds over a persistent connection. Millions of drivers → the heaviest write load in the system." },
      { id: "rider", x: 8, y: 80, em: "🧍", label: "Rider app", info: "Requests a trip, then watches the driver approach in real time." },
      { id: "gw", x: 30, y: 50, em: "🚪", label: "Gateway", sub: "WebSocket", info: "Holds long-lived connections to both apps so the server can push updates (match found, driver location) instantly." },
      { id: "loc", x: 54, y: 16, em: "📍", label: "Location service", info: "Ingests position updates and writes the latest one per driver into the geo index. Only the newest location matters, so it lives in memory with a TTL." },
      { id: "geo", x: 82, y: 16, em: "🗺️", label: "Geo index", sub: "in-memory, by cell", info: "Divides the map into cells (geohash, S2 or H3 hexagons). 'Drivers near me' = look up the rider's cell and its neighbours. Sharded by region." },
      { id: "match", x: 56, y: 52, em: "🤝", label: "Matching service", info: "Finds candidate drivers nearby, ranks them by ETA (road distance, not straight line), offers the trip to one at a time, and handles accept / timeout." },
      { id: "trip", x: 82, y: 56, em: "🧾", label: "Trip service", info: "The trip state machine: REQUESTED → MATCHED → ARRIVING → IN_PROGRESS → COMPLETED. Stored in a durable, consistent database: no double-booked drivers." },
      { id: "pay", x: 60, y: 88, em: "💳", label: "Pricing & payment", info: "Estimates the fare, applies surge pricing when demand exceeds supply in a cell, and charges the rider after the trip." },
    ],
    edges: [["driver", "gw"], ["rider", "gw"], ["gw", "loc"], ["loc", "geo"], ["gw", "match"], ["match", "geo"], ["match", "trip"], ["trip", "pay"], ["gw", "pay", 1]],
    flows: {
      "Driver location update": { color: "#48bb78", path: ["driver", "gw", "loc", "geo"], steps: ["GPS position sent every few seconds", "Gateway forwards it (often via a stream such as Kafka)", "Location service keeps only the latest point per driver", "Geo index updated: the driver now belongs to the cell covering that position"] },
      "Request a ride": { path: ["rider", "gw", "match", "geo", "match", "gw", "driver", "gw", "match", "trip", "match", "gw", "rider"], steps: ["Rider requests a trip from pickup to destination", "Gateway forwards to matching", "Which available drivers are close?", "Query the rider's cell and neighbouring cells", "Candidates returned; rank them by ETA", "Offer the trip to the best driver", "Driver's phone rings: 15 seconds to accept", "Driver accepts", "Matching confirms the accept", "Create the trip atomically: mark the driver busy so nobody else gets them", "Trip created", "Push 'driver found' to the rider", "Rider sees the driver, the plate and the ETA"] },
      "Trip ends → charge": { color: "#f6ad55", path: ["driver", "gw", "match", "trip", "pay"], steps: ["Driver taps 'complete trip'", "Gateway forwards the event", "Driver becomes available again", "Trip marked COMPLETED with the final route", "Compute the fare and charge the rider (idempotently), pay out the driver"] },
    },
  });

  /* ================= Case study: payment system ================= */
  L.viz.paymentSystem = (root) => ArchDiagram(root, {
    height: 390,
    nodes: [
      { id: "client", x: 7, y: 45, em: "🛒", label: "Checkout", sub: "client", info: "Generates an idempotency key for the purchase and sends it with every retry, so a double click or a timeout can never charge twice." },
      { id: "api", x: 28, y: 45, em: "🖥️", label: "Payment API", info: "Validates the request, checks the idempotency key, creates a payment record in state PENDING, and returns the stored result for repeated keys." },
      { id: "idem", x: 28, y: 12, em: "🔑", label: "Idempotency store", info: "Maps idempotency key → request hash + result. A unique constraint makes 'insert if absent' atomic, which is what prevents double charges." },
      { id: "psp", x: 56, y: 22, em: "🏦", label: "Payment provider", sub: "PSP → card networks", info: "An external processor (Stripe, Adyen…) that talks to card networks and banks. Slow, sometimes unavailable, and answers can get lost: always call it with your idempotency key." },
      { id: "ledger", x: 58, y: 66, em: "📒", label: "Ledger", sub: "double-entry", info: "The source of truth for money. Append-only: every movement is a debit in one account and an equal credit in another, so the books always sum to zero. Corrections are new entries, never edits." },
      { id: "hook", x: 84, y: 22, em: "🪝", label: "Webhook handler", info: "The provider reports the final outcome asynchronously. Verify the signature, dedupe by event id (webhooks are delivered at least once, possibly out of order)." },
      { id: "recon", x: 86, y: 66, em: "🔍", label: "Reconciliation", info: "A nightly job that compares the ledger with the provider's settlement files and flags every mismatch. This is the safety net that catches whatever the online path missed." },
      { id: "q", x: 30, y: 84, em: "📨", label: "Event queue", info: "Publishes 'payment succeeded' to order, email and analytics services via the outbox pattern, so the event is sent if and only if the DB commit happened." },
    ],
    edges: [["client", "api"], ["api", "idem"], ["api", "psp"], ["api", "ledger"], ["psp", "hook"], ["hook", "ledger"], ["ledger", "recon"], ["psp", "recon", 1], ["api", "q"]],
    flows: {
      "Pay (happy path)": { color: "#48bb78", path: ["client", "api", "idem", "api", "psp", "api", "ledger", "api", "client"], steps: ["POST /payments with Idempotency-Key: 7f3c…", "Look the key up", "New key → record it; create the payment as PENDING", "Call the provider with the same key", "Provider authorizes and captures the charge", "Success returned", "Write the double-entry ledger rows and mark the payment SUCCEEDED in one DB transaction", "Store the result under the idempotency key", "Client sees 'payment successful'"] },
      "Retry after a timeout": { color: "#f6ad55", path: ["client", "api", "idem", "api", "client"], steps: ["The response was lost; the client retries with the SAME idempotency key", "API looks the key up", "Key exists → the charge already happened", "Return the stored result without calling the provider again", "No double charge"] },
      "Webhook & reconciliation": { path: ["psp", "hook", "ledger", "recon", "psp"], steps: ["Provider sends 'charge.succeeded' asynchronously", "Verify the signature; ignore the event if its id was seen before", "Ledger updated if the online path had left the payment PENDING", "Nightly: compare ledger totals with the provider's settlement report", "Any difference raises an alert for a human to investigate"] },
    },
  });
})();
