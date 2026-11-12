/* AI & LLM visualizers. Each L.viz.<name>(root) builds its UI into root. */
(function () {
  const { h, clear, rand, Player, Timers, ArchDiagram } = L;
  const range = (label, min, max, val, step = 1) => { const inp = h("input", { type: "range", min, max, step, value: val }); /* step must be set before value, or fractional values get rounded */ const out = h("b", { text: val }); inp.addEventListener("input", () => (out.textContent = inp.value)); return { el: h("label", null, label, inp, out), inp }; };
  const select = (opts) => h("select", null, opts.map(([v, t]) => h("option", { value: v, text: t })));
  const kv = (pairs) => h("div", { class: "kv" }, pairs.flatMap(([a, b]) => [h("span", { text: a }), h("b", { text: b })]));
  const legend = (items) => h("div", { class: "legend" }, items.map(([c, t]) => h("span", null, h("i", { style: { background: c } }), t)));
  const bar = (frac, color = "var(--accent)") => h("div", { class: "pbar" }, h("i", { style: { width: Math.max(0, Math.min(1, frac)) * 100 + "%", background: color } }));

  /* ================= The AI landscape: nested fields ================= */
  L.viz.aiMap = (root) => {
    const info = {
      ai: "The broad goal: machines that perceive, reason, learn and act. Includes everything below, plus approaches with no learning at all, like search and logic.",
      sym: "Hand-written knowledge and rules: search algorithms (A*), logic, planners, expert systems, constraint solvers. Dominant from the 1950s to the 1980s. Precise and explainable, but brittle when the world is messy. Still inside every GPS, chess engine and scheduler.",
      ml: "Systems that improve from data instead of explicit rules: regression, trees, clustering, reinforcement learning. Took over from the 1990s as data became plentiful.",
      dl: "Machine learning with many-layered neural networks that learn their own features from raw pixels, audio or text. Took off in 2012 thanks to GPUs and big datasets.",
      gen: "Deep models that <i>create</i> new content (text, images, audio, video, code) by learning the distribution of their training data: transformers, diffusion models, GANs.",
      llm: "Large language models: transformers trained on a large share of the public internet to predict the next token. GPT, Claude, Gemini, Llama. Add tools and a loop and you get agents.",
    };
    const detail = h("div", { class: "caption detail", html: "Each field sits inside the one around it. Click a box to see what it means." });
    const ring = (key, label, sub, ...kids) => {
      const el = h("div", { class: "ai-ring" }, h("b", { text: label }), h("small", { text: sub }), kids);
      el.addEventListener("click", (e) => { e.stopPropagation(); root.querySelectorAll(".ai-ring").forEach((x) => x.classList.remove("active")); el.classList.add("active"); detail.innerHTML = `<b>${label}</b> — ${info[key]}`; });
      return el;
    };
    root.append(h("div", { class: "stage" },
      ring("ai", "🤖 Artificial Intelligence", "any technique that makes machines act intelligently · 1956 →",
        h("div", { class: "ai-row" },
          ring("sym", "♟️ Symbolic AI", "search, logic, rules, planning"),
          ring("ml", "📈 Machine Learning", "learn patterns from data · 1990s →",
            ring("dl", "🧠 Deep Learning", "multi-layer neural networks · 2012 →",
              ring("gen", "🎨 Generative AI", "models that create content · 2014 →",
                ring("llm", "💬 Large Language Models", "next-token predictors · 2018 →"))))))), detail,
      h("h3", { text: "Which approach fits which problem?" }),
      h("table", { class: "cmp-table" }, h("tr", null, ["Problem", "Typical approach", "Why"].map((t) => h("th", { text: t }))),
        [["Shortest route on a map", "Search (A*)", "The rules are known exactly; no data needed"],
          ["Will this customer churn?", "Classic ML (boosted trees)", "Tabular data with labels"],
          ["What's in this photo?", "Deep learning (CNN / vision transformer)", "Raw pixels; features must be learned"],
          ["Draft a reply to this email", "LLM", "Open-ended language generation"],
          ["Answer questions about our private docs", "LLM + retrieval (RAG)", "The model needs facts it was never trained on"],
          ["Play a game / control a robot", "Reinforcement learning", "Learn by trial, error and reward"]].map((r) => h("tr", null, r.map((t) => h("td", { text: t }))))));
  };

  /* ================= A* / BFS / greedy search on a grid ================= */
  L.viz.aStar = (root) => {
    const R = 13, Cn = 26, start = [6, 3], goal = [6, 22];
    const key = (r, c) => r * Cn + c;
    let walls = new Set();
    const algo = select([["astar", "A*  (f = g + h)"], ["bfs", "Uniform cost / BFS  (g only)"], ["greedy", "Greedy best-first  (h only)"]]);
    const grid = h("div", { class: "ai-grid", style: { gridTemplateColumns: `repeat(${Cn}, 1fr)` } });
    const out = h("div", { class: "side-panel" });
    const cells = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
      const el = h("div", { class: "ai-cell" });
      el.addEventListener("click", () => { const k = key(r, c); if (k === key(...start) || k === key(...goal)) return; walls.has(k) ? walls.delete(k) : walls.add(k); run(); });
      cells.push(el); grid.append(el);
    }
    const preset = () => { walls = new Set(); for (let r = 2; r <= 10; r++) walls.add(key(r, 13)); for (let c = 9; c <= 13; c++) { walls.add(key(2, c)); walls.add(key(10, c)); } };
    root.append(h("div", { class: "controls" }, algo,
      h("button", { class: "btn small", text: "🧱 Preset walls", onclick: () => { preset(); run(); } }),
      h("button", { class: "btn small", text: "🎲 Random walls", onclick: () => { walls = new Set(); for (let i = 0; i < 90; i++) { const k = rand(0, R * Cn - 1); if (k !== key(...start) && k !== key(...goal)) walls.add(k); } run(); } }),
      h("button", { class: "btn small", text: "🧹 Clear", onclick: () => { walls = new Set(); run(); } }),
      h("span", { class: "badge", text: "click cells to draw or erase walls" })),
      h("div", { class: "viz-split" }, h("div", { class: "stage", style: { minHeight: "0" } }, grid), out),
      legend([["var(--good)", "start"], ["var(--bad)", "goal"], ["var(--muted)", "wall"], ["rgba(124,140,255,.45)", "expanded"], ["var(--yellow)", "expanding now"], ["var(--pink)", "path found"]]));
    algo.addEventListener("change", run);
    let order = [], seen = new Map(), path = new Set();
    const player = Player(root, render, { speed: 5 });
    function run() {
      const hF = (r, c) => Math.abs(r - goal[0]) + Math.abs(c - goal[1]);
      const g = new Map([[key(...start), 0]]), parent = new Map(), closed = new Set(), open = [start], F = [];
      const pri = ([r, c]) => { const gg = g.get(key(r, c)), hh = hF(r, c); return algo.value === "bfs" ? gg : algo.value === "greedy" ? hh : gg + hh; };
      order = []; let found = false;
      while (open.length) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) { const a = pri(open[i]), b = pri(open[bi]); if (a < b || (a === b && hF(...open[i]) < hF(...open[bi]))) bi = i; }
        const [r, c] = open.splice(bi, 1)[0], k = key(r, c);
        if (closed.has(k)) continue;
        closed.add(k); order.push(k);
        const gg = g.get(k), hh = hF(r, c);
        F.push({ n: order.length, msg: `Expand (${r}, ${c}): g = ${gg} steps so far, h = ${hh} estimated to go${algo.value === "astar" ? `, f = g + h = <b>${gg + hh}</b>` : ""}. Frontier holds ${open.length} cells.` });
        if (r === goal[0] && c === goal[1]) { found = true; break; }
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          const nr = r + dr, nc = c + dc, nk = key(nr, nc);
          if (nr < 0 || nc < 0 || nr >= R || nc >= Cn || walls.has(nk) || closed.has(nk)) continue;
          if (!g.has(nk) || gg + 1 < g.get(nk)) { g.set(nk, gg + 1); parent.set(nk, k); open.push([nr, nc]); }
        }
      }
      seen = new Map(order.map((k, i) => [k, i]));
      path = new Set();
      if (found) for (let k = key(...goal); k != null; k = parent.get(k)) path.add(k);
      const name = { astar: "A*", bfs: "Uniform cost / BFS", greedy: "Greedy best-first" }[algo.value];
      F.push({ n: order.length, done: true, msg: found ? `🏁 ${name} reached the goal after expanding <b>${order.length}</b> cells. Path length: <b>${path.size - 1}</b> steps${algo.value === "greedy" ? " (not guaranteed to be the shortest)." : " (guaranteed shortest)."}` : `No path exists: the frontier ran empty after ${order.length} cells.` });
      clear(out).append(h("h4", { text: name }), kv([["cells expanded", order.length], ["path length", found ? path.size - 1 : "–"], ["walls", walls.size]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, text: "Switch algorithm with the same walls and compare how many cells each one has to expand." }));
      player.load(F);
      player.go(F.length - 1);
    }
    function render(f) {
      cells.forEach((el, k) => {
        const i = seen.get(k);
        el.className = "ai-cell" + (walls.has(k) ? " wall" : k === key(...start) ? " start" : k === key(...goal) ? " goal" : f.done && path.has(k) ? " path" : i === f.n - 1 && !f.done ? " cur" : i != null && i < f.n ? " seen" : "");
      });
    }
    preset(); run();
  };

  /* ================= Q-learning gridworld ================= */
  L.viz.qLearning = (root) => {
    const R = 4, Cn = 6, start = [3, 0], goal = [0, 5], pits = [[1, 5], [2, 2], [3, 3]], blocks = [[1, 1], [1, 3]];
    const A = [[-1, 0, "↑"], [0, 1, "→"], [1, 0, "↓"], [0, -1, "←"]];
    const ALPHA = 0.5, GAMMA = 0.9;
    const is = (list, r, c) => list.some(([a, b]) => a === r && b === c);
    const eps = range("exploration ε", 0, 1, 0.2, 0.05);
    const grid = h("div", { class: "ai-grid rl", style: { gridTemplateColumns: `repeat(${Cn}, 1fr)` } });
    const out = h("div", { class: "side-panel" }), cap = h("div", { class: "caption" });
    let Q, pos, episodes, returns, epReturn, epSteps, watching = false;
    root.append(h("div", { class: "controls" }, eps.el,
      h("button", { class: "btn primary small", text: "▶ Watch 1 episode", onclick: () => { newEpisode(); watching = true; } }),
      h("button", { class: "btn small", text: "⏩ Train 20 episodes", onclick: () => train(20) }),
      h("button", { class: "btn small", text: "⏩⏩ Train 200", onclick: () => train(200) }),
      h("button", { class: "btn small", text: "♻ Reset", onclick: reset })),
      h("div", { class: "viz-split" }, h("div", { class: "stage", style: { minHeight: "0" } }, grid), out), cap,
      legend([["rgba(72,187,120,.5)", "high value (good place to be)"], ["rgba(245,101,101,.5)", "negative value"], ["transparent", "arrow = best known action · number = max Q"]]));
    function reset() { Q = Array.from({ length: R * Cn }, () => [0, 0, 0, 0]); episodes = 0; returns = []; watching = false; newEpisode(); cap.innerHTML = "The agent 🤖 knows nothing: every Q-value is 0. Reward: <b>+10</b> at 🏆, <b>−10</b> in a 🔥 pit, <b>−1</b> per step (so shorter paths are better)."; draw(); }
    function newEpisode() { pos = start.slice(); epReturn = 0; epSteps = 0; }
    function step() {   // one Q-learning update; returns true when the episode ends
      const s = pos[0] * Cn + pos[1], q = Q[s];
      const best = Math.max(...q), greedy = [0, 1, 2, 3].filter((a) => q[a] === best);
      const explore = Math.random() < +eps.inp.value;
      const a = explore ? rand(0, 3) : greedy[rand(0, greedy.length - 1)];
      let nr = pos[0] + A[a][0], nc = pos[1] + A[a][1];
      if (nr < 0 || nc < 0 || nr >= R || nc >= Cn || is(blocks, nr, nc)) { nr = pos[0]; nc = pos[1]; }
      const win = nr === goal[0] && nc === goal[1], dead = is(pits, nr, nc);
      const reward = win ? 10 : dead ? -10 : -1, done = win || dead;
      const target = reward + (done ? 0 : GAMMA * Math.max(...Q[nr * Cn + nc])), old = q[a];
      q[a] = old + ALPHA * (target - old);
      cap.innerHTML = `${explore ? "🎲 Explore" : "🎯 Exploit"}: move ${A[a][2]} from (${pos[0]}, ${pos[1]}), reward <b>${reward}</b>. Update Q ← Q + α·(r + γ·max Q′ − Q) = ${old.toFixed(2)} + 0.5·(${target.toFixed(2)} − ${old.toFixed(2)}) = <b>${q[a].toFixed(2)}</b>`;
      pos = [nr, nc]; epReturn += reward; epSteps++;
      if (done || epSteps >= 80) { episodes++; returns.push(epReturn); return true; }
      return false;
    }
    function train(n) { watching = false; for (let i = 0; i < n; i++) { newEpisode(); while (!step()); } newEpisode(); draw(); }
    function draw() {
      clear(grid);
      for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
        const q = Q[r * Cn + c], v = Math.max(...q), a = q.indexOf(v), here = pos[0] === r && pos[1] === c;
        const special = is(blocks, r, c) ? "wall" : r === goal[0] && c === goal[1] ? "🏆" : is(pits, r, c) ? "🔥" : null;
        const known = q.some((x) => x !== 0);
        grid.append(h("div", { class: "ai-cell" + (special === "wall" ? " wall" : ""), style: special || !known ? null : { background: v >= 0 ? `rgba(72,187,120,${Math.min(0.6, v / 12)})` : `rgba(245,101,101,${Math.min(0.6, -v / 12)})` } },
          special === "wall" ? null : h("span", { class: "big", text: here ? "🤖" : special || (known ? A[a][2] : "·") }),
          special || !known ? null : h("small", { text: v.toFixed(1) })));
      }
      const last = returns.slice(-20);
      clear(out).append(h("h4", { text: "Q-learning" }), kv([["episodes", episodes], ["avg return (last 20)", last.length ? (last.reduce((a, b) => a + b, 0) / last.length).toFixed(1) : "–"], ["best possible return", "3"], ["α (learning rate)", ALPHA], ["γ (discount)", GAMMA]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, text: "Value spreads backwards from the trophy one cell per visit. After ~200 episodes the arrows form a safe route. Set ε to 0 and watch the agent follow it." }));
    }
    Timers.every(() => { if (!watching || !grid.isConnected) return; if (step()) { watching = false; cap.innerHTML += ` — episode over, return <b>${returns[returns.length - 1]}</b>.`; draw(); newEpisode(); } else draw(); }, 140);
    reset();
  };

  /* ================= Embeddings: toy vectors, cosine similarity, analogies ================= */
  L.viz.embeddings = (root) => {
    // Hand-built 8-D vectors: [human, animal, royal, gender, food, tech, young, sweet]
    const V = {
      king: [1, 0, 1, 1, 0, 0, 0, 0], queen: [1, 0, 1, -1, 0, 0, 0, 0], man: [1, 0, 0, 1, 0, 0, 0, 0], woman: [1, 0, 0, -1, 0, 0, 0, 0],
      prince: [1, 0, 1, 1, 0, 0, 1, 0], princess: [1, 0, 1, -1, 0, 0, 1, 0], boy: [1, 0, 0, 1, 0, 0, 1, 0], girl: [1, 0, 0, -1, 0, 0, 1, 0],
      dog: [0, 1, 0, 0.1, 0, 0, 0, 0], cat: [0, 1, 0, -0.1, 0, 0, 0, 0], puppy: [0, 1, 0, 0.1, 0, 0, 1, 0], kitten: [0, 1, 0, -0.1, 0, 0, 1, 0],
      apple: [0, 0, 0, 0, 1, 0, 0, 0.8], banana: [0, 0, 0, 0, 1, 0, 0, 0.9], cake: [0, 0, 0, 0, 1, 0, 0, 1.4], pizza: [0, 0, 0, 0, 1, 0, 0, 0], bread: [0, 0, 0, 0, 1, 0, 0, 0.1],
      laptop: [0, 0, 0, 0, 0, 1, 0, 0], phone: [0, 0, 0, 0, 0, 1, 0.2, 0], server: [0, 0, 0, 0, 0, 1.2, -0.2, 0], robot: [0.3, 0, 0, 0, 0, 1, 0, 0],
    };
    const words = Object.keys(V);
    const axes = [[-0.55, 0.45], [-0.6, -0.55], [0.05, 0.4], [0.16, 0.02], [0.6, -0.5], [0.65, 0.55], [-0.1, -0.22], [0.12, -0.22]];   // 2-D direction of each dimension
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const cos = (a, b) => dot(a, b) / (Math.hypot(...a) * Math.hypot(...b) || 1);
    const wrap = h("div", { class: "sd-canvas", style: { height: "380px" } });
    const out = h("div", { class: "side-panel" });
    const chips = {};
    words.forEach((w) => {
      const p = V[w].reduce((a, v, i) => [a[0] + v * axes[i][0], a[1] + v * axes[i][1]], [0, 0]);
      chips[w] = h("div", { class: "chip", text: w, style: { position: "absolute", left: 50 + p[0] * 42 + "%", top: 50 - p[1] * 40 + "%", transform: "translate(-50%,-50%)", cursor: "pointer" }, onclick: () => pick(w) });
      wrap.append(chips[w]);
    });
    const sel = () => select(words.map((w) => [w, w]));
    const a = sel(), b = sel(), c = sel(); a.value = "king"; b.value = "man"; c.value = "woman";
    const ans = h("b", { style: { color: "var(--good)" } });
    root.append(h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 300px" } }, h("div", { class: "stage", style: { padding: 0 } }, wrap), out),
      h("div", { class: "card", style: { marginTop: "14px" } }, h("div", { class: "controls", style: { margin: 0 } }, h("b", { text: "Vector arithmetic:" }), a, "−", b, "+", c, "≈", ans)),
      h("p", { class: "topic-sub", style: { marginTop: "12px" }, text: "These are toy 8-dimensional vectors built by hand (human, animal, royal, gender, food, tech, young, sweet) and flattened to 2-D for display. Real embeddings have hundreds to thousands of learned dimensions with no human-readable names." }));
    [a, b, c].forEach((s) => s.addEventListener("change", analogy));
    function pick(w) {
      const ranked = words.filter((x) => x !== w).map((x) => [x, cos(V[w], V[x])]).sort((p, q) => q[1] - p[1]);
      words.forEach((x) => (chips[x].className = "chip" + (x === w ? " hl" : ranked.slice(0, 4).some(([n]) => n === x) ? " new" : "")));
      clear(out).append(h("h4", { text: `Nearest to "${w}"` }), ...ranked.slice(0, 8).map(([x, sc]) => h("div", { style: { marginBottom: "6px" } }, h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("span", { text: x }), h("b", { class: "mono", text: sc.toFixed(2) })), bar(sc, sc > 0.6 ? "var(--good)" : "var(--accent)"))),
        h("p", { class: "topic-sub", style: { margin: "8px 0 0" }, text: "Cosine similarity: 1 = same direction, 0 = unrelated." }));
    }
    function analogy() {
      const t = V[a.value].map((v, i) => v - V[b.value][i] + V[c.value][i]);
      const best = words.filter((x) => ![a.value, b.value, c.value].includes(x)).map((x) => [x, cos(t, V[x])]).sort((p, q) => q[1] - p[1])[0];
      ans.textContent = `${best[0]}  (cosine ${best[1].toFixed(2)})`;
    }
    pick("king"); analogy();
  };

  /* ================= Byte-pair encoding ================= */
  L.viz.bpe = (root) => {
    const inp = h("input", { type: "text", value: "low lower lowest new newer newest wide wider widest", style: { flex: "1", minWidth: "280px" } });
    const stage = h("div", { class: "stage", style: { minHeight: "120px" } }), out = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, h("label", null, "training text"), inp, h("button", { class: "btn primary small", text: "Train BPE", onclick: run })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 280px" } }, stage, out));
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
    const player = Player(root, render, { speed: 2 });
    function run() {
      const raw = inp.value.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 40);
      if (!raw.length) return;
      let words = raw.map((w) => ["▁", ...w]);
      const merges = [], F = [];
      const snap = (msg, fresh) => F.push({ words: words.map((w) => w.slice()), merges: merges.slice(), fresh, msg });
      snap(`Start: every character is its own token (▁ marks the start of a word). ${words.flat().length} tokens for ${raw.length} words.`);
      for (let m = 0; m < 24; m++) {
        const counts = new Map();
        words.forEach((w) => { for (let i = 0; i < w.length - 1; i++) { const k = w[i] + "\u0000" + w[i + 1]; counts.set(k, (counts.get(k) || 0) + 1); } });
        let best = null;
        counts.forEach((n, k) => { if (!best || n > best[1]) best = [k, n]; });
        if (!best || best[1] < 2) break;
        const [x, y] = best[0].split("\u0000");
        words = words.map((w) => { const o = []; for (let i = 0; i < w.length; i++) { if (w[i] === x && w[i + 1] === y) { o.push(x + y); i++; } else o.push(w[i]); } return o; });
        merges.push([x, y, best[1]]);
        snap(`Merge ${merges.length}: the most frequent adjacent pair is <code>${x}</code> + <code>${y}</code> (${best[1]}×) → new token <code>${x + y}</code>. Now ${words.flat().length} tokens.`, x + y);
      }
      F[F.length - 1].msg += " <b>Done</b>: no remaining pair occurs twice. Frequent words became single tokens; rare ones stay split into reusable pieces.";
      player.load(F);
    }
    function render(f) {
      clear(stage).append(...f.words.map((w) => h("span", { style: { display: "inline-block", margin: "0 12px 10px 0" } }, w.map((t) => h("span", { class: "chip" + (t === f.fresh ? " new" : ""), text: t })))));
      const vocab = new Set([...f.words.flat(), ...f.merges.map(([x, y]) => x + y)]);
      clear(out).append(h("h4", { text: "Tokenizer state" }), kv([["tokens in text", f.words.flat().length], ["vocabulary size", vocab.size], ["merges learned", f.merges.length]]),
        h("h4", { text: "Merge rules (in order)", style: { marginTop: "12px" } }),
        h("div", { class: "log", style: { maxHeight: "200px" } }, f.merges.length ? f.merges.map(([x, y, n], i) => h("div", { text: `${i + 1}. ${x} + ${y} → ${x + y}  (${n}×)` })) : h("div", { text: "none yet" })));
    }
    run();
  };

  /* ================= Self-attention (toy single head) ================= */
  L.viz.attention = (root) => {
    // Hand-built 4-D keys/queries: [animate thing, place, action, description]
    const K = { The: [0.1, 0.1, 0, 0], animal: [2, 0, 0, 0], "didn't": [0, 0, 1, 0], cross: [0, 0, 2, 0], the: [0.1, 0.1, 0, 0], street: [0, 2, 0, 0], because: [0, 0, 0.3, 0.2], it: [0.5, 0.5, 0, 0], was: [0, 0, 0.6, 0], too: [0, 0, 0, 0.6], tired: [0, 0, 0, 2], wide: [0, 0, 0, 2] };
    const Qv = { The: [1, 1, 0, 0], animal: [0.4, 0, 1.6, 1], "didn't": [0.6, 0, 2, 0], cross: [1.6, 1.6, 0.3, 0], the: [1, 1, 0, 0], street: [0, 0.4, 1.6, 0.6], because: [0, 0, 1.2, 1.2], was: [1.2, 1.2, 0, 1.4], too: [0, 0, 0, 2.2], tired: [2.6, 0, 0, 0.6], wide: [0, 2.6, 0, 0.6] };
    const sents = { tired: "The animal didn't cross the street because it was too tired", wide: "The animal didn't cross the street because it was too wide" };
    const which = select([["tired", "…because it was too tired"], ["wide", "…because it was too wide"]]);
    const row = h("div", { class: "attn-row" }), out = h("div", { class: "side-panel" }), heat = h("div", { style: { overflowX: "auto" } });
    let toks = [], cur = 7;
    root.append(h("div", { class: "controls" }, h("label", null, "sentence", which), h("span", { class: "badge", text: "click a word to see what it attends to" })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 300px" } }, h("div", null, h("div", { class: "stage", style: { minHeight: "0" } }, row), h("h3", { text: "Full attention matrix (row attends to column)" }), heat), out),
      h("p", { class: "topic-sub", style: { marginTop: "12px" }, text: "Toy single attention head with hand-built 4-dimensional query and key vectors, so you can follow the arithmetic. Real models learn these vectors and run dozens of heads in each of dozens of layers." }));
    which.addEventListener("change", () => { toks = sents[which.value].split(" "); draw(); });
    // "it" asks for whatever the adjective describes: a tired thing is animate, a wide thing is a place
    const query = (t) => (t === "it" ? (which.value === "tired" ? [3, 0, 0, 1] : [0, 3, 0, 1]) : Qv[t]);
    function weights(i) {
      const q = query(toks[i]);
      const scores = toks.map((t) => q.reduce((s, v, d) => s + v * K[t][d], 0) / 2);   // divide by √d = √4
      const m = Math.max(...scores), e = scores.map((v) => Math.exp(v - m)), z = e.reduce((x, y) => x + y, 0);
      return { scores, w: e.map((v) => v / z) };
    }
    function draw() {
      const { scores, w } = weights(cur), top = w.indexOf(Math.max(...w));
      clear(row).append(...toks.map((t, i) => h("div", { class: "attn-tok" + (i === cur ? " cur" : ""), style: { background: `rgba(79,209,197,${w[i] * 0.9})` }, onclick: () => { cur = i; draw(); } }, t, h("small", { text: (w[i] * 100).toFixed(0) + "%" }))));
      clear(out).append(h("h4", { text: `"${toks[cur]}" attends to…` }),
        ...toks.map((t, i) => [i, w[i]]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([i, v]) => h("div", { style: { marginBottom: "6px" } }, h("div", { style: { display: "flex", justifyContent: "space-between" } }, h("span", { text: toks[i] }), h("span", { class: "mono", text: `score ${scores[i].toFixed(2)} → ${(v * 100).toFixed(0)}%` })), bar(v, "var(--accent2)"))),
        h("p", { class: "topic-sub", style: { margin: "8px 0 0" }, html: `score = q·k / √d, then softmax over the row. ${toks[cur] === "it" ? `Here <b>it</b> resolves to <b>${toks[top]}</b>: change the last word and watch it switch.` : ""}` }));
      clear(heat).append(h("table", { class: "dp" }, h("tr", null, h("th"), toks.map((t) => h("th", { text: t, style: { width: "auto", padding: "0 6px" } }))),
        toks.map((t, i) => { const r = weights(i).w; return h("tr", null, h("th", { text: t, style: { width: "auto", padding: "0 6px" } }), r.map((v) => h("td", { text: v >= 0.095 ? (v * 10).toFixed(0) : "", title: (v * 100).toFixed(1) + "%", style: { background: `rgba(79,209,197,${v * 0.95})`, outline: i === cur ? "1px solid var(--yellow)" : null } }))); })));
    }
    toks = sents.tired.split(" "); draw();
  };

  /* ================= Next-token sampling: temperature, top-k, top-p ================= */
  L.viz.sampling = (root) => {
    const toks = [["mat", 5.0], ["floor", 4.3], ["sofa", 4.0], ["bed", 3.6], ["roof", 2.9], ["table", 2.7], ["moon", 1.2], ["piano", 0.7], ["banana", 0.2]];
    const temp = range("temperature", 0, 2, 1, 0.05), topk = range("top-k", 1, 9, 9), topp = range("top-p", 0.1, 1, 1, 0.05);
    const list = h("div", { class: "card" }), outText = h("div", { class: "caption" });
    let counts = toks.map(() => 0), last = null;
    root.append(h("div", { class: "controls" }, temp.el, topk.el, topp.el),
      h("div", { class: "controls" }, h("button", { class: "btn primary small", text: "🎲 Sample 1 token", onclick: () => sample(1) }), h("button", { class: "btn small", text: "🎲 Sample 200", onclick: () => sample(200) }), h("button", { class: "btn small", text: "♻ Clear samples", onclick: () => { counts = toks.map(() => 0); last = null; draw(); } })),
      outText, h("div", { style: { height: "12px" } }), list,
      legend([["var(--accent)", "probability after temperature"], ["var(--line)", "cut off by top-k / top-p (probability set to 0)"], ["var(--warn)", "share of your samples"]]));
    [temp, topk, topp].forEach((r) => r.inp.addEventListener("input", () => { counts = toks.map(() => 0); last = null; draw(); }));
    function dist() {
      const T = +temp.inp.value, Kk = +topk.inp.value, Pp = +topp.inp.value;
      let p;
      if (T < 0.05) p = toks.map((_, i) => (i === 0 ? 1 : 0));
      else { const e = toks.map(([, l]) => Math.exp((l - toks[0][1]) / T)), z = e.reduce((a, b) => a + b, 0); p = e.map((v) => v / z); }
      let cum = 0;
      const keep = p.map((v, i) => { const ok = i < Kk && cum < Pp; cum += v; return ok; });   // tokens are already sorted by logit
      const z = p.reduce((a, v, i) => a + (keep[i] ? v : 0), 0);
      return p.map((v, i) => ({ raw: v, keep: keep[i], fin: keep[i] ? v / z : 0 }));
    }
    function sample(n) { const d = dist(); for (let s = 0; s < n; s++) { let r = Math.random(), i = 0; while (i < d.length - 1 && (r -= d[i].fin) > 0) i++; counts[i]++; last = i; } draw(); }
    function draw() {
      const d = dist(), total = counts.reduce((a, b) => a + b, 0), T = +temp.inp.value;
      outText.innerHTML = `Prompt: <span class="mono">The cat sat on the <b style="color:var(--accent2)">${last == null ? "____" : toks[last][0]}</b></span> &nbsp; <span class="step">${T < 0.05 ? "temperature 0 = greedy: always the top token (deterministic)" : T < 0.6 ? "low temperature: focused and repeatable" : T > 1.3 ? "high temperature: flat distribution, surprising (and sometimes silly) picks" : "temperature 1: sample from the model's raw distribution"}</span>`;
      clear(list).append(h("div", { class: "samp-row head" }, h("span", { text: "token" }), h("span", { text: "logit" }), h("span", { text: "probability" }), h("span", { text: "final" }), h("span", { text: total ? `sampled (${total})` : "sampled" })),
        ...toks.map(([t, l], i) => h("div", { class: "samp-row" + (d[i].keep ? "" : " cut") }, h("b", { text: t }), h("span", { class: "mono", text: l.toFixed(1) }), bar(d[i].raw, d[i].keep ? "var(--accent)" : "var(--line)"), h("span", { class: "mono", text: (d[i].fin * 100).toFixed(1) + "%" }), total ? h("span", { style: { display: "flex", gap: "6px", alignItems: "center" } }, bar(counts[i] / total, "var(--warn)"), h("small", { class: "mono", text: counts[i] })) : h("span", { text: "–" }))));
    }
    draw();
  };

  /* ================= RAG pipeline ================= */
  L.viz.ragFlow = (root) => ArchDiagram(root, {
    height: 380,
    intro: "Click a component, or trace the two phases: indexing happens ahead of time, retrieval + generation on every question.",
    nodes: [
      { id: "user", x: 7, y: 42, em: "🧑", label: "User", info: "Asks a question in plain language, e.g. 'What is our refund policy for annual plans?'" },
      { id: "app", x: 28, y: 42, em: "🧩", label: "Orchestrator", sub: "your backend", info: "Glue code: embeds the question, queries the vector DB, builds the prompt (instructions + retrieved chunks + question), calls the LLM and returns the answer with citations." },
      { id: "embed", x: 52, y: 14, em: "🧲", label: "Embedding model", info: "Turns text into a vector that captures meaning. The same model must be used for documents and for questions, so related texts land close together." },
      { id: "vdb", x: 80, y: 14, em: "🗃️", label: "Vector DB", sub: "ANN index", info: "Stores chunk vectors + text + metadata. Approximate nearest-neighbour search (HNSW, IVF) finds the top-k most similar chunks in milliseconds. Often combined with keyword search (BM25) = hybrid search." },
      { id: "rerank", x: 55, y: 48, em: "🥇", label: "Reranker", sub: "optional", info: "A slower, more accurate cross-encoder re-scores the top ~50 candidates and keeps the best ~5. A cheap way to boost answer quality." },
      { id: "llm", x: 52, y: 84, em: "💬", label: "LLM", info: "Reads the prompt (retrieved context + question) and writes a grounded answer. It is told to answer only from the context and to say 'I don't know' otherwise." },
      { id: "chunk", x: 80, y: 60, em: "✂️", label: "Chunker", info: "Splits documents into passages of ~200–800 tokens, usually with a little overlap, keeping headings and metadata. Chunk quality is the biggest lever on RAG quality." },
      { id: "docs", x: 93, y: 88, em: "📄", label: "Documents", sub: "PDFs, wiki, tickets", info: "Your private or fresh knowledge the LLM was never trained on. Re-index when documents change; respect per-user access permissions." },
    ],
    edges: [["user", "app"], ["app", "embed"], ["embed", "vdb"], ["app", "vdb", 1], ["app", "rerank"], ["app", "llm"], ["docs", "chunk"], ["chunk", "embed"]],
    flows: {
      "1 · Index documents (offline)": { color: "#f6ad55", path: ["docs", "chunk", "embed", "vdb"], steps: ["Load documents and extract clean text", "Split into overlapping chunks; each one is embedded into a vector", "Store vector + text + metadata (source, date, permissions) in the vector DB", "Indexing done. Repeat whenever documents change."] },
      "2 · Answer a question (online)": { path: ["user", "app", "embed", "app", "vdb", "app", "rerank", "app", "llm", "app", "user"], steps: ["User asks: 'What is the refund policy for annual plans?'", "Embed the question with the same embedding model", "Question vector comes back", "Search the vector DB for the nearest chunks (top 20–50)", "Candidate chunks returned with similarity scores", "Rerank the candidates and keep the best ~5", "Build the prompt: instructions + the 5 chunks + the question", "Send the augmented prompt to the LLM", "LLM writes an answer grounded in the chunks, with citations", "Return the answer and its sources", "The user can click through to verify the sources"] },
    },
  });

  /* ================= Agent loop ================= */
  L.viz.agentLoop = (root) => ArchDiagram(root, {
    height: 380,
    intro: "An agent is an LLM in a loop: think → call a tool → read the result → repeat until done. Click a component or trace a task.",
    nodes: [
      { id: "user", x: 7, y: 50, em: "🧑", label: "User", info: "Gives a goal, not step-by-step instructions: 'Find why checkout latency spiked yesterday and open a ticket.'" },
      { id: "agent", x: 30, y: 50, em: "🔁", label: "Agent loop", sub: "harness", info: "Ordinary code around the model: sends the conversation + tool definitions to the LLM, executes whichever tool the LLM requests, appends the result, and repeats. Also enforces step limits, permissions and human approval." },
      { id: "llm", x: 56, y: 14, em: "🧠", label: "LLM", sub: "the reasoner", info: "Decides the next step. It never runs anything itself: it outputs either a final answer or a structured tool call (name + JSON arguments)." },
      { id: "search", x: 82, y: 24, em: "🌐", label: "Search / RAG", info: "Tool for looking things up: web search, docs, a vector database. Gives the model facts it doesn't have." },
      { id: "code", x: 88, y: 56, em: "🖥️", label: "Code sandbox", info: "Tool for running code, queries or shell commands in an isolated environment. Lets the model compute instead of guessing." },
      { id: "api", x: 74, y: 86, em: "🔌", label: "APIs & actions", sub: "tickets, email, DB", info: "Tools with side effects in the real world. High-risk actions should need human approval and least-privilege credentials." },
      { id: "mem", x: 42, y: 88, em: "🗒️", label: "Memory", info: "Short-term: the context window (conversation + tool results so far). Long-term: notes or a vector store the agent can read and write across sessions." },
    ],
    edges: [["user", "agent"], ["agent", "llm"], ["agent", "search"], ["agent", "code"], ["agent", "api"], ["agent", "mem"]],
    flows: {
      "Research question (ReAct)": { path: ["user", "agent", "llm", "agent", "search", "agent", "llm", "agent", "user"], steps: ["Goal: 'What changed in Python 3.13's GIL?'", "Harness sends the goal + tool list to the LLM", "Thought: 'I should look this up.' Action: search('Python 3.13 free-threaded build')", "Harness executes the tool call", "Observation: search results come back", "Results are appended to the conversation", "LLM reads them and decides it has enough to answer", "Final answer, no more tool calls → loop ends", "User gets the answer with sources"] },
      "Multi-step task with an action": { color: "#f6ad55", path: ["user", "agent", "llm", "agent", "code", "agent", "llm", "agent", "api", "agent", "llm", "agent", "user"], steps: ["Goal: 'Find why checkout latency spiked and file a ticket'", "Send goal + tools to the LLM", "Plan step 1: query the metrics. Tool call: run_sql(...)", "Harness runs the query in the sandbox", "Observation: p99 latency tripled after deploy #482", "Append the result", "Step 2: file a ticket. Tool call: create_ticket(title, body)", "Harness checks permissions (and asks a human if required)", "Ticket API returns id OPS-1432", "Append the result", "LLM writes the summary: cause, evidence, ticket link", "No more tool calls → done", "User reviews the result"] },
      "Recall from memory": { color: "#48bb78", path: ["user", "agent", "mem", "agent", "llm", "agent", "user"], steps: ["'Continue the migration we started last week'", "Harness loads saved notes for this project", "Notes: 'Tables A–C migrated; D blocked on schema review'", "Notes are added to the context", "LLM continues from where the last session stopped", "Answer + updated notes saved for next time", "User sees the progress"] },
    },
  });
})();
