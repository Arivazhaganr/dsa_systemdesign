/* Machine learning visualizers. Each L.viz.<name>(root) builds its UI into root. */
(function () {
  const { h, clear, rand, shuffle, Player, Timers } = L;
  const C = ["#7c8cff", "#f6ad55", "#4fd1c5", "#f687b3", "#48bb78"];
  const RGB = [[124, 140, 255], [246, 173, 85]];
  const W = 540, H = 360;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += Math.random(); return (u - 3) / Math.SQRT1_2; };
  const clamp = (v, a = 0.02, b = 0.98) => Math.max(a, Math.min(b, v));
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const pct = (v) => (v * 100).toFixed(0) + "%";
  const range = (label, min, max, val, step = 1) => { const inp = h("input", { type: "range", min, max, step, value: val }); /* step must be set before value, or fractional values get rounded */ const out = h("b", { text: val }); inp.addEventListener("input", () => (out.textContent = inp.value)); return { el: h("label", null, label, inp, out), inp }; };
  const select = (opts) => h("select", null, opts.map(([v, t]) => h("option", { value: v, text: t })));
  const canvas = (w = W, ht = H) => { const c = h("canvas", { width: w, height: ht, style: { width: "100%", maxWidth: w + "px", display: "block", borderRadius: "10px" } }); return [c, c.getContext("2d")]; };
  const kv = (pairs) => h("div", { class: "kv" }, pairs.flatMap(([a, b, col]) => [h("span", { text: a }), h("b", { text: b, style: col ? { color: col } : null })]));
  const legend = (items) => h("div", { class: "legend" }, items.map(([c, t]) => h("span", null, h("i", { style: { background: c } }), t)));
  const classLegend = () => legend([[C[0], "class A"], [C[1], "class B"], ["transparent", "● filled = training point · ○ hollow = held-out test point"]]);

  /* 2-D toy datasets in the unit square: [{x, y, c}] */
  function dataset(kind, n = 80) {
    const pts = [];
    while (pts.length < n) {
      let x, y, c;
      if (kind === "xor" || kind === "circle") {
        x = Math.random(); y = Math.random();
        if (kind === "xor") { if (Math.abs(x - 0.5) < 0.04 || Math.abs(y - 0.5) < 0.04) continue; c = (x > 0.5) !== (y > 0.5) ? 1 : 0; }
        else { const d = Math.hypot(x - 0.5, y - 0.5); if (d > 0.25 && d < 0.31) continue; c = d < 0.28 ? 1 : 0; }
      } else {
        c = pts.length % 2;
        const sd = kind === "separable" ? 0.07 : 0.14;
        x = (c ? 0.67 : 0.33) + gauss() * sd; y = (c ? 0.62 : 0.38) + gauss() * sd;
      }
      pts.push({ x: clamp(x), y: clamp(y), c });
    }
    return pts;
  }
  const holdOut = (pts, frac = 0.3) => { pts.forEach((p) => (p.test = Math.random() < frac)); return pts; };
  const accuracy = (pts, pred) => (pts.length ? pts.filter((p) => pred(p.x, p.y) === p.c).length / pts.length : 0);
  /* Paint a probability field: fn(x, y) → P(class B) */
  function paint(g, fn, cell = 10) {
    g.clearRect(0, 0, W, H);
    for (let py = 0; py < H; py += cell) for (let px = 0; px < W; px += cell) {
      const p = fn((px + cell / 2) / W, 1 - (py + cell / 2) / H);
      const [r, gg, b] = RGB[p > 0.5 ? 1 : 0];
      g.fillStyle = `rgba(${r},${gg},${b},${0.08 + 0.42 * Math.abs(2 * p - 1)})`;
      g.fillRect(px, py, cell, cell);
    }
  }
  function dots(g, pts, color) {
    pts.forEach((p, i) => {
      g.beginPath(); g.arc(p.x * W, (1 - p.y) * H, 5, 0, 7);
      const col = color ? color(p, i) : C[p.c];
      if (p.test) { g.lineWidth = 2; g.strokeStyle = col; g.stroke(); }
      else { g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = "rgba(0,0,0,.45)"; g.stroke(); }
    });
  }
  function lineChart(g, w, ht, series, { mark, cap = Infinity, label = "" } = {}) {
    g.clearRect(0, 0, w, ht);
    const all = series.flatMap((s) => s.vals).filter(isFinite);
    const max = Math.min(cap, Math.max(...all, 1e-9)), n = Math.max(...series.map((s) => s.vals.length));
    const X = (i) => 34 + (i / Math.max(1, n - 1)) * (w - 46), Y = (v) => ht - 20 - (Math.min(isFinite(v) ? v : max, max) / max) * (ht - 34);
    g.strokeStyle = css("--line"); g.lineWidth = 1; g.beginPath(); g.moveTo(34, 8); g.lineTo(34, ht - 20); g.lineTo(w - 8, ht - 20); g.stroke();
    g.fillStyle = css("--muted"); g.font = "11px sans-serif"; g.fillText(max.toPrecision(2), 2, 14); g.fillText("0", 22, ht - 18); g.fillText(label, 40, ht - 5);
    series.forEach((s) => {
      g.strokeStyle = s.color; g.lineWidth = 2; g.beginPath();
      s.vals.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
      if (mark != null && s.vals[mark] != null) { g.fillStyle = s.color; g.beginPath(); g.arc(X(mark), Y(s.vals[mark]), 4.5, 0, 7); g.fill(); }
    });
  }

  /* ================= k-nearest neighbours (ML foundations) ================= */
  L.viz.knn = (root) => {
    let pts = [], cls = 0;
    const k = range("k (neighbours that vote)", 1, 15, 3, 2);
    const [cv, g] = canvas();
    const out = h("div", { class: "side-panel" });
    const clsBtn = h("button", { class: "btn small", onclick: () => { cls = 1 - cls; draw(); } });
    root.append(h("div", { class: "controls" }, k.el, clsBtn,
      h("button", { class: "btn small", text: "🎲 New data", onclick: gen }),
      h("button", { class: "btn small", text: "🔀 New train/test split", onclick: () => { holdOut(pts); draw(); } })),
      h("div", { class: "viz-split" }, h("div", { class: "stage" }, cv), out), classLegend());
    k.inp.addEventListener("input", draw);
    cv.addEventListener("click", (e) => { const r = cv.getBoundingClientRect(); pts.push({ x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height, c: cls }); draw(); });
    function gen() { pts = holdOut(dataset("blobs", 90)); draw(); }
    function draw() {
      const K = +k.inp.value, train = pts.filter((p) => !p.test), test = pts.filter((p) => p.test);
      const predict = (x, y) => { const near = train.map((p) => [(p.x - x) ** 2 + (p.y - y) ** 2, p.c]).sort((a, b) => a[0] - b[0]).slice(0, K); return near.reduce((a, n) => a + n[1], 0) * 2 > near.length ? 1 : 0; };
      paint(g, predict, 9); dots(g, pts);
      clsBtn.textContent = `Click canvas to add: class ${"AB"[cls]}`; clsBtn.style.borderColor = C[cls];
      const tr = accuracy(train, predict), te = accuracy(test, predict);
      clear(out).append(h("h4", { text: "Model: k-NN" }), kv([["k", K], ["training points", train.length], ["test points", test.length], ["train accuracy", pct(tr)], ["test accuracy", pct(te), te < tr - 0.08 ? "var(--warn)" : "var(--good)"]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, html: K === 1 ? "<b>k = 1</b> memorizes: every training point is its own nearest neighbour, so train accuracy is 100%, but the jagged boundary follows noise. That's <b>overfitting</b>." : K >= 11 ? "<b>Large k</b> averages over many neighbours: a smooth boundary that may miss real structure (<b>underfitting</b>)." : "A moderate k smooths out noise while still following the data. Compare train vs test accuracy as you slide k." }));
    }
    gen();
  };

  /* ================= Linear regression by gradient descent ================= */
  L.viz.gradientDescent = (root) => {
    let data = [], losses = [];
    const lr = select([["0.02", "α = 0.02 (too small)"], ["0.1", "α = 0.1 (slow)"], ["0.5", "α = 0.5 (good)"], ["0.9", "α = 0.9 (too large → diverges)"]]);
    lr.value = "0.5";
    const [cv, g] = canvas(), [lc, lg] = canvas(260, 190);
    const out = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, h("label", null, "learning rate", lr),
      h("button", { class: "btn small", text: "🎲 New data", onclick: gen })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 290px" } }, h("div", { class: "stage" }, cv), h("div", null, out, h("div", { style: { height: "10px" } }), h("div", { class: "side-panel" }, h("h4", { text: "Loss per step" }), lc))),
      legend([[C[0], "data point"], [C[2], "model: ŷ = w·x + b"], [C[3], "residual (error)"]]));
    lr.addEventListener("change", run);
    const X = (x) => 30 + x * (W - 50), Y = (y) => H - 25 - (y / 4.6) * (H - 45);
    const player = Player(root, render, { speed: 4 });
    function gen() { const w = 1.5 + Math.random() * 1.5, b = 0.3 + Math.random() * 0.8; data = Array.from({ length: 30 }, () => { const x = Math.random(); return [x, w * x + b + gauss() * 0.25]; }); run(); }
    function run() {
      const a = +lr.value, F = [], n = data.length;
      let w = 0, b = 0;
      for (let t = 0; t <= 60; t++) {
        let dw = 0, db = 0, loss = 0;
        data.forEach(([x, y]) => { const e = w * x + b - y; loss += e * e; dw += 2 * e * x; db += 2 * e; });
        loss /= n; dw /= n; db /= n;
        F.push({ w, b, loss, t, msg: t === 0 ? `Start with w = 0, b = 0: a flat line. Loss (mean squared error) = <b>${loss.toFixed(3)}</b>.` : `Gradient: ∂L/∂w = ${dw.toFixed(3)}, ∂L/∂b = ${db.toFixed(3)}. Step downhill: w ← w − α·∂L/∂w, b ← b − α·∂L/∂b. Loss = <b>${loss.toPrecision(4)}</b>` });
        w -= a * dw; b -= a * db;
      }
      const last = F[F.length - 1];
      last.msg = last.loss > F[0].loss ? `💥 Loss exploded to ${last.loss.toPrecision(3)}: each step overshoots the minimum by more than the last. Lower the learning rate.` : last.loss > F[55].loss * 0.999 && last.loss < 0.12 ? `✅ Converged: ŷ = ${last.w.toFixed(2)}·x + ${last.b.toFixed(2)}, loss ${last.loss.toFixed(4)} (what's left is noise).` : `Still descending after 60 steps (loss ${last.loss.toFixed(4)}). A larger learning rate would get there faster.`;
      losses = F.map((f) => f.loss);
      player.load(F);
    }
    function render(f) {
      g.clearRect(0, 0, W, H);
      g.strokeStyle = css("--line"); g.lineWidth = 1; g.beginPath(); g.moveTo(X(0), Y(4.6)); g.lineTo(X(0), Y(0)); g.lineTo(X(1), Y(0)); g.stroke();
      g.fillStyle = css("--muted"); g.font = "11px sans-serif"; g.fillText("x", X(1) - 4, Y(0) + 14); g.fillText("y", X(0) - 14, Y(4.4));
      data.forEach(([x, y]) => {
        g.strokeStyle = "rgba(246,135,179,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(X(x), Y(y)); g.lineTo(X(x), Y(f.w * x + f.b)); g.stroke();
        g.fillStyle = C[0]; g.beginPath(); g.arc(X(x), Y(y), 4.5, 0, 7); g.fill();
      });
      g.strokeStyle = C[2]; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0), Y(f.b)); g.lineTo(X(1), Y(f.w + f.b)); g.stroke();
      lineChart(lg, 260, 190, [{ vals: losses, color: C[3] }], { mark: f.t, cap: losses[0] * 1.5, label: "step →" });
      clear(out).append(h("h4", { text: "Parameters" }), kv([["step", f.t], ["w (slope)", f.w.toFixed(3)], ["b (intercept)", f.b.toFixed(3)], ["loss (MSE)", f.loss.toPrecision(4)]]));
    }
    gen();
  };

  /* ================= Logistic regression ================= */
  L.viz.logistic = (root) => {
    let pts = [];
    const kind = select([["separable", "Linearly separable"], ["blobs", "Overlapping classes"], ["circle", "Circle (not linearly separable)"]]);
    const [cv, g] = canvas();
    const out = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, h("label", null, "data", kind), h("button", { class: "btn small", text: "🎲 New data", onclick: gen })),
      h("div", { class: "viz-split" }, h("div", { class: "stage" }, cv), out), legend([[C[0], "class A (y = 0)"], [C[1], "class B (y = 1)"], [css("--text"), "decision boundary: p = 0.5"]]));
    kind.addEventListener("change", gen);
    const player = Player(root, render, { speed: 4 });
    function gen() { pts = dataset(kind.value, 80); run(); }
    function run() {
      const F = [], n = pts.length;
      let w1 = 0, w2 = 0, b = 0;
      for (let t = 0; t <= 40; t++) {
        let g1 = 0, g2 = 0, gb = 0, loss = 0, ok = 0;
        pts.forEach((p) => { const x1 = p.x * 2 - 1, x2 = p.y * 2 - 1, pr = sig(w1 * x1 + w2 * x2 + b); loss -= p.c ? Math.log(pr + 1e-9) : Math.log(1 - pr + 1e-9); if ((pr > 0.5 ? 1 : 0) === p.c) ok++; g1 += (pr - p.c) * x1; g2 += (pr - p.c) * x2; gb += pr - p.c; });
        F.push({ w1, w2, b, loss: loss / n, acc: ok / n, t, msg: t === 0 ? "All weights are 0, so every point gets p = σ(0) = 0.5. Log-loss = ln 2 ≈ <b>0.693</b>, the 'knows nothing' baseline." : `Epoch ${t}: nudge each weight against its gradient, mean of (p − y)·x. Log-loss <b>${(loss / n).toFixed(3)}</b>, accuracy ${pct(ok / n)}.` });
        w1 -= (3 * g1) / n; w2 -= (3 * g2) / n; b -= (3 * gb) / n;
      }
      const last = F[F.length - 1];
      if (last.acc < 0.8) last.msg += " ⚠️ A single straight line can't separate this data. You need non-linear features (x², y²) or a neural network.";
      player.load(F);
    }
    function render(f) {
      paint(g, (x, y) => sig(f.w1 * (x * 2 - 1) + f.w2 * (y * 2 - 1) + f.b));
      if (Math.abs(f.w1) + Math.abs(f.w2) > 1e-6) {   // boundary: w1·x1 + w2·x2 + b = 0
        g.strokeStyle = css("--text"); g.lineWidth = 2; g.beginPath();
        const P = (x1, x2) => [((x1 + 1) / 2) * W, (1 - (x2 + 1) / 2) * H];
        if (Math.abs(f.w2) > Math.abs(f.w1)) { g.moveTo(...P(-1, (f.w1 - f.b) / f.w2)); g.lineTo(...P(1, (-f.w1 - f.b) / f.w2)); }
        else { g.moveTo(...P((f.w2 - f.b) / f.w1, -1)); g.lineTo(...P((-f.w2 - f.b) / f.w1, 1)); }
        g.stroke();
      }
      dots(g, pts);
      clear(out).append(h("h4", { text: "p = σ(w₁x₁ + w₂x₂ + b)" }), kv([["epoch", f.t], ["w₁", f.w1.toFixed(2)], ["w₂", f.w2.toFixed(2)], ["b", f.b.toFixed(2)], ["log-loss", f.loss.toFixed(3)], ["accuracy", pct(f.acc)]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, text: "Colour intensity = confidence. Near the boundary the model says ~50/50." }));
    }
    gen();
  };

  /* ================= Overfitting: polynomial degree vs error ================= */
  L.viz.polyfit = (root) => {
    let train = [], test = [];
    const deg = range("polynomial degree", 1, 9, 3);
    const lam = select([["0", "no regularization"], ["0.001", "ridge λ = 0.001"], ["0.05", "ridge λ = 0.05"], ["1", "ridge λ = 1 (strong)"]]);
    const [cv, g] = canvas(), [ec, eg] = canvas(260, 190);
    const out = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, deg.el, lam, h("button", { class: "btn small", text: "🎲 New data", onclick: gen })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 290px" } }, h("div", { class: "stage" }, cv), h("div", null, out, h("div", { style: { height: "10px" } }), h("div", { class: "side-panel" }, h("h4", { text: "Error vs degree" }), ec, legend([[C[0], "train"], [C[1], "test"]])))),
      legend([[C[0], "● training points (12)"], [C[1], "○ test points (unseen)"], [css("--muted"), "true function sin(2πx)"], [C[2], "fitted polynomial"]]));
    deg.inp.addEventListener("input", draw); lam.addEventListener("change", draw);
    const f0 = (x) => Math.sin(2 * Math.PI * x);
    const sample = (x) => [x, f0(x) + gauss() * 0.25];
    function gen() { train = Array.from({ length: 12 }, (_, i) => sample((i + 0.1 + Math.random() * 0.8) / 12)); test = Array.from({ length: 40 }, () => sample(Math.random())); draw(); }
    function fit(d, l) {   // ridge least squares: solve (AᵀA + λI) w = Aᵀy by Gaussian elimination
      const m = d + 1, A = Array.from({ length: m }, () => new Array(m + 1).fill(0));
      train.forEach(([x, y]) => { const u = 2 * x - 1, pw = Array.from({ length: m }, (_, i) => u ** i); for (let i = 0; i < m; i++) { for (let j = 0; j < m; j++) A[i][j] += pw[i] * pw[j]; A[i][m] += pw[i] * y; } });
      for (let i = 1; i < m; i++) A[i][i] += l;
      for (let c = 0; c < m; c++) {
        let p = c;
        for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        [A[c], A[p]] = [A[p], A[c]];
        const d0 = A[c][c] || 1e-12;
        for (let r = 0; r < m; r++) if (r !== c) { const k = A[r][c] / d0; for (let j = c; j <= m; j++) A[r][j] -= k * A[c][j]; }
      }
      return A.map((row, i) => row[m] / (row[i] || 1e-12));
    }
    const evalP = (w, x) => { const u = 2 * x - 1; return w.reduce((a, c, i) => a + c * u ** i, 0); };
    const mse = (w, d) => d.reduce((a, [x, y]) => a + (evalP(w, x) - y) ** 2, 0) / d.length;
    const X = (x) => 20 + x * (W - 40), Y = (y) => H / 2 - (y / 1.9) * (H / 2 - 12);
    function draw() {
      const d = +deg.inp.value, l = +lam.value, w = fit(d, l);
      g.clearRect(0, 0, W, H);
      const curve = (fn, color, width, dash) => { g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash || []); g.beginPath(); for (let i = 0; i <= 200; i++) { const x = i / 200, y = Math.max(-3, Math.min(3, fn(x))); i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); } g.stroke(); g.setLineDash([]); };
      curve(f0, css("--muted"), 1.5, [5, 5]);
      curve((x) => evalP(w, x), C[2], 3);
      test.forEach(([x, y]) => { g.strokeStyle = C[1]; g.lineWidth = 1.5; g.beginPath(); g.arc(X(x), Y(y), 3.5, 0, 7); g.stroke(); });
      train.forEach(([x, y]) => { g.fillStyle = C[0]; g.beginPath(); g.arc(X(x), Y(y), 5.5, 0, 7); g.fill(); });
      const errs = Array.from({ length: 9 }, (_, i) => { const wi = fit(i + 1, l); return [mse(wi, train), mse(wi, test)]; });
      lineChart(eg, 260, 190, [{ vals: errs.map((e) => e[0]), color: C[0] }, { vals: errs.map((e) => e[1]), color: C[1] }], { mark: d - 1, cap: 0.8, label: "degree 1 → 9" });
      const [tr, te] = errs[d - 1];
      const verdict = tr > 0.2 ? ["Underfitting: too simple to follow the curve (high bias)", "var(--warn)"] : te > 2 * tr + 0.06 ? ["Overfitting: chasing noise in the 12 training points (high variance)", "var(--bad)"] : ["Good fit: train and test error are both low", "var(--good)"];
      clear(out).append(h("h4", { text: "Fit quality" }), kv([["degree", d], ["parameters", d + 1], ["train MSE", tr.toFixed(3)], ["test MSE", te > 99 ? "> 99" : te.toFixed(3), verdict[1]], ["largest |weight|", Math.max(...w.map(Math.abs)).toFixed(1)]]),
        h("p", { style: { margin: "10px 0 0", color: verdict[1] }, text: verdict[0] }));
    }
    gen();
  };

  /* ================= Decision tree ================= */
  L.viz.decisionTree = (root) => {
    let pts = [];
    const kind = select([["xor", "XOR quadrants"], ["blobs", "Overlapping blobs"], ["circle", "Circle"]]);
    const depth = range("max depth", 0, 7, 2);
    const [cv, g] = canvas();
    const out = h("div", { class: "side-panel" }), rules = h("div", { class: "log", style: { maxHeight: "230px", whiteSpace: "pre" } });
    root.append(h("div", { class: "controls" }, h("label", null, "data", kind), depth.el, h("button", { class: "btn small", text: "🎲 New data", onclick: gen })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 290px" } }, h("div", { class: "stage" }, cv), h("div", null, out, h("div", { style: { height: "10px" } }), rules)), classLegend());
    kind.addEventListener("change", gen); depth.inp.addEventListener("input", draw);
    const gini = (a) => { if (!a.length) return 0; const p = a.filter((q) => q.c).length / a.length; return 2 * p * (1 - p); };
    function build(a, d, box) {
      const ones = a.filter((q) => q.c).length, node = { box, n: a.length, ones, c: ones * 2 > a.length ? 1 : 0, gini: gini(a) };
      if (d === 0 || ones === 0 || ones === a.length) return node;
      let best = null;
      ["x", "y"].forEach((f) => {
        const vs = [...new Set(a.map((q) => q[f]))].sort((m, n) => m - n);
        for (let i = 1; i < vs.length; i++) {
          const t = (vs[i] + vs[i - 1]) / 2, l = a.filter((q) => q[f] < t), r = a.filter((q) => q[f] >= t);
          const sc = (l.length * gini(l) + r.length * gini(r)) / a.length;
          if (!best || sc < best.sc) best = { sc, f, t, l, r };
        }
      });
      if (!best) return node;
      const [x0, y0, x1, y1] = box;
      node.f = best.f; node.t = best.t;
      node.l = build(best.l, d - 1, best.f === "x" ? [x0, y0, best.t, y1] : [x0, y0, x1, best.t]);
      node.r = build(best.r, d - 1, best.f === "x" ? [best.t, y0, x1, y1] : [x0, best.t, x1, y1]);
      return node;
    }
    const leaves = (n) => (n.l ? [...leaves(n.l), ...leaves(n.r)] : [n]);
    const predict = (n, x, y) => (n.l ? predict((n.f === "x" ? x : y) < n.t ? n.l : n.r, x, y) : n.c);
    const text = (n, ind = "") => (n.l ? [`${ind}if ${n.f} < ${n.t.toFixed(2)}:`, ...text(n.l, ind + "  "), `${ind}else:`, ...text(n.r, ind + "  ")] : [`${ind}→ ${"AB"[n.c]}  (${n.n - n.ones}A/${n.ones}B)`]);
    function gen() { pts = holdOut(dataset(kind.value, 110)); draw(); }
    function draw() {
      const train = pts.filter((p) => !p.test), test = pts.filter((p) => p.test), tree = build(train, +depth.inp.value, [0, 0, 1, 1]), lv = leaves(tree);
      g.clearRect(0, 0, W, H);
      lv.forEach((n) => {
        const [x0, y0, x1, y1] = n.box, [r, gg, b] = RGB[n.c];
        g.fillStyle = `rgba(${r},${gg},${b},${0.1 + 0.4 * (1 - n.gini * 2)})`; g.fillRect(x0 * W, (1 - y1) * H, (x1 - x0) * W, (y1 - y0) * H);
        g.strokeStyle = css("--text"); g.lineWidth = 1; g.strokeRect(x0 * W, (1 - y1) * H, (x1 - x0) * W, (y1 - y0) * H);
      });
      dots(g, pts);
      const tr = accuracy(train, (x, y) => predict(tree, x, y)), te = accuracy(test, (x, y) => predict(tree, x, y));
      clear(out).append(h("h4", { text: "Tree" }), kv([["max depth", depth.inp.value], ["leaves (regions)", lv.length], ["train accuracy", pct(tr)], ["test accuracy", pct(te), te < tr - 0.08 ? "var(--warn)" : "var(--good)"]]));
      const lines = text(tree);
      rules.textContent = lines.slice(0, 40).join("\n") + (lines.length > 40 ? "\n…" : "");
    }
    gen();
  };

  /* ================= K-means ================= */
  L.viz.kmeans = (root) => {
    let pts = [];
    const k = range("k (clusters)", 2, 5, 3);
    const [cv, g] = canvas();
    root.append(h("div", { class: "controls" }, k.el, h("button", { class: "btn primary small", text: "↻ Re-run (new random start)", onclick: run }), h("button", { class: "btn small", text: "🎲 New data", onclick: gen })),
      h("div", { class: "stage" }, cv));
    k.inp.addEventListener("input", run);
    const player = Player(root, render, { speed: 2 });
    function gen() { const cs = Array.from({ length: rand(3, 4) }, () => [0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7]); pts = Array.from({ length: 96 }, (_, i) => { const c = cs[i % cs.length]; return { x: clamp(c[0] + gauss() * 0.07), y: clamp(c[1] + gauss() * 0.07) }; }); run(); }
    function run() {
      const K = +k.inp.value, F = [];
      let cen = shuffle(pts).slice(0, K).map((p) => [p.x, p.y]), asg = pts.map(() => -1);
      const snap = (msg, prev) => F.push({ cen: cen.map((c) => c.slice()), asg: asg.slice(), prev, msg });
      const inertia = () => pts.reduce((a, p, i) => a + (p.x - cen[asg[i]][0]) ** 2 + (p.y - cen[asg[i]][1]) ** 2, 0).toFixed(3);
      snap(`Pick ${K} random data points as the starting centroids (✕). Nothing is assigned yet.`);
      for (let it = 1; it <= 20; it++) {
        const next = pts.map((p) => { let b = 0, bd = Infinity; cen.forEach((c, j) => { const d = (p.x - c[0]) ** 2 + (p.y - c[1]) ** 2; if (d < bd) { bd = d; b = j; } }); return b; });
        const changed = next.filter((a, i) => a !== asg[i]).length;
        asg = next;
        if (!changed) { snap(`Iteration ${it}, assign: no point changed cluster → <b>converged</b>. Final inertia (sum of squared distances) = ${inertia()}. A different random start may give a different answer.`); break; }
        snap(`Iteration ${it}, <b>assign</b>: every point joins its nearest centroid (${changed} changed). Inertia = ${inertia()}`);
        const prev = cen.map((c) => c.slice());
        cen = cen.map((c, j) => { const m = pts.filter((_, i) => asg[i] === j); return m.length ? [m.reduce((a, p) => a + p.x, 0) / m.length, m.reduce((a, p) => a + p.y, 0) / m.length] : c; });
        snap(`Iteration ${it}, <b>update</b>: move each centroid to the mean of its points. Inertia = ${inertia()}`, prev);
      }
      player.load(F);
    }
    function render(f) {
      g.clearRect(0, 0, W, H);
      dots(g, pts, (p, i) => (f.asg[i] < 0 ? css("--muted") : C[f.asg[i]]));
      f.cen.forEach((c, j) => {
        const x = c[0] * W, y = (1 - c[1]) * H;
        if (f.prev) { g.strokeStyle = C[j]; g.lineWidth = 1.5; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(f.prev[j][0] * W, (1 - f.prev[j][1]) * H); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
        g.strokeStyle = css("--text"); g.lineWidth = 7; g.beginPath(); g.moveTo(x - 9, y - 9); g.lineTo(x + 9, y + 9); g.moveTo(x + 9, y - 9); g.lineTo(x - 9, y + 9); g.stroke();
        g.strokeStyle = C[j]; g.lineWidth = 4; g.stroke();
      });
    }
    gen();
  };

  /* ================= Neural network playground ================= */
  L.viz.neuralNet = (root) => {
    let pts = [], net, losses = [], epoch = 0, running = false;
    const kind = select([["xor", "XOR"], ["circle", "Circle"], ["blobs", "Overlapping blobs"]]);
    const hid = range("hidden neurons", 1, 8, 4);
    const lr = select([["0.1", "learning rate 0.1"], ["0.5", "learning rate 0.5"], ["2", "learning rate 2"]]); lr.value = "0.5";
    const [cv, g] = canvas(), [lc, lg] = canvas(260, 170);
    const out = h("div", { class: "side-panel" });
    const runBtn = h("button", { class: "btn primary small", onclick: () => { running = !running; draw(); } });
    root.append(h("div", { class: "controls" }, h("label", null, "data", kind), hid.el, lr, runBtn,
      h("button", { class: "btn small", text: "♻ Reset weights", onclick: init }), h("button", { class: "btn small", text: "🎲 New data", onclick: gen })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 290px" } }, h("div", { class: "stage" }, cv), h("div", null, out, h("div", { style: { height: "10px" } }), h("div", { class: "side-panel" }, h("h4", { text: "Training loss" }), lc))), classLegend());
    kind.addEventListener("change", gen); hid.inp.addEventListener("input", init);
    function gen() { pts = dataset(kind.value, 100); init(); }
    function init() { const n = +hid.inp.value; net = { W1: Array.from({ length: n }, () => [gauss() * 1.5, gauss() * 1.5]), b1: new Array(n).fill(0), W2: Array.from({ length: n }, () => gauss()), b2: 0 }; losses = []; epoch = 0; draw(); }
    function fwd(x, y) { const a = x * 2 - 1, b = y * 2 - 1, hs = net.W1.map((w, j) => Math.tanh(w[0] * a + w[1] * b + net.b1[j])); return [sig(hs.reduce((s, v, j) => s + v * net.W2[j], net.b2)), hs, a, b]; }
    function step() {   // one epoch of full-batch gradient descent with backpropagation
      const n = net.W2.length, gW1 = net.W1.map(() => [0, 0]), gb1 = new Array(n).fill(0), gW2 = new Array(n).fill(0);
      let gb2 = 0, loss = 0;
      pts.forEach((p) => {
        const [o, hs, a, b] = fwd(p.x, p.y);
        loss -= p.c ? Math.log(o + 1e-9) : Math.log(1 - o + 1e-9);
        const dz = o - p.c;                                   // ∂loss/∂(output pre-activation)
        gb2 += dz;
        for (let j = 0; j < n; j++) {
          gW2[j] += dz * hs[j];
          const dh = dz * net.W2[j] * (1 - hs[j] * hs[j]);    // chain rule back through tanh
          gW1[j][0] += dh * a; gW1[j][1] += dh * b; gb1[j] += dh;
        }
      });
      const a = +lr.value / pts.length;
      for (let j = 0; j < n; j++) { net.W2[j] -= a * gW2[j]; net.b1[j] -= a * gb1[j]; net.W1[j][0] -= a * gW1[j][0]; net.W1[j][1] -= a * gW1[j][1]; }
      net.b2 -= a * gb2; epoch++;
      return loss / pts.length;
    }
    function draw() {
      paint(g, (x, y) => fwd(x, y)[0]); dots(g, pts);
      runBtn.textContent = running ? "⏸ Pause" : "▶ Train";
      if (losses.length) lineChart(lg, 260, 170, [{ vals: losses, color: C[3] }], { label: "epochs →" }); else lg.clearRect(0, 0, 260, 170);
      const n = net.W2.length, acc = accuracy(pts, (x, y) => (fwd(x, y)[0] > 0.5 ? 1 : 0));
      clear(out).append(h("h4", { text: `Network: 2 → ${n} → 1` }), kv([["epoch", epoch], ["parameters", 4 * n + 1], ["loss", losses.length ? losses[losses.length - 1].toFixed(4) : "–"], ["accuracy", pct(acc), acc > 0.95 ? "var(--good)" : ""]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, text: n < 3 ? "Each hidden neuron draws one line. With fewer than 3 you can't enclose a circle; XOR needs at least 2." : "Each hidden tanh neuron contributes one soft line; the output neuron blends them into a curved boundary." }));
    }
    Timers.every(() => { if (!running || !cv.isConnected) return; let l; for (let i = 0; i < 10; i++) l = step(); losses.push(l); if (losses.length > 400) losses.shift(); draw(); }, 60);
    gen();
  };

  /* ================= Classification metrics & ROC ================= */
  L.viz.metrics = (root) => {
    let data = [];
    const thr = range("decision threshold", 0, 1, 0.5, 0.01);
    const [cv, g] = canvas(W, 190), [rc, rg] = canvas(250, 250);
    const out = h("div", { class: "side-panel" }), cm = h("div");
    root.append(h("div", { class: "controls" }, thr.el,
      h("button", { class: "btn small", text: "⚖️ Balanced data (50% positive)", onclick: () => gen(60, 60) }),
      h("button", { class: "btn small", text: "🦄 Imbalanced data (5% positive)", onclick: () => gen(8, 152) })),
      h("div", { class: "viz-split", style: { gridTemplateColumns: "1fr 290px" } },
        h("div", null, h("div", { class: "stage", style: { minHeight: "0" } }, cv), h("div", { style: { height: "12px" } }), cm),
        h("div", null, out, h("div", { style: { height: "10px" } }), h("div", { class: "side-panel" }, h("h4", { text: "ROC curve" }), rc))),
      legend([[C[1], "actually positive"], [C[0], "actually negative"], [css("--text"), "threshold: score ≥ threshold → predict positive"]]));
    thr.inp.addEventListener("input", draw);
    function gen(pos, neg) { const mk = (n, mu, c) => Array.from({ length: n }, () => ({ s: clamp(mu + gauss() * 0.16, 0, 1), c, j: Math.random() })); data = [...mk(pos, 0.66, 1), ...mk(neg, 0.36, 0)]; draw(); }
    const count = (t) => { let tp = 0, fp = 0, tn = 0, fn = 0; data.forEach((d) => { const pr = d.s >= t; if (pr && d.c) tp++; else if (pr) fp++; else if (d.c) fn++; else tn++; }); return { tp, fp, tn, fn }; };
    const fx = (v) => (isFinite(v) ? v.toFixed(2) : "–");
    function draw() {
      const t = +thr.inp.value, { tp, fp, tn, fn } = count(t);
      const X = (s) => 20 + s * (W - 40);
      g.clearRect(0, 0, W, 190);
      g.fillStyle = "rgba(246,173,85,.10)"; g.fillRect(X(t), 0, X(1) - X(t) + 20, 190);
      data.forEach((d) => { g.fillStyle = C[d.c ? 1 : 0]; g.globalAlpha = d.s >= t === !!d.c ? 1 : 0.45; g.beginPath(); g.arc(X(d.s), (d.c ? 18 : 100) + d.j * 60, 4.5, 0, 7); g.fill(); });
      g.globalAlpha = 1;
      g.strokeStyle = css("--text"); g.lineWidth = 2; g.beginPath(); g.moveTo(X(t), 0); g.lineTo(X(t), 172); g.stroke();
      g.fillStyle = css("--muted"); g.font = "11px sans-serif"; g.fillText("model score 0", X(0), 186); g.fillText("1", X(1) - 4, 186); g.fillText("← predict negative", Math.max(4, X(t) - 106), 12); g.fillText("predict positive →", Math.min(W - 100, X(t) + 6), 12);
      const prec = tp / (tp + fp), rec = tp / (tp + fn), acc = (tp + tn) / data.length, f1 = (2 * prec * rec) / (prec + rec), fpr = fp / (fp + tn);
      // ROC: sweep the threshold from 1 to 0
      const roc = []; let auc = 0;
      for (let i = 100; i >= 0; i--) { const c = count(i / 100); roc.push([c.fp / (c.fp + c.tn), c.tp / (c.tp + c.fn)]); }
      for (let i = 1; i < roc.length; i++) auc += ((roc[i][0] - roc[i - 1][0]) * (roc[i][1] + roc[i - 1][1])) / 2;
      const RX = (v) => 30 + v * 210, RY = (v) => 225 - v * 210;
      rg.clearRect(0, 0, 250, 250);
      rg.strokeStyle = css("--line"); rg.lineWidth = 1; rg.strokeRect(RX(0), RY(1), 210, 210);
      rg.setLineDash([4, 4]); rg.beginPath(); rg.moveTo(RX(0), RY(0)); rg.lineTo(RX(1), RY(1)); rg.stroke(); rg.setLineDash([]);
      rg.strokeStyle = C[2]; rg.lineWidth = 2.5; rg.beginPath(); roc.forEach(([a, b], i) => (i ? rg.lineTo(RX(a), RY(b)) : rg.moveTo(RX(a), RY(b)))); rg.stroke();
      rg.fillStyle = C[3]; rg.beginPath(); rg.arc(RX(fpr), RY(rec), 6, 0, 7); rg.fill();
      rg.fillStyle = css("--muted"); rg.font = "11px sans-serif"; rg.fillText("false positive rate →", 80, 244); rg.save(); rg.translate(12, 170); rg.rotate(-Math.PI / 2); rg.fillText("true positive rate →", 0, 0); rg.restore();
      clear(out).append(h("h4", { text: "Metrics at this threshold" }), kv([["accuracy", fx(acc)], ["precision", fx(prec)], ["recall (TPR)", fx(rec)], ["F1 score", fx(f1)], ["false positive rate", fx(fpr)], ["ROC AUC (all thresholds)", fx(auc)]]),
        h("p", { class: "topic-sub", style: { margin: "10px 0 0" }, text: tp + fn < 20 ? "With 5% positives, predicting 'negative' for everyone already scores 95% accuracy. Watch precision and recall instead." : "Slide the threshold: recall rises as precision falls. You choose the trade-off; the model doesn't." }));
      const cell = (label, n, good) => h("td", { style: { background: good ? "rgba(72,187,120,.16)" : "rgba(245,101,101,.14)" } }, h("b", { text: n }), " ", h("small", { text: label, style: { color: "var(--muted)" } }));
      clear(cm).append(h("table", { class: "cmp-table" },
        h("tr", null, h("th", { text: "Confusion matrix" }), h("th", { text: "Predicted positive" }), h("th", { text: "Predicted negative" })),
        h("tr", null, h("th", { text: "Actually positive" }), cell("true positives", tp, 1), cell("false negatives (missed)", fn, 0)),
        h("tr", null, h("th", { text: "Actually negative" }), cell("false positives (false alarms)", fp, 0), cell("true negatives", tn, 1))));
    }
    gen(60, 60);
  };
})();
