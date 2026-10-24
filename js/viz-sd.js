/* System design simulators and diagrams */
(function () {
  const { h, s, clear, rand, shuffle, Player, Timers, ArchDiagram, animatePacket } = L;
  const fmt = (n) => (n >= 1e12 ? (n / 1e12).toFixed(1) + " T" : n >= 1e9 ? (n / 1e9).toFixed(1) + " B" : n >= 1e6 ? (n / 1e6).toFixed(1) + " M" : n >= 1e3 ? (n / 1e3).toFixed(1) + " K" : n.toFixed(n < 10 ? 1 : 0));
  const bytes = (b) => { const u = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return b.toFixed(1) + " " + u[i]; };
  const range = (label, min, max, val, step = 1) => { const inp = h("input", { type: "range", min, max, value: val, step }); const out = h("b", { text: val }); inp.addEventListener("input", () => (out.textContent = inp.value)); return { el: h("label", null, label, inp, out), inp }; };

  /* ================= Back-of-envelope estimation ================= */
  L.viz.estimation = (root) => {
    const f = {
      dau: ["Daily active users", 10e6], reqs: ["Requests per user per day", 20], ratio: ["Read : write ratio (reads per write)", 10],
      size: ["Bytes stored per write", 1000], years: ["Years to retain data", 5], peak: ["Peak factor (peak / average)", 3],
    };
    const inputs = {};
    const out = h("div", { class: "side-panel", style: { fontSize: "14px" } });
    const form = h("div", { class: "card" }, Object.entries(f).map(([k, [lab, v]]) => { inputs[k] = h("input", { type: "number", value: v, style: { width: "140px" }, oninput: calc }); return h("div", { class: "controls", style: { justifyContent: "space-between" } }, h("span", { text: lab }), inputs[k]); }),
      h("div", { class: "controls" }, h("b", { text: "Presets:" }), [["Twitter-like", [200e6, 50, 100, 300, 5, 3]], ["URL shortener", [10e6, 2, 100, 500, 10, 2]], ["Chat app", [50e6, 100, 1, 200, 3, 4]]].map(([n, vals]) =>
        h("button", { class: "btn small", text: n, onclick: () => { Object.keys(f).forEach((k, i) => (inputs[k].value = vals[i])); calc(); } }))));
    root.append(h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 320px" } }, form, out));
    function calc() {
      const v = Object.fromEntries(Object.keys(f).map((k) => [k, +inputs[k].value || 0]));
      const total = v.dau * v.reqs, qps = total / 86400, writes = qps / (v.ratio + 1), reads = qps - writes;
      const storeDay = writes * 86400 * v.size, storeAll = storeDay * 365 * v.years;
      clear(out).append(h("h4", { text: "Estimates" }), h("div", { class: "kv" },
        h("span", { text: "Requests / day" }), h("b", { text: fmt(total) }),
        h("span", { text: "Avg QPS" }), h("b", { text: fmt(qps) }),
        h("span", { text: "Peak QPS" }), h("b", { text: fmt(qps * v.peak) }),
        h("span", { text: "Write QPS" }), h("b", { text: fmt(writes) }),
        h("span", { text: "Read QPS" }), h("b", { text: fmt(reads) }),
        h("span", { text: "New storage / day" }), h("b", { text: bytes(storeDay) }),
        h("span", { text: `Storage for ${v.years} yrs` }), h("b", { text: bytes(storeAll) }),
        h("span", { text: "Write bandwidth" }), h("b", { text: bytes(writes * v.size) + "/s" }),
        h("span", { text: "Servers @1k QPS each" }), h("b", { text: Math.ceil((qps * v.peak) / 1000) })),
        h("p", { class: "topic-sub", style: { marginTop: "10px" }, html: "Trick: 1 day ≈ <b>86,400 s ≈ 10⁵ s</b>. So 1M requests/day ≈ 12 QPS." }));
    }
    calc();
    const lat = [["L1 cache reference", "0.5 ns"], ["Main memory reference", "100 ns"], ["Compress 1 KB (fast codec)", "2 µs"], ["Read 1 MB sequentially from memory", "3 µs"], ["SSD random read", "16 µs"], ["Round trip within same datacenter", "500 µs"], ["Read 1 MB sequentially from SSD", "50 µs – 1 ms"], ["Disk seek (HDD)", "2–10 ms"], ["Packet CA → Netherlands → CA", "150 ms"]];
    root.append(h("h3", { text: "Latency numbers every engineer should know (rough)" }), h("table", { class: "cmp-table" }, h("tr", null, h("th", { text: "Operation" }), h("th", { text: "Time" })), lat.map(([a, b]) => h("tr", null, h("td", { text: a }), h("td", { class: "mono", text: b })))));
  };

  /* ================= Load balancer simulator ================= */
  L.viz.loadBalancer = (root) => {
    const algo = h("select", null, [["rr", "Round robin"], ["least", "Least connections"], ["random", "Random"], ["hash", "IP hash (sticky)"]].map(([v, t]) => h("option", { value: v, text: t })));
    const rate = range("traffic", 1, 12, 4);
    const wrap = h("div", { class: "sd-canvas", style: { height: "380px" } });
    const statsEl = h("div", { class: "side-panel" });
    const log = h("div", { class: "log" });
    let servers = [], rr = 0, served = 0, dropped = 0, nextId = 1, running = true;
    const pauseBtn = h("button", { class: "btn small", text: "⏸ Pause", onclick: () => { running = !running; pauseBtn.textContent = running ? "⏸ Pause" : "▶ Resume"; } });
    root.append(h("div", { class: "controls" }, algo, rate.el,
      h("button", { class: "btn small", text: "+ Add server", onclick: () => { addServer(); layout(); } }),
      h("button", { class: "btn small", text: "💥 Crash a server", onclick: () => { const up = servers.filter((x) => x.up); if (up.length) { const v = up[rand(0, up.length - 1)]; v.up = false; v.active = 0; say(`${v.name} crashed! Health check marks it DOWN; LB stops routing to it.`, "err"); render(); } } }),
      h("button", { class: "btn small", text: "🔧 Recover all", onclick: () => { servers.forEach((x) => (x.up = true)); render(); } }), pauseBtn),
      h("div", { class: "viz-split" }, h("div", { class: "stage", style: { padding: 0 } }, wrap), h("div", null, statsEl, h("div", { style: { height: "10px" } }), log)));
    const clients = ["10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.4"];
    const cBoxes = clients.map((ip, i) => h("div", { class: "sd-box", style: { left: "10%", top: 15 + i * 23 + "%" } }, h("span", { class: "em", text: "💻" }), h("small", { text: ip })));
    const lb = h("div", { class: "sd-box", style: { left: "42%", top: "50%" } }, h("span", { class: "em", text: "⚖️" }), "Load balancer");
    wrap.append(...cBoxes, lb);
    function addServer() { const sv = { name: "S" + nextId++, up: true, active: 0, cap: 4, count: 0 }; sv.box = h("div", { class: "sd-box" }); wrap.append(sv.box); servers.push(sv); }
    function layout() { servers.forEach((sv, i) => { sv.y = servers.length === 1 ? 50 : 12 + (i * 76) / (servers.length - 1); sv.box.style.left = "76%"; sv.box.style.top = sv.y + "%"; }); render(); }
    function render() {
      servers.forEach((sv) => {
        sv.box.className = "sd-box" + (sv.up ? "" : " down");
        const pct = Math.min(100, (sv.active / sv.cap) * 100);
        clear(sv.box).append(h("span", { class: "em", text: sv.up ? "🖥️" : "💀" }), sv.name, h("small", { text: sv.up ? `${sv.active}/${sv.cap} conns · ${sv.count} served` : "DOWN" }),
          h("div", { class: "load" }, h("i", { style: { width: pct + "%", background: pct > 80 ? "var(--bad)" : pct > 50 ? "var(--warn)" : "var(--good)" } })));
      });
      clear(statsEl).append(h("h4", { text: "Stats" }), h("div", { class: "kv" }, h("span", { text: "served" }), h("b", { text: served }), h("span", { text: "dropped" }), h("b", { text: dropped, style: { color: dropped ? "var(--bad)" : "" } }), h("span", { text: "healthy servers" }), h("b", { text: servers.filter((x) => x.up).length + "/" + servers.length })));
    }
    function say(t, c = "") { log.prepend(h("div", { class: c, text: t })); while (log.children.length > 40) log.lastChild.remove(); }
    function pick(ip) {
      const up = servers.filter((x) => x.up);
      if (!up.length) return null;
      if (algo.value === "rr") return up[rr++ % up.length];
      if (algo.value === "random") return up[rand(0, up.length - 1)];
      if (algo.value === "least") return up.reduce((a, b) => (b.active < a.active ? b : a));
      const hsh = [...ip].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0; return up[hsh % up.length];
    }
    function request() {
      const ci = rand(0, clients.length - 1), ip = clients[ci], from = [10, 15 + ci * 23];
      animatePacket(wrap, from, [42, 50], "#7c8cff", 450, () => {
        const sv = pick(ip);
        if (!sv) { dropped++; say(`${ip}: 503, no healthy servers`, "err"); render(); return; }
        if (sv.active >= sv.cap) { dropped++; say(`${ip} → ${sv.name}: overloaded, dropped`, "err"); render(); return; }
        sv.active++; render();
        animatePacket(wrap, [42, 50], [76, sv.y], sv.active > 3 ? "#f6ad55" : "#4fd1c5", 450, () => {
          setTimeout(() => { sv.active = Math.max(0, sv.active - 1); if (sv.up) { sv.count++; served++; } render(); }, rand(900, 2600));
        });
        say(`${ip} → ${sv.name}`, "hit");
      });
    }
    [0, 1, 2].forEach(addServer); layout();
    let acc = 0;
    Timers.every(() => { if (!running || !wrap.isConnected) return; acc += +rate.inp.value / 10; while (acc >= 1) { acc--; request(); } }, 100);
    algo.onchange = () => say(`Algorithm → ${algo.options[algo.selectedIndex].text}`);
  };

  /* ================= Cache simulator ================= */
  L.viz.cache = (root) => {
    const policy = h("select", null, [["lru", "LRU (least recently used)"], ["lfu", "LFU (least frequently used)"], ["fifo", "FIFO"]].map(([v, t]) => h("option", { value: v, text: t })));
    const cap = range("capacity", 1, 8, 3);
    const keys = "ABCDEFGH".split("");
    let cache = [], hits = 0, misses = 0, totalMs = 0, tick = 0, auto = null;
    const view = h("div", { class: "stage", style: { minHeight: "150px" } });
    const stats = h("div", { class: "side-panel" });
    const log = h("div", { class: "log" });
    const autoBtn = h("button", { class: "btn small", text: "▶ Auto traffic (popular keys)", onclick: () => { if (auto) { clearInterval(auto); auto = null; autoBtn.textContent = "▶ Auto traffic (popular keys)"; } else { auto = Timers.every(() => { if (!view.isConnected) return; const r = Math.random(); get(keys[r < .45 ? 0 : r < .7 ? 1 : r < .82 ? 2 : rand(3, 7)]); }, 450); autoBtn.textContent = "⏸ Stop"; } } });
    root.append(h("div", { class: "controls" }, policy, cap.el, h("button", { class: "btn small", text: "Reset", onclick: reset }), autoBtn),
      h("div", { class: "controls" }, h("b", { text: "GET key:" }), keys.map((k) => h("button", { class: "btn small", text: k, onclick: () => get(k) }))),
      h("div", { class: "viz-split" }, view, h("div", null, stats)), h("div", { style: { height: "10px" } }), log);
    function reset() { cache = []; hits = misses = totalMs = 0; clear(log); draw(); }
    policy.onchange = reset; cap.inp.addEventListener("change", reset);
    function get(k) {
      tick++;
      const e = cache.find((x) => x.k === k);
      if (e) { hits++; totalMs += 1; e.freq++; e.used = tick; say(`GET ${k}: HIT ⚡ 1 ms`, "hit"); draw(k, "hit"); return; }
      misses++; totalMs += 50;
      let evicted = null;
      if (cache.length >= +cap.inp.value) {
        let victim;
        if (policy.value === "lru") victim = cache.reduce((a, b) => (b.used < a.used ? b : a));
        else if (policy.value === "lfu") victim = cache.reduce((a, b) => (b.freq < a.freq || (b.freq === a.freq && b.used < a.used) ? b : a));
        else victim = cache.reduce((a, b) => (b.added < a.added ? b : a));
        cache = cache.filter((x) => x !== victim); evicted = victim.k;
      }
      cache.push({ k, freq: 1, used: tick, added: tick });
      say(`GET ${k}: MISS → read DB (50 ms), store in cache${evicted ? `, evict ${evicted}` : ""}`, "miss");
      draw(k, "miss", evicted);
    }
    function say(t, c) { log.prepend(h("div", { class: c, text: t })); while (log.children.length > 50) log.lastChild.remove(); }
    function draw(k, kind, ev) {
      const order = policy.value === "lru" ? cache.slice().sort((a, b) => b.used - a.used) : policy.value === "lfu" ? cache.slice().sort((a, b) => b.freq - a.freq || b.used - a.used) : cache.slice().sort((a, b) => b.added - a.added);
      clear(view).append(h("div", { class: "controls" }, h("span", { class: "badge", text: policy.value === "lru" ? "most recent → least recent (evict from the right)" : policy.value === "lfu" ? "most used → least used (evict from the right)" : "newest → oldest (evict from the right)" })),
        h("div", { class: "cells" }, order.map((e) => h("div", { class: "cell " + (e.k === k ? (kind === "hit" ? "found" : "hl") : ""), style: { width: "64px", height: "64px" } }, e.k, h("span", { class: "idx", text: policy.value === "lfu" ? `freq ${e.freq}` : "" }))),
          Array.from({ length: Math.max(0, +cap.inp.value - cache.length) }, () => h("div", { class: "cell dim", style: { width: "64px", height: "64px" } }, "–"))),
        ev ? h("div", null, "evicted: ", h("span", { class: "chip old", text: ev })) : null);
      const total = hits + misses;
      clear(stats).append(h("h4", { text: "Stats" }), h("div", { class: "kv" }, h("span", { text: "hits" }), h("b", { text: hits }), h("span", { text: "misses" }), h("b", { text: misses }),
        h("span", { text: "hit rate" }), h("b", { text: total ? Math.round((hits / total) * 100) + "%" : "-" }), h("span", { text: "avg latency" }), h("b", { text: total ? (totalMs / total).toFixed(1) + " ms" : "-" })),
        h("div", { class: "meter", style: { marginTop: "10px" } }, h("i", { style: { width: total ? (hits / total) * 100 + "%" : 0 } })));
    }
    draw();
  };

  /* ================= Sharding & replication ================= */
  L.viz.sharding = (root) => {
    const strat = h("select", null, h("option", { value: "hash", text: "Hash: user_id mod N" }), h("option", { value: "range", text: "Range: id ranges" }));
    let N = 3, keys = [];
    const view = h("div", { class: "stage" });
    const msg = h("div", { class: "caption" });
    root.append(h("div", { class: "controls" }, strat,
      h("button", { class: "btn small primary", text: "+10 users", onclick: () => { for (let i = 0; i < 10; i++) keys.push(rand(1, 999)); draw(); } }),
      h("button", { class: "btn small", text: "+10 new signups (ids keep growing)", onclick: () => { const mx = Math.max(0, ...keys); for (let i = 1; i <= 10; i++) keys.push(mx + i * rand(1, 4)); draw(); } }),
      h("button", { class: "btn small", text: "+ Add shard", onclick: () => resize(N + 1) }),
      h("button", { class: "btn small", text: "− Remove shard", onclick: () => N > 1 && resize(N - 1) })), view, msg);
    const shardOf = (k, n) => (strat.value === "hash" ? k % n : Math.min(n - 1, Math.floor(k / Math.ceil(1000 / n))));
    function resize(n) {
      const moved = keys.filter((k) => shardOf(k, N) !== shardOf(k, n)).length;
      N = n; draw(); msg.innerHTML = `Resharded to ${n} shards: <b>${moved} of ${keys.length}</b> keys (${keys.length ? Math.round((moved / keys.length) * 100) : 0}%) had to move! ${strat.value === "hash" ? "With mod-N hashing most keys move. <b>Consistent hashing</b> fixes this (next topic)." : ""}`;
    }
    strat.onchange = () => { draw(); msg.innerHTML = strat.value === "range" ? "Range sharding keeps ranges together (great for range queries) but new, growing ids pile onto the last shard → <b>hot spot</b>." : "Hash sharding spreads keys evenly but range queries must hit every shard."; };
    function draw() {
      const per = Array.from({ length: N }, () => []); keys.forEach((k) => per[shardOf(k, N)].push(k));
      const max = Math.max(1, ...per.map((p) => p.length));
      clear(view).append(h("div", { style: { display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`, gap: "10px" } }, per.map((p, i) => h("div", { class: "side-panel" },
        h("h4", { text: `🗄️ Shard ${i}` + (strat.value === "range" ? ` [${i * Math.ceil(1000 / N)}–${i === N - 1 ? "∞" : (i + 1) * Math.ceil(1000 / N) - 1}]` : "") }),
        h("div", { class: "load" }, h("i", { style: { width: (p.length / max) * 100 + "%", background: p.length === max && p.length > 3 && keys.length / N * 1.6 < p.length ? "var(--bad)" : "var(--good)" } })),
        h("div", { class: "topic-sub", text: `${p.length} rows` }), h("div", null, p.slice(-24).map((k) => h("span", { class: "chip", text: k })))))));
    }
    for (let i = 0; i < 15; i++) keys.push(rand(1, 999));
    draw(); msg.innerHTML = "Sharding = splitting one big table across machines by a <b>shard key</b>. Add users, then add or remove a shard.";

    root.append(h("h3", { text: "Replication: primary + read replicas" }));
    ArchDiagram(root, {
      height: 300,
      nodes: [
        { id: "app", x: 12, y: 50, em: "🧑‍💻", label: "App server", info: "Sends writes to the primary and spreads reads across replicas." },
        { id: "p", x: 45, y: 25, em: "👑", label: "Primary DB", info: "Accepts all writes. Streams its change log (WAL/binlog) to replicas." },
        { id: "r1", x: 80, y: 20, em: "📖", label: "Replica 1", info: "Read-only copy. May lag behind the primary by milliseconds to seconds (replication lag)." },
        { id: "r2", x: 80, y: 55, em: "📖", label: "Replica 2", info: "Another read-only copy. More replicas = more read throughput and fail-over options." },
        { id: "r3", x: 45, y: 80, em: "📖", label: "Replica 3", info: "If the primary dies, a replica can be promoted to primary (failover)." },
      ],
      edges: [["app", "p"], ["p", "r1", 1], ["p", "r2", 1], ["p", "r3", 1], ["app", "r2"], ["app", "r3"]],
      flows: {
        "Write": { path: ["app", "p", "r1"], steps: ["App sends INSERT to the primary", "Primary commits, then ships the change asynchronously to replicas", "Replica applies the change. Until then, reads from it are stale (eventual consistency)."] },
        "Read": { path: ["app", "r2"], steps: ["Reads go to any replica, scaling read traffic horizontally", "Replica returns data (possibly slightly stale)"] },
        "Failover": { path: ["app", "r3", "p"], color: "#f56565", steps: ["Primary is unreachable! Orchestrator picks the most up-to-date replica", "Replica 3 is promoted to the new primary; others follow it"] },
      },
    });
  };

  /* ================= Consistent hashing ================= */
  L.viz.consistentHashing = (root) => {
    let nodes = ["N1", "N2", "N3"], vnodes = 1, nextN = 4;
    const keys = Array.from({ length: 24 }, (_, i) => "key" + i);
    const vSel = h("select", null, [1, 3, 8].map((v) => h("option", { value: v, text: `${v} virtual node${v > 1 ? "s" : ""} per server` })));
    const view = h("div", { class: "stage" });
    const msg = h("div", { class: "caption" });
    root.append(h("div", { class: "controls" },
      h("button", { class: "btn small primary", text: "+ Add server", onclick: () => change([...nodes, "N" + nextN++]) }),
      h("button", { class: "btn small", text: "− Remove a server", onclick: () => nodes.length > 1 && change(nodes.filter((_, i) => i !== rand(0, nodes.length - 1))) }), vSel),
      h("div", { class: "viz-split" }, view, msg));
    const hash = (str) => { let x = 2166136261; for (const c of str) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995); x ^= x >>> 15; return (x >>> 0) / 4294967296; };
    const colors = ["#7c8cff", "#4fd1c5", "#f6ad55", "#f687b3", "#48bb78", "#f6e05e", "#a78bfa", "#fb7185"];
    const color = (n) => colors[(+n.slice(1) - 1) % colors.length];
    const ring = (ns) => ns.flatMap((n) => Array.from({ length: vnodes }, (_, v) => ({ n, p: hash(n + "#" + v) }))).sort((a, b) => a.p - b.p);
    const owner = (k, r) => { const p = hash(k); return (r.find((x) => x.p >= p) || r[0]).n; };
    function change(nn) {
      const r0 = ring(nodes), r1 = ring(nn);
      const moved = keys.filter((k) => owner(k, r0) !== owner(k, r1));
      const modMoved = keys.filter((k) => Math.floor(hash(k) * 1e6) % nodes.length !== Math.floor(hash(k) * 1e6) % nn.length).length;
      nodes = nn; draw(moved);
      msg.innerHTML = `Servers: ${nodes.join(", ")}<br><br>Keys that moved: <b>${moved.length}/${keys.length}</b> (only those between the changed server and its neighbour).<br>With <code>hash mod N</code> it would be <b>${modMoved}/${keys.length}</b>.<br><br>Ideal is about K/N = ${(keys.length / nodes.length).toFixed(1)}.`;
    }
    vSel.onchange = () => { vnodes = +vSel.value; draw([]); msg.innerHTML = "More virtual nodes → each server owns many small arcs → <b>more even load</b>, and when a server leaves its keys spread across many servers instead of one."; };
    function draw(moved = []) {
      const r = ring(nodes), W = 420, C = W / 2, R = 160;
      const svg = s("svg", { class: "viz", viewBox: `0 0 ${W} ${W}`, style: "max-width:440px;margin:auto" });
      svg.append(s("circle", { cx: C, cy: C, r: R, fill: "none", stroke: "var(--line)", "stroke-width": 6 }));
      const xy = (p, rr = R) => [C + rr * Math.sin(p * 2 * Math.PI), C - rr * Math.cos(p * 2 * Math.PI)];
      keys.forEach((k) => {
        const [x, y] = xy(hash(k), R - 26), o = owner(k, r);
        svg.append(s("circle", { cx: x, cy: y, r: moved.includes(k) ? 7 : 5, fill: color(o), stroke: moved.includes(k) ? "#fff" : "none", "stroke-width": 2 }));
      });
      r.forEach(({ n, p }) => { const [x, y] = xy(p), [tx, ty] = xy(p, R + 22); svg.append(s("rect", { x: x - 7, y: y - 7, width: 14, height: 14, rx: 3, fill: color(n) }), s("text", { x: tx, y: ty + 4, "text-anchor": "middle", text: n, style: `fill:${color(n)};font-weight:700;font-size:12px` })); });
      const counts = nodes.map((n) => [n, keys.filter((k) => owner(k, r) === n).length]);
      svg.append(s("text", { x: C, y: C - 6, "text-anchor": "middle", text: "keys go clockwise" }), s("text", { x: C, y: C + 14, "text-anchor": "middle", class: "w", text: "to the next server" }));
      clear(view).append(svg, h("div", { style: { textAlign: "center" } }, counts.map(([n, c]) => h("span", { class: "chip", style: { borderColor: color(n), color: color(n) }, text: `${n}: ${c} keys` }))));
    }
    draw(); msg.innerHTML = "Servers (squares) and keys (dots) are hashed onto the same ring. Each key belongs to the first server clockwise. Add or remove a server and count how many keys move (white outline).";
  };

  /* ================= CAP theorem ================= */
  L.viz.cap = (root) => {
    let mode = "CP", partitioned = false, a = { v: 1, t: 0 }, b = { v: 1, t: 0 }, clock = 0;
    const modeSel = h("select", null, h("option", { value: "CP", text: "CP: prefer Consistency" }), h("option", { value: "AP", text: "AP: prefer Availability" }));
    const wrap = h("div", { class: "sd-canvas", style: { height: "260px" } });
    const log = h("div", { class: "log", style: { maxHeight: "220px" } });
    const partBtn = h("button", { class: "btn small", text: "✂️ Cut network (partition)" });
    root.append(h("div", { class: "controls" }, modeSel, partBtn,
      h("button", { class: "btn small primary", text: "Write x+1 via Node A", onclick: () => write("A") }),
      h("button", { class: "btn small primary", text: "Write x×10 via Node B", onclick: () => write("B") }),
      h("button", { class: "btn small", text: "Read from A", onclick: () => read("A") }), h("button", { class: "btn small", text: "Read from B", onclick: () => read("B") })),
      h("div", { class: "viz-split" }, h("div", { class: "stage", style: { padding: 0 } }, wrap), log));
    const boxA = h("div", { class: "sd-box", style: { left: "20%", top: "50%", minWidth: "130px" } });
    const boxB = h("div", { class: "sd-box", style: { left: "80%", top: "50%", minWidth: "130px" } });
    const link = h("div", { style: { position: "absolute", left: "30%", right: "30%", top: "50%", borderTop: "4px solid var(--good)", zIndex: 1 } });
    const cut = h("div", { style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-60%)", fontSize: "30px", zIndex: 3 }, text: "" });
    wrap.append(link, boxA, boxB, cut);
    partBtn.onclick = () => {
      partitioned = !partitioned;
      if (!partitioned) {
        if (a.v !== b.v) { const win = a.t >= b.t ? a : b; say(`Network healed. Replicas disagree (A=${a.v}, B=${b.v}). Last-write-wins → x=${win.v}. The other write is lost! (Real systems may use vector clocks / CRDTs.)`, "miss"); a = { ...win }; b = { ...win }; }
        else say("Network healed. Replicas in sync.", "hit");
      } else say("Partition! A and B can no longer talk.", "err");
      draw();
    };
    modeSel.onchange = () => { mode = modeSel.value; say(`Mode → ${mode}`); };
    function write(n) {
      clock++;
      const me = n === "A" ? a : b, other = n === "A" ? b : a, nv = n === "A" ? me.v + 1 : me.v * 10;
      if (!partitioned) { me.v = other.v = nv; me.t = other.t = clock; say(`Write via ${n}: x=${nv}, replicated to the other node synchronously ✅`, "hit"); }
      else if (mode === "CP") say(`Write via ${n} REJECTED ❌ (can't reach the other replica, so a quorum isn't possible). System stays consistent but is unavailable for writes.`, "err");
      else { me.v = nv; me.t = clock; say(`Write via ${n} accepted ✅ (x=${nv} locally). The other node doesn't know! Available but inconsistent.`, "miss"); }
      draw();
    }
    function read(n) {
      const me = n === "A" ? a : b;
      if (partitioned && mode === "CP") say(`Read from ${n}: error / timeout ❌. A CP system refuses to risk returning stale data.`, "err");
      else say(`Read from ${n}: x = ${me.v}${partitioned && a.v !== b.v ? " ⚠️ (stale/divergent!)" : ""}`, partitioned && a.v !== b.v ? "miss" : "hit");
    }
    function say(t, c = "") { log.prepend(h("div", { class: c, text: t })); }
    function draw() {
      [[boxA, "A", a], [boxB, "B", b]].forEach(([bx, n, d]) => { clear(bx).append(h("span", { class: "em", text: "🗄️" }), "Node " + n, h("div", { style: { fontSize: "26px", fontWeight: 900 }, text: "x = " + d.v })); bx.className = "sd-box" + (a.v !== b.v ? " hot" : ""); });
      link.style.borderTopColor = partitioned ? "var(--bad)" : "var(--good)"; link.style.borderTopStyle = partitioned ? "dashed" : "solid";
      cut.textContent = partitioned ? "✂️" : ""; partBtn.textContent = partitioned ? "🔗 Heal network" : "✂️ Cut network (partition)";
    }
    draw(); say("Two replicas of x. Writes replicate while the network is fine. Cut the network, then write, in both modes.");
  };

  /* ================= Message queue ================= */
  L.viz.messageQueue = (root) => {
    const prod = range("producer rate/s", 1, 20, 6), cons = range("consumers", 0, 6, 2), speed = range("each consumer msgs/s", 1, 8, 2);
    const view = h("div", { class: "stage" });
    const stats = h("div", { class: "side-panel" });
    let q = [], id = 0, processed = 0, workers = [], burstLeft = 0;
    root.append(h("div", { class: "controls" }, prod.el, cons.el, speed.el, h("button", { class: "btn small", text: "🚀 Traffic spike (+60)", onclick: () => (burstLeft = 60) })),
      h("div", { class: "viz-split" }, view, stats));
    function syncWorkers() { const n = +cons.inp.value; while (workers.length < n) workers.push({ busy: null, left: 0 }); workers.length = n; }
    let accP = 0;
    Timers.every(() => {
      if (!view.isConnected) return;
      syncWorkers();
      accP += +prod.inp.value / 10; if (burstLeft > 0) { accP += 3; burstLeft -= 3; }
      while (accP >= 1) { accP--; q.push(++id); }
      workers.forEach((w) => {
        if (w.busy) { w.left -= 100; if (w.left <= 0) { processed++; w.busy = null; } }
        if (!w.busy && q.length) { w.busy = q.shift(); w.left = 1000 / +speed.inp.value; }
      });
      draw();
    }, 100);
    function draw() {
      const capacity = +cons.inp.value * +speed.inp.value, inRate = +prod.inp.value;
      clear(view).append(
        h("div", { style: { display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" } },
          h("div", { class: "sd-box", style: { position: "static", transform: "none" } }, h("span", { class: "em", text: "🏭" }), "Producers", h("small", { text: `${inRate}/s` + (burstLeft > 0 ? " + spike" : "") })), "→",
          h("div", { style: { flex: 1, minWidth: "200px" } }, h("div", { class: "badge", text: `Queue: ${q.length} waiting` }),
            h("div", { style: { display: "flex", flexWrap: "wrap", gap: "2px", marginTop: "6px", maxHeight: "110px", overflow: "hidden" } }, q.slice(0, 120).map(() => h("div", { style: { width: "10px", height: "14px", background: q.length > 60 ? "var(--bad)" : q.length > 20 ? "var(--warn)" : "var(--accent)", borderRadius: "2px" } })))), "→",
          h("div", null, workers.length ? workers.map((w, i) => h("div", { class: "chip " + (w.busy ? "hl" : ""), text: `⚙️ C${i + 1} ${w.busy ? "#" + w.busy : "idle"}` })) : h("span", { class: "badge hard", text: "no consumers!" }))));
      clear(stats).append(h("h4", { text: "Stats" }), h("div", { class: "kv" }, h("span", { text: "in rate" }), h("b", { text: inRate + "/s" }), h("span", { text: "processing capacity" }), h("b", { text: capacity + "/s" }), h("span", { text: "backlog" }), h("b", { text: q.length }), h("span", { text: "processed" }), h("b", { text: processed })),
        h("p", { class: "topic-sub", style: { marginTop: "8px" }, html: capacity < inRate ? "⚠️ Consumers are slower than producers: the backlog grows. Add consumers (scale out)!" : "✅ Consumers keep up. Spikes are absorbed by the queue and drained later." }));
    }
  };

  /* ================= Rate limiter ================= */
  L.viz.rateLimiter = (root) => {
    const algo = h("select", null, [["token", "Token bucket"], ["fixed", "Fixed window counter"], ["sliding", "Sliding window log"]].map(([v, t]) => h("option", { value: v, text: t })));
    const capR = range("limit / bucket size", 1, 10, 5), refill = range("refill tokens/s", 1, 5, 1);
    const view = h("div", { class: "stage" });
    const timeline = h("div", { style: { display: "flex", gap: "2px", flexWrap: "wrap", marginTop: "10px" } });
    let tokens = 5, windowStart = 0, windowCount = 0, logT = [], ok = 0, rej = 0, autoOn = false;
    const autoBtn = h("button", { class: "btn small", text: "▶ Steady traffic (2/s)", onclick: () => { autoOn = !autoOn; autoBtn.textContent = autoOn ? "⏸ Stop traffic" : "▶ Steady traffic (2/s)"; } });
    root.append(h("div", { class: "controls" }, algo, capR.el, refill.el),
      h("div", { class: "controls" }, h("button", { class: "btn small primary", text: "Send 1 request", onclick: () => req() }), h("button", { class: "btn small", text: "💥 Burst of 10", onclick: () => { for (let i = 0; i < 10; i++) setTimeout(req, i * 60); } }), autoBtn,
        h("button", { class: "btn small", text: "Reset", onclick: () => { tokens = +capR.inp.value; windowCount = 0; logT = []; ok = rej = 0; clear(timeline); } })), view, timeline);
    algo.onchange = () => { tokens = +capR.inp.value; windowCount = 0; logT = []; };
    const now = () => performance.now() / 1000;
    let last = now(), autoAcc = 0;
    Timers.every(() => {
      if (!view.isConnected) return;
      const t = now(), dt = t - last; last = t;
      tokens = Math.min(+capR.inp.value, tokens + dt * +refill.inp.value);
      if (autoOn) { autoAcc += dt * 2; while (autoAcc >= 1) { autoAcc--; req(); } }
      draw();
    }, 100);
    function req() {
      const t = now(), lim = +capR.inp.value; let allowed;
      if (algo.value === "token") { allowed = tokens >= 1; if (allowed) tokens -= 1; }
      else if (algo.value === "fixed") { const w = Math.floor(t / 5); if (w !== windowStart) { windowStart = w; windowCount = 0; } allowed = windowCount < lim; if (allowed) windowCount++; }
      else { logT = logT.filter((x) => t - x < 5); allowed = logT.length < lim; if (allowed) logT.push(t); }
      allowed ? ok++ : rej++;
      timeline.append(h("div", { class: "chip " + (allowed ? "new" : "old"), text: allowed ? "200" : "429" }));
      while (timeline.children.length > 60) timeline.firstChild.remove();
    }
    function draw() {
      const lim = +capR.inp.value, t = now();
      let body;
      if (algo.value === "token") body = h("div", null, h("div", { class: "badge", text: `Bucket: ${tokens.toFixed(1)} / ${lim} tokens. Each request costs 1 token; tokens refill at ${refill.inp.value}/s.` }),
        h("div", { style: { display: "flex", gap: "6px", marginTop: "12px" } }, Array.from({ length: lim }, (_, i) => h("div", { style: { width: "34px", height: "34px", borderRadius: "50%", border: "2px solid var(--yellow)", background: i < Math.floor(tokens) ? "var(--yellow)" : "transparent", opacity: i < tokens ? 1 : .35 } }))));
      else if (algo.value === "fixed") { const left = 5 - (t % 5); body = h("div", null, h("div", { class: "badge", text: `Window of 5 s: ${windowCount}/${lim} used. Resets in ${left.toFixed(1)} s.` }), h("div", { class: "meter", style: { marginTop: "12px", height: "14px" } }, h("i", { style: { width: (windowCount / lim) * 100 + "%" } })), h("p", { class: "topic-sub", text: "Weakness: a burst at the end of one window + start of the next can let 2× the limit through." })); }
      else { const live = logT.filter((x) => t - x < 5); body = h("div", null, h("div", { class: "badge", text: `${live.length}/${lim} requests in the last 5 s (rolling)` }), h("div", { style: { position: "relative", height: "34px", border: "1px solid var(--line)", borderRadius: "8px", marginTop: "12px" } }, live.map((x) => h("div", { style: { position: "absolute", left: (1 - (t - x) / 5) * 100 + "%", top: "6px", width: "8px", height: "20px", background: "var(--accent2)", borderRadius: "3px" } }))), h("p", { class: "topic-sub", text: "Accurate but stores a timestamp per request (memory heavy)." })); }
      clear(view).append(body, h("div", { class: "controls", style: { marginTop: "12px" } }, h("span", { class: "badge good", text: `✅ allowed ${ok}` }), h("span", { class: "badge hard", text: `⛔ 429 Too Many Requests ${rej}` })));
    }
  };

  /* ================= Circuit breaker ================= */
  L.viz.circuitBreaker = (root) => {
    const fail = range("downstream failure %", 0, 100, 10, 5);
    const view = h("div", { class: "stage" });
    const tl = h("div", { style: { display: "flex", gap: "2px", flexWrap: "wrap", marginTop: "10px" } });
    let state = "CLOSED", fails = 0, openedAt = 0, stats = { ok: 0, fail: 0, fast: 0 };
    root.append(h("div", { class: "controls" }, fail.el, h("button", { class: "btn small", text: "🔥 Outage (100%)", onclick: () => { fail.inp.value = 100; fail.inp.dispatchEvent(new Event("input")); } }), h("button", { class: "btn small", text: "✅ Recover (0%)", onclick: () => { fail.inp.value = 0; fail.inp.dispatchEvent(new Event("input")); } })), view, tl);
    Timers.every(() => {
      if (!view.isConnected) return;
      const t = Date.now();
      if (state === "OPEN" && t - openedAt > 4000) state = "HALF-OPEN";
      let res;
      if (state === "OPEN") { res = "fast"; stats.fast++; }
      else {
        const bad = Math.random() * 100 < +fail.inp.value;
        if (bad) { stats.fail++; res = "fail"; fails++; if (state === "HALF-OPEN" || fails >= 5) { state = "OPEN"; openedAt = t; fails = 0; } }
        else { stats.ok++; res = "ok"; if (state === "HALF-OPEN") state = "CLOSED"; fails = 0; }
      }
      tl.append(h("div", { class: "chip " + (res === "ok" ? "new" : res === "fail" ? "old" : ""), text: res === "ok" ? "200" : res === "fail" ? "timeout" : "fast-fail" }));
      while (tl.children.length > 48) tl.firstChild.remove();
      const col = state === "CLOSED" ? "var(--good)" : state === "OPEN" ? "var(--bad)" : "var(--warn)";
      clear(view).append(h("div", { style: { display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" } },
        h("div", { class: "sd-box", style: { position: "static", transform: "none" } }, h("span", { class: "em", text: "🛒" }), "Order service"), "→",
        h("div", { style: { padding: "14px 18px", border: `3px solid ${col}`, borderRadius: "14px", textAlign: "center" } }, h("div", { text: "⚡ Circuit breaker" }), h("b", { style: { color: col, fontSize: "20px" }, text: state }), h("div", { class: "topic-sub", style: { margin: 0 }, text: state === "CLOSED" ? `${fails}/5 consecutive failures` : state === "OPEN" ? `cooling down ${Math.max(0, 4 - (t - openedAt) / 1000).toFixed(1)} s` : "letting 1 trial request through" })), "→",
        h("div", { class: "sd-box", style: { position: "static", transform: "none" } }, h("span", { class: "em", text: +fail.inp.value > 50 ? "🔥" : "💳" }), "Payment service", h("small", { text: `${fail.inp.value}% failing` }))),
        h("div", { class: "controls", style: { marginTop: "12px" } }, h("span", { class: "badge good", text: `ok ${stats.ok}` }), h("span", { class: "badge hard", text: `slow failures ${stats.fail}` }), h("span", { class: "badge", text: `instant fallbacks ${stats.fast}` })));
    }, 350);
  };

  /* ================= Architecture case studies ================= */
  L.viz.cdnFlow = (root) => ArchDiagram(root, {
    height: 340,
    nodes: [
      { id: "user", x: 8, y: 50, em: "🧑", label: "Browser", info: "Types example.com. Needs an IP address, then makes HTTPS requests." },
      { id: "dns", x: 30, y: 15, em: "📒", label: "DNS", info: "Translates a domain into an IP. Results are cached (TTL) by the browser, OS and resolver. GeoDNS can return the closest CDN edge." },
      { id: "cdn", x: 35, y: 70, em: "🌍", label: "CDN edge", sub: "near the user", info: "A server physically close to the user that caches static content (images, JS, CSS, video). Cuts latency from ~200 ms to ~20 ms and offloads the origin." },
      { id: "lb", x: 60, y: 50, em: "⚖️", label: "Load balancer", info: "Terminates TLS and spreads traffic across the web servers." },
      { id: "web", x: 80, y: 25, em: "🖥️", label: "Web/API servers", info: "Stateless app servers: any one can handle any request, so you can add more." },
      { id: "origin", x: 80, y: 80, em: "🗂️", label: "Origin storage", sub: "e.g. object store", info: "The source of truth for static files. The CDN pulls from here on a cache miss." },
      { id: "db", x: 96, y: 50, em: "🗄️", label: "Database", info: "Stores dynamic data." },
    ],
    edges: [["user", "dns"], ["user", "cdn"], ["user", "lb"], ["cdn", "origin"], ["lb", "web"], ["web", "db"], ["web", "origin", 1]],
    flows: {
      "DNS lookup": { path: ["user", "dns", "user"], steps: ["Browser asks DNS: where is example.com?", "DNS answers with an IP (cached for TTL seconds)", "Browser now opens a TCP + TLS connection"] },
      "Image (CDN miss)": { path: ["user", "cdn", "origin", "cdn", "user"], color: "#f6ad55", steps: ["GET /logo.png goes to the nearest edge", "Edge doesn't have it → fetch from the origin (slow, far away)", "Origin returns the file; the edge caches it with a TTL", "Edge serves the user"] },
      "Image (CDN hit)": { path: ["user", "cdn", "user"], color: "#48bb78", steps: ["Next user nearby requests /logo.png", "Edge already has it → served in ~10 ms, origin untouched"] },
      "API call": { path: ["user", "lb", "web", "db", "web", "lb", "user"], steps: ["Dynamic request (GET /api/feed) bypasses the CDN cache", "LB picks a healthy server", "Server queries the database", "DB returns rows", "Server builds JSON", "Response back to the browser"] },
    },
  });

  L.viz.apiGateway = (root) => ArchDiagram(root, {
    height: 340,
    nodes: [
      { id: "mob", x: 8, y: 30, em: "📱", label: "Mobile app", info: "Talks to one public endpoint, the gateway." },
      { id: "web", x: 8, y: 72, em: "💻", label: "Web app", info: "Same gateway, maybe a different BFF (backend-for-frontend)." },
      { id: "gw", x: 35, y: 50, em: "🚪", label: "API Gateway", info: "Single entry point: authentication, rate limiting, request routing, TLS, request/response transformation, aggregation." },
      { id: "auth", x: 60, y: 12, em: "🔐", label: "Auth service", info: "Validates tokens (e.g. JWT/OAuth2). The gateway often caches the result." },
      { id: "users", x: 65, y: 40, em: "👤", label: "User service", info: "Owns user data. Each microservice owns its own database." },
      { id: "orders", x: 65, y: 70, em: "🧾", label: "Order service", info: "Creates orders. Publishes an OrderCreated event to the queue instead of calling everyone synchronously." },
      { id: "mq", x: 88, y: 88, em: "📬", label: "Message queue", info: "Decouples services: email, analytics and inventory consume events at their own pace." },
      { id: "email", x: 90, y: 55, em: "✉️", label: "Email worker", info: "Consumes OrderCreated and sends a confirmation email asynchronously." },
    ],
    edges: [["mob", "gw"], ["web", "gw"], ["gw", "auth"], ["gw", "users"], ["gw", "orders"], ["orders", "mq"], ["mq", "email", 1]],
    flows: {
      "Place order": { path: ["mob", "gw", "auth", "gw", "orders", "mq", "email"], steps: ["POST /orders with an Idempotency-Key header", "Gateway checks the token with Auth", "Token is valid", "Route to the Order service", "Order saved; event published; return 201 immediately", "Email worker sends the confirmation in the background"] },
      "Get profile": { path: ["web", "gw", "users", "gw", "web"], steps: ["GET /users/42", "Gateway routes by path prefix", "User service responds", "JSON back to the client"] },
    },
  });

  L.viz.urlShortener = (root) => {
    const inp = h("input", { type: "number", value: 125, style: { width: "160px" } });
    const out = h("div", { class: "caption" });
    const enc = (n) => { const a = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; let s0 = "", steps = []; if (n === 0) return ["0", []]; while (n > 0) { steps.push(`${n} mod 62 = ${n % 62} → '${a[n % 62]}'`); s0 = a[n % 62] + s0; n = Math.floor(n / 62); } return [s0, steps]; };
    const go = () => { const [code, st] = enc(Math.max(0, Math.floor(+inp.value))); out.innerHTML = `id <b>${inp.value}</b> → short code <code>${code}</code> → <code>sho.rt/${code}</code><br><span class="step">${st.join(" · ")}</span><br>7 base62 chars = 62⁷ ≈ <b>3.5 trillion</b> URLs.`; };
    inp.oninput = go;
    root.append(h("h3", { text: "Base62 encoder: unique id → short code" }), h("div", { class: "controls" }, h("label", null, "auto-increment id", inp), h("button", { class: "btn small", text: "🎲", onclick: () => { inp.value = rand(1, 3.5e12); go(); } })), out);
    go();
    root.append(h("h3", { text: "Architecture" }));
    ArchDiagram(root, {
      height: 340,
      nodes: [
        { id: "c", x: 8, y: 50, em: "🧑", label: "Client" },
        { id: "lb", x: 26, y: 50, em: "⚖️", label: "Load balancer", info: "Distributes traffic. Reads outnumber writes ~100:1." },
        { id: "api", x: 46, y: 50, em: "🖥️", label: "API servers", info: "POST /shorten creates; GET /{code} responds with a 301/302 redirect." },
        { id: "idgen", x: 46, y: 12, em: "🔢", label: "ID generator", info: "Hands out unique ids (DB sequence, Snowflake ids or pre-allocated ranges per server) → base62. Avoids collisions, unlike random/hash-based codes." },
        { id: "cache", x: 72, y: 25, em: "⚡", label: "Redis cache", info: "code → longURL. Hot links (20% of links get 80% of traffic) are served from memory." },
        { id: "db", x: 72, y: 78, em: "🗄️", label: "Key-value DB", info: "Stores code → {longURL, createdAt, expiry, owner}. A NoSQL KV store scales horizontally; shard by code." },
        { id: "an", x: 93, y: 50, em: "📊", label: "Analytics queue", info: "Click events are sent asynchronously (Kafka) so redirects stay fast." },
      ],
      edges: [["c", "lb"], ["lb", "api"], ["api", "idgen"], ["api", "cache"], ["api", "db"], ["cache", "db", 1], ["api", "an", 1]],
      flows: {
        "Shorten URL": { path: ["c", "lb", "api", "idgen", "api", "db"], steps: ["POST /shorten {url}", "Routed to an API server", "Get the next unique id", "id = 125 → base62 '21'", "Store '21' → long URL; return sho.rt/21"] },
        "Redirect (cache hit)": { path: ["c", "lb", "api", "cache", "api", "c"], color: "#48bb78", steps: ["GET /21", "Routed", "Look up '21' in Redis", "Found!", "301/302 Location: long URL"] },
        "Redirect (cache miss)": { path: ["c", "lb", "api", "cache", "db", "api", "c"], color: "#f6ad55", steps: ["GET /aZ9", "Routed", "Not in cache", "Read from DB, then populate the cache (cache-aside)", "Return the redirect", "Done"] },
      },
    });
  };

  L.viz.newsFeed = (root) => {
    const followers = range("followers of poster", 10, 1000000, 300, 10);
    const views = range("feed reads per user / day", 1, 50, 10);
    const out = h("div", { class: "two-col" });
    root.append(h("h3", { text: "Fan-out on write (push) vs fan-out on read (pull)" }), h("div", { class: "controls" }, followers.el, views.el), out);
    const calc = () => {
      const f = +followers.inp.value, v = +views.inp.value;
      clear(out).append(
        h("div", { class: "side-panel" }, h("h4", { text: "📤 Push: write to every follower's feed" }), h("div", { class: "kv" }, h("span", { text: "writes per post" }), h("b", { text: fmt(f) }), h("span", { text: "cost per feed read" }), h("b", { text: "1 cache read" })), h("p", { class: "topic-sub", html: f > 1e5 ? "⚠️ Celebrity problem: one post = " + fmt(f) + " writes. Too slow!" : "✅ Fast reads; fine for normal users." })),
        h("div", { class: "side-panel" }, h("h4", { text: "📥 Pull: build feed at read time" }), h("div", { class: "kv" }, h("span", { text: "writes per post" }), h("b", { text: "1" }), h("span", { text: "cost per feed read" }), h("b", { text: "query ~N followees + merge" })), h("p", { class: "topic-sub", html: `Each user reads ${v}× a day → expensive reads, but no fan-out storms.` })),
        h("div", { class: "callout tip", style: { gridColumn: "1 / -1" }, html: "<b>Hybrid (what big social networks do):</b> push for normal users, pull for celebrities, then merge at read time." }));
    };
    followers.inp.addEventListener("input", calc); views.inp.addEventListener("input", calc); calc();
    ArchDiagram(root, {
      height: 330,
      nodes: [
        { id: "u", x: 8, y: 50, em: "🧑", label: "User" },
        { id: "post", x: 30, y: 22, em: "✍️", label: "Post service", info: "Saves the post to the posts DB, then emits a NewPost event." },
        { id: "feed", x: 30, y: 78, em: "📰", label: "Feed service", info: "Reads the precomputed feed (list of post ids) from cache, then hydrates post content." },
        { id: "fan", x: 58, y: 22, em: "📣", label: "Fan-out workers", info: "Consume NewPost, look up followers in the graph DB, push post id into each follower's feed cache." },
        { id: "graph", x: 85, y: 12, em: "🕸️", label: "Social graph", info: "Who follows whom." },
        { id: "fc", x: 62, y: 70, em: "⚡", label: "Feed cache", sub: "per-user lists", info: "Redis lists: feed:{userId} → [postIds], trimmed to the latest ~800." },
        { id: "pdb", x: 88, y: 55, em: "🗄️", label: "Posts DB + media CDN", info: "Post bodies; media served from object storage + CDN." },
      ],
      edges: [["u", "post"], ["u", "feed"], ["post", "fan", 1], ["fan", "graph"], ["fan", "fc"], ["feed", "fc"], ["feed", "pdb"], ["post", "pdb"]],
      flows: {
        "Publish post": { path: ["u", "post", "fan", "graph", "fan", "fc"], steps: ["User publishes a post", "Saved; event queued; user gets OK instantly", "Workers fetch the follower list", "e.g. 300 followers", "Prepend post id to 300 feed lists"] },
        "Open feed": { path: ["u", "feed", "fc", "feed", "pdb", "feed", "u"], color: "#48bb78", steps: ["GET /feed", "Read feed:{me} list from cache", "Got 20 post ids", "Hydrate post bodies (batch get)", "Posts returned", "Rendered feed"] },
      },
    });
  };

  L.viz.chatSystem = (root) => ArchDiagram(root, {
    height: 340,
    nodes: [
      { id: "a", x: 7, y: 30, em: "🧑", label: "Alice", info: "Keeps a persistent WebSocket open to a chat server." },
      { id: "b", x: 93, y: 30, em: "👩", label: "Bob", info: "Connected to a different chat server." },
      { id: "cs1", x: 30, y: 30, em: "🔌", label: "Chat server 1", info: "Stateful: holds WebSocket connections. Uses heartbeats to detect disconnects." },
      { id: "cs2", x: 70, y: 30, em: "🔌", label: "Chat server 2", info: "Holds Bob's connection." },
      { id: "pres", x: 50, y: 8, em: "🟢", label: "Presence / session registry", info: "Maps userId → which chat server holds their connection, plus online status. Usually Redis." },
      { id: "bus", x: 50, y: 52, em: "📬", label: "Pub/Sub bus", info: "Routes messages between chat servers (Redis pub/sub, Kafka)." },
      { id: "store", x: 30, y: 85, em: "🗄️", label: "Message store", info: "Wide-column DB (Cassandra-style) partitioned by conversation_id, sorted by message time." },
      { id: "push", x: 75, y: 85, em: "🔔", label: "Push notification", info: "If Bob is offline, send an APNs/FCM push instead." },
    ],
    edges: [["a", "cs1"], ["b", "cs2"], ["cs1", "pres"], ["cs2", "pres"], ["cs1", "bus"], ["bus", "cs2"], ["cs1", "store"], ["bus", "push", 1]],
    flows: {
      "Alice → Bob (online)": { path: ["a", "cs1", "store", "cs1", "pres", "cs1", "bus", "cs2", "b"], steps: ["Alice sends over her WebSocket", "Persist the message first (durability)", "Saved with a message id", "Where is Bob connected?", "Bob is on chat server 2", "Publish to the bus", "Server 2 receives it", "Pushed down Bob's socket instantly; Bob's client acks"] },
      "Bob offline": { path: ["a", "cs1", "store", "cs1", "bus", "push"], color: "#f6ad55", steps: ["Alice sends", "Persist", "Stored", "Registry says Bob is offline → publish", "Push notification sent; Bob syncs missed messages from the store when he reconnects"] },
    },
  });
})();
