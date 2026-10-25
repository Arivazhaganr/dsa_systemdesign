/* App shell: sidebar, routing, pages */
(function () {
  const { h, clear, Store, Player, Timers, Quiz, shuffle } = L;
  Store.load();
  const main = document.getElementById("main");
  const nav = document.getElementById("nav");
  const xpbar = document.getElementById("xpbar");
  const sidebar = document.querySelector(".sidebar");
  const TRACKS = { dsa: "Data Structures & Algorithms", sd: "System Design" };
  const byId = (id) => L.topics.find((t) => t.id === id);
  const go = (hash) => (location.hash = hash);

  try { const th = localStorage.getItem("dsaLearner.theme"); if (th) document.documentElement.dataset.theme = th; } catch (e) {}

  function renderNav(active) {
    clear(nav);
    nav.append(h("div", { class: "navlink" + (!active ? " active" : ""), onclick: () => go("#/") }, h("span", { class: "ico", text: "🏠" }), "Home"),
      h("div", { class: "navlink" + (active === "challenge" ? " active" : ""), onclick: () => go("#/challenge/all") }, h("span", { class: "ico", text: "🎲" }), "Daily challenge"));
    Object.entries(TRACKS).forEach(([k, name]) => {
      nav.append(h("div", { class: "navsec", text: name }));
      L.topics.filter((t) => t.track === k).forEach((t) => nav.append(h("div", { class: "navlink" + (active === t.id ? " active" : ""), onclick: () => go(`#/t/${t.id}`) },
        h("span", { class: "ico", text: t.icon }), t.title, Store.mastered(t.id) ? h("span", { class: "done", text: "★" }) : Store.data.visited[t.id] ? h("span", { class: "done", style: { color: "var(--muted)" }, text: "•" }) : null)));
    });
    nav.append(h("div", { class: "navsec", text: "Settings" }),
      h("div", { class: "navlink", onclick: () => { const r = document.documentElement; const next = r.dataset.theme === "light" ? "dark" : "light"; r.dataset.theme = next; try { localStorage.setItem("dsaLearner.theme", next); } catch (e) {} } }, h("span", { class: "ico", text: "🌓" }), "Toggle theme"),
      h("div", { class: "navlink", onclick: () => { if (confirm("Reset all XP and quiz progress?")) Store.reset(); } }, h("span", { class: "ico", text: "♻️" }), "Reset progress"));
  }
  function renderXP() {
    const d = Store.data, lvl = Store.level(), into = d.xp % 100;
    clear(xpbar).append(h("div", { class: "row" }, h("span", null, "Level ", h("b", { text: lvl })), h("span", null, "🔥 ", h("b", { text: d.streak.count || 0 }), " day streak")),
      h("div", { class: "meter" }, h("i", { style: { width: into + "%" } })), h("div", { class: "row", style: { marginTop: "4px" } }, h("span", { text: `${d.xp} XP` }), h("span", { text: `${100 - into} to next level` })));
  }
  document.addEventListener("progress", () => { renderXP(); const id = (location.hash.match(/#\/t\/([^/]+)/) || [])[1]; renderNav(id); });

  function home() {
    const mastered = L.topics.filter((t) => Store.mastered(t.id)).length;
    const qCount = L.topics.reduce((a, t) => a + t.quiz.length, 0);
    main.append(h("div", { class: "hero fade-in" },
      h("h1", { text: "Learn DSA & System Design by seeing it 👀" }),
      h("p", { text: `${L.topics.length} topics, each with a short lesson, an interactive visualizer you can play step by step, a quiz (${qCount} questions in total) and interview-style practice problems. Earn XP, keep a streak, and master every topic.` }),
      h("div", { class: "controls" },
        h("button", { class: "btn primary", text: "▶ Start with Big-O", onclick: () => go("#/t/big-o") }),
        h("button", { class: "btn", text: "🎲 Daily challenge (10 mixed questions)", onclick: () => go("#/challenge/all") }),
        h("button", { class: "btn", text: "🏗️ Jump to System Design", onclick: () => go("#/t/sd-basics") })),
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("b", { text: Store.data.xp }), h("span", { text: "XP" })),
        h("div", { class: "stat" }, h("b", { text: Store.level() }), h("span", { text: "level" })),
        h("div", { class: "stat" }, h("b", { text: (Store.data.streak.count || 0) + " 🔥" }), h("span", { text: "day streak" })),
        h("div", { class: "stat" }, h("b", { text: `${mastered}/${L.topics.length}` }), h("span", { text: "topics mastered (≥80% quiz)" })))));
    Object.entries(TRACKS).forEach(([k, name]) => {
      const list = L.topics.filter((t) => t.track === k);
      const done = list.filter((t) => Store.mastered(t.id)).length;
      main.append(h("div", { class: "controls", style: { marginTop: "10px" } }, h("h2", { text: name, style: { margin: 0 } }), h("span", { class: "badge", text: `${done}/${list.length} mastered` }), h("div", { class: "spacer" }),
        h("button", { class: "btn small", text: `🎲 ${k === "dsa" ? "DSA" : "System design"} quiz`, onclick: () => go(`#/challenge/${k}`) })),
        h("div", { class: "meter", style: { marginBottom: "14px" } }, h("i", { style: { width: (done / list.length) * 100 + "%" } })),
        h("div", { class: "grid", style: { marginBottom: "30px" } }, list.map((t, i) => {
          const q = Store.data.quiz[t.id];
          return h("div", { class: "card tcard fade-in", onclick: () => go(`#/t/${t.id}`) },
            h("div", { class: "ico", text: t.icon }), h("h3", { text: `${i + 1}. ${t.title}` }), h("p", { text: t.summary }),
            q ? h("span", { class: "badge " + (Store.mastered(t.id) ? "good" : ""), text: `${Store.mastered(t.id) ? "★ " : ""}${q.best}/${q.total}` }) : null);
        })));
    });
    main.append(h("div", { class: "card" }, h("h3", { text: "🗺️ Suggested 4-week plan", style: { marginTop: 0 } }),
      h("div", { class: "learn", html: `<ol>
<li><b>Week 1, foundations:</b> Big-O, Arrays & Two Pointers, Sliding Window, Binary Search, Sorting, Hashing.</li>
<li><b>Week 2, structures:</b> Linked Lists, Stacks & Queues, Trees & BST, Heaps, Tries, Recursion & Backtracking.</li>
<li><b>Week 3, algorithms + SD basics:</b> Graphs, Dijkstra, DP, Greedy · Interview framework, Load balancing, Caching, Databases.</li>
<li><b>Week 4, system design:</b> Consistent hashing, CAP, Queues, Rate limiting, CDN, APIs, Reliability, then the three case studies.</li></ol>
<p>Each day: read the lesson (10 min) → play with the visualizer (10 min) → take the quiz → solve 1–2 practice problems on your favourite judge (LeetCode, NeetCode, etc.).</p>` })));
  }

  function topic(id, tab = "learn") {
    const t = byId(id);
    if (!t) return home();
    Store.visit(id);
    const list = L.topics, i = list.indexOf(t);
    const tabs = [["learn", "📖 Learn"], ["visualize", "🎬 Visualize"], ["quiz", `📝 Quiz (${t.quiz.length})`], ["practice", `💪 Practice (${t.practice.length})`]];
    const body = h("div", { class: "fade-in" });
    main.append(h("div", { class: "topic-head" }, h("span", { class: "ico", text: t.icon }), h("div", null, h("div", { class: "badge", text: TRACKS[t.track] }), h("h1", { text: t.title }))),
      h("p", { class: "topic-sub", text: t.summary }),
      h("div", { class: "tabs" }, tabs.map(([k, label]) => h("div", { class: "tab" + (tab === k ? " active" : ""), text: label, onclick: () => go(`#/t/${id}/${k}`) }))), body);
    if (tab === "learn") {
      body.append(h("div", { class: "learn", html: t.learn }),
        h("div", { class: "controls", style: { marginTop: "20px" } }, h("button", { class: "btn primary", text: "🎬 See it in action →", onclick: () => go(`#/t/${id}/visualize`) })));
    } else if (tab === "visualize") {
      if (L.viz[t.viz]) L.viz[t.viz](body); else body.append(h("p", { text: "No visualizer for this topic." }));
      body.append(h("div", { class: "controls", style: { marginTop: "20px" } }, h("button", { class: "btn primary", text: "📝 Test yourself →", onclick: () => go(`#/t/${id}/quiz`) })));
    } else if (tab === "quiz") {
      Quiz(body, t.quiz, { id, onDone: () => go(`#/t/${id}/practice`) });
    } else {
      body.append(h("p", { class: "topic-sub", text: t.track === "dsa" ? "Interview-style problems. Try each one yourself first (search the name on LeetCode or NeetCode), then reveal the hint and the approach." : "Design exercises. Sketch your answer on paper first, then compare with the outline." }));
      t.practice.forEach((p) => {
        const mk = (label, text) => { const r = h("div", { class: "reveal" }, h("button", { class: "btn small", text: label, onclick: () => r.classList.toggle("open") }), h("div", { class: "body", html: text })); return r; };
        body.append(h("div", { class: "card prob" }, h("h3", null, p.name, h("span", { class: "badge " + p.diff, text: p.diff })), p.desc ? h("p", { text: p.desc }) : null,
          h("div", { class: "controls", style: { margin: 0, alignItems: "flex-start" } }, mk("💡 Hint", p.hint), mk("✅ Approach", p.sol))));
      });
    }
    main.append(h("div", { class: "nav-foot" },
      i > 0 ? h("button", { class: "btn", text: `← ${list[i - 1].icon} ${list[i - 1].title}`, onclick: () => go(`#/t/${list[i - 1].id}`) }) : h("span"),
      i < list.length - 1 ? h("button", { class: "btn", text: `${list[i + 1].icon} ${list[i + 1].title} →`, onclick: () => go(`#/t/${list[i + 1].id}`) }) : h("span")));
  }

  function challenge(track) {
    const pool = L.topics.filter((t) => track === "all" || t.track === track).flatMap((t) => t.quiz.map((q) => ({ ...q, q: `<span class="badge">${t.icon} ${t.title}</span><br>${q.q}` })));
    main.append(h("div", { class: "topic-head" }, h("span", { class: "ico", text: "🎲" }), h("h1", { text: track === "all" ? "Daily challenge" : `${TRACKS[track]} quiz` })),
      h("p", { class: "topic-sub", text: "10 random questions from across the topics. A new mix every time." }));
    const box = h("div");
    main.append(box);
    Quiz(box, shuffle(pool).slice(0, 10), { onDone: () => go("#/") });
  }

  /* Visit counting: one GoatCounter page view per topic (tabs are not counted separately) */
  let lastTracked = null;
  function track(path, title, tries = 0) {
    if (path === lastTracked) return;
    const gc = window.goatcounter;
    if (!gc || !gc.count) { if (tries < 20) setTimeout(() => track(path, title, tries + 1), 500); return; }
    lastTracked = path;
    gc.count({ path, title });
  }

  function route() {
    Player.stopAll(); Timers.clearAll();
    clear(main); main.scrollTop = 0; sidebar.classList.remove("open");
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    if (parts[0] === "t" && byId(parts[1])) { topic(parts[1], parts[2]); renderNav(parts[1]); track(`/t/${parts[1]}`, byId(parts[1]).title); }
    else if (parts[0] === "challenge") { challenge(parts[1] || "all"); renderNav("challenge"); track(`/challenge/${parts[1] || "all"}`, "Daily challenge"); }
    else { home(); renderNav(); track("/", "Home"); }
    renderXP();
  }
  window.addEventListener("hashchange", route);
  document.querySelector(".brand").onclick = () => go("#/");
  document.querySelector(".menu-btn").onclick = () => sidebar.classList.toggle("open");
  route();
})();
