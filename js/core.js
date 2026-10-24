/* Core helpers: DOM builders, progress store, step Player, quiz engine, architecture diagrams */
(function () {
  const SVGNS = "http://www.w3.org/2000/svg";
  // Let element.append(...) skip null/false children, like h() does
  const nativeAppend = Element.prototype.append;
  Element.prototype.append = function (...kids) { return nativeAppend.apply(this, kids.filter((k) => k != null && k !== false)); };

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    applyProps(el, props);
    append(el, kids);
    return el;
  }
  function s(tag, props, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    append(el, kids);
    return el;
  }
  function applyProps(el, props) {
    if (!props) return;
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v);
    }
  }
  function append(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }
  const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const parseNums = (str) => str.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && isFinite(n));

  /* ---------- Progress store (localStorage) ---------- */
  const KEY = "dsaLearner.v1";
  const Store = {
    data: { xp: 0, quiz: {}, visited: {}, streak: { last: null, count: 0 } },
    load() {
      try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) Object.assign(this.data, d); } catch (e) {}
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} },
    addXP(n) {
      this.data.xp += n;
      const today = new Date().toISOString().slice(0, 10);
      const st = this.data.streak;
      if (st.last !== today) {
        const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        st.count = st.last === y ? st.count + 1 : 1;
        st.last = today;
      }
      this.save();
      document.dispatchEvent(new Event("progress"));
    },
    visit(id) { this.data.visited[id] = true; this.save(); },
    recordQuiz(id, score, total) {
      const prev = this.data.quiz[id];
      if (!prev || score > prev.best) this.data.quiz[id] = { best: score, total };
      this.save();
      document.dispatchEvent(new Event("progress"));
    },
    mastered(id) { const q = this.data.quiz[id]; return q && q.best / q.total >= 0.8; },
    level() { return Math.floor(this.data.xp / 100) + 1; },
    reset() { localStorage.removeItem(KEY); location.reload(); },
  };

  function toast(msg) {
    const t = h("div", { class: "toast", html: msg });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function confetti() {
    const colors = ["#7c8cff", "#4fd1c5", "#f6e05e", "#f687b3", "#48bb78", "#f6ad55"];
    for (let i = 0; i < 80; i++) {
      const c = h("div", { class: "confetti" });
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.5 + Math.random() * 2 + "s";
      c.style.animationDelay = Math.random() * 0.4 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4500);
    }
  }

  /* ---------- Step Player ----------
     A visualizer precomputes an array of frames; the player renders frame i via render(frame).
     Each frame may carry `msg` for the caption. */
  function Player(host, render, opts = {}) {
    let frames = [], i = 0, timer = null;
    let speed = opts.speed || 3;
    const caption = h("div", { class: "caption" });
    const btn = (label, title, fn) => h("button", { class: "btn small", title, onclick: fn, text: label });
    const playBtn = btn("▶ Play", "Play / pause (space)", () => (timer ? pause() : play()));
    const counter = h("span", { class: "badge" });
    const speedIn = h("input", { type: "range", min: 1, max: 6, value: speed, oninput: (e) => { speed = +e.target.value; if (timer) { pause(); play(); } } });
    const bar = h("div", { class: "player" },
      btn("⏮", "First", () => go(0)),
      btn("◀ Step", "Previous step", () => go(i - 1)),
      playBtn,
      btn("Step ▶", "Next step", () => go(i + 1)),
      btn("⏭", "Last", () => go(frames.length - 1)),
      h("label", { class: "badge", style: { display: "flex", gap: "6px", alignItems: "center" } }, "speed", speedIn),
      counter);
    host.appendChild(bar);
    host.appendChild(caption);

    function go(n) {
      if (!frames.length) return;
      i = Math.max(0, Math.min(frames.length - 1, n));
      render(frames[i], i, frames);
      caption.innerHTML = `<span class="step">Step ${i + 1}/${frames.length}</span>${frames[i].msg || ""}`;
      counter.textContent = `${i + 1} / ${frames.length}`;
      if (i === frames.length - 1) pause();
    }
    function play() {
      if (i >= frames.length - 1) go(0);
      const delay = [0, 1400, 900, 550, 300, 140, 50][speed];
      timer = setInterval(() => go(i + 1), delay);
      playBtn.textContent = "⏸ Pause";
    }
    function pause() { clearInterval(timer); timer = null; playBtn.textContent = "▶ Play"; }
    const api = {
      load(f, autoplay) { pause(); frames = f; go(0); if (autoplay) play(); },
      pause, play, go,
      get index() { return i; },
      destroy() { pause(); },
    };
    Player.active.push(api);
    return api;
  }
  Player.active = [];
  Player.stopAll = () => { Player.active.forEach((p) => p.destroy()); Player.active = []; };
  /* Interval helper that is cleaned up when the route changes */
  const Timers = {
    list: [],
    every(fn, ms) { const id = setInterval(fn, ms); this.list.push(id); return id; },
    clearAll() { this.list.forEach(clearInterval); this.list = []; },
  };

  /* ---------- Architecture diagram ----------
     nodes: [{id, x, y (percent), label, em, sub, info}]
     edges: [[a, b], ...]; flows: {name: {path:[ids], steps:[captions]}} */
  function ArchDiagram(host, cfg) {
    const wrap = h("div", { class: "sd-canvas", style: { height: (cfg.height || 360) + "px" } });
    const svg = s("svg", { class: "sd-lines" });
    wrap.appendChild(svg);
    const boxes = {};
    const detail = h("div", { class: "caption detail", html: cfg.intro || "Click any component to learn what it does." });
    cfg.nodes.forEach((n) => {
      const b = h("div", { class: "sd-box", style: { left: n.x + "%", top: n.y + "%" } },
        h("span", { class: "em", text: n.em || "▫️" }), n.label, n.sub ? h("small", { text: n.sub }) : null);
      b.onclick = () => {
        Object.values(boxes).forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        detail.innerHTML = `<b>${n.em || ""} ${n.label}</b> — ${n.info || ""}`;
      };
      boxes[n.id] = b;
      wrap.appendChild(b);
    });
    const pos = (id) => { const n = cfg.nodes.find((x) => x.id === id); return [n.x, n.y]; };
    const lines = {};
    function drawEdges() {
      clear(svg);
      cfg.edges.forEach(([a, b, dashed]) => {
        const [x1, y1] = pos(a), [x2, y2] = pos(b);
        const l = s("line", { x1: x1 + "%", y1: y1 + "%", x2: x2 + "%", y2: y2 + "%", "stroke-dasharray": dashed ? "6 5" : null });
        lines[a + ">" + b] = lines[b + ">" + a] = l;
        svg.appendChild(l);
      });
    }
    drawEdges();
    host.appendChild(wrap);

    let flowCtrl = null;
    if (cfg.flows) {
      const ctrl = h("div", { class: "controls", style: { marginTop: "12px" } }, h("b", { text: "Trace a request:" }));
      Object.entries(cfg.flows).forEach(([name, f]) => {
        ctrl.appendChild(h("button", { class: "btn small", text: "▶ " + name, onclick: () => runFlow(f) }));
      });
      host.appendChild(ctrl);
    }
    host.appendChild(detail);

    let flowToken = 0;
    function runFlow(f) {
      const token = ++flowToken;
      Object.values(lines).forEach((l) => l.classList.remove("flow"));
      Object.values(boxes).forEach((x) => x.classList.remove("hot"));
      let k = 0;
      const stepFn = () => {
        if (token !== flowToken || !wrap.isConnected) return;
        if (k >= f.path.length - 1) { boxes[f.path[k]].classList.add("hot"); detail.innerHTML = f.steps[k] || f.steps[f.steps.length - 1]; return; }
        const a = f.path[k], b = f.path[k + 1];
        boxes[a].classList.add("hot");
        const l = lines[a + ">" + b]; if (l) l.classList.add("flow");
        detail.innerHTML = `<span class="step">${k + 1}/${f.path.length - 1}</span>` + (f.steps[k] || "");
        animatePacket(wrap, pos(a), pos(b), f.color || "#4fd1c5", 900, () => { k++; setTimeout(stepFn, 350); });
      };
      stepFn();
    }
    return { boxes, wrap, detail, runFlow };
  }
  function animatePacket(wrap, [x1, y1], [x2, y2], color, ms, done) {
    const p = h("div", { class: "packet", style: { background: color, color } });
    wrap.appendChild(p);
    const t0 = performance.now();
    function frame(t) {
      const k = Math.min(1, (t - t0) / ms);
      p.style.left = x1 + (x2 - x1) * k + "%";
      p.style.top = y1 + (y2 - y1) * k + "%";
      if (k < 1 && wrap.isConnected) requestAnimationFrame(frame);
      else { p.remove(); done && done(); }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Quiz engine ---------- */
  function Quiz(host, questions, { id, onDone } = {}) {
    let i = 0, score = 0;
    const results = [];
    const qs = questions.map((q) => {
      // shuffle options but keep track of the right one
      const order = shuffle(q.options.map((_, k) => k));
      return { ...q, options: order.map((k) => q.options[k]), answer: order.indexOf(q.answer) };
    });
    function render() {
      clear(host);
      const prog = h("div", { class: "q-progress" }, qs.map((_, k) => h("i", { class: k < i ? (results[k] ? "ok" : "no") : k === i ? "now" : "" })));
      if (i >= qs.length) return finish(prog);
      const q = qs[i];
      const explain = h("div");
      const opts = q.options.map((o, k) => h("button", { class: "q-opt", onclick: () => pick(k) }, h("span", { class: "k", text: "ABCD"[k] }), h("span", { html: o })));
      function pick(k) {
        opts.forEach((b) => (b.disabled = true));
        const ok = k === q.answer;
        results[i] = ok;
        if (ok) score++;
        opts[q.answer].classList.add("right");
        if (!ok) opts[k].classList.add("wrong");
        prog.children[i].className = ok ? "ok" : "no";
        explain.appendChild(h("div", { class: "q-explain fade-in", html: `<b>${ok ? "✅ Correct!" : "❌ Not quite."}</b> ${q.explain || ""}` }));
        explain.appendChild(h("div", { style: { marginTop: "12px" } }, h("button", { class: "btn primary", text: i === qs.length - 1 ? "See results" : "Next question →", onclick: () => { i++; render(); } })));
      }
      host.appendChild(h("div", { class: "quiz fade-in" }, prog,
        h("div", { class: "badge", text: `Question ${i + 1} of ${qs.length}`, style: { marginBottom: "10px" } }),
        h("p", { class: "q-text", html: q.q }),
        q.code ? h("pre", { text: q.code }) : null,
        h("div", { class: "q-opts" }, opts), explain));
    }
    function finish(prog) {
      const pct = Math.round((score / qs.length) * 100);
      const xp = score * 10 + (pct === 100 ? 20 : 0);
      Store.addXP(xp);
      if (id) Store.recordQuiz(id, score, qs.length);
      if (pct >= 80) confetti();
      host.appendChild(h("div", { class: "quiz" }, prog, h("div", { class: "card q-result fade-in" },
        h("div", { class: "big", text: `${score}/${qs.length}` }),
        h("p", { html: pct === 100 ? "🏆 Perfect! You've mastered this one." : pct >= 80 ? "🎉 Great job, topic mastered!" : pct >= 50 ? "👍 Good progress. Revisit the Learn tab and try again." : "📚 Keep going. Watch the visualizer, then retry." }),
        h("p", { class: "badge good", text: `+${xp} XP` }),
        h("div", { class: "controls", style: { justifyContent: "center", marginTop: "14px" } },
          h("button", { class: "btn primary", text: "↻ Retry", onclick: () => { i = 0; score = 0; results.length = 0; render(); } }),
          onDone ? h("button", { class: "btn", text: "Continue", onclick: onDone }) : null))));
    }
    render();
  }

  window.L = { h, s, clear, rand, shuffle, parseNums, Store, Player, Timers, ArchDiagram, animatePacket, Quiz, toast, confetti, topics: [], viz: {} };
})();
