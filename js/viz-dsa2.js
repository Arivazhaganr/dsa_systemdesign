/* More DSA visualizers: bits, string matching, union-find, topological sort, Fenwick tree, Bloom filter */
(function () {
  const { h, s, clear, rand, Player } = L;
  const select = (opts) => h("select", null, opts.map(([v, t]) => h("option", { value: v, text: t })));
  const kv = (pairs) => h("div", { class: "kv" }, pairs.flatMap(([a, b]) => [h("span", { text: a }), h("b", { text: b })]));
  const legend = (items) => h("div", { class: "legend" }, items.map(([c, t]) => h("span", null, h("i", { style: { background: c } }), t)));
  const cell = (text, cls, idx, ptr) => h("div", { class: "cell " + (cls || "") }, String(text), idx != null ? h("span", { class: "idx", text: idx }) : null, ptr ? h("span", { class: "ptr", text: ptr }) : null);

  /* ================= Bit manipulation ================= */
  L.viz.bits = (root) => {
    const a = h("input", { type: "number", min: 0, max: 255, value: 44 }), b = h("input", { type: "number", min: 0, max: 255, value: 29 });
    const op = select([["and", "a & b  (AND)"], ["or", "a | b  (OR)"], ["xor", "a ^ b  (XOR)"], ["not", "~a  (NOT, 8-bit)"], ["shl", "a << 1  (shift left)"], ["shr", "a >> 1  (shift right)"], ["low", "a & -a  (lowest set bit)"], ["clr", "a & (a - 1)  (clear lowest set bit)"]]);
    const stage = h("div", { class: "stage", style: { minHeight: "0" } }), note = h("div", { class: "caption" }), stage2 = h("div", { class: "stage", style: { minHeight: "0" } });
    root.append(h("div", { class: "controls" }, h("label", null, "a", a), h("label", null, "b", b), op), stage, note,
      h("h3", { text: "Count the set bits of a (Brian Kernighan's trick)" }), stage2);
    const val = (inp) => Math.max(0, Math.min(255, +inp.value || 0));
    const row = (label, n, on) => h("div", { class: "controls", style: { margin: "0 0 4px", flexWrap: "nowrap" } }, h("b", { class: "mono", style: { width: "120px", flex: "none" }, text: label }),
      h("div", { class: "cells sm", style: { padding: "0 0 24px", flexWrap: "nowrap" } }, (n & 255).toString(2).padStart(8, "0").split("").map((bit, i) => cell(bit, bit === "1" ? on : "", 7 - i))), h("span", { class: "mono", text: "= " + (n & 255) }));
    const player = Player(root, (f) => clear(stage2).append(row("n", f.n, "win"), f.m != null ? row("n − 1", f.m, "hl") : null, f.r != null ? row("n & (n − 1)", f.r, "found") : null));
    const OPS = {
      and: (x, y) => [x & y, "AND keeps a bit only where <b>both</b> inputs have 1. Use it to <b>mask</b> (test or keep selected bits): <code>x & 1</code> is 1 when x is odd."],
      or: (x, y) => [x | y, "OR sets a bit where <b>either</b> input has 1. Use it to <b>turn bits on</b>: <code>flags | (1 << k)</code>."],
      xor: (x, y) => [x ^ y, "XOR sets a bit where the inputs <b>differ</b>. <code>x ^ x = 0</code> and <code>x ^ 0 = x</code>, so XOR-ing a whole array cancels every pair and leaves the single number."],
      not: (x) => [~x & 255, "NOT flips every bit. In two's complement, <code>~x = −x − 1</code> (shown here limited to 8 bits)."],
      shl: (x) => [(x << 1) & 255, "Shifting left by 1 multiplies by 2 (the top bit falls off in 8 bits). <code>1 << k</code> is the number with only bit k set."],
      shr: (x) => [x >> 1, "Shifting right by 1 divides by 2, rounding down. <code>(x >> k) & 1</code> reads bit k."],
      low: (x) => [x & -x, "<code>x & −x</code> isolates the lowest set bit. Fenwick trees use this to jump between ranges."],
      clr: (x) => [x & (x - 1), "<code>x & (x − 1)</code> clears the lowest set bit. If the result is 0, x was a power of two."],
    };
    function draw() {
      const x = val(a), y = val(b), unary = !["and", "or", "xor"].includes(op.value), [r, text] = OPS[op.value](x, y);
      clear(stage).append(row("a", x, "win"), unary ? null : row("b", y, "win"), row("result", r, "found"));
      note.innerHTML = text;
      const F = [{ n: x, msg: `Start with n = ${x}. Each step removes exactly one 1-bit, so the loop runs once per set bit, not once per bit.` }];
      let n = x, count = 0;
      while (n) { const m = n - 1, r2 = n & m; count++; F.push({ n, m, r: r2, msg: `n − 1 flips the lowest 1 and the zeros below it. AND-ing clears that bit: ${n} & ${m} = <b>${r2}</b>. Count = <b>${count}</b>.` }); n = r2; }
      F.push({ n: 0, msg: `n is 0 → done. <b>${x}</b> has <b>${count}</b> set bit${count === 1 ? "" : "s"}, found in ${count} step${count === 1 ? "" : "s"}.` });
      player.load(F);
    }
    [a, b].forEach((el) => el.addEventListener("input", draw)); op.addEventListener("change", draw);
    draw();
  };

  /* ================= String matching: naive vs KMP ================= */
  L.viz.kmp = (root) => {
    const text = h("input", { type: "text", value: "ABABDABACDABABCABAB", style: { width: "240px" } }), pat = h("input", { type: "text", value: "ABABCABAB", style: { width: "140px" } });
    const algo = select([["kmp", "KMP"], ["naive", "Naive (brute force)"]]);
    const stage = h("div", { class: "stage", style: { minHeight: "0" } }), out = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, h("label", null, "text", text), h("label", null, "pattern", pat), algo, h("button", { class: "btn primary small", text: "Search", onclick: run })),
      h("div", { class: "viz-split" }, stage, out), legend([["var(--yellow)", "comparing"], ["var(--accent2)", "matched so far"], ["var(--bad)", "mismatch"], ["var(--good)", "full match"]]));
    algo.addEventListener("change", run);
    let T = "", Pt = "", lps = [];
    const player = Player(root, render, { speed: 3 });
    function run() {
      T = text.value.slice(0, 26); Pt = pat.value.slice(0, 12);
      if (!T || !Pt) return;
      const n = T.length, m = Pt.length, F = [], found = [];
      let cmp = 0;
      lps = new Array(m).fill(0);
      for (let i = 1, len = 0; i < m;) { if (Pt[i] === Pt[len]) lps[i++] = ++len; else if (len) len = lps[len - 1]; else lps[i++] = 0; }
      const push = (i, j, state, msg) => F.push({ i, j, state, cmp, found: found.slice(), msg });
      if (algo.value === "naive") {
        push(0, 0, "", "Naive search: try the pattern at every position of the text and restart from scratch after each mismatch.");
        for (let st = 0; st + m <= n && F.length < 400; st++) {
          let j = 0;
          while (j < m) { cmp++; if (T[st + j] !== Pt[j]) { push(st + j, j, "bad", `'${T[st + j]}' ≠ '${Pt[j]}' → slide the pattern right by one and re-compare from its first character.`); break; } push(st + j, j, "hl", `'${T[st + j]}' = '${Pt[j]}' ✓`); j++; }
          if (j === m) { found.push(st); push(st + m - 1, m - 1, "found", `🎯 Match at index <b>${st}</b>.`); }
        }
      } else {
        push(0, 0, "", `KMP first builds the <b>LPS table</b> for the pattern: lps[j] = length of the longest proper prefix of pattern[0..j] that is also its suffix → [${lps.join(", ")}].`);
        let i = 0, j = 0;
        while (i < n && F.length < 400) {
          cmp++;
          if (T[i] === Pt[j]) {
            push(i, j, "hl", `'${T[i]}' = '${Pt[j]}' ✓ advance both pointers.`); i++; j++;
            if (j === m) { found.push(i - m); push(i - 1, m - 1, "found", `🎯 Match at index <b>${i - m}</b>. Continue with j = lps[${m - 1}] = ${lps[m - 1]} to find overlapping matches.`); j = lps[m - 1]; }
          } else if (j > 0) { push(i, j, "bad", `'${T[i]}' ≠ '${Pt[j]}'. We already matched ${j} characters, and lps[${j - 1}] = ${lps[j - 1]} of them can be reused → j = ${lps[j - 1]}. <b>The text pointer never moves back.</b>`); j = lps[j - 1]; }
          else { push(i, j, "bad", `'${T[i]}' ≠ '${Pt[j]}' at the pattern's first character → move on in the text.`); i++; }
        }
      }
      push(-1, -1, "", `Done: ${found.length ? `found at index ${found.join(", ")}` : "no match"} using <b>${cmp}</b> character comparisons (text ${n}, pattern ${m}). ${algo.value === "kmp" ? "KMP never needs more than 2n." : "Worst case for naive is n·m; try text AAAAAAAAAAAAAAAAAB with pattern AAAAB."}`);
      player.load(F);
    }
    function render(f) {
      const shift = f.i < 0 ? 0 : f.i - f.j;
      const inMatch = (k) => f.found.some((st) => k >= st && k < st + Pt.length);
      clear(stage).append(
        h("div", { class: "cells sm", style: { padding: "26px 0 26px", flexWrap: "nowrap" } }, T.split("").map((c, k) => cell(c, k === f.i ? (f.state === "found" ? "found" : f.state) : inMatch(k) ? "found" : f.i >= 0 && k >= shift && k < f.i ? "win" : "", k, k === f.i ? "↓i" : ""))),
        h("div", { class: "cells sm", style: { padding: "4px 0 26px", flexWrap: "nowrap", marginLeft: shift * 40 + "px", transition: "margin .25s" } }, Pt.split("").map((c, k) => cell(c, f.i < 0 ? "" : k === f.j ? f.state : k < f.j ? "win" : "", k, k === f.j ? "↑j" : ""))));
      clear(out).append(h("h4", { text: algo.value === "kmp" ? "KMP" : "Naive" }), kv([["comparisons", f.cmp], ["matches found", f.found.length], ["text index i", f.i < 0 ? "–" : f.i], ["pattern index j", f.j < 0 ? "–" : f.j]]),
        algo.value === "kmp" ? h("p", { class: "mono", style: { margin: "10px 0 0", fontSize: "12px" }, text: "lps = [" + lps.join(", ") + "]" }) : null);
    }
    run();
  };

  /* ================= Union-Find ================= */
  L.viz.unionFind = (root) => {
    const N = 10;
    let parent, rank, hot = [], sets;
    const a = h("input", { type: "number", min: 0, max: N - 1, value: 0 }), b = h("input", { type: "number", min: 0, max: N - 1, value: 1 });
    const stage = h("div", { class: "stage", style: { minHeight: "0" } }), cap = h("div", { class: "caption" }), arr = h("div");
    root.append(h("div", { class: "controls" }, h("label", null, "a", a), h("label", null, "b", b),
      h("button", { class: "btn primary small", text: "Union(a, b)", onclick: () => union(val(a), val(b)) }),
      h("button", { class: "btn small", text: "Find(a)", onclick: () => { const x = val(a), r = find(x); say(`find(${x}) = <b>${r}</b>. ${hot.length > 2 ? `Path compression: every node on the way (${hot.slice(0, -1).join(", ")}) now points straight at the root, so the next find is O(1).` : "Already at (or directly under) the root."}`); draw(); } }),
      h("button", { class: "btn small", text: "🎲 Random union", onclick: () => { let x = rand(0, N - 1), y = rand(0, N - 1); a.value = x; b.value = y; union(x, y); } }),
      h("button", { class: "btn small", text: "♻ Reset", onclick: reset })), stage, cap, arr,
      legend([["var(--pink)", "root (the set's representative)"], ["var(--yellow)", "nodes visited by the last find"]]));
    const val = (inp) => Math.max(0, Math.min(N - 1, +inp.value || 0));
    const say = (t) => (cap.innerHTML = t);
    function reset() { parent = Array.from({ length: N }, (_, i) => i); rank = new Array(N).fill(0); hot = []; sets = N; say(`${N} elements, each in its own set (every node is its own root).`); draw(); }
    function find(x) { hot = [x]; let r = x; while (parent[r] !== r) { r = parent[r]; hot.push(r); } while (parent[x] !== r) { const nx = parent[x]; parent[x] = r; x = nx; } return r; }
    function union(x, y) {
      const rx = find(x), hx = hot, ry = find(y); hot = [...hx, ...hot];
      if (rx === ry) { say(`${x} and ${y} already share the root <b>${rx}</b> → same set, nothing to do. (In Kruskal's algorithm this means the edge would create a <b>cycle</b>, so it is skipped.)`); return draw(); }
      let [big, small] = rank[rx] >= rank[ry] ? [rx, ry] : [ry, rx];
      parent[small] = big; if (rank[big] === rank[small]) rank[big]++;
      sets--;
      say(`union(${x}, ${y}): roots are ${rx} and ${ry}. <b>Union by rank</b>: hang the shallower tree (root ${small}) under the deeper one (root ${big}) to keep trees flat. ${sets} set${sets === 1 ? "" : "s"} left.`);
      draw();
    }
    function draw() {
      const kids = Array.from({ length: N }, () => []), pos = {};
      parent.forEach((p, i) => { if (p !== i) kids[p].push(i); });
      let leaf = 0, maxD = 0;
      const place = (n, d) => { maxD = Math.max(maxD, d); const xs = kids[n].map((k) => place(k, d + 1)); const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : leaf++; pos[n] = [40 + x * 64, 34 + d * 68]; return x; };
      parent.forEach((p, i) => { if (p === i) place(i, 0); });
      const svg = s("svg", { class: "viz", viewBox: `0 0 ${Math.max(660, 80 + (leaf - 1) * 64)} ${68 + maxD * 68}`, style: `max-height:${(68 + maxD * 68) * 1.4}px` });
      parent.forEach((p, i) => { if (p !== i) svg.appendChild(s("line", { class: "edge" + (hot.includes(i) && hot.includes(p) ? " hl" : ""), x1: pos[i][0], y1: pos[i][1], x2: pos[p][0], y2: pos[p][1] })); });
      parent.forEach((p, i) => svg.appendChild(s("g", { class: "node" + (p === i ? " path" : hot.includes(i) ? " cur" : ""), transform: `translate(${pos[i][0]},${pos[i][1]})` }, s("circle", { r: 19 }), s("text", { "text-anchor": "middle", dy: 5, text: i }))));
      clear(stage).append(svg);
      clear(arr).append(h("table", { class: "dp", style: { marginTop: "12px" } },
        h("tr", null, h("th", { text: "i", style: { width: "70px" } }), parent.map((_, i) => h("th", { text: i }))),
        h("tr", null, h("th", { text: "parent", style: { width: "70px" } }), parent.map((p, i) => h("td", { text: p, class: p === i ? "path" : hot.includes(i) ? "cur" : "" }))),
        h("tr", null, h("th", { text: "rank", style: { width: "70px" } }), rank.map((r, i) => h("td", { text: parent[i] === i ? r : "" })))));
    }
    reset();
  };

  /* ================= Topological sort (Kahn) ================= */
  L.viz.topoSort = (root) => {
    const names = "ABCDEFGH".split(""), N = names.length;
    let edges = [];
    const stage = h("div", { class: "stage", style: { minHeight: "0" } }), out = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" },
      h("button", { class: "btn small", text: "🎲 New DAG", onclick: gen }),
      h("button", { class: "btn small", text: "🔁 Add a back edge (creates a cycle)", onclick: () => { const cand = edges.filter(([u, v]) => !edges.some(([x, y]) => x === v && y === u)); if (cand.length) { const [u, v] = cand[rand(0, cand.length - 1)]; edges.push([v, u]); run(); } } })),
      h("div", { class: "viz-split" }, stage, out),
      legend([["var(--warn)", "in the queue (in-degree 0)"], ["var(--yellow)", "being removed"], ["var(--good)", "placed in the order"]]));
    const P = (i) => [70 + (i >> 1) * 170 + (i % 2 ? 60 : 0), i % 2 ? 190 : 60];
    const player = Player(root, render, { speed: 2 });
    function gen() { edges = []; for (let u = 0; u < N; u++) for (let v = u + 1; v < N; v++) if (Math.random() < (v - u <= 2 ? 0.5 : 0.14)) edges.push([u, v]); run(); }
    function run() {
      const indeg = new Array(N).fill(0), F = [], order = [];
      edges.forEach(([, v]) => indeg[v]++);
      let queue = indeg.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0);
      const snap = (cur, msg) => F.push({ indeg: indeg.slice(), queue: queue.slice(), order: order.slice(), cur, msg });
      snap(-1, `Count each node's <b>in-degree</b> (number of prerequisites). Nodes with in-degree 0 have nothing blocking them → start the queue with [${queue.map((i) => names[i]).join(", ") || "nothing"}].`);
      while (queue.length) {
        const u = queue.shift();
        snap(u, `Take <b>${names[u]}</b> from the queue and append it to the order.`);
        order.push(u);
        const freed = [];
        edges.forEach(([x, v]) => { if (x === u && --indeg[v] === 0) { queue.push(v); freed.push(names[v]); } });
        snap(u, `Remove ${names[u]}'s outgoing edges: each neighbour loses one prerequisite. ${freed.length ? `<b>${freed.join(", ")}</b> dropped to in-degree 0 → enqueue.` : "No neighbour is free yet."}`);
      }
      snap(-1, order.length === N ? `✅ Topological order: <b>${order.map((i) => names[i]).join(" → ")}</b>. Every edge points forward in this order.` : `⚠️ The queue is empty but only ${order.length} of ${N} nodes were placed. The rest all wait on each other → the graph has a <b>cycle</b>, so no valid order exists.`);
      player.load(F);
    }
    function render(f) {
      const svg = s("svg", { class: "viz", viewBox: "0 0 720 250" },
        s("defs", null, s("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, s("path", { d: "M0,0L10,5L0,10z", fill: "context-stroke" }))));
      edges.forEach(([u, v]) => {
        const [x1, y1] = P(u), [x2, y2] = P(v), d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d, back = u > v, gone = f.order.includes(u);
        svg.appendChild(s("path", { class: "edge" + (u === f.cur ? " hl" : ""), fill: "none", "marker-end": "url(#arrow)", style: gone ? "opacity:.2" : back ? "stroke:var(--bad)" : "",
          d: `M${x1 + ux * 22},${y1 + uy * 22} Q${(x1 + x2) / 2 + (back ? -uy * 40 : 0)},${(y1 + y2) / 2 + (back ? ux * 40 : 0)} ${x2 - ux * 24},${y2 - uy * 24}` }));
      });
      names.forEach((nm, i) => { const [x, y] = P(i); svg.appendChild(s("g", { class: "node" + (i === f.cur ? " cur" : f.order.includes(i) ? " visited" : f.queue.includes(i) ? " frontier" : ""), transform: `translate(${x},${y})` }, s("circle", { r: 20 }), s("text", { "text-anchor": "middle", dy: 5, text: nm }), s("text", { class: "w", "text-anchor": "middle", dy: 38, text: "in " + f.indeg[i] }))); });
      clear(stage).append(svg);
      clear(out).append(h("h4", { text: "Kahn's algorithm" }), kv([["queue", f.queue.map((i) => names[i]).join(" ") || "empty"], ["order so far", f.order.map((i) => names[i]).join(" ") || "–"], ["edges", edges.length]]));
    }
    gen();
  };

  /* ================= Fenwick tree (binary indexed tree) ================= */
  L.viz.fenwick = (root) => {
    const N = 12;
    let arr, tree;
    const qi = h("input", { type: "number", min: 1, max: N, value: 11 }), ui = h("input", { type: "number", min: 1, max: N, value: 5 }), ud = h("input", { type: "number", value: 3 });
    const stage = h("div", { class: "stage", style: { minHeight: "0" } });
    root.append(h("div", { class: "controls" }, h("label", null, "i", qi), h("button", { class: "btn primary small", text: "Prefix sum(1..i)", onclick: query }),
      h("span", { class: "spacer" }), h("label", null, "index", ui), h("label", null, "add", ud), h("button", { class: "btn small", text: "Update", onclick: update }),
      h("button", { class: "btn small", text: "🎲 New array", onclick: gen })), stage,
      legend([["var(--yellow)", "tree node touched in this step"], ["var(--accent2)", "nodes already used"], ["var(--good)", "array cells covered so far"]]));
    const low = (i) => i & -i, bin = (i) => i.toString(2).padStart(4, "0");
    const clampI = (inp) => Math.max(1, Math.min(N, +inp.value || 1));
    const player = Player(root, render, { speed: 2 });
    function gen() { arr = [0, ...Array.from({ length: N }, () => rand(1, 9))]; tree = new Array(N + 1).fill(0); for (let i = 1; i <= N; i++) for (let j = i; j <= N; j += low(j)) tree[j] += arr[i]; query(); }
    function query() {
      const n = clampI(qi), F = [], used = [];
      let sum = 0;
      F.push({ arr: arr.slice(), tree: tree.slice(), used: [], cover: 0, msg: `Each tree[i] stores the sum of the <b>last lowbit(i)</b> array cells ending at i (shown above each cell). Query prefix sum(1..${n}).` });
      for (let i = n; i > 0; i -= low(i)) { sum += tree[i]; F.push({ arr: arr.slice(), tree: tree.slice(), cur: i, used: used.slice(), cover: [i - low(i) + 1, n], msg: `i = ${i} (${bin(i)}): add tree[${i}] = ${tree[i]}, which covers a[${i - low(i) + 1}..${i}]. Sum = <b>${sum}</b>. Drop the lowest set bit → i = ${i - low(i)}.` }); used.push(i); }
      F.push({ arr: arr.slice(), tree: tree.slice(), used, cover: [1, n], msg: `✅ sum(1..${n}) = <b>${sum}</b> by adding only ${used.length} tree node${used.length === 1 ? "" : "s"} (one per 1-bit of ${n} = ${bin(n)}) instead of ${n} array cells.` });
      player.load(F);
    }
    function update() {
      const n = clampI(ui), d = +ud.value || 0, F = [], used = [];
      F.push({ arr: arr.slice(), tree: tree.slice(), used: [], cover: [n, n], msg: `Add ${d} to a[${n}]. Every tree node whose range contains index ${n} must change.` });
      arr[n] += d;
      for (let i = n; i <= N; i += low(i)) { tree[i] += d; F.push({ arr: arr.slice(), tree: tree.slice(), cur: i, used: used.slice(), cover: [n, n], msg: `i = ${i} (${bin(i)}): tree[${i}] covers a[${i - low(i) + 1}..${i}] → add ${d}. Add the lowest set bit → i = ${i + low(i)}${i + low(i) > N ? " (past the end, stop)" : ""}.` }); used.push(i); }
      F.push({ arr: arr.slice(), tree: tree.slice(), used, cover: [n, n], msg: `✅ Updated ${used.length} tree node${used.length === 1 ? "" : "s"}: O(log n). A plain prefix-sum array would have needed to rewrite ${N - n + 1} cells.` });
      player.load(F);
    }
    function render(f) {
      const idx = Array.from({ length: N }, (_, k) => k + 1);
      clear(stage).append(h("b", { text: "array a" }), h("div", { class: "cells sm", style: { padding: "8px 0 30px" } }, idx.map((i) => cell(f.arr[i], f.cover && i >= f.cover[0] && i <= f.cover[1] ? "found" : "", i))),
        h("b", { text: "Fenwick tree" }), h("div", { class: "cells sm", style: { padding: "30px 0 26px" } }, idx.map((i) => cell(f.tree[i], i === f.cur ? "hl" : f.used.includes(i) ? "win" : "", i, low(i) === 1 ? `[${i}]` : `[${i - low(i) + 1}..${i}]`))));
    }
    gen();
  };

  /* ================= Bloom filter ================= */
  L.viz.bloom = (root) => {
    const M = 40, K = 3;
    let bits, items, probe = null;
    const inp = h("input", { type: "text", value: "apple", style: { width: "160px" } });
    const stage = h("div", { class: "stage", style: { minHeight: "0" } }), cap = h("div", { class: "caption" }), out = h("div", { class: "side-panel" });
    const pool = ["apple", "banana", "cherry", "grape", "kiwi", "lemon", "mango", "melon", "olive", "peach", "pear", "plum", "fig", "lime", "date", "guava", "papaya", "berry"];
    root.append(h("div", { class: "controls" }, inp,
      h("button", { class: "btn primary small", text: "➕ Add", onclick: () => add(inp.value.trim()) }),
      h("button", { class: "btn small", text: "🔍 Might contain?", onclick: () => check(inp.value.trim()) }),
      h("button", { class: "btn small", text: "🎲 Add 4 random words", onclick: () => { for (let i = 0; i < 4; i++) add(pool[rand(0, pool.length - 1)], true); draw(); } }),
      h("button", { class: "btn small", text: "🎯 Hunt for a false positive", onclick: hunt }),
      h("button", { class: "btn small", text: "♻ Reset", onclick: reset })),
      h("div", { class: "viz-split" }, stage, out), cap,
      legend([["var(--accent2)", "bit set to 1"], ["var(--good)", "probed and set"], ["var(--bad)", "probed and 0 → definitely absent"]]));
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") check(inp.value.trim()); });
    const hashes = (w) => Array.from({ length: K }, (_, seed) => { let x = 2166136261 ^ (seed * 0x9e3779b1); for (const ch of w) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; return (x >>> 0) % M; });
    function reset() { bits = new Array(M).fill(0); items = new Set(); probe = null; cap.innerHTML = `An array of ${M} bits and ${K} hash functions. No words are stored, only bits.`; draw(); }
    function add(w, quiet) { if (!w) return; const hs = hashes(w); hs.forEach((i) => (bits[i] = 1)); items.add(w); probe = { hs, w }; if (!quiet) { cap.innerHTML = `add("${w}"): hash it ${K} ways → positions <b>${hs.join(", ")}</b> → set those bits to 1.`; draw(); } }
    function check(w) {
      if (!w) return;
      const hs = hashes(w), miss = hs.filter((i) => !bits[i]);
      probe = { hs, w };
      cap.innerHTML = miss.length ? `contains("${w}"): position${miss.length > 1 ? "s" : ""} ${miss.join(", ")} ${miss.length > 1 ? "are" : "is"} 0 → <b style="color:var(--good)">definitely not in the set</b>. A Bloom filter never gives a false negative.`
        : items.has(w) ? `contains("${w}"): bits ${hs.join(", ")} are all 1 → <b>probably in the set</b> (and it really is).`
          : `contains("${w}"): bits ${hs.join(", ")} are all 1 → the filter says "probably present", but <b style="color:var(--bad)">"${w}" was never added: a false positive</b>. Other words happened to set those bits.`;
      draw();
    }
    function hunt() { for (let t = 0; t < 4000; t++) { const w = "w" + rand(100, 99999); if (!items.has(w) && hashes(w).every((i) => bits[i])) { inp.value = w; return check(w); } } cap.innerHTML = "No false positive found in 4,000 random words: the filter is still nearly empty. Add more words and try again."; }
    function draw() {
      clear(stage).append(h("div", { class: "cells sm", style: { padding: "26px 0 26px" } }, bits.map((bit, i) => cell(bit, probe && probe.hs.includes(i) ? (bit ? "found" : "bad") : bit ? "win" : "", i, probe && probe.hs.includes(i) ? "h" + (probe.hs.indexOf(i) + 1) : ""))));
      const n = items.size, set = bits.filter(Boolean).length;
      clear(out).append(h("h4", { text: "Filter" }), kv([["bits (m)", M], ["hash functions (k)", K], ["items added (n)", n], ["bits set", `${set} / ${M}`], ["false-positive rate", (Math.pow(set / M, K) * 100).toFixed(1) + "%"], ["formula (1 − e^(−kn/m))^k", (Math.pow(1 - Math.exp((-K * n) / M), K) * 100).toFixed(1) + "%"]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, text: "The more words you add, the fuller the array and the more false positives. Size m for the item count you expect." }));
    }
    reset(); add("apple", true); add("mango", true); probe = null; draw();
  };
})();
