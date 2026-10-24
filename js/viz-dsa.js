/* DSA visualizers. Each L.viz.<name>(root) builds its UI into root. */
(function () {
  const { h, s, clear, rand, shuffle, parseNums, Player } = L;

  const legend = (items) => h("div", { class: "legend" }, items.map(([c, t]) => h("span", null, h("i", { style: { background: c } }), t)));
  const randArr = (n, lo = 5, hi = 99) => Array.from({ length: n }, () => rand(lo, hi));
  const uniqSorted = (n) => { const set = new Set(); while (set.size < n) set.add(rand(1, 99)); return [...set].sort((a, b) => a - b); };

  function renderCells(stage, vals, { cls = {}, ptrs = {}, idx = true } = {}) {
    clear(stage);
    const row = h("div", { class: "cells" });
    vals.forEach((v, i) => {
      const labels = Object.entries(ptrs).filter(([, p]) => p === i).map(([k]) => k).join(" ");
      row.appendChild(h("div", { class: "cell " + (cls[i] || "") }, String(v),
        idx ? h("span", { class: "idx", text: i }) : null,
        labels ? h("span", { class: "ptr", text: "↓" + labels }) : null));
    });
    stage.appendChild(row);
  }

  /* ================= Big-O growth ================= */
  L.viz.bigO = (root) => {
    const fns = [
      ["O(1)", () => 1, "#48bb78"],
      ["O(log n)", (n) => Math.max(1, Math.log2(n)), "#4fd1c5"],
      ["O(n)", (n) => n, "#7c8cff"],
      ["O(n log n)", (n) => n * Math.max(1, Math.log2(n)), "#f6e05e"],
      ["O(n²)", (n) => n * n, "#f6ad55"],
      ["O(2ⁿ)", (n) => Math.pow(2, n), "#f56565"],
      ["O(n!)", (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }, "#f687b3"],
    ];
    const nIn = h("input", { type: "range", min: 1, max: 40, value: 10 });
    const nLbl = h("b", { text: "10" });
    const chart = h("div", { class: "stage" });
    const table = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, h("label", null, "input size n =", nLbl, nIn), h("span", { class: "badge", text: "Assume 1 operation ≈ 1 nanosecond" })),
      h("div", { class: "viz-split" }, chart, table));
    function fmtTime(ops) {
      const ns = ops; if (!isFinite(ns)) return "∞";
      if (ns < 1e3) return ns.toFixed(0) + " ns"; if (ns < 1e6) return (ns / 1e3).toFixed(1) + " µs";
      if (ns < 1e9) return (ns / 1e6).toFixed(1) + " ms"; if (ns < 6e10) return (ns / 1e9).toFixed(1) + " s";
      if (ns < 3.6e12) return (ns / 6e10).toFixed(1) + " min"; if (ns < 3.15e16) return (ns / 3.6e12).toFixed(1) + " hours";
      const yrs = ns / 3.15e16; return yrs > 1e6 ? yrs.toExponential(1) + " years" : yrs.toFixed(0) + " years";
    }
    function draw() {
      const n = +nIn.value; nLbl.textContent = n;
      const W = 600, H = 280, maxY = 120;
      const svg = s("svg", { class: "viz", viewBox: `0 -15 ${W} ${H + 45}` });
      for (let g = 0; g <= 4; g++) { const y = H - (g / 4) * H; svg.append(s("line", { x1: 30, x2: W, y1: y, y2: y, stroke: "currentColor", opacity: .1 }), s("text", { x: 0, y: y + 4, text: Math.round((g / 4) * maxY), class: "w" })); }
      fns.forEach(([name, f, color]) => {
        let pts = [];
        for (let x = 1; x <= 40; x += 0.25) { const v = f(Math.round(x * 4) / 4 >= 1 ? x : 1); if (v > maxY * 1.05) break; pts.push(`${30 + ((x - 1) / 39) * (W - 40)},${H - (v / maxY) * H}`); }
        svg.append(s("polyline", { points: pts.join(" "), fill: "none", stroke: color, "stroke-width": 3 }));
        const last = pts[pts.length - 1].split(",");
        svg.append(s("text", { x: Math.min(+last[0] + 4, W - 70), y: Math.max(+last[1] - 4, 12), text: name, fill: color, style: `fill:${color}` }));
      });
      const xn = 30 + ((n - 1) / 39) * (W - 40);
      svg.append(s("line", { x1: xn, x2: xn, y1: 0, y2: H, stroke: "#f6e05e", "stroke-dasharray": "5 4" }), s("text", { x: xn + 4, y: H + 20, text: "n=" + n }));
      clear(chart).append(svg);
      clear(table).append(h("h4", { text: `Operations at n = ${n}` }), ...fns.map(([name, f, color]) => {
        const v = f(n);
        return h("div", { style: { margin: "6px 0" } }, h("b", { style: { color }, text: name }), " ",
          h("span", { class: "mono", text: v > 1e15 ? v.toExponential(2) : Math.round(v).toLocaleString() }),
          h("div", { style: { color: "var(--muted)", fontSize: "12px" }, text: "≈ " + fmtTime(v) }));
      }));
    }
    nIn.oninput = draw; draw();
    root.append(h("p", { class: "callout tip", html: "Drag n to 30+ and watch O(2ⁿ) and O(n!) explode. That's why interviewers care: an O(n²) solution may pass for n = 1,000 but fail for n = 10⁵." }));
  };

  /* ================= Sorting ================= */
  const SORTS = {
    bubble: { name: "Bubble Sort", info: "Time O(n²) · Space O(1) · stable", gen: bubble },
    selection: { name: "Selection Sort", info: "Time O(n²) · Space O(1) · not stable", gen: selection },
    insertion: { name: "Insertion Sort", info: "Time O(n²), O(n) when nearly sorted · Space O(1) · stable", gen: insertion },
    merge: { name: "Merge Sort", info: "Time O(n log n) always · Space O(n) · stable", gen: mergeSort },
    quick: { name: "Quick Sort", info: "Time O(n log n) avg, O(n²) worst · Space O(log n) · not stable", gen: quickSort },
    heap: { name: "Heap Sort", info: "Time O(n log n) · Space O(1) · not stable", gen: heapSort },
  };
  function recorder(a) {
    const F = [], sorted = new Set();
    return { F, sorted, push: (cls, msg) => F.push({ arr: a.slice(), cls, sorted: [...sorted], msg }) };
  }
  function bubble(a) {
    const r = recorder(a), n = a.length;
    for (let i = 0; i < n; i++) {
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {
        r.push({ [j]: "c-cmp", [j + 1]: "c-cmp" }, `Compare <b>${a[j]}</b> and <b>${a[j + 1]}</b>`);
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swapped = true; r.push({ [j]: "c-swap", [j + 1]: "c-swap" }, `${a[j + 1]} > ${a[j]} → swap. The larger value bubbles right.`); }
      }
      r.sorted.add(n - 1 - i);
      if (!swapped) { for (let k = 0; k < n; k++) r.sorted.add(k); r.push({}, "No swaps in this pass → array is sorted (early exit)."); break; }
      r.push({}, `Pass ${i + 1} done: <b>${a[n - 1 - i]}</b> is in its final place.`);
    }
    return r.F;
  }
  function selection(a) {
    const r = recorder(a), n = a.length;
    for (let i = 0; i < n; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) {
        r.push({ [m]: "c-pivot", [j]: "c-cmp" }, `Current min is <b>${a[m]}</b>; check <b>${a[j]}</b>`);
        if (a[j] < a[m]) m = j;
      }
      if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; r.push({ [i]: "c-swap", [m]: "c-swap" }, `Swap min <b>${a[i]}</b> into position ${i}`); }
      r.sorted.add(i);
      r.push({}, `Position ${i} fixed with <b>${a[i]}</b>`);
    }
    return r.F;
  }
  function insertion(a) {
    const r = recorder(a), n = a.length;
    r.sorted.add(0);
    for (let i = 1; i < n; i++) {
      let j = i;
      r.push({ [i]: "c-pivot" }, `Take <b>${a[i]}</b> and insert it into the sorted left part`);
      while (j > 0 && a[j - 1] > a[j]) {
        r.push({ [j - 1]: "c-cmp", [j]: "c-pivot" }, `${a[j - 1]} > ${a[j]} → shift left`);
        [a[j - 1], a[j]] = [a[j], a[j - 1]]; j--;
        r.push({ [j]: "c-swap", [j + 1]: "c-swap" }, "Swapped");
      }
      for (let k = 0; k <= i; k++) r.sorted.add(k);
      r.push({ [j]: "c-pivot" }, `<b>${a[j]}</b> placed at index ${j}. First ${i + 1} elements are sorted.`);
    }
    return r.F;
  }
  function mergeSort(a) {
    const r = recorder(a);
    function range(lo, hi, extra = {}) { const c = {}; for (let k = lo; k <= hi; k++) c[k] = "c-range"; return Object.assign(c, extra); }
    function sort(lo, hi) {
      if (lo >= hi) return;
      const mid = (lo + hi) >> 1;
      r.push(range(lo, hi), `Split [${lo}..${hi}] into [${lo}..${mid}] and [${mid + 1}..${hi}]`);
      sort(lo, mid); sort(mid + 1, hi);
      const L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1);
      let i = 0, j = 0, k = lo;
      while (i < L.length || j < R.length) {
        const takeL = j >= R.length || (i < L.length && L[i] <= R[j]);
        a[k] = takeL ? L[i++] : R[j++];
        r.push(range(lo, hi, { [k]: "c-swap" }), `Merge: write <b>${a[k]}</b> to index ${k}${i <= L.length && j <= R.length ? " (smaller of the two fronts)" : ""}`);
        k++;
      }
      if (lo === 0 && hi === a.length - 1) for (let x = 0; x < a.length; x++) r.sorted.add(x);
      r.push(range(lo, hi), `Merged [${lo}..${hi}] is sorted`);
    }
    sort(0, a.length - 1);
    r.push({}, "Done!");
    return r.F;
  }
  function quickSort(a) {
    const r = recorder(a);
    function qs(lo, hi) {
      if (lo > hi) return;
      if (lo === hi) { r.sorted.add(lo); r.push({}, `Single element ${a[lo]} is in place`); return; }
      const p = a[hi]; let i = lo;
      r.push({ [hi]: "c-pivot" }, `Partition [${lo}..${hi}] with pivot <b>${p}</b> (last element)`);
      for (let j = lo; j < hi; j++) {
        r.push({ [hi]: "c-pivot", [j]: "c-cmp", [i]: "c-range" }, `Is ${a[j]} < ${p}? ${a[j] < p ? "Yes → move to left side" : "No"}`);
        if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; if (i !== j) r.push({ [hi]: "c-pivot", [i]: "c-swap", [j]: "c-swap" }, "Swap into the 'less than pivot' zone"); i++; }
      }
      [a[i], a[hi]] = [a[hi], a[i]];
      r.sorted.add(i);
      r.push({ [i]: "c-pivot" }, `Pivot <b>${p}</b> lands at index ${i}: everything left is smaller, right is larger`);
      qs(lo, i - 1); qs(i + 1, hi);
    }
    qs(0, a.length - 1);
    for (let x = 0; x < a.length; x++) r.sorted.add(x);
    r.push({}, "Done!");
    return r.F;
  }
  function heapSort(a) {
    const r = recorder(a), n = a.length;
    function sift(i, size) {
      while (true) {
        let big = i; const l = 2 * i + 1, rr = 2 * i + 2;
        if (l < size && a[l] > a[big]) big = l;
        if (rr < size && a[rr] > a[big]) big = rr;
        r.push({ [i]: "c-pivot", ...(l < size ? { [l]: "c-cmp" } : {}), ...(rr < size ? { [rr]: "c-cmp" } : {}) }, `Sift-down at ${i}: compare with children`);
        if (big === i) return;
        [a[i], a[big]] = [a[big], a[i]];
        r.push({ [i]: "c-swap", [big]: "c-swap" }, "Swap with larger child");
        i = big;
      }
    }
    for (let i = (n >> 1) - 1; i >= 0; i--) sift(i, n);
    r.push({}, "Max-heap built: the largest element is at index 0");
    for (let end = n - 1; end > 0; end--) {
      [a[0], a[end]] = [a[end], a[0]]; r.sorted.add(end);
      r.push({ [0]: "c-swap", [end]: "c-swap" }, `Move max <b>${a[end]}</b> to the end`);
      sift(0, end);
    }
    r.sorted.add(0); r.push({}, "Done!");
    return r.F;
  }
  L.viz.sorting = (root) => {
    const algo = h("select", null, Object.entries(SORTS).map(([k, v]) => h("option", { value: k, text: v.name })));
    const size = h("input", { type: "range", min: 5, max: 40, value: 14 });
    const custom = h("input", { type: "text", placeholder: "custom e.g. 5,3,8,1" });
    const info = h("span", { class: "badge" });
    const stage = h("div", { class: "stage bars-wrap" });
    let base = randArr(14);
    root.append(
      h("div", { class: "controls" }, algo, h("label", null, "size", size),
        h("button", { class: "btn small", text: "🎲 Random", onclick: () => { base = randArr(+size.value); run(); } }),
        h("button", { class: "btn small", text: "Reversed", onclick: () => { base = randArr(+size.value).sort((a, b) => b - a); run(); } }),
        h("button", { class: "btn small", text: "Nearly sorted", onclick: () => { base = randArr(+size.value).sort((a, b) => a - b); const i = rand(0, base.length - 2); [base[i], base[i + 1]] = [base[i + 1], base[i]]; run(); } }),
        custom, h("button", { class: "btn small", text: "Use", onclick: () => { const v = parseNums(custom.value).slice(0, 40); if (v.length) { base = v; run(); } } })),
      h("div", { class: "controls" }, info), stage);
    const player = Player(root, (f) => {
      const max = Math.max(...f.arr, 1);
      const bars = h("div", { class: "bars" });
      f.arr.forEach((v, i) => bars.appendChild(h("div", { class: "bar " + (f.cls[i] || (f.sorted.includes(i) ? "c-sorted" : "")), style: { height: Math.max(4, (v / max) * 100) + "%" } }, f.arr.length <= 24 ? h("span", { text: v }) : null)));
      clear(stage).append(bars);
    });
    root.append(legend([["var(--yellow)", "comparing"], ["var(--bad)", "swap / write"], ["var(--pink)", "pivot / key"], ["var(--accent2)", "active range"], ["var(--good)", "final position"]]));
    function run() { const A = SORTS[algo.value]; info.textContent = A.info; const F = A.gen(base.slice()); F.unshift({ arr: base.slice(), cls: {}, sorted: [], msg: "Initial array. Press ▶ Play." }); player.load(F); }
    algo.onchange = run; size.onchange = () => { base = randArr(+size.value); run(); };
    run();
  };

  /* ================= Binary search ================= */
  L.viz.binarySearch = (root) => {
    let arr = uniqSorted(15);
    const target = h("input", { type: "number", value: arr[rand(0, 14)] });
    const mode = h("select", null, h("option", { value: "exact", text: "Find exact value" }), h("option", { value: "lower", text: "Lower bound (first ≥ target)" }));
    const stage = h("div", { class: "stage" });
    root.append(h("div", { class: "controls" }, mode, h("label", null, "target", target),
      h("button", { class: "btn primary small", text: "Search", onclick: run }),
      h("button", { class: "btn small", text: "🎲 New array", onclick: () => { arr = uniqSorted(15); target.value = arr[rand(0, 14)]; run(); } })), stage);
    const player = Player(root, (f) => renderCells(stage, arr, f));
    function run() {
      const t = +target.value, F = [];
      let lo = 0, hi = arr.length - 1;
      const dimOut = (lo, hi, extra) => { const c = {}; arr.forEach((_, i) => { if (i < lo || i > hi) c[i] = "dim"; }); return Object.assign(c, extra); };
      F.push({ cls: {}, ptrs: { lo, hi }, msg: `Search for <b>${t}</b> in a sorted array of ${arr.length}. Window = whole array.` });
      if (mode.value === "exact") {
        let found = false;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          F.push({ cls: dimOut(lo, hi, { [mid]: "hl" }), ptrs: { lo, hi, mid }, msg: `mid = (${lo}+${hi})/2 = ${mid}. arr[mid] = <b>${arr[mid]}</b>` });
          if (arr[mid] === t) { F.push({ cls: dimOut(lo, hi, { [mid]: "found" }), ptrs: { mid }, msg: `🎯 Found ${t} at index ${mid} in ${F.length - 1} probes (log₂(${arr.length}) ≈ ${Math.ceil(Math.log2(arr.length))}).` }); found = true; break; }
          if (arr[mid] < t) { lo = mid + 1; F.push({ cls: dimOut(lo, hi), ptrs: { lo, hi }, msg: `${arr[mid]} < ${t} → discard the left half. lo = ${lo}` }); }
          else { hi = mid - 1; F.push({ cls: dimOut(lo, hi), ptrs: { lo, hi }, msg: `${arr[mid]} > ${t} → discard the right half. hi = ${hi}` }); }
        }
        if (!found) F.push({ cls: dimOut(1, 0), ptrs: {}, msg: `lo > hi → <b>${t}</b> is not in the array.` });
      } else {
        hi = arr.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          F.push({ cls: dimOut(lo, hi - 1, { [mid]: "hl" }), ptrs: { lo, mid }, msg: `Range [${lo}, ${hi}). mid=${mid}, arr[mid]=${arr[mid]}` });
          if (arr[mid] < t) { lo = mid + 1; F.push({ cls: dimOut(lo, hi - 1), ptrs: { lo }, msg: `${arr[mid]} < ${t} → answer is right of mid. lo=${lo}` }); }
          else { hi = mid; F.push({ cls: dimOut(lo, hi - 1), ptrs: { lo }, msg: `${arr[mid]} ≥ ${t} → mid could be the answer, keep it. hi=${hi}` }); }
        }
        F.push({ cls: lo < arr.length ? { [lo]: "found" } : {}, ptrs: { ans: lo }, msg: lo < arr.length ? `First element ≥ ${t} is <b>${arr[lo]}</b> at index ${lo}.` : `All elements are < ${t}; answer = ${lo} (end).` });
      }
      player.load(F);
    }
    run();
  };

  /* ================= Two pointers & sliding window ================= */
  L.viz.twoPointers = (root) => {
    let arr = uniqSorted(12);
    const target = h("input", { type: "number", value: arr[2] + arr[9] });
    const stage = h("div", { class: "stage" });
    root.append(h("p", { class: "topic-sub", html: "<b>Problem:</b> in a <i>sorted</i> array, find two numbers that add up to the target (Two Sum II)." }),
      h("div", { class: "controls" }, h("label", null, "target", target), h("button", { class: "btn primary small", text: "Run", onclick: run }),
        h("button", { class: "btn small", text: "🎲 New", onclick: () => { arr = uniqSorted(12); target.value = arr[rand(0, 5)] + arr[rand(6, 11)]; run(); } })), stage);
    const player = Player(root, (f) => renderCells(stage, arr, f));
    function run() {
      const t = +target.value, F = [];
      let l = 0, r = arr.length - 1;
      while (l < r) {
        const sum = arr[l] + arr[r];
        const cls = {}; arr.forEach((_, i) => { if (i < l || i > r) cls[i] = "dim"; }); cls[l] = cls[r] = "hl";
        if (sum === t) { cls[l] = cls[r] = "found"; F.push({ cls, ptrs: { L: l, R: r }, msg: `${arr[l]} + ${arr[r]} = ${t} 🎯 Found in O(n), no extra memory.` }); player.load(F); return; }
        F.push({ cls, ptrs: { L: l, R: r }, msg: `${arr[l]} + ${arr[r]} = ${sum} ${sum < t ? `< ${t} → need bigger, move L right` : `> ${t} → need smaller, move R left`}` });
        sum < t ? l++ : r--;
      }
      F.push({ cls: {}, ptrs: {}, msg: "Pointers met: no pair sums to the target." });
      player.load(F);
    }
    run();
  };

  L.viz.slidingWindow = (root) => {
    const mode = h("select", null, h("option", { value: "uniq", text: "Longest substring without repeating chars" }), h("option", { value: "sum", text: "Max sum subarray of size k" }));
    const input = h("input", { type: "text", value: "abcabcbbxyz", style: { width: "220px" } });
    const kIn = h("input", { type: "number", value: 3, min: 1 });
    const stage = h("div", { class: "stage" });
    const side = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, mode, input, h("label", null, "k", kIn), h("button", { class: "btn primary small", text: "Run", onclick: run })),
      h("div", { class: "viz-split" }, stage, side));
    const player = Player(root, (f) => {
      renderCells(stage, f.vals, f);
      clear(side).append(h("h4", { text: "Window state" }), h("div", { html: f.side }));
    });
    mode.onchange = () => { input.value = mode.value === "uniq" ? "abcabcbbxyz" : "2 1 5 1 3 2 9 1"; run(); };
    function run() {
      const F = [];
      if (mode.value === "uniq") {
        const str = input.value.slice(0, 20), vals = [...str];
        const seen = new Map(); let l = 0, best = 0, bestL = 0;
        for (let r = 0; r < vals.length; r++) {
          const c = vals[r];
          if (seen.has(c) && seen.get(c) >= l) {
            const cls = win(l, r - 1); cls[r] = "bad"; cls[seen.get(c)] = "bad";
            F.push({ vals, cls, ptrs: { L: l, R: r }, msg: `'${c}' is already in the window → shrink: L jumps to ${seen.get(c) + 1}`, side: sideTxt(l, r - 1) });
            l = seen.get(c) + 1;
          }
          seen.set(c, r);
          if (r - l + 1 > best) { best = r - l + 1; bestL = l; }
          F.push({ vals, cls: win(l, r), ptrs: { L: l, R: r }, msg: `Expand R to '${c}'. Window "${str.slice(l, r + 1)}" length ${r - l + 1}`, side: sideTxt(l, r) });
        }
        F.push({ vals, cls: Object.fromEntries(Array.from({ length: best }, (_, i) => [bestL + i, "found"])), ptrs: {}, msg: `Answer: "<b>${str.substr(bestL, best)}</b>" (length ${best}). Each char enters and leaves once → O(n).`, side: `best = ${best}` });
        function sideTxt(l, r) { return `window: <code>${str.slice(l, r + 1) || "∅"}</code><br>set: {${[...new Set(str.slice(l, r + 1))].join(", ")}}<br>best so far: <b>${best}</b>`; }
      } else {
        const vals = parseNums(input.value).slice(0, 20), k = Math.max(1, Math.min(+kIn.value, vals.length));
        let sum = 0, best = -Infinity, bi = 0;
        for (let r = 0; r < vals.length; r++) {
          sum += vals[r];
          if (r >= k) sum -= vals[r - k];
          if (r >= k - 1) {
            if (sum > best) { best = sum; bi = r - k + 1; }
            F.push({ vals, cls: win(r - k + 1, r), ptrs: { L: r - k + 1, R: r }, msg: r >= k ? `Slide: add ${vals[r]}, remove ${vals[r - k]} → sum = ${sum}` : `First window sum = ${sum}`, side: `sum = <b>${sum}</b><br>best = <b>${best}</b>` });
          } else F.push({ vals, cls: win(0, r), ptrs: { R: r }, msg: `Building first window: sum = ${sum}`, side: `sum = ${sum}` });
        }
        F.push({ vals, cls: Object.fromEntries(Array.from({ length: k }, (_, i) => [bi + i, "found"])), ptrs: {}, msg: `Max sum of ${k} consecutive = <b>${best}</b>. O(n) instead of O(n·k).`, side: `best = ${best}` });
      }
      player.load(F);
    }
    function win(l, r) { const c = {}; for (let i = l; i <= r; i++) c[i] = "win"; return c; }
    run();
  };

  /* ================= Linked list ================= */
  L.viz.linkedList = (root) => {
    let vals = [12, 7, 30, 5];
    const val = h("input", { type: "number", value: 42 });
    const stage = h("div", { class: "stage" });
    const B = (t, fn) => h("button", { class: "btn small", text: t, onclick: () => fn(+val.value) });
    root.append(h("div", { class: "controls" }, h("label", null, "value", val),
      B("Insert head", insHead), B("Insert tail", insTail), B("Delete value", del), B("Search", search),
      h("button", { class: "btn small primary", text: "↺ Reverse", onclick: reverse }),
      h("button", { class: "btn small", text: "Find middle", onclick: middle })), stage);
    const player = Player(root, (f) => draw(f));
    const normal = (n) => Array.from({ length: n }, (_, i) => (i < n - 1 ? i + 1 : null));
    function draw({ vals, links, ptrs = {}, cls = {} }) {
      const W = Math.max(600, vals.length * 110 + 80), H = 190;
      const svg = s("svg", { class: "viz", viewBox: `0 0 ${W} ${H}`, style: `min-width:${W}px` });
      svg.append(s("defs", null, s("marker", { id: "arr", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" }))));
      const X = (i) => 50 + i * 110, Y = 85;
      links.forEach((t, i) => {
        if (t == null) { svg.append(s("text", { x: X(i) + 22, y: Y + 48, text: "∅", class: "w" })); return; }
        if (t === i + 1) svg.append(s("line", { x1: X(i) + 66, y1: Y, x2: X(t) - 4, y2: Y, class: "edge " + (cls["e" + i] || ""), "marker-end": "url(#arr)", style: "color:var(--muted)" }));
        else svg.append(s("path", { d: `M${X(i) + 10},${Y + 22} Q${(X(i) + X(t)) / 2 + 30},${Y + 75} ${X(t) + 50},${Y + 24}`, class: "edge " + (cls["e" + i] || "hl"), fill: "none", "marker-end": "url(#arr)", style: "color:var(--yellow)" }));
      });
      vals.forEach((v, i) => {
        const c = cls[i] === "cur" ? "var(--yellow)" : cls[i] === "found" ? "var(--good)" : cls[i] === "new" ? "var(--accent2)" : cls[i] === "del" ? "var(--bad)" : "var(--accent)";
        svg.append(s("rect", { x: X(i), y: Y - 20, width: 64, height: 40, rx: 8, fill: "var(--panel)", stroke: c, "stroke-width": 3 }),
          s("line", { x1: X(i) + 44, x2: X(i) + 44, y1: Y - 20, y2: Y + 20, stroke: c, "stroke-width": 2 }),
          s("text", { x: X(i) + 22, y: Y + 5, "text-anchor": "middle", text: v }),
          s("circle", { cx: X(i) + 54, cy: Y, r: 3, fill: c }));
        const labels = Object.entries(ptrs).filter(([, p]) => p === i).map(([k]) => k);
        labels.forEach((lb, k) => svg.append(s("text", { x: X(i) + 22, y: Y - 32 - k * 16, "text-anchor": "middle", text: lb + " ↓", style: "fill:var(--accent2);font-weight:700" })));
      });
      if (!vals.length) svg.append(s("text", { x: 50, y: Y, text: "head → ∅ (empty list)" }));
      clear(stage).append(svg);
    }
    const frame = (v, extra, msg) => ({ vals: v.slice(), links: normal(v.length), ...extra, msg });
    function show() { player.load([frame(vals, { ptrs: { head: 0 } }, `List: ${vals.join(" → ") || "empty"} → null`)]); }
    function insHead(v) {
      const nv = [v, ...vals];
      const F = [frame(nv, { cls: { 0: "new" }, ptrs: { new: 0, head: 1 } }, `Create node(${v}) and set new.next = head. O(1)`),
        frame(nv, { cls: { 0: "new" }, ptrs: { head: 0 } }, `Move head to the new node. Done in O(1)!`)];
      vals = nv; player.load(F, true);
    }
    function insTail(v) {
      const F = [];
      for (let i = 0; i < vals.length; i++) F.push(frame(vals, { cls: { [i]: "cur" }, ptrs: { head: 0, cur: i } }, i < vals.length - 1 ? `cur.next exists → keep walking` : `cur.next is null → this is the tail`));
      const nv = [...vals, v];
      F.push(frame(nv, { cls: { [nv.length - 1]: "new" }, ptrs: { head: 0 } }, `tail.next = node(${v}). O(n) walk (O(1) if you keep a tail pointer).`));
      vals = nv; player.load(F, true);
    }
    function del(v) {
      const F = []; const idx = vals.indexOf(v);
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] === v) {
          F.push(frame(vals, { cls: { [i]: "del" }, ptrs: { head: 0, cur: i, ...(i > 0 ? { prev: i - 1 } : {}) } }, i === 0 ? `Found ${v} at head → head = head.next` : `Found ${v}: set prev.next = cur.next to unlink it`));
          break;
        }
        F.push(frame(vals, { cls: { [i]: "cur" }, ptrs: { head: 0, cur: i } }, `${vals[i]} ≠ ${v}, move on`));
      }
      if (idx === -1) F.push(frame(vals, { ptrs: { head: 0 } }, `${v} not found`));
      else { vals = vals.filter((_, i) => i !== idx); F.push(frame(vals, { ptrs: { head: 0 } }, `Deleted. List: ${vals.join(" → ") || "empty"}`)); }
      player.load(F, true);
    }
    function search(v) {
      const F = [];
      let found = false;
      for (let i = 0; i < vals.length; i++) {
        const ok = vals[i] === v;
        F.push(frame(vals, { cls: { [i]: ok ? "found" : "cur" }, ptrs: { head: 0, cur: i } }, ok ? `Found ${v} at position ${i}` : `${vals[i]} ≠ ${v}`));
        if (ok) { found = true; break; }
      }
      if (!found) F.push(frame(vals, { ptrs: { head: 0 } }, `Reached null: ${v} not in list. Search is O(n), no random access!`));
      player.load(F, true);
    }
    function reverse() {
      const n = vals.length, links = normal(n), F = [];
      let prev = null, cur = 0;
      const p = () => { const o = { head: 0 }; if (prev != null) o.prev = prev; if (cur != null && cur < n) o.cur = cur; if (cur != null && cur + 1 < n) o.next = cur + 1; return o; };
      F.push({ vals: vals.slice(), links: links.slice(), ptrs: p(), msg: "prev = null, cur = head" });
      while (cur != null && cur < n) {
        const next = links[cur];
        links[cur] = prev;
        F.push({ vals: vals.slice(), links: links.slice(), ptrs: p(), cls: { [cur]: "cur", ["e" + cur]: "hl" }, msg: `Save next, then point cur(${vals[cur]}).next → ${prev == null ? "null" : vals[prev]}` });
        prev = cur; cur = next;
        F.push({ vals: vals.slice(), links: links.slice(), ptrs: p(), msg: "Advance: prev = cur, cur = next" });
      }
      F.push({ vals: vals.slice(), links: links.slice(), ptrs: prev != null ? { head: prev } : {}, cls: { [prev]: "found" }, msg: "cur is null → head = prev. Reversed in O(n) time, O(1) space." });
      vals = vals.slice().reverse();
      F.push(frame(vals, { ptrs: { head: 0 } }, `Result: ${vals.join(" → ")} → null`));
      player.load(F, true);
    }
    function middle() {
      const F = []; let sl = 0, fa = 0;
      F.push(frame(vals, { ptrs: { slow: sl, fast: fa } }, "Slow moves 1 step, fast moves 2 steps"));
      while (fa + 2 <= vals.length - 1 || fa + 1 <= vals.length - 1) {
        if (fa + 1 > vals.length - 1) break;
        sl += 1; fa += 2;
        if (fa > vals.length - 1) { F.push(frame(vals, { cls: { [sl]: "cur" }, ptrs: { slow: sl } }, "fast fell off the end")); break; }
        F.push(frame(vals, { cls: { [sl]: "cur" }, ptrs: { slow: sl, fast: fa } }, `slow → ${vals[sl]}, fast → ${vals[fa]}`));
      }
      F.push(frame(vals, { cls: { [sl]: "found" }, ptrs: { middle: sl } }, `When fast reaches the end, slow is at the middle: <b>${vals[sl]}</b>. Same trick detects cycles (Floyd).`));
      player.load(F, true);
    }
    show();
  };

  /* ================= Stack & Queue ================= */
  L.viz.stackQueue = (root) => {
    let stack = [3, 8], queue = [4, 9];
    const val = h("input", { type: "number", value: 5 });
    const st = h("div", { class: "side-panel", style: { minHeight: "220px" } });
    const qu = h("div", { class: "side-panel", style: { minHeight: "220px" } });
    const msg = h("div", { class: "caption", text: "Try push/pop and enqueue/dequeue." });
    const next = () => { val.value = rand(1, 99); };
    root.append(h("div", { class: "controls" }, h("label", null, "value", val)),
      h("div", { class: "two-col" },
        h("div", null, h("div", { class: "controls" }, h("b", { text: "Stack (LIFO)" }),
          h("button", { class: "btn small", text: "push", onclick: () => { stack.push(+val.value); say(`push(${val.value}): goes on top. O(1)`); next(); draw("s"); } }),
          h("button", { class: "btn small", text: "pop", onclick: () => { say(stack.length ? `pop() → ${stack.pop()} (last in, first out)` : "Stack underflow: empty!"); draw(); } }),
          h("button", { class: "btn small", text: "peek", onclick: () => say(stack.length ? `peek() → ${stack[stack.length - 1]}` : "empty") })), st),
        h("div", null, h("div", { class: "controls" }, h("b", { text: "Queue (FIFO)" }),
          h("button", { class: "btn small", text: "enqueue", onclick: () => { queue.push(+val.value); say(`enqueue(${val.value}): joins at the back. O(1)`); next(); draw("q"); } }),
          h("button", { class: "btn small", text: "dequeue", onclick: () => { say(queue.length ? `dequeue() → ${queue.shift()} (first in, first out)` : "Queue is empty!"); draw(); } })), qu)),
      msg);
    function say(t) { msg.innerHTML = t; }
    function draw(added) {
      clear(st).append(h("h4", { text: "top ↓" }), h("div", { style: { display: "flex", flexDirection: "column-reverse", gap: "4px", alignItems: "center" } },
        stack.map((v, i) => h("div", { class: "cell " + (i === stack.length - 1 ? "hl" : "") + (added === "s" && i === stack.length - 1 ? " fade-in" : ""), style: { width: "120px", height: "34px" } }, v))));
      clear(qu).append(h("h4", { text: "front → back" }), h("div", { style: { display: "flex", gap: "4px", flexWrap: "wrap" } },
        queue.map((v, i) => h("div", { class: "cell " + (i === 0 ? "hl" : "") + (added === "q" && i === queue.length - 1 ? " fade-in" : "") }, v))));
    }
    draw();

    // Balanced brackets stepper
    const expr = h("input", { type: "text", value: "{[()()]}(", style: { width: "200px" } });
    const stage = h("div", { class: "stage", style: { minHeight: "160px" } });
    root.append(h("h3", { text: "Stack in action: valid parentheses" }),
      h("div", { class: "controls" }, expr, h("button", { class: "btn primary small", text: "Check", onclick: run })), stage);
    const player = Player(root, (f) => {
      renderCells(stage, f.chars, { cls: f.cls, ptrs: f.ptrs, idx: false });
      stage.appendChild(h("div", null, h("b", { text: "stack: " }), f.stack.length ? f.stack.map((c) => h("span", { class: "chip", text: c })) : h("span", { class: "badge", text: "empty" })));
    });
    function run() {
      const chars = [...expr.value.slice(0, 18)], pair = { ")": "(", "]": "[", "}": "{" }, stk = [], F = [];
      let ok = true;
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if ("([{".includes(c)) { stk.push(c); F.push({ chars, cls: { [i]: "hl" }, ptrs: { i }, stack: stk.slice(), msg: `'${c}' opens → push` }); }
        else if (pair[c]) {
          if (stk[stk.length - 1] === pair[c]) { stk.pop(); F.push({ chars, cls: { [i]: "found" }, ptrs: { i }, stack: stk.slice(), msg: `'${c}' matches top '${pair[c]}' → pop` }); }
          else { ok = false; F.push({ chars, cls: { [i]: "bad" }, ptrs: { i }, stack: stk.slice(), msg: `'${c}' doesn't match ${stk.length ? `top '${stk[stk.length - 1]}'` : "an empty stack"} → <b>invalid</b>` }); break; }
        }
      }
      if (ok) F.push({ chars, cls: {}, ptrs: {}, stack: stk.slice(), msg: stk.length ? `End reached but stack still has ${stk.join("")} → <b>invalid</b> (unclosed)` : "End reached and stack is empty → <b>valid ✅</b>" });
      player.load(F);
    }
    run();
  };

  /* ================= Hash table ================= */
  L.viz.hashTable = (root) => {
    let m = 7, buckets = Array.from({ length: m }, () => []);
    const key = h("input", { type: "text", value: "cat" });
    const mSel = h("select", null, [5, 7, 11].map((v) => h("option", { value: v, text: `${v} buckets`, selected: v === 7 })));
    const stage = h("div", { class: "stage" });
    const words = ["dog", "apple", "tea", "eat", "bird", "zebra", "car", "act", "sun", "moon", "fish", "code"];
    root.append(h("div", { class: "controls" }, h("label", null, "key", key),
      h("button", { class: "btn small primary", text: "Insert", onclick: () => op("ins") }),
      h("button", { class: "btn small", text: "Search", onclick: () => op("find") }),
      h("button", { class: "btn small", text: "Delete", onclick: () => op("del") }),
      h("button", { class: "btn small", text: "+5 random keys", onclick: () => { shuffle(words).slice(0, 5).forEach((w) => { const b = hash(w); if (!buckets[b].includes(w)) buckets[b].push(w); }); player.load([fr({}, "Inserted 5 keys. Notice <b>collisions</b>: 'tea', 'eat' and 'ate' share letters so they always collide with this weak hash!")]); } }),
      mSel), stage);
    const player = Player(root, (f) => {
      clear(stage);
      const n = f.b.reduce((a, x) => a + x.length, 0);
      stage.append(h("div", { class: "controls" }, h("span", { class: "badge", text: `size n = ${n}` }), h("span", { class: "badge", text: `buckets m = ${f.b.length}` }), h("span", { class: "badge " + (n / f.b.length > 0.75 ? "hard" : ""), text: `load factor n/m = ${(n / f.b.length).toFixed(2)}` })));
      f.b.forEach((chain, i) => stage.append(h("div", { style: { display: "flex", alignItems: "center", gap: "6px", margin: "4px 0" } },
        h("div", { class: "cell " + (f.hl.bucket === i ? "hl" : ""), style: { width: "42px", height: "34px" } }, i), "→",
        chain.map((k) => h("span", { class: "chip " + (f.hl.key === k ? (f.hl.kind || "hl") : "") , text: k })),
        chain.length ? null : h("span", { class: "w", style: { color: "var(--muted)" }, text: "∅" }))));
    });
    const hash = (k) => [...k].reduce((a, c) => a + c.charCodeAt(0), 0) % m;
    const fr = (hl, msg) => ({ b: buckets.map((c) => c.slice()), hl, msg });
    mSel.onchange = () => { const all = buckets.flat(); m = +mSel.value; buckets = Array.from({ length: m }, () => []); all.forEach((k) => buckets[hash(k)].push(k)); player.load([fr({}, `Rehashed all keys into ${m} buckets. Every key may move! (This is why resizing is O(n).)`)]); };
    function op(kind) {
      const k = key.value.trim(); if (!k) return;
      const sum = [...k].reduce((a, c) => a + c.charCodeAt(0), 0), b = sum % m, F = [];
      F.push(fr({}, `hash("${k}") = sum of char codes = ${[...k].map((c) => c.charCodeAt(0)).join("+")} = ${sum}`));
      F.push(fr({ bucket: b }, `${sum} mod ${m} = <b>${b}</b> → go to bucket ${b} in O(1)`));
      const chain = buckets[b];
      let at = -1;
      chain.forEach((x, i) => { if (at >= 0) return; F.push(fr({ bucket: b, key: x }, `Compare chain entry "${x}" with "${k}"`)); if (x === k) at = i; });
      if (kind === "ins") {
        if (at >= 0) F.push(fr({ bucket: b, key: k, kind: "hl" }, `"${k}" already present, no duplicate`));
        else { chain.push(k); F.push(fr({ bucket: b, key: k, kind: "new" }, chain.length > 1 ? `Collision! Append "${k}" to the chain (separate chaining).` : `Bucket empty → store "${k}"`)); }
      } else if (kind === "find") F.push(fr({ bucket: b, key: at >= 0 ? k : null, kind: "new" }, at >= 0 ? `Found "${k}" ✅` : `"${k}" not found`));
      else { if (at >= 0) { F.push(fr({ bucket: b, key: k, kind: "old" }, `Remove "${k}"`)); chain.splice(at, 1); F.push(fr({ bucket: b }, "Deleted")); } else F.push(fr({ bucket: b }, `"${k}" not found`)); }
      player.load(F, true);
      key.value = shuffle(words)[0];
    }
    ["cat", "act", "dog"].forEach((w) => buckets[hash(w)].push(w));
    player.load([fr({}, "A hash table maps key → bucket index with a hash function. Insert a key to see how it's placed.")]);
  };

  /* ================= N-Queens backtracking ================= */
  L.viz.nQueens = (root) => {
    const nSel = h("select", null, [4, 5, 6, 8].map((v) => h("option", { value: v, text: `${v} × ${v}`, selected: v === 5 })));
    const mode = h("select", null, h("option", { value: "1", text: "Find first solution" }), h("option", { value: "all", text: "Find all solutions" }));
    const stage = h("div", { class: "stage", style: { display: "flex", gap: "24px", flexWrap: "wrap" } });
    root.append(h("p", { class: "topic-sub", text: "Place N queens so none attack each other. Backtracking = try, recurse, undo if it fails." }),
      h("div", { class: "controls" }, nSel, mode, h("button", { class: "btn primary small", text: "Solve", onclick: run })), stage);
    const player = Player(root, (f) => {
      const n = f.q.length; const board = h("div", { class: "board", style: { gridTemplateColumns: `repeat(${n}, 46px)` } });
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const isTry = f.try && f.try[0] === r && f.try[1] === c;
        board.appendChild(h("div", { class: "sq " + ((r + c) % 2 ? "d" : "l") + (isTry ? (f.conf ? " conf" : " try") : "") + (f.attack && f.attack.some(([a, b]) => a === r && b === c) ? " conf" : "") }, f.q[r] === c ? "♛" : ""));
      }
      clear(stage).append(board, h("div", { class: "side-panel" }, h("h4", { text: "Stats" }), h("div", { class: "kv" }, h("span", { text: "row" }), h("span", { text: f.row ?? "-" }), h("span", { text: "solutions" }), h("span", { text: f.sol }), h("span", { text: "steps" }), h("span", { text: f.steps }))));
    });
    function run() {
      const n = +nSel.value, q = Array(n).fill(-1), F = []; let sol = 0, steps = 0;
      const cap = 2500;
      const ok = (r, c) => { for (let i = 0; i < r; i++) if (q[i] === c || Math.abs(q[i] - c) === r - i) return [i, q[i]]; return null; };
      function place(r) {
        if (F.length > cap) return true;
        if (r === n) { sol++; F.push({ q: q.slice(), sol, steps, msg: `🎉 Solution #${sol} found!` }); return mode.value === "1"; }
        for (let c = 0; c < n; c++) {
          steps++;
          const hit = ok(r, c);
          if (hit) { F.push({ q: q.slice(), try: [r, c], conf: true, attack: [hit], row: r, sol, steps, msg: `Row ${r}, col ${c}: attacked by queen at (${hit[0]},${hit[1]}) ✗` }); continue; }
          q[r] = c; F.push({ q: q.slice(), try: [r, c], row: r, sol, steps, msg: `Row ${r}, col ${c} is safe → place queen, recurse to row ${r + 1}` });
          if (place(r + 1)) return true;
          q[r] = -1; F.push({ q: q.slice(), try: [r, c], conf: true, row: r, sol, steps, msg: `Dead end below → <b>backtrack</b>: remove queen from (${r},${c})` });
        }
        return false;
      }
      place(0);
      F.push({ q: q.slice(), sol, steps, msg: F.length > cap ? `Stopped after ${cap} steps (try a smaller board for "all"). Solutions so far: ${sol}` : `Finished. ${sol} solution(s), ${steps} placements tried. Pruning saved checking ${n}^${n} = ${Math.pow(n, n).toLocaleString()} boards.` });
      player.load(F);
    }
    run();
  };

  /* ================= Trees: shared layout ================= */
  function layoutBinary(root) {
    const pos = new Map(); let x = 0, maxD = 0;
    (function walk(n, d) { if (!n) return; walk(n.l, d + 1); pos.set(n, { x: x++, d }); maxD = Math.max(maxD, d); walk(n.r, d + 1); })(root, 0);
    return { pos, count: x, maxD };
  }
  function drawBinary(stage, tree, cls = {}, label) {
    const { pos, count, maxD } = layoutBinary(tree);
    const W = Math.max(500, count * 52 + 40), H = (maxD + 1) * 70 + 30;
    const svg = s("svg", { class: "viz", viewBox: `0 0 ${W} ${H}`, style: `max-height:${H + 20}px;min-width:${Math.min(W, 900)}px` });
    const X = (p) => 30 + p.x * ((W - 60) / Math.max(1, count - 1 || 1)), Y = (p) => 30 + p.d * 70;
    const edges = s("g"), nodes = s("g");
    pos.forEach((p, n) => {
      [n.l, n.r].forEach((c) => { if (c) { const q = pos.get(c); edges.append(s("line", { x1: X(p), y1: Y(p), x2: X(q), y2: Y(q), class: "edge " + (cls["e" + c.v] || "") })); } });
      nodes.append(s("g", { class: "node " + (cls[n.v] || "") }, s("circle", { cx: X(p), cy: Y(p), r: 19 }), s("text", { x: X(p), y: Y(p) + 5, "text-anchor": "middle", text: label ? label(n) : n.v })));
    });
    svg.append(edges, nodes);
    if (!tree) svg.append(s("text", { x: 20, y: 40, text: "(empty tree)" }));
    clear(stage).append(svg);
  }
  const cloneT = (n) => (n ? { v: n.v, l: cloneT(n.l), r: cloneT(n.r) } : null);

  /* ================= BST ================= */
  L.viz.bst = (root) => {
    let tree = null;
    const val = h("input", { type: "number", value: 40 });
    const stage = h("div", { class: "stage" });
    const out = h("div", { class: "side-panel" });
    const B = (t, fn, p) => h("button", { class: "btn small" + (p ? " primary" : ""), text: t, onclick: fn });
    root.append(h("div", { class: "controls" }, h("label", null, "value", val),
      B("Insert", () => ins(+val.value), 1), B("Search", () => find(+val.value)), B("Delete", () => del(+val.value)),
      B("🎲 Random tree", () => { tree = null; uniqSorted(9).sort(() => Math.random() - .5).forEach((v) => (tree = insertRaw(tree, v))); show("Random BST built"); }),
      B("Sorted inserts (worst case)", () => { tree = null; [10, 20, 30, 40, 50, 60].forEach((v) => (tree = insertRaw(tree, v))); show("Inserting sorted data makes a <b>degenerate</b> tree (a linked list): O(n) operations. Balanced trees (AVL / Red-Black) fix this."); })),
      h("div", { class: "controls" }, h("b", { text: "Traversals:" }), ["inorder", "preorder", "postorder", "level-order"].map((t) => B(t, () => trav(t)))),
      h("div", { class: "viz-split" }, stage, out));
    const player = Player(root, (f) => { drawBinary(stage, f.t, f.cls); clear(out).append(h("h4", { text: "Output / info" }), h("div", { html: f.out || "" })); });
    function insertRaw(n, v) { if (!n) return { v, l: null, r: null }; if (v < n.v) n.l = insertRaw(n.l, v); else if (v > n.v) n.r = insertRaw(n.r, v); return n; }
    const height = (n) => (n ? 1 + Math.max(height(n.l), height(n.r)) : 0);
    const info = () => `height = ${height(tree)}`;
    function show(msg) { player.load([{ t: cloneT(tree), cls: {}, msg, out: info() }]); }
    function walkPath(v, F, verb) {
      let n = tree;
      while (n) {
        F.push({ t: cloneT(tree), cls: { [n.v]: "cur" }, msg: `${verb} ${v}: at ${n.v}. ${v === n.v ? "Equal!" : v < n.v ? `${v} < ${n.v} → go left` : `${v} > ${n.v} → go right`}`, out: info() });
        if (v === n.v) return n;
        n = v < n.v ? n.l : n.r;
      }
      return null;
    }
    function ins(v) {
      const F = []; const hit = walkPath(v, F, "Insert");
      if (hit) F.push({ t: cloneT(tree), cls: { [v]: "path" }, msg: `${v} already exists`, out: info() });
      else { tree = insertRaw(tree, v); F.push({ t: cloneT(tree), cls: { [v]: "visited" }, msg: `Reached an empty spot → insert ${v} here. Cost = tree height.`, out: info() }); }
      player.load(F, true); val.value = rand(1, 99);
    }
    function find(v) {
      const F = []; const hit = walkPath(v, F, "Search");
      F.push({ t: cloneT(tree), cls: hit ? { [v]: "visited" } : {}, msg: hit ? `Found ${v} ✅` : `Hit null → ${v} not in tree`, out: info() });
      player.load(F, true);
    }
    function del(v) {
      const F = []; const hit = walkPath(v, F, "Delete");
      if (!hit) { F.push({ t: cloneT(tree), cls: {}, msg: `${v} not found`, out: info() }); return player.load(F, true); }
      let note;
      if (hit.l && hit.r) { let s = hit.r; while (s.l) s = s.l; note = `Two children → replace with in-order successor ${s.v} (smallest in right subtree), then delete the successor`; F.push({ t: cloneT(tree), cls: { [v]: "path", [s.v]: "cur" }, msg: note, out: info() }); }
      else note = hit.l || hit.r ? "One child → splice it up into this node's place" : "Leaf → just remove it";
      if (!(hit.l && hit.r)) F.push({ t: cloneT(tree), cls: { [v]: "path" }, msg: note, out: info() });
      tree = delRaw(tree, v);
      F.push({ t: cloneT(tree), cls: {}, msg: `Deleted ${v}`, out: info() });
      player.load(F, true);
    }
    function delRaw(n, v) {
      if (!n) return null;
      if (v < n.v) n.l = delRaw(n.l, v); else if (v > n.v) n.r = delRaw(n.r, v);
      else { if (!n.l) return n.r; if (!n.r) return n.l; let s = n.r; while (s.l) s = s.l; n.v = s.v; n.r = delRaw(n.r, s.v); }
      return n;
    }
    function trav(kind) {
      const F = [], order = [], visited = {};
      const push = (n, msg) => { order.push(n.v); visited[n.v] = "visited"; F.push({ t: cloneT(tree), cls: { ...visited, [n.v]: "cur" }, msg, out: `<b>${kind}</b>:<br><code>${order.join(", ")}</code>` }); };
      const go = (n) => {
        if (!n) return;
        if (kind === "preorder") push(n, `Visit ${n.v} (root first), then left, then right`);
        go(n.l);
        if (kind === "inorder") push(n, `Left done → visit ${n.v} → then right`);
        go(n.r);
        if (kind === "postorder") push(n, `Both children done → visit ${n.v}`);
      };
      if (kind === "level-order") { const q = tree ? [tree] : []; while (q.length) { const n = q.shift(); push(n, `Dequeue ${n.v}; enqueue its children (BFS)`); n.l && q.push(n.l); n.r && q.push(n.r); } }
      else go(tree);
      F.push({ t: cloneT(tree), cls: visited, msg: kind === "inorder" ? "In-order traversal of a BST gives <b>sorted</b> output!" : `${kind} complete`, out: `<b>${kind}</b>:<br><code>${order.join(", ")}</code>` });
      player.load(F, true);
    }
    [50, 30, 70, 20, 40, 60, 80].forEach((v) => (tree = insertRaw(tree, v)));
    show("A Binary Search Tree: left subtree < node < right subtree. Try inserting or a traversal.");
  };

  /* ================= Heap ================= */
  L.viz.heap = (root) => {
    let a = [];
    const val = h("input", { type: "number", value: 4 });
    const kind = h("select", null, h("option", { value: "min", text: "Min-heap" }), h("option", { value: "max", text: "Max-heap" }));
    const stage = h("div", { class: "stage" });
    const arrStage = h("div");
    root.append(h("div", { class: "controls" }, kind, h("label", null, "value", val),
      h("button", { class: "btn small primary", text: "Insert", onclick: () => ins(+val.value) }),
      h("button", { class: "btn small", text: "Extract top", onclick: extract }),
      h("button", { class: "btn small", text: "🎲 Build heap from random", onclick: build })), stage, arrStage);
    const better = (x, y) => (kind.value === "min" ? x < y : x > y);
    const player = Player(root, (f) => {
      const toTree = (i) => (i < f.a.length ? { v: i, l: toTree(2 * i + 1), r: toTree(2 * i + 2) } : null);
      const cls = {}; Object.entries(f.cls || {}).forEach(([i, c]) => (cls[i] = c));
      drawBinary(stage, f.a.length ? toTree(0) : null, cls, (n) => f.a[n.v]);
      renderCells(arrStage, f.a, { cls: Object.fromEntries(Object.entries(f.cls || {}).map(([i, c]) => [i, c === "cur" ? "hl" : c === "visited" ? "found" : ""])) });
      arrStage.appendChild(h("p", { class: "topic-sub", html: "Array view: children of i are at <code>2i+1</code> and <code>2i+2</code>, parent at <code>(i-1)/2</code>." }));
    });
    const fr = (cls, msg) => ({ a: a.slice(), cls, msg });
    function siftUp(i, F) {
      while (i > 0) {
        const p = (i - 1) >> 1;
        F.push(fr({ [i]: "cur", [p]: "frontier" }, `Compare ${a[i]} with parent ${a[p]}`));
        if (!better(a[i], a[p])) { F.push(fr({ [i]: "visited" }, "Heap property holds → stop")); return; }
        [a[i], a[p]] = [a[p], a[i]]; F.push(fr({ [p]: "cur" }, `Swap up`)); i = p;
      }
      F.push(fr({ 0: "visited" }, "Reached the root"));
    }
    function siftDown(i, F) {
      while (true) {
        let b = i; const l = 2 * i + 1, r = 2 * i + 2;
        if (l < a.length && better(a[l], a[b])) b = l;
        if (r < a.length && better(a[r], a[b])) b = r;
        if (b === i) { F.push(fr({ [i]: "visited" }, "No child is " + (kind.value === "min" ? "smaller" : "larger") + " → stop")); return; }
        F.push(fr({ [i]: "cur", [b]: "frontier" }, `${a[b]} is the ${kind.value === "min" ? "smaller" : "larger"} child → swap down`));
        [a[i], a[b]] = [a[b], a[i]]; i = b;
      }
    }
    function ins(v) {
      const F = []; a.push(v); F.push(fr({ [a.length - 1]: "cur" }, `Add ${v} at the end (keeps the tree complete)`)); siftUp(a.length - 1, F);
      F.push(fr({}, `Inserted in O(log n). Top = ${a[0]}`)); player.load(F, true); val.value = rand(1, 99);
    }
    function extract() {
      if (!a.length) return player.load([fr({}, "Heap is empty")]);
      const F = [], top = a[0]; F.push(fr({ 0: "path" }, `Top element is ${top}`));
      const last = a.pop(); if (a.length) { a[0] = last; F.push(fr({ 0: "cur" }, `Move last element ${last} to the root`)); siftDown(0, F); }
      F.push(fr({}, `Extracted ${top} in O(log n)`)); player.load(F, true);
    }
    function build() {
      a = randArr(10, 1, 99); const F = [fr({}, "Random array, not yet a heap. Heapify bottom-up from the last parent: O(n) total!")];
      for (let i = (a.length >> 1) - 1; i >= 0; i--) { F.push(fr({ [i]: "cur" }, `Heapify subtree at index ${i}`)); siftDown(i, F); }
      F.push(fr({}, "Valid heap built")); player.load(F, true);
    }
    kind.onchange = () => { a = []; [5, 3, 8, 1, 9, 2].forEach((v) => { a.push(v); siftUp(a.length - 1, []); }); player.load([fr({}, `${kind.value}-heap ready`)]); };
    kind.onchange();
  };

  /* ================= Trie ================= */
  L.viz.trie = (root) => {
    const mk = () => ({ kids: {}, end: false });
    let trie = mk();
    const word = h("input", { type: "text", value: "card" });
    const stage = h("div", { class: "stage" });
    root.append(h("div", { class: "controls" }, h("label", null, "word", word),
      h("button", { class: "btn small primary", text: "Insert", onclick: () => ins(word.value) }),
      h("button", { class: "btn small", text: "Search word", onclick: () => find(word.value, false) }),
      h("button", { class: "btn small", text: "Starts with (prefix)", onclick: () => find(word.value, true) }),
      h("button", { class: "btn small", text: "Autocomplete", onclick: () => auto(word.value) })), stage);
    const clone = (n) => ({ end: n.end, kids: Object.fromEntries(Object.entries(n.kids).map(([k, v]) => [k, clone(v)])) });
    const player = Player(root, (f) => draw(f.t, f.cls || {}));
    function draw(t, cls) {
      const pos = []; let leaf = 0;
      (function walk(n, d, p, ch) {
        const ks = Object.keys(n.kids).sort();
        const me = { d, p, ch, end: n.end, x: 0 }; pos.push(me);
        if (!ks.length) me.x = leaf++;
        else { const xs = ks.map((k) => walk(n.kids[k], d + 1, p + k, k).x); me.x = (xs[0] + xs[xs.length - 1]) / 2; }
        return me;
      })(t, 0, "", "•");
      const maxD = Math.max(...pos.map((p) => p.d)), W = Math.max(500, leaf * 46 + 40), H = maxD * 58 + 50;
      const X = (p) => 25 + p.x * ((W - 50) / Math.max(1, leaf - 1)), Y = (p) => 25 + p.d * 58;
      const svg = s("svg", { class: "viz", viewBox: `0 0 ${W} ${H}`, style: `min-width:${Math.min(W, 1000)}px` });
      const byP = Object.fromEntries(pos.map((p) => [p.p, p]));
      pos.forEach((p) => { if (p.d) { const par = byP[p.p.slice(0, -1)]; svg.append(s("line", { x1: X(par), y1: Y(par), x2: X(p), y2: Y(p), class: "edge " + (cls[p.p] ? "hl" : "") })); } });
      pos.forEach((p) => svg.append(s("g", { class: "node " + (cls[p.p] || "") + (p.end ? " end" : "") }, s("circle", { cx: X(p), cy: Y(p), r: 16 }), s("text", { x: X(p), y: Y(p) + 5, "text-anchor": "middle", text: p.ch }))));
      clear(stage).append(svg, legend([["var(--accent2)", "thick ring = end of a word"], ["var(--yellow)", "current"], ["var(--good)", "matched path"]]));
    }
    function ins(w) {
      w = w.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10); if (!w) return;
      const F = []; let n = trie, p = "";
      const vis = {};
      for (const c of w) {
        const existed = !!n.kids[c];
        if (!existed) n.kids[c] = mk();
        n = n.kids[c]; p += c; vis[p] = "visited";
        F.push({ t: clone(trie), cls: { ...vis, [p]: "cur" }, msg: existed ? `'${c}' already exists → reuse (shared prefix "${p}")` : `'${c}' missing → create node` });
      }
      n.end = true;
      F.push({ t: clone(trie), cls: vis, msg: `Mark "${w}" as a complete word. Insert is O(length of word).` });
      player.load(F, true);
    }
    function walk(w, F) {
      let n = trie, p = ""; const vis = {};
      for (const c of w) {
        if (!n.kids[c]) { F.push({ t: clone(trie), cls: vis, msg: `No child '${c}' after "${p}" → not found` }); return null; }
        n = n.kids[c]; p += c; vis[p] = "visited"; F.push({ t: clone(trie), cls: { ...vis, [p]: "cur" }, msg: `Follow '${c}'` });
      }
      return { n, vis };
    }
    function find(w, prefix) {
      w = w.toLowerCase(); const F = []; const r = walk(w, F);
      if (r) F.push({ t: clone(trie), cls: r.vis, msg: prefix ? `Prefix "${w}" exists ✅` : r.n.end ? `"${w}" is a word ✅` : `Path exists but "${w}" isn't marked as a word ✗` });
      player.load(F, true);
    }
    function auto(w) {
      w = w.toLowerCase(); const F = []; const r = walk(w, F);
      if (r) {
        const res = [], cls = { ...r.vis };
        (function dfs(n, p) { if (n.end) res.push(p); Object.keys(n.kids).sort().forEach((k) => { cls[p + k] = "path"; dfs(n.kids[k], p + k); }); })(r.n, w);
        F.push({ t: clone(trie), cls, msg: `Suggestions for "${w}": <b>${res.join(", ") || "none"}</b>` });
      }
      player.load(F, true);
    }
    ["car", "cart", "care", "cat", "dog", "do", "dot"].forEach((w) => { let n = trie; for (const c of w) n = n.kids[c] = n.kids[c] || mk(); n.end = true; });
    player.load([{ t: clone(trie), cls: {}, msg: "Trie with: car, cart, care, cat, do, dog, dot. Words sharing a prefix share nodes." }]);
  };

  /* ================= Graphs ================= */
  const G1 = {
    nodes: { A: [80, 60], B: [230, 40], C: [380, 70], D: [70, 200], E: [220, 170], F: [370, 200], G: [520, 120], H: [160, 300], I: [330, 310], J: [520, 280] },
    edges: [["A", "B"], ["A", "D"], ["B", "C"], ["B", "E"], ["C", "G"], ["D", "E"], ["D", "H"], ["E", "F"], ["F", "G"], ["F", "I"], ["H", "I"], ["I", "J"], ["G", "J"]],
  };
  const G2 = {
    nodes: { A: [70, 160], B: [200, 60], C: [200, 270], D: [350, 60], E: [350, 270], F: [500, 160] },
    edges: [["A", "B", 4], ["A", "C", 2], ["B", "C", 1], ["B", "D", 5], ["C", "D", 8], ["C", "E", 10], ["D", "E", 2], ["D", "F", 6], ["E", "F", 3]],
  };
  function drawGraph(stage, g, f, directed) {
    const svg = s("svg", { class: "viz", viewBox: "0 0 600 350", style: "max-height:380px" });
    g.edges.forEach(([a, b, w]) => {
      const [x1, y1] = g.nodes[a], [x2, y2] = g.nodes[b];
      const k = a + b, k2 = b + a, c = (f.ecls && (f.ecls[k] || f.ecls[k2])) || "";
      svg.append(s("line", { x1, y1, x2, y2, class: "edge " + c }));
      if (w != null) svg.append(s("rect", { x: (x1 + x2) / 2 - 11, y: (y1 + y2) / 2 - 10, width: 22, height: 18, rx: 4, fill: "var(--bg2)" }), s("text", { x: (x1 + x2) / 2, y: (y1 + y2) / 2 + 4, "text-anchor": "middle", class: "w", text: w }));
    });
    Object.entries(g.nodes).forEach(([id, [x, y]]) => {
      svg.append(s("g", { class: "node " + ((f.cls && f.cls[id]) || ""), style: "cursor:pointer", onclick: () => f.onNode && f.onNode(id) }, s("circle", { cx: x, cy: y, r: 20 }), s("text", { x, y: y + 5, "text-anchor": "middle", text: id })));
      if (f.labels && f.labels[id] != null) svg.append(s("text", { x: x + 22, y: y - 18, text: f.labels[id], style: "fill:var(--accent2);font-weight:700" }));
    });
    clear(stage).append(svg);
  }
  const adj = (g) => { const m = {}; Object.keys(g.nodes).forEach((n) => (m[n] = [])); g.edges.forEach(([a, b, w]) => { m[a].push([b, w]); m[b].push([a, w]); }); Object.values(m).forEach((l) => l.sort()); return m; };

  L.viz.graphTraversal = (root) => {
    const algo = h("select", null, h("option", { value: "bfs", text: "BFS (queue)" }), h("option", { value: "dfs", text: "DFS (stack / recursion)" }));
    let start = "A";
    const startLbl = h("b", { text: start });
    const stage = h("div", { class: "stage" });
    const side = h("div", { class: "side-panel" });
    root.append(h("div", { class: "controls" }, algo, h("span", null, "start: ", startLbl, " (click a node to change)"),
      h("button", { class: "btn primary small", text: "Run", onclick: run })), h("div", { class: "viz-split" }, stage, side));
    const player = Player(root, (f) => {
      drawGraph(stage, G1, { ...f, onNode: (id) => { start = id; startLbl.textContent = id; run(); } });
      clear(side).append(h("h4", { text: algo.value === "bfs" ? "Queue (front → back)" : "Stack (top → bottom)" }),
        h("div", null, f.ds.length ? f.ds.map((x) => h("span", { class: "chip hl", text: x })) : h("span", { class: "badge", text: "empty" })),
        h("h4", { text: "Visit order", style: { marginTop: "14px" } }), h("div", { class: "mono", text: f.order.join(" → ") }),
        f.labels ? h("p", { class: "topic-sub", text: "Numbers = distance (edges) from start" }) : null);
    });
    root.append(legend([["var(--yellow)", "current"], ["var(--warn)", "in queue/stack (dashed)"], ["var(--good)", "visited"], ["var(--good)", "tree edge"]]));
    algo.onchange = run;
    function run() {
      const A = adj(G1), F = [], visited = new Set(), order = [], cls = {}, ecls = {}, labels = {};
      const snap = (ds, msg, cur) => F.push({ cls: { ...cls, ...(cur ? { [cur]: "cur" } : {}) }, ecls: { ...ecls }, ds: ds.slice(), order: order.slice(), labels: algo.value === "bfs" ? { ...labels } : null, msg });
      if (algo.value === "bfs") {
        const q = [start]; visited.add(start); cls[start] = "frontier"; labels[start] = 0;
        snap(q, `Enqueue start ${start} and mark it seen`);
        while (q.length) {
          const u = q.shift(); order.push(u); cls[u] = "visited";
          snap(q, `Dequeue <b>${u}</b> (distance ${labels[u]}). Look at neighbours: ${A[u].map((x) => x[0]).join(", ")}`, u);
          for (const [v] of A[u]) if (!visited.has(v)) { visited.add(v); q.push(v); cls[v] = "frontier"; ecls[u + v] = "tree"; labels[v] = labels[u] + 1; snap(q, `${v} unseen → enqueue (distance ${labels[v]})`, u); }
        }
        snap([], "BFS done. It explores level by level, so it finds <b>shortest paths in unweighted graphs</b>. O(V + E).");
      } else {
        const st = [[start, null]];
        snap(st.map((x) => x[0]), `Push start ${start}`);
        while (st.length) {
          const [u, from] = st.pop();
          if (visited.has(u)) { snap(st.map((x) => x[0]), `${u} already visited → skip`); continue; }
          visited.add(u); order.push(u); cls[u] = "visited"; if (from) ecls[from + u] = "tree";
          const nb = A[u].map((x) => x[0]).filter((v) => !visited.has(v)).reverse();
          nb.forEach((v) => { st.push([v, u]); if (cls[v] !== "visited") cls[v] = "frontier"; });
          snap(st.map((x) => x[0]).reverse(), `Visit <b>${u}</b>, push unvisited neighbours ${nb.slice().reverse().join(", ") || "(none)"}`, u);
        }
        snap([], "DFS done. It dives deep before backtracking: great for cycle detection, topological sort, connected components. O(V + E).");
      }
      player.load(F);
    }
    run();
  };

  L.viz.dijkstra = (root) => {
    let src = "A", dst = "F";
    const stage = h("div", { class: "stage" });
    const side = h("div", { class: "side-panel" });
    const info = h("span", null);
    root.append(h("div", { class: "controls" }, info, h("button", { class: "btn primary small", text: "Run Dijkstra", onclick: run }),
      h("span", { class: "badge", text: "click a node to set the destination" })), h("div", { class: "viz-split" }, stage, side));
    const player = Player(root, (f) => {
      drawGraph(stage, G2, { ...f, onNode: (id) => { if (id !== src) { dst = id; run(); } } });
      clear(side).append(h("h4", { text: "dist[] table" }), h("table", { class: "cmp-table" }, h("tr", null, h("th", { text: "node" }), h("th", { text: "dist" }), h("th", { text: "prev" })),
        Object.keys(G2.nodes).map((n) => h("tr", { style: f.done && f.done.includes(n) ? { color: "var(--good)" } : {} }, h("td", { text: n }), h("td", { text: f.dist[n] === Infinity ? "∞" : f.dist[n] }), h("td", { text: f.prev[n] || "-" })))),
        h("h4", { text: "Priority queue", style: { marginTop: "12px" } }), h("div", null, f.pq.map(([d, n]) => h("span", { class: "chip", text: `${n}:${d}` }))));
    });
    function run() {
      info.innerHTML = `Shortest path <b>${src}</b> → <b>${dst}</b>`;
      const A = adj(G2), dist = {}, prev = {}, done = [], F = [];
      Object.keys(G2.nodes).forEach((n) => (dist[n] = Infinity)); dist[src] = 0;
      let pq = [[0, src]];
      const snap = (msg, cls = {}, ecls = {}) => F.push({ dist: { ...dist }, prev: { ...prev }, done: done.slice(), pq: pq.slice().sort((a, b) => a[0] - b[0]), labels: Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, v === Infinity ? "∞" : v])), cls: { ...Object.fromEntries(done.map((d) => [d, "visited"])), ...cls }, ecls: { ...Object.fromEntries(Object.entries(prev).map(([k, v]) => [v + k, "tree"])), ...ecls }, msg });
      snap(`dist[${src}] = 0, all others ∞. Push (0, ${src}) into a min-priority-queue.`);
      while (pq.length) {
        pq.sort((a, b) => a[0] - b[0]);
        const [d, u] = pq.shift();
        if (done.includes(u)) { snap(`Pop ${u}:${d}, stale entry (already finalized) → skip`); continue; }
        done.push(u);
        snap(`Pop the closest unfinished node <b>${u}</b> (dist ${d}). Its distance is now final.`, { [u]: "cur" });
        for (const [v, w] of A[u]) {
          if (done.includes(v)) continue;
          const nd = d + w;
          if (nd < dist[v]) { const old = dist[v]; dist[v] = nd; prev[v] = u; pq.push([nd, v]); snap(`Relax ${u}→${v}: ${d} + ${w} = ${nd} < ${old === Infinity ? "∞" : old} → update`, { [u]: "cur", [v]: "frontier" }, { [u + v]: "hl" }); }
          else snap(`Relax ${u}→${v}: ${d} + ${w} = ${nd} ≥ ${dist[v]} → no change`, { [u]: "cur" }, { [u + v]: "hl" });
        }
      }
      const path = []; for (let n = dst; n; n = prev[n]) path.unshift(n);
      const pc = Object.fromEntries(path.map((n) => [n, "path"])), pe = {}; for (let i = 1; i < path.length; i++) pe[path[i - 1] + path[i]] = "path";
      snap(`Shortest path ${src} → ${dst}: <b>${path.join(" → ")}</b> with total cost <b>${dist[dst]}</b>. Complexity O((V + E) log V) with a heap.`, pc, pe);
      player.load(F);
    }
    run();
  };

  /* ================= Dynamic programming ================= */
  L.viz.dp = (root) => {
    const mode = h("select", null, h("option", { value: "lcs", text: "Longest Common Subsequence (2D)" }), h("option", { value: "coin", text: "Coin Change: min coins (1D)" }), h("option", { value: "knap", text: "0/1 Knapsack (2D)" }));
    const a = h("input", { type: "text", value: "ABCBDAB", style: { width: "140px" } });
    const b = h("input", { type: "text", value: "BDCABA", style: { width: "140px" } });
    const stage = h("div", { class: "stage" });
    const hint = h("p", { class: "topic-sub" });
    root.append(h("div", { class: "controls" }, mode, a, b, h("button", { class: "btn primary small", text: "Run", onclick: run })), hint, stage);
    const player = Player(root, (f) => {
      const t = h("table", { class: "dp" });
      t.appendChild(h("tr", null, h("th"), f.cols.map((c) => h("th", { text: c }))));
      f.grid.forEach((row, i) => t.appendChild(h("tr", null, h("th", { text: f.rows[i] }), row.map((v, j) => h("td", { class: f.cls[i + "," + j] || (v !== "" ? "filled" : ""), text: v === Infinity ? "∞" : v })))));
      clear(stage).append(t);
    });
    mode.onchange = () => {
      if (mode.value === "lcs") { a.value = "ABCBDAB"; b.value = "BDCABA"; }
      else if (mode.value === "coin") { a.value = "1,3,4"; b.value = "6"; }
      else { a.value = "w:1,3,4,5 v:1,4,5,7"; b.value = "7"; }
      run();
    };
    function run() {
      const F = [];
      if (mode.value === "lcs") {
        hint.innerHTML = "<b>dp[i][j]</b> = LCS length of first i chars of A and first j chars of B. If chars match: dp[i-1][j-1] + 1, else max(dp[i-1][j], dp[i][j-1]).";
        const A = a.value.slice(0, 10), B = b.value.slice(0, 10), n = A.length, m = B.length;
        const grid = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : "")));
        const rows = ["∅", ...A], cols = ["∅", ...B];
        const snap = (cls, msg) => F.push({ grid: grid.map((r) => r.slice()), rows, cols, cls, msg });
        snap({}, "Row/column 0 = empty string → LCS 0");
        for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
          if (A[i - 1] === B[j - 1]) { grid[i][j] = grid[i - 1][j - 1] + 1; snap({ [i + "," + j]: "cur", [i - 1 + "," + (j - 1)]: "dep" }, `'${A[i - 1]}' = '${B[j - 1]}' → diagonal + 1 = ${grid[i][j]}`); }
          else { grid[i][j] = Math.max(grid[i - 1][j], grid[i][j - 1]); snap({ [i + "," + j]: "cur", [i - 1 + "," + j]: "dep", [i + "," + (j - 1)]: "dep" }, `'${A[i - 1]}' ≠ '${B[j - 1]}' → max(up ${grid[i - 1][j]}, left ${grid[i][j - 1]}) = ${grid[i][j]}`); }
        }
        let i = n, j = m, lcs = ""; const path = {};
        while (i > 0 && j > 0) { path[i + "," + j] = "path"; if (A[i - 1] === B[j - 1]) { lcs = A[i - 1] + lcs; i--; j--; } else if (grid[i - 1][j] >= grid[i][j - 1]) i--; else j--; }
        snap(path, `Backtrack from the bottom-right to rebuild the answer: LCS = "<b>${lcs}</b>" (length ${grid[n][m]}). Time O(n·m).`);
      } else if (mode.value === "coin") {
        const coins = parseNums(a.value).filter((c) => c > 0), amt = Math.min(25, Math.max(0, +b.value || 0));
        hint.innerHTML = `<b>dp[x]</b> = fewest coins to make amount x. dp[x] = min over coins c of dp[x − c] + 1. Coins: ${coins.join(", ")}`;
        const dp = Array(amt + 1).fill(Infinity); dp[0] = 0;
        const cols = Array.from({ length: amt + 1 }, (_, i) => i);
        const snap = (cls, msg) => F.push({ grid: [dp.map((v, i) => (i === 0 || v !== Infinity || i < cur ? v : ""))], rows: ["dp"], cols, cls, msg });
        let cur = 1;
        snap({ "0,0": "cur" }, "dp[0] = 0: zero coins make amount 0");
        for (cur = 1; cur <= amt; cur++) {
          for (const c of coins) if (c <= cur && dp[cur - c] + 1 < dp[cur]) { dp[cur] = dp[cur - c] + 1; snap({ ["0," + cur]: "cur", ["0," + (cur - c)]: "dep" }, `Amount ${cur}: use coin ${c} → dp[${cur - c}] + 1 = ${dp[cur]}`); }
          if (dp[cur] === Infinity) snap({ ["0," + cur]: "cur" }, `Amount ${cur} cannot be made`);
        }
        snap({ ["0," + amt]: "path" }, dp[amt] === Infinity ? "Impossible" : `Answer: <b>${dp[amt]}</b> coins for ${amt}. Greedy (largest coin first) would fail for 1,3,4 → 6: it picks 4+1+1 = 3 coins, DP finds 3+3 = 2.`);
      } else {
        const ws = (a.value.match(/w:([\d,]+)/) || [, "1,3,4,5"])[1].split(",").map(Number), vs = (a.value.match(/v:([\d,]+)/) || [, "1,4,5,7"])[1].split(",").map(Number);
        const W = Math.min(12, +b.value || 7), n = Math.min(ws.length, vs.length);
        hint.innerHTML = `<b>dp[i][w]</b> = best value using the first i items with capacity w. Skip item: dp[i-1][w]; take it: v + dp[i-1][w − wᵢ]. Items (w,v): ${ws.slice(0, n).map((w, i) => `(${w},${vs[i]})`).join(" ")}, capacity ${W}`;
        const grid = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, () => (i === 0 ? 0 : "")));
        const rows = ["∅", ...ws.slice(0, n).map((w, i) => `#${i + 1}(${w},${vs[i]})`)], cols = Array.from({ length: W + 1 }, (_, i) => i);
        const snap = (cls, msg) => F.push({ grid: grid.map((r) => r.slice()), rows, cols, cls, msg });
        snap({}, "Row 0: no items → value 0");
        for (let i = 1; i <= n; i++) for (let w = 0; w <= W; w++) {
          const skip = grid[i - 1][w], wi = ws[i - 1], vi = vs[i - 1];
          if (wi <= w && vi + grid[i - 1][w - wi] > skip) { grid[i][w] = vi + grid[i - 1][w - wi]; snap({ [i + "," + w]: "cur", [i - 1 + "," + (w - wi)]: "dep" }, `Cap ${w}: take item ${i} → ${vi} + dp[${i - 1}][${w - wi}] = ${grid[i][w]} (beats skip = ${skip})`); }
          else { grid[i][w] = skip; snap({ [i + "," + w]: "cur", [i - 1 + "," + w]: "dep" }, `Cap ${w}: ${wi > w ? "item too heavy" : "taking isn't better"} → skip = ${skip}`); }
        }
        snap({ [n + "," + W]: "path" }, `Max value = <b>${grid[n][W]}</b>. Time O(n·W).`);
      }
      player.load(F);
    }
    run();
  };

  /* ================= Greedy: intervals ================= */
  L.viz.intervals = (root) => {
    const mode = h("select", null, h("option", { value: "sched", text: "Activity selection (max non-overlapping)" }), h("option", { value: "merge", text: "Merge overlapping intervals" }));
    let iv = [[1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9], [6, 10], [8, 11], [8, 12], [2, 14], [12, 16]];
    const stage = h("div", { class: "stage" });
    root.append(h("div", { class: "controls" }, mode, h("button", { class: "btn primary small", text: "Run", onclick: run }),
      h("button", { class: "btn small", text: "🎲 Random", onclick: () => { iv = Array.from({ length: 9 }, () => { const s0 = rand(0, 14); return [s0, s0 + rand(1, 5)]; }); run(); } })), stage);
    const player = Player(root, (f) => {
      const W = 620, rowH = 26, H = f.list.length * rowH + 40 + (f.merged ? 40 : 0), scale = (W - 40) / 20;
      const svg = s("svg", { class: "viz", viewBox: `0 0 ${W} ${H}` });
      for (let t = 0; t <= 20; t += 2) svg.append(s("text", { x: 20 + t * scale, y: 14, class: "w", "text-anchor": "middle", text: t }));
      f.list.forEach(([a, b], i) => {
        const c = f.cls[i] === "pick" ? "var(--good)" : f.cls[i] === "cur" ? "var(--yellow)" : f.cls[i] === "skip" ? "var(--bad)" : "var(--accent)";
        svg.append(s("rect", { x: 20 + a * scale, y: 24 + i * rowH, width: (b - a) * scale, height: 18, rx: 5, fill: c, opacity: f.cls[i] === "skip" ? .35 : 1 }), s("text", { x: 24 + b * scale, y: 38 + i * rowH, class: "w", text: `[${a},${b}]` }));
      });
      if (f.merged) f.merged.forEach(([a, b]) => svg.append(s("rect", { x: 20 + a * scale, y: H - 30, width: (b - a) * scale, height: 20, rx: 5, fill: "var(--pink)" })));
      if (f.line != null) svg.append(s("line", { x1: 20 + f.line * scale, x2: 20 + f.line * scale, y1: 18, y2: H, stroke: "var(--accent2)", "stroke-dasharray": "4 3", "stroke-width": 2 }));
      clear(stage).append(svg);
    });
    mode.onchange = run;
    function run() {
      const F = [];
      if (mode.value === "sched") {
        const list = iv.slice().sort((a, b) => a[1] - b[1]), cls = {};
        F.push({ list, cls: {}, msg: "Greedy rule: sort by <b>end time</b> and always pick the meeting that finishes first. It leaves the most room for the rest." });
        let end = -Infinity, count = 0;
        list.forEach(([a, b], i) => {
          F.push({ list, cls: { ...cls, [i]: "cur" }, line: end === -Infinity ? null : end, msg: `[${a},${b}] starts at ${a}; last chosen ends at ${end === -Infinity ? "-∞" : end}` });
          if (a >= end) { cls[i] = "pick"; end = b; count++; F.push({ list, cls: { ...cls }, line: end, msg: `No overlap → pick it (${count} chosen)` }); }
          else { cls[i] = "skip"; F.push({ list, cls: { ...cls }, line: end, msg: "Overlaps → skip" }); }
        });
        F.push({ list, cls, msg: `Max non-overlapping = <b>${count}</b>. O(n log n) for the sort.` });
      } else {
        const list = iv.slice().sort((a, b) => a[0] - b[0]), cls = {}, merged = [];
        F.push({ list, cls: {}, merged: [], msg: "Sort by <b>start time</b>, then sweep left to right, extending the current block while intervals overlap." });
        list.forEach(([a, b], i) => {
          const last = merged[merged.length - 1];
          if (last && a <= last[1]) { last[1] = Math.max(last[1], b); cls[i] = "pick"; F.push({ list, cls: { ...cls, [i]: "cur" }, merged: merged.map((x) => x.slice()), msg: `[${a},${b}] overlaps [${last[0]},${last[1]}] → extend` }); }
          else { merged.push([a, b]); cls[i] = "pick"; F.push({ list, cls: { ...cls, [i]: "cur" }, merged: merged.map((x) => x.slice()), msg: `[${a},${b}] starts a new block` }); }
        });
        F.push({ list, cls, merged: merged.map((x) => x.slice()), msg: `Merged: <b>${merged.map((x) => `[${x}]`).join(" ")}</b>` });
      }
      player.load(F);
    }
    run();
  };
})();
