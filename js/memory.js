/* "In memory" views: how each data structure is laid out in RAM.
   L.mem.render draws a strip of memory cells with addresses, values, labels and pointer arrows. */
(function () {
  const { h, s, clear, Player } = L;
  const hex = (n) => "0x" + n.toString(16).toUpperCase();
  const FILL = { a: "rgba(124,140,255,.22)", b: "rgba(79,209,197,.22)", c: "rgba(246,173,85,.25)", d: "rgba(246,135,179,.25)", hl: "rgba(246,224,94,.5)", ok: "rgba(72,187,120,.38)", bad: "rgba(245,101,101,.32)", dead: "rgba(128,128,128,.14)" };
  const STROKE = { a: "#7c8cff", b: "#4fd1c5", c: "#f6ad55", d: "#f687b3", hl: "#f6e05e", ok: "#48bb78", bad: "#f56565", dead: "#777" };

  /* frame: { cells:[{v, tag, cls}], cols, base, size, down, rowLabels, arrows:[[from,to,color]], note } */
  function render(stage, f) {
    const cols = f.cols || 8, size = f.size || 4, base = f.base ?? 0x1000;
    const cw = 84, ch = 40, rh = 80, padX = f.rowLabels ? 86 : 10, padY = 24;
    const rows = Math.ceil(f.cells.length / cols);
    const W = padX + cols * cw + 10, H = padY + rows * rh;
    const svg = s("svg", { class: "viz", viewBox: `0 0 ${W} ${H}`, style: `min-width:${Math.min(W, 1000)}px;max-width:${W * 1.25}px` });
    const id = "m" + Math.random().toString(36).slice(2, 7);
    svg.append(s("defs", null, s("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0,0 L10,5 L0,10 z", fill: "context-stroke" }))));
    const P = (i) => ({ x: padX + (i % cols) * cw, y: padY + Math.floor(i / cols) * rh });
    if (f.rowLabels) f.rowLabels.forEach((t, r) => t && svg.append(s("text", { x: 4, y: padY + r * rh + 25, text: t, style: "fill:var(--muted);font-size:12px;font-weight:700" })));
    f.cells.forEach((c, i) => {
      const { x, y } = P(i);
      const addr = f.down ? base - i * size : base + i * size;
      const free = !c || c.v === undefined;
      svg.append(s("text", { x: x + 4, y: y - 5, text: hex(addr), style: "fill:var(--muted);font-size:10px" }));
      svg.append(s("rect", { x: x + 2, y, width: cw - 4, height: ch, rx: 6, fill: free ? "none" : FILL[c.cls] || "var(--panel)", stroke: free ? "var(--line)" : STROKE[c.cls] || "var(--line)", "stroke-width": free ? 1 : 2, "stroke-dasharray": free ? "4 3" : null }));
      if (!free) svg.append(s("text", { x: x + cw / 2, y: y + 25, "text-anchor": "middle", text: String(c.v), style: `font-weight:700;font-size:${String(c.v).length > 8 ? 11 : 13}px` }));
      if (c && c.tag) svg.append(s("text", { x: x + cw / 2, y: y + ch + 14, "text-anchor": "middle", text: c.tag, style: "fill:var(--accent2);font-size:11px" }));
    });
    (f.arrows || []).forEach(([a, b, col]) => {
      if (a == null || b == null || a === b) return;
      const p = P(a), q = P(b);
      const x1 = p.x + cw / 2, y1 = p.y + ch / 2, x2 = q.x + cw / 2, y2 = q.y - 1;
      const bend = Math.max(30, Math.abs(x2 - x1) * 0.25);
      svg.append(s("path", { d: `M${x1},${y1} C${x1},${y1 - bend} ${x2},${y2 - bend} ${x2},${y2}`, fill: "none", stroke: col || "#f6ad55", "stroke-width": 2, opacity: .9, "marker-end": `url(#${id})` }));
    });
    clear(stage).append(svg, f.note ? h("div", { class: "caption", style: { marginTop: "8px" }, html: f.note }) : null);
  }

  /* Common shell: optional controls row, a stage, a player and a legend */
  function shell(root, intro, controls, legendItems) {
    if (intro) root.append(h("p", { class: "topic-sub", html: intro }));
    if (controls && controls.length) root.append(h("div", { class: "controls" }, controls));
    const stage = h("div", { class: "stage" });
    root.append(stage);
    const player = Player(root, (f) => render(stage, f));
    if (legendItems) root.append(h("div", { class: "legend" }, legendItems.map(([c, t]) => h("span", null, h("i", { style: { background: STROKE[c] || c } }), t))));
    return player;
  }
  const btn = (t, fn, primary) => h("button", { class: "btn small" + (primary ? " primary" : ""), text: t, onclick: fn });
  const sel = (opts, onchange) => { const e = h("select", null, opts.map(([v, t]) => h("option", { value: v, text: t }))); e.onchange = () => onchange(e.value); return e; };
  const blank = (n) => Array.from({ length: n }, () => undefined);

  L.mem = { render };
  const M = (L.memViz = {});

  /* ---------- Big-O: why constant factors and cache lines matter ---------- */
  M["big-o"] = (root) => {
    const player = shell(root, "Big-O hides constants, but real hardware doesn't. RAM is read in <b>cache lines</b> of 64 bytes (8 × 8-byte values). An array scan loads 8 values per trip to RAM; a linked list may need a trip for every node. Both are O(n), but one can be ~10× faster.",
      [sel([["arr", "Scan an array (sequential)"], ["list", "Walk a linked list (scattered)"]], run)], [["hl", "being read"], ["ok", "in CPU cache (hit, ~1 ns)"], ["bad", "cache miss (~100 ns trip to RAM)"]]);
    function run(mode) {
      const F = [], N = 32;
      if (mode === "arr") {
        const cached = new Set(); let misses = 0;
        for (let i = 0; i < 16; i++) {
          const line = Math.floor(i / 8), miss = !cached.has(line);
          if (miss) { misses++; cached.add(line); }
          const cells = blank(N).map((_, k) => (k < 24 ? { v: k * 3, tag: `a[${k}]`, cls: cached.has(Math.floor(k / 8)) ? "ok" : "a" } : undefined));
          cells[i] = { v: i * 3, tag: `a[${i}]`, cls: miss ? "bad" : "hl" };
          F.push({ cells, size: 8, rowLabels: ["line 0", "line 1", "line 2", "free"], msg: miss ? `Read a[${i}]: <b>cache miss</b>. The CPU loads the whole 64-byte line (a[${line * 8}]..a[${line * 8 + 7}]) at once.` : `Read a[${i}]: <b>cache hit</b>, it came along with the line. Misses so far: ${misses}/${i + 1}` });
        }
      } else {
        const slots = [26, 3, 17, 9, 30, 12, 21, 5];
        for (let k = 0; k < slots.length; k++) {
          const cells = blank(N);
          slots.forEach((sl, j) => (cells[sl] = { v: `node${j}`, tag: j < slots.length - 1 ? `next→${hex(0x1000 + slots[j + 1] * 8)}` : "next=null", cls: j < k ? "ok" : "a" }));
          cells[slots[k]] = { v: `node${k}`, tag: "reading", cls: "bad" };
          F.push({ cells, size: 8, arrows: slots.slice(0, -1).map((sl, j) => [sl, slots[j + 1]]), msg: `Follow the pointer to node${k} at ${hex(0x1000 + slots[k] * 8)}: it's in a different cache line, so <b>another miss</b> (${k + 1} misses for ${k + 1} nodes).` });
        }
      }
      player.load(F);
    }
    run("arr");
  };

  /* ---------- Arrays: address arithmetic + dynamic resizing ---------- */
  M.arrays = (root) => {
    const idx = h("input", { type: "number", value: 3, min: 0, max: 5 });
    const player = shell(root, "An <code>int[]</code> is one contiguous block. Each int is 4 bytes, so the address of <code>a[i]</code> is <b>base + i × 4</b>: one multiplication and one addition, whatever the size. That's O(1) access.",
      [h("label", null, "index i", idx), btn("Compute address", () => lookup(+idx.value), 1), btn("Append past capacity (resize)", resize)], [["a", "array element"], ["hl", "accessed"], ["c", "new block"], ["dead", "old block (freed)"]]);
    const vals = [12, 7, 30, 5, 18, 42];
    const base = (cells, extra) => ({ cells, size: 4, base: 0x1000, ...extra });
    function lookup(i) {
      i = Math.max(0, Math.min(5, i | 0));
      const cells = vals.map((v, k) => ({ v, tag: `a[${k}]`, cls: k === i ? "hl" : "a" })).concat(blank(10));
      player.load([base(cells, { msg: `a[${i}] → 0x1000 + ${i} × 4 = <b>${hex(0x1000 + i * 4)}</b>. The CPU jumps straight there, no scanning.` })]);
    }
    function resize() {
      const F = [], cap = 4, old = [3, 8, 1, 9];
      const row = (newBlock, k, dead) => {
        const cells = old.map((v, j) => ({ v, tag: `old[${j}]`, cls: dead ? "dead" : j === k ? "hl" : "a" })).concat(blank(4));
        newBlock.forEach((v, j) => (cells[8 + j] = v === undefined ? { tag: `new[${j}]` } : { v, tag: `new[${j}]`, cls: j === k ? "hl" : "c" }));
        return cells.concat(blank(16 - cells.length));
      };
      F.push(base(row([], -1).slice(0, 16), { msg: `ArrayList / Python list / JS array with capacity ${cap}, size ${cap}. It's full. Where does the next element go? The bytes right after it may belong to something else.` }));
      const nb = blank(8);
      F.push(base(row(nb, -1), { msg: "Allocate a <b>new block twice as big</b> (capacity 8) somewhere else in memory." }));
      old.forEach((v, k) => { nb[k] = v; F.push(base(row(nb.slice(), k), { msg: `Copy element ${k} (${v}) to the new block` })); });
      nb[4] = 6; F.push(base(row(nb.slice(), 4), { msg: "Write the new element 6. Now there's room for 3 more appends at O(1) each." }));
      F.push(base(row(nb.slice(), -1, true), { msg: "Free the old block. One resize costs O(n), but doubling makes it rare, so appends average out to <b>O(1) amortized</b>." }));
      player.load(F);
    }
    lookup(3);
  };

  /* ---------- Sliding window: strings are byte arrays; the window is two integers ---------- */
  M["sliding-window"] = (root) => {
    const player = shell(root, "A string is an array of bytes (here ASCII: 'a' = 97). The 'window' isn't copied anywhere: it's just two integers, L and R, living in CPU registers or on the stack. That's why sliding is O(1) per step.", null, [["a", "string byte"], ["b", "inside window"], ["c", "local variable (stack)"]]);
    const str = "abcabcbb", F = [];
    const seen = {}; let l = 0, best = 0;
    const frame = (r, msg) => {
      const cells = [...str].map((c, i) => ({ v: `'${c}' ${c.charCodeAt(0)}`, tag: `s[${i}]`, cls: i >= l && i <= r ? "b" : "a" }));
      const vars = [{ v: l, tag: "L", cls: "c" }, { v: r, tag: "R", cls: "c" }, { v: best, tag: "best", cls: "c" }, ...blank(5)];
      F.push({ cells: cells.concat(vars), size: 1, rowLabels: ["heap: s", "stack"], arrows: [[8, l, "#f6ad55"], [9, Math.max(r, 0), "#4fd1c5"]], msg });
    };
    for (let r = 0; r < str.length; r++) {
      const c = str[r];
      if (seen[c] >= l) { l = seen[c] + 1; }
      seen[c] = r; best = Math.max(best, r - l + 1);
      frame(r, `R = ${r} ('${c}'). Window s[${l}..${r}] = "${str.slice(l, r + 1)}". Only L and R change, no characters move.`);
    }
    player.load(F);
  };

  /* ---------- Binary search: probes jump around the array ---------- */
  M["binary-search"] = (root) => {
    const t = h("input", { type: "number", value: 61 });
    const player = shell(root, "Each probe reads <code>a[mid]</code> by address arithmetic. On a huge array the first probes land far apart (each one likely a cache miss), but there are only ~log₂ n of them.", [h("label", null, "target", t), btn("Search", () => run(+t.value), 1)], [["a", "element"], ["hl", "probe"], ["dead", "eliminated"], ["ok", "found"]]);
    const arr = [3, 9, 14, 21, 27, 33, 38, 44, 50, 57, 61, 66, 72, 80, 88, 95];
    function run(x) {
      const F = []; let lo = 0, hi = arr.length - 1;
      const cells = (mid, found) => arr.map((v, i) => ({ v, tag: `a[${i}]`, cls: i === mid ? (found ? "ok" : "hl") : i < lo || i > hi ? "dead" : "a" }));
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        F.push({ cells: cells(mid, arr[mid] === x), size: 4, msg: `mid = ${mid} → address 0x1000 + ${mid}×4 = <b>${hex(0x1000 + mid * 4)}</b>, value ${arr[mid]}` });
        if (arr[mid] === x) break;
        if (arr[mid] < x) lo = mid + 1; else hi = mid - 1;
        F.push({ cells: cells(-1), size: 4, msg: `Discard half. ${hi - lo + 1} candidates left.` });
      }
      if (lo > hi) F.push({ cells: cells(-1), size: 4, msg: `${x} isn't in the array.` });
      player.load(F);
    }
    run(61);
  };

  /* ---------- Sorting: in-place vs extra buffer ---------- */
  M.sorting = (root) => {
    const player = shell(root, "Quick sort and heap sort rearrange elements <b>in place</b> (O(1) or O(log n) extra memory). Merge sort needs a second buffer of n elements. Here's one merge step of merge sort, with the array on row 1 and the temporary buffer on row 2.", null, [["a", "array"], ["b", "left run"], ["d", "right run"], ["c", "temp buffer"], ["hl", "being written"]]);
    const a = [5, 12, 19, 30, 2, 8, 21, 40], F = [], tmp = blank(8);
    const fr = (wi, ti, msg, arrows) => F.push({ cells: a.map((v, i) => ({ v, tag: `a[${i}]`, cls: i === wi ? "hl" : i < 4 ? "b" : "d" })).concat(tmp.map((v, i) => (v === undefined ? { tag: `tmp[${i}]` } : { v, tag: `tmp[${i}]`, cls: i === ti ? "hl" : "c" }))), size: 4, rowLabels: ["array", "buffer"], arrows, msg });
    fr(-1, -1, "Two sorted halves: [5,12,19,30] and [2,8,21,40]. To merge them we need somewhere to write.");
    let i = 0, j = 4;
    for (let k = 0; k < 8; k++) {
      const takeL = j >= 8 || (i < 4 && a[i] <= a[j]); const from = takeL ? i++ : j++;
      tmp[k] = a[from]; fr(from, k, `Smaller front is ${a[from]} → tmp[${k}]`, [[from, 8 + k, "#f6e05e"]]);
    }
    tmp.forEach((v, k) => (a[k] = v));
    fr(-1, -1, "Copy tmp back into the array. That extra buffer is why merge sort uses <b>O(n) extra memory</b>, which matters when sorting gigabytes.");
    player.load(F);
  };

  /* ---------- Linked list: nodes scattered across the heap ---------- */
  M["linked-list"] = (root) => {
    let nodes, order, free;
    const reset = () => { nodes = { 18: 12, 10: 7, 28: 30, 14: 5 }; order = [18, 10, 28, 14]; free = [22, 12, 26]; };
    const player = shell(root, "Each node is allocated separately on the <b>heap</b>, wherever there's free space. A node holds its value plus the <b>address</b> of the next node (8 bytes on a 64-bit machine). The variable <code>head</code> lives on the stack.",
      [btn("Traverse", traverse, 1), btn("Insert 42 at head", insHead), btn("Delete 2nd node", delSecond), btn("Reset", () => { reset(); show("Fresh list: 12 → 7 → 30 → 5"); })], [["c", "head pointer (stack)"], ["a", "value"], ["b", "next pointer"], ["hl", "current"], ["dead", "garbage (unreachable)"]]);
    function frame(hlSlot, msg, garbage = []) {
      const cells = blank(32);
      cells[0] = { v: order.length ? hex(0x1000 + order[0] * 8) : "null", tag: "head", cls: "c" };
      const arrows = order.length ? [[0, order[0], "#f6ad55"]] : [];
      order.forEach((sl, k) => {
        const nx = order[k + 1];
        cells[sl] = { v: nodes[sl], tag: "val", cls: sl === hlSlot ? "hl" : "a" };
        cells[sl + 1] = { v: nx ? hex(0x1000 + nx * 8) : "null", tag: "next", cls: "b" };
        if (nx) arrows.push([sl + 1, nx, "#4fd1c5"]);
      });
      garbage.forEach(([sl, v]) => { cells[sl] = { v, tag: "val", cls: "dead" }; cells[sl + 1] = { v: "…", tag: "next", cls: "dead" }; });
      return { cells, size: 8, rowLabels: ["stack", "heap", "heap", "heap"], arrows, msg };
    }
    const show = (msg) => player.load([frame(-1, msg)]);
    function traverse() {
      const F = [frame(-1, "cur = head")];
      order.forEach((sl) => F.push(frame(sl, `cur → ${hex(0x1000 + sl * 8)}: value ${nodes[sl]}. Next address is stored right after it. Jump there.`)));
      F.push(frame(-1, "next = null → end. Notice the jumps go back and forth across memory (bad for the CPU cache)."));
      player.load(F);
    }
    function insHead() {
      if (!free.length) return show("Out of free slots in this demo. Press Reset.");
      const sl = free.shift(), F = [];
      nodes[sl] = 42;
      const tmpOrder = order; order = [sl, ...tmpOrder];
      F.push(frame(sl, `malloc / new Node(42): the allocator finds a free spot at ${hex(0x1000 + sl * 8)}. new.next = old head.`));
      F.push(frame(-1, "head = address of the new node. Nothing else moved: O(1)."));
      player.load(F);
    }
    function delSecond() {
      if (order.length < 2) return show("Need at least 2 nodes.");
      const victim = order[1], v = nodes[victim];
      const F = [frame(victim, `Delete ${v}: set first.next = victim.next`)];
      order = order.filter((x) => x !== victim); delete nodes[victim]; free.push(victim);
      F.push(frame(-1, `Unlinked. The old node is now unreachable: Java/JS/Python's garbage collector frees it later; in C you'd call free().`, [[victim, v]]));
      F.push(frame(-1, "Its memory can be reused by the next allocation."));
      player.load(F);
    }
    reset(); show("12 → 7 → 30 → 5 → null. Logically in a line, physically scattered.");
  };

  /* ---------- Stacks & queues: array stack, circular queue, call stack ---------- */
  M["stack-queue"] = (root) => {
    const player = shell(root, null, [sel([["stack", "Stack on an array (top index)"], ["queue", "Queue as a circular buffer"], ["call", "The CPU call stack"]], run)], [["a", "element"], ["c", "index variable"], ["hl", "changed"], ["dead", "logically empty"]]);
    function run(mode) {
      const F = [];
      if (mode === "stack") {
        const arr = blank(8); let top = 0;
        const fr = (k, msg) => F.push({ cells: arr.map((v, i) => (v === undefined ? { tag: `data[${i}]` } : { v, tag: `data[${i}]`, cls: i === k ? "hl" : i < top ? "a" : "dead" })).concat([{ v: top, tag: "top", cls: "c" }, ...blank(7)]), size: 4, rowLabels: ["array", "fields"], arrows: [[8, Math.max(0, top - 1), "#f6ad55"]], msg });
        fr(-1, "A stack is usually just an array plus one integer: <code>top</code> (the count).");
        [4, 9, 2].forEach((v) => { arr[top] = v; top++; fr(top - 1, `push(${v}): data[top] = ${v}; top++ → O(1)`); });
        top--; fr(top, `pop() → ${arr[top]}: just top--. The value is still in memory but no longer counts.`);
        arr[top] = 7; top++; fr(top - 1, "push(7) overwrites the old slot.");
      } else if (mode === "queue") {
        const arr = blank(6); let head = 0, tail = 0, n = 0;
        const fr = (k, msg) => F.push({ cells: arr.map((v, i) => { const live = n && ((head <= (tail - 1 + 6) % 6) ? i >= head && i <= (tail - 1 + 6) % 6 : i >= head || i <= (tail - 1 + 6) % 6); return v === undefined ? { tag: `buf[${i}]` } : { v, tag: `buf[${i}]`, cls: i === k ? "hl" : live ? "a" : "dead" }; }).concat([{ v: head, tag: "head", cls: "c" }, { v: tail, tag: "tail", cls: "c" }, ...blank(4)]), cols: 6, size: 4, rowLabels: ["buffer", "fields"], arrows: [[6, head, "#f6ad55"], [7, tail, "#4fd1c5"]], msg });
        const enq = (v) => { arr[tail] = v; tail = (tail + 1) % 6; n++; fr((tail + 5) % 6, `enqueue(${v}) at tail, then tail = (tail+1) % 6 = ${tail}`); };
        const deq = () => { const v = arr[head]; head = (head + 1) % 6; n--; fr(-1, `dequeue() → ${v}; head = ${head}. Nothing shifts! (list.pop(0) would shift everything.)`); };
        fr(-1, "A fixed array with head and tail indices that wrap around: a <b>ring buffer</b>.");
        [1, 2, 3, 4, 5].forEach(enq); deq(); deq(); deq(); enq(6); enq(7);
        F[F.length - 1].msg = "tail wrapped around to the start of the array. Used by keyboard buffers, audio, network cards, and Java's ArrayDeque.";
      } else {
        const frames = [];
        const fr = (msg, hl) => F.push({ cells: frames.flat().concat(blank(Math.max(0, 12 - frames.flat().length))), cols: 3, size: 8, base: 0x7ff0, down: true, rowLabels: frames.map((f) => f.name).concat(blank(4 - frames.length)), msg });
        const push = (name, cells) => { const f = cells.map((c) => ({ ...c, cls: "a" })); f.name = name; frames.push(f); };
        push("main()", [{ v: 10, tag: "x" }, { v: "-", tag: "" }, { v: "OS", tag: "return addr" }]); fr("main() starts. Its local x lives in a <b>stack frame</b>. Note the addresses go DOWN: the stack grows toward lower addresses.");
        push("square(10)", [{ v: 10, tag: "n" }, { v: "?", tag: "result" }, { v: "main+12", tag: "return addr" }]); fr("main calls square(10): push a new frame with the argument and the return address.");
        push("mul(10,10)", [{ v: 10, tag: "a" }, { v: 10, tag: "b" }, { v: "square+8", tag: "return addr" }]); fr("square calls mul: another frame. The CPU's stack pointer (SP) register points at the newest frame.");
        frames.pop(); frames[1][1] = { v: 100, tag: "result", cls: "hl" }; fr("mul returns 100: its frame is popped (SP moves back up). Instant 'free'.");
        frames.pop(); frames[0][1] = { v: 100, tag: "y", cls: "hl" }; fr("square returns. That's why local variables vanish after a function returns, and why infinite recursion causes a <b>stack overflow</b>.");
      }
      player.load(F);
    }
    run("stack");
  };

  /* ---------- Hash tables: bucket array + chained entries, or open addressing ---------- */
  M.hashing = (root) => {
    const player = shell(root, null, [sel([["chain", "Separate chaining (Java HashMap)"], ["open", "Open addressing (Python dict)"]], run)], [["c", "bucket pointer"], ["a", "key"], ["b", "value / next"], ["hl", "just written"]]);
    const keys = [["cat", 1], ["dog", 2], ["act", 3], ["bird", 4], ["owl", 5]];
    const hash = (k) => [...k].reduce((a, c) => a + c.charCodeAt(0), 0);
    function run(mode) {
      const F = [];
      if (mode === "chain") {
        const M = 5, buckets = Array(M).fill(null), entries = [], slots = [8, 11, 16, 19, 24];
        const fr = (msg, hl) => {
          const cells = blank(32), arrows = [];
          buckets.forEach((b, i) => { cells[i] = { v: b == null ? "null" : hex(0x1000 + b * 8), tag: `bucket[${i}]`, cls: "c" }; if (b != null) arrows.push([i, b, "#f6ad55"]); });
          entries.forEach((e) => { cells[e.slot] = { v: e.k, tag: "key", cls: e.slot === hl ? "hl" : "a" }; cells[e.slot + 1] = { v: e.v, tag: "value", cls: "b" }; cells[e.slot + 2] = { v: e.next == null ? "null" : hex(0x1000 + e.next * 8), tag: "next", cls: "b" }; if (e.next != null) arrows.push([e.slot + 2, e.next, "#4fd1c5"]); });
          F.push({ cells, size: 8, rowLabels: ["table", "entries", "entries", "entries"], arrows, msg });
        };
        fr("The table is an array of 5 pointers (buckets). Entries are separate objects on the heap.");
        keys.forEach(([k, v], n) => {
          const b = hash(k) % M, slot = slots[n];
          entries.push({ k, v, slot, next: buckets[b] }); buckets[b] = slot;
          fr(`put("${k}", ${v}): hash = ${hash(k)}, ${hash(k)} % ${M} = <b>${b}</b>. New entry at ${hex(0x1000 + slot * 8)} is linked at the front of bucket ${b}${entries.filter((e) => e.next === slot).length || entries.find((e) => e.slot === slot).next != null ? " (collision → chain)" : ""}.`, slot);
        });
      } else {
        const M = 8, table = blank(M);
        const fr = (msg, hl, probe) => F.push({ cells: table.map((e, i) => (e ? { v: `${e[0]}:${e[1]}`, tag: `slot[${i}]`, cls: i === hl ? "hl" : "a" } : { tag: `slot[${i}]`, ...(i === probe ? { v: "?", cls: "bad" } : {}) })), size: 16, msg });
        fr("Open addressing keeps all entries inside one array. No pointers, very cache friendly.");
        keys.forEach(([k, v]) => {
          let i = hash(k) % M, steps = 0;
          while (table[i]) { fr(`"${k}" wants slot ${hash(k) % M} but slot ${i} is taken → probe the next slot`, -1, i); i = (i + 1) % M; steps++; }
          table[i] = [k, v]; fr(`put("${k}"): hash % 8 = ${hash(k) % M}${steps ? `, found free slot ${i} after ${steps} probe(s)` : ""}`, i);
        });
        F.push({ ...F[F.length - 1], msg: "When the array gets ~2/3 full, Python allocates a bigger one and re-inserts everything (rehash)." });
      }
      player.load(F);
    }
    run("chain");
  };

  /* ---------- Recursion: the call stack ---------- */
  M.recursion = (root) => {
    const player = shell(root, "Every recursive call gets its own <b>stack frame</b> holding its arguments, locals and the return address. Here's <code>fact(4)</code>.", null, [["a", "frame data"], ["hl", "active frame"], ["ok", "returned value"]]);
    const F = [], frames = [];
    const fr = (msg) => F.push({ cells: frames.flatMap((f, i) => f.map((c) => ({ ...c, cls: c.cls || (i === frames.length - 1 ? "hl" : "a") }))).concat(blank(Math.max(0, 15 - frames.length * 3))), cols: 3, size: 8, base: 0x7ff0, down: true, rowLabels: frames.map((f) => f.name).concat(blank(5 - frames.length)), msg });
    for (let n = 4; n >= 1; n--) { const f = [{ v: n, tag: "n" }, { v: "?", tag: "result" }, { v: n === 4 ? "main" : `fact(${n + 1})`, tag: "return to" }]; f.name = `fact(${n})`; frames.push(f); fr(n > 1 ? `fact(${n}) needs fact(${n - 1}) first → push a new frame` : "fact(1) hits the base case: no more calls"); }
    let val = 1;
    for (let n = 1; n <= 4; n++) { val *= n; frames[frames.length - 1][1] = { v: val, tag: "result", cls: "ok" }; fr(`fact(${n}) = ${val}${n < 4 ? ", return it to the caller and pop this frame" : ". Done!"}`); if (n < 4) frames.pop(); }
    F.push({ ...F[F.length - 1], msg: "Depth n → n frames → O(n) memory. With depth 100,000 you'd overflow the stack, which is why deep recursion is often rewritten as a loop." });
    player.load(F);
  };

  /* ---------- Trees: nodes with left/right pointers ---------- */
  M.trees = (root) => {
    const player = shell(root, "Each tree node is a small heap object: <b>[left pointer | value | right pointer]</b>. The variable <code>root</code> holds the address of the top node.", [btn("Build tree", build, 1), btn("Search 60", () => search(60))], [["c", "root pointer"], ["b", "left / right pointer"], ["a", "value"], ["hl", "visiting"]]);
    const vals = [50, 30, 70, 20, 40, 60, 80], slotOf = [12, 0, 21, 6, 3, 15, 24];
    function snapshot(n, hl, msg) {
      const nodes = {}; const cells = blank(36), arrows = [];
      cells[0] = undefined;
      const ins = (v, i) => { nodes[v] = { slot: 9 + slotOf[i], l: null, r: null }; if (i === 0) return; let cur = vals[0]; while (true) { const nd = nodes[cur]; if (v < cur) { if (nd.l == null) { nd.l = v; break; } cur = nd.l; } else { if (nd.r == null) { nd.r = v; break; } cur = nd.r; } } };
      vals.slice(0, n).forEach(ins);
      const stack = [{ v: n ? hex(0x1000 + nodes[50].slot * 8) : "null", tag: "root", cls: "c" }];
      Object.entries(nodes).forEach(([v, nd]) => {
        const p = (x) => (x == null ? "null" : hex(0x1000 + nodes[x].slot * 8));
        cells[nd.slot] = { v: p(nd.l), tag: "left", cls: "b" }; cells[nd.slot + 1] = { v: +v, tag: "value", cls: +v === hl ? "hl" : "a" }; cells[nd.slot + 2] = { v: p(nd.r), tag: "right", cls: "b" };
        if (nd.l != null) arrows.push([nd.slot, nodes[nd.l].slot + 1, "#4fd1c5"]); if (nd.r != null) arrows.push([nd.slot + 2, nodes[nd.r].slot + 1, "#f687b3"]);
      });
      if (n) arrows.push([0, nodes[50].slot + 1, "#f6ad55"]);
      return { cells: stack.concat(blank(8), cells.slice(9)), cols: 9, size: 8, rowLabels: ["stack", "heap", "heap", "heap", "heap"], arrows, msg };
    }
    function build() { player.load(vals.map((v, i) => snapshot(i + 1, v, `insert ${v}: allocate a node somewhere free, then write its address into the parent's ${i ? "left/right" : "root"} slot`))); }
    function search(x) {
      const F = []; let cur = 50, path = [];
      while (cur != null) { path.push(cur); F.push(snapshot(7, cur, `At ${cur}: ${x === cur ? "found!" : x < cur ? "go left: load the address in the left slot" : "go right: load the address in the right slot"}`)); if (x === cur) break; cur = x < cur ? ({ 50: 30, 30: 20, 70: 60 })[cur] : ({ 50: 70, 30: 40, 70: 80 })[cur]; }
      F.push(snapshot(7, x, `Found ${x} after following ${path.length - 1} pointers (= depth). Balanced tree → log n hops.`));
      player.load(F);
    }
    player.load([snapshot(7, -1, "A BST with 7 nodes. Arrows are just addresses stored in memory.")]);
  };

  /* ---------- Heaps: a tree that lives in a plain array ---------- */
  M.heaps = (root) => {
    const player = shell(root, "A binary heap needs <b>no pointers at all</b>. The tree shape is implied by index math: children of i are at 2i+1 and 2i+2, parent at (i−1)/2. Compact and cache friendly.", [btn("Index math", math, 1), btn("Insert 3", ins)], [["a", "element"], ["hl", "node i"], ["b", "children"], ["c", "parent"]]);
    const base = [5, 9, 8, 14, 11, 12, 10, 20, 17];
    const fr = (arr, cls, msg, arrows) => ({ cells: arr.map((v, i) => ({ v, tag: `h[${i}]`, cls: cls[i] || "a" })).concat(blank(Math.max(0, 12 - arr.length))), cols: 12, size: 4, arrows, msg });
    function math() {
      const F = [];
      [0, 1, 3].forEach((i) => F.push(fr(base, { [i]: "hl", [2 * i + 1]: "b", [2 * i + 2]: "b" }, `Node i=${i} (value ${base[i]}) at ${hex(0x1000 + i * 4)}. Children: 2·${i}+1 = ${2 * i + 1} and 2·${i}+2 = ${2 * i + 2} → ${hex(0x1000 + (2 * i + 1) * 4)} and ${hex(0x1000 + (2 * i + 2) * 4)}.`, [[i, 2 * i + 1, "#4fd1c5"], [i, 2 * i + 2, "#4fd1c5"]])));
      F.push(fr(base, { 7: "hl", 3: "c" }, `Parent of i=7 is (7−1)/2 = 3. No parent pointers needed.`, [[7, 3, "#f6ad55"]]));
      player.load(F);
    }
    function ins() {
      const a = base.slice(), F = []; a.push(3); let i = a.length - 1;
      F.push(fr(a, { [i]: "hl" }, "Append 3 at the end of the array (next free slot)"));
      while (i > 0) { const p = (i - 1) >> 1; if (a[p] <= a[i]) break; F.push(fr(a, { [i]: "hl", [p]: "c" }, `3 < parent ${a[p]} at index ${p} → swap the two array slots`, [[i, p, "#f6ad55"]])); [a[p], a[i]] = [a[i], a[p]]; i = p; }
      F.push(fr(a, { [i]: "ok" }, "Done: 3 is the new minimum at h[0]. Only O(log n) swaps, all inside one array."));
      player.load(F);
    }
    math();
  };

  /* ---------- Tries: one child-slot array per node ---------- */
  M.tries = (root) => {
    const player = shell(root, "A classic trie node is an <b>array of child pointers</b>, one per letter, plus an end-of-word flag. To keep it small, this demo only uses letters a–g (real ones use 26 slots, i.e. 26 × 8 = 208 bytes per node!).", null, [["c", "end-of-word flag"], ["b", "child pointer"], ["hl", "just written"]]);
    const L8 = ["end", "a", "b", "c", "d", "e", "f", "g"], F = [];
    const rows = [Array(8).fill(null)], names = ["root"];
    const fr = (msg, hr, hc) => {
      const cells = [], arrows = [];
      rows.forEach((r, ri) => r.forEach((v, ci) => {
        const isEnd = ci === 0;
        cells.push(isEnd ? { v: v ? "✓" : "–", tag: "end", cls: v ? "c" : undefined } : v == null ? { tag: L8[ci] } : { v: hex(0x1000 + v * 64), tag: L8[ci], cls: ri === hr && ci === hc ? "hl" : "b" });
        if (!isEnd && v != null) arrows.push([ri * 8 + ci, v * 8, "#4fd1c5"]);
      }));
      cells.forEach((c) => { if (c && c.v === "–") c.cls = "dead"; });
      F.push({ cells, size: 8, rowLabels: names.slice(), arrows, msg });
    };
    fr("Empty trie: one root node with 7 empty child slots.");
    ["bad", "bag", "be"].forEach((w) => {
      let cur = 0;
      [...w].forEach((ch, k) => {
        const ci = L8.indexOf(ch);
        if (rows[cur][ci] == null) { rows.push(Array(8).fill(null)); names.push('"' + w.slice(0, k + 1) + '"'); rows[cur][ci] = rows.length - 1; fr(`"${w}": no '${ch}' child → allocate a node for "${w.slice(0, k + 1)}" and store its address in slot '${ch}'`, cur, ci); }
        else fr(`"${w}": '${ch}' child exists → reuse the shared prefix "${w.slice(0, k + 1)}"`, cur, ci);
        cur = rows[cur][ci];
      });
      rows[cur][0] = true; fr(`Mark "${w}" as a word (end flag).`);
    });
    const used = rows.reduce((a, r) => a + r.slice(1).filter((x) => x != null).length, 0);
    F.push({ ...F[F.length - 1], msg: `${rows.length} nodes × 7 slots = ${rows.length * 7} pointer slots, but only ${used} are used. That's the trie memory trade-off: fast prefix lookups, lots of empty slots. Compact variants use hash maps or radix trees.` });
    player.load(F);
  };

  /* ---------- Graphs: matrix vs adjacency list ---------- */
  M.graphs = (root) => {
    const player = shell(root, "Same graph (A–B, A–C, B–D, C–D, D–E), two memory layouts.", [sel([["matrix", "Adjacency matrix"], ["list", "Adjacency list"]], run)], [["ok", "edge (1)"], ["a", "no edge (0)"], ["c", "head pointer"], ["b", "list node"], ["hl", "looking at"]]);
    const N = ["A", "B", "C", "D", "E"], E = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];
    const adj = N.map((_, i) => E.filter((e) => e.includes(i)).map((e) => (e[0] === i ? e[1] : e[0])));
    function run(mode) {
      const F = [];
      if (mode === "matrix") {
        const m = N.map((_, i) => N.map((_, j) => (adj[i].includes(j) ? 1 : 0)));
        const fr = (hi, msg) => F.push({ cells: m.flatMap((r, i) => r.map((v, j) => ({ v, tag: `${N[i]}→${N[j]}`, cls: i * 5 + j === hi ? "hl" : v ? "ok" : "a" }))), cols: 5, size: 1, rowLabels: N.map((n) => "row " + n), msg });
        fr(-1, "A V×V grid stored row by row. <b>V² cells</b> even if there are few edges: 1 million nodes → 10¹² cells. Way too big!");
        fr(1 * 5 + 3, `Is there an edge B–D? Read cell [1][3] at 0x1000 + (1×5 + 3) = <b>${hex(0x1000 + 8)}</b> → 1. O(1) check.`);
        fr(0 * 5 + 4, "Edge A–E? cell [0][4] → 0. Matrices shine for dense graphs and instant edge lookups.");
      } else {
        const slots = [], cells = blank(40), arrows = []; let nextSlot = 8;
        N.forEach((n, i) => { let prev = i; adj[i].forEach((j, k) => { const sl = nextSlot; nextSlot += 2; if (nextSlot % 8 === 1) nextSlot++; slots.push([i, j, sl]); cells[sl] = { v: N[j], tag: "neighbor", cls: "b" }; cells[sl + 1] = { v: k < adj[i].length - 1 ? hex(0x1000 + (sl + 2) * 8) : "null", tag: "next", cls: "b" }; arrows.push([prev === i ? i : prev, sl, prev === i ? "#f6ad55" : "#4fd1c5"]); prev = sl + 1; }); cells[i] = { v: hex(0x1000 + slots.find((x) => x[0] === i)[2] * 8), tag: `adj[${n}]`, cls: "c" }; });
        F.push({ cells, size: 8, rowLabels: ["heads", "nodes", "nodes", "nodes", "nodes"], arrows, msg: `An array of V head pointers, each starting a list of neighbours. Memory = V + 2E entries (each undirected edge stored twice): ${N.length} + ${2 * E.length}. Great for sparse graphs (most real ones).` });
        const sD = slots.filter((x) => x[0] === 3);
        sD.forEach(([, j, sl]) => { const c = cells.slice(); c[sl] = { ...c[sl], cls: "hl" }; F.push({ cells: c, size: 8, rowLabels: ["heads", "nodes", "nodes", "nodes", "nodes"], arrows, msg: `Neighbours of D: follow adj[D] → ${N[j]}. Iterating neighbours costs O(degree), not O(V).` }); });
        F.push({ ...F[0], msg: "In Python/JS you'd write {A: ['B','C'], ...}. Under the hood that's a hash map of dynamic arrays, the same idea." });
      }
      player.load(F);
    }
    run("matrix");
  };

  /* ---------- Shortest paths: dist / prev / done arrays ---------- */
  M["shortest-path"] = (root) => {
    const player = shell(root, "Dijkstra keeps three arrays indexed by node number, plus a heap. Graph: A–B 4, A–C 1, C–B 2, B–D 1, C–D 5.", null, [["a", "dist"], ["b", "prev"], ["c", "done"], ["hl", "updated"]]);
    const N = ["A", "B", "C", "D"], W = { "0-1": 4, "0-2": 1, "2-1": 2, "1-3": 1, "2-3": 5 };
    const w = (u, v) => W[`${u}-${v}`] ?? W[`${v}-${u}`];
    const dist = [0, Infinity, Infinity, Infinity], prev = [null, null, null, null], done = [false, false, false, false], F = [];
    const fr = (hl, msg) => F.push({ cells: [...dist.map((d, i) => ({ v: d === Infinity ? "∞" : d, tag: `dist[${N[i]}]`, cls: hl === i ? "hl" : "a" })), ...prev.map((p, i) => ({ v: p == null ? "-" : N[p], tag: `prev[${N[i]}]`, cls: hl === i ? "hl" : "b" })), ...done.map((d, i) => ({ v: d ? "true" : "false", tag: `done[${N[i]}]`, cls: d ? "c" : "dead" }))], cols: 4, size: 4, rowLabels: ["dist[]", "prev[]", "done[]"], msg });
    fr(0, "Start: dist[A] = 0, everything else ∞. Arrays give O(1) reads/writes by node index.");
    for (let k = 0; k < 4; k++) {
      let u = -1; dist.forEach((d, i) => { if (!done[i] && (u < 0 || d < dist[u])) u = i; });
      done[u] = true; fr(u, `Pick ${N[u]} (smallest dist, from the heap). Mark done.`);
      N.forEach((_, v) => { const ww = w(u, v); if (ww != null && !done[v] && dist[u] + ww < dist[v]) { dist[v] = dist[u] + ww; prev[v] = u; fr(v, `Relax ${N[u]}→${N[v]}: dist[${N[v]}] = ${dist[v]}, prev[${N[v]}] = ${N[u]}`); } });
    }
    F.push({ ...F[F.length - 1], msg: "Follow prev[] backwards from D: D ← B ← C ← A. Path A→C→B→D, cost 4. Memory: O(V) for the arrays + O(E) for the heap." });
    player.load(F);
  };

  /* ---------- DP: a 2D table is one flat block (row-major) ---------- */
  M.dp = (root) => {
    const player = shell(root, "A 2D table <code>dp[3][4]</code> is really one flat block of 12 ints, stored <b>row by row</b>: dp[i][j] lives at base + (i × 4 + j) × 4. Example: unique paths in a 3×4 grid, dp[i][j] = dp[i−1][j] + dp[i][j−1].", null, [["a", "row 0"], ["b", "row 1"], ["d", "row 2"], ["hl", "computing"], ["c", "read from"]]);
    const R = 3, C = 4, dp = blank(R * C), F = [];
    const cls = ["a", "b", "d"];
    const fr = (cur, deps, msg) => F.push({ cells: dp.map((v, k) => (v === undefined ? { tag: `dp[${Math.floor(k / C)}][${k % C}]` } : { v, tag: `dp[${Math.floor(k / C)}][${k % C}]`, cls: k === cur ? "hl" : deps.includes(k) ? "c" : cls[Math.floor(k / C)] })), cols: 12, size: 4, arrows: deps.map((d) => [d, cur, "#f6ad55"]), msg });
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
      const k = i * C + j;
      if (i === 0 || j === 0) { dp[k] = 1; fr(k, [], `dp[${i}][${j}] = 1 (edge of the grid) at ${hex(0x1000 + k * 4)}`); }
      else { dp[k] = dp[k - C] + dp[k - 1]; fr(k, [k - C, k - 1], `dp[${i}][${j}] = up (${dp[k - C]}, ${C} cells back in memory) + left (${dp[k - 1]}, the cell right before) = ${dp[k]}`); }
    }
    F.push({ ...F[F.length - 1], msg: "Each row only reads the previous row, so you can keep just 2 rows (or 1) instead of the whole table: O(cols) memory instead of O(rows × cols). Filling row by row also matches memory order, which is cache friendly." });
    player.load(F);
  };

  /* ---------- Greedy & intervals: array of structs vs struct of arrays ---------- */
  M.greedy = (root) => {
    const player = shell(root, "Intervals are stored as pairs. Two common layouts, and what sorting actually moves in memory.", null, [["a", "start"], ["b", "end"], ["hl", "moved by the sort"]]);
    const iv = [[1, 4], [3, 5], [0, 6], [5, 7]], sorted = iv.slice().sort((a, b) => a[1] - b[1]);
    const aos = (arr, hl) => arr.flatMap(([s0, e], i) => [{ v: s0, tag: `iv[${i}].start`, cls: hl ? "hl" : "a" }, { v: e, tag: `iv[${i}].end`, cls: hl ? "hl" : "b" }]);
    player.load([
      { cells: aos(iv), size: 4, msg: "<b>Array of structs</b>: [start, end] pairs side by side. Java <code>int[][]</code>, Python list of tuples, JS array of objects (each pair is actually a separate heap object with a pointer in those languages)." },
      { cells: aos(sorted, true), size: 4, msg: "After sorting by end time, whole pairs moved together. In Java/Python/JS only the <i>pointers</i> to the pair objects move, which is cheaper than copying data." },
      { cells: [...iv.map((x, i) => ({ v: x[0], tag: `starts[${i}]`, cls: "a" })), ...iv.map((x, i) => ({ v: x[1], tag: `ends[${i}]`, cls: "b" }))], cols: 4, size: 4, rowLabels: ["starts[]", "ends[]"], msg: "<b>Struct of arrays</b>: all starts together, all ends together. The 'meeting rooms' trick sorts starts and ends <i>independently</i>, which is easy in this layout." },
    ]);
  };
})();
