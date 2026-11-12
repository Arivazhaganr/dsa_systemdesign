/* Extras for the additional DSA topics: history, real-world uses, code in Python, Java and JavaScript */
(function () {
  const X = (L.extras = L.extras || {});

  X["bit-manipulation"] = {
    story: {
      when: "1847 Boolean algebra · 1937 switching circuits",
      who: "George Boole (the algebra of true/false); Claude Shannon (showed in his master's thesis that relay circuits compute Boolean algebra); Peter Wegner and later Brian Kernighan (the bit-counting trick)",
      before: "Early calculating machines worked in decimal with gears and wheels, and logic was a branch of philosophy, not engineering.",
      why: "Shannon realised that a switch being open or closed is a 0 or a 1, and that wiring switches together implements AND, OR and NOT. That made binary the natural language of computers. Bit tricks then became the way to squeeze the most out of scarce memory and slow CPUs, and they are still how the fastest code is written.",
    },
    uses: [
      ["🚩", "Flags & permissions", "Unix file modes (rwx = 4 | 2 | 1), feature flags, TCP header flags."],
      ["🌐", "Networking", "Subnet masks: ip & mask gives the network address."],
      ["🔐", "Cryptography & hashing", "XOR, rotations and shifts are the building blocks of ciphers and hash functions."],
      ["♟️", "Bitboards & bitsets", "Chess engines store a board in 64 bits; databases use bitmaps for fast filters."],
    ],
    code: {
      python: `def single_number(nums):          # every value appears twice except one
    result = 0
    for x in nums:
        result ^= x
    return result

def count_bits(x):                # Kernighan: one loop per set bit
    count = 0
    while x:
        x &= x - 1
        count += 1
    return count

def is_power_of_two(x):
    return x > 0 and x & (x - 1) == 0

def subsets(items):               # each mask is one subset
    n = len(items)
    return [[items[i] for i in range(n) if mask >> i & 1] for mask in range(1 << n)]

READ, WRITE, EXEC = 4, 2, 1
perms = READ | WRITE              # set flags
print(bool(perms & WRITE), bool(perms & EXEC))    # True False
print(single_number([4, 1, 2, 1, 2]), count_bits(44), is_power_of_two(64), len(subsets("abc")))`,
      java: `class Bits {
    static int singleNumber(int[] nums) {
        int result = 0;
        for (int x : nums) result ^= x;
        return result;
    }

    static int countBits(int x) {
        int count = 0;
        while (x != 0) { x &= x - 1; count++; }
        return count;                       // or Integer.bitCount(x)
    }

    static boolean isPowerOfTwo(int x) { return x > 0 && (x & (x - 1)) == 0; }

    static boolean testBit(int x, int k) { return ((x >> k) & 1) == 1; }
    static int setBit(int x, int k)      { return x | (1 << k); }
    static int clearBit(int x, int k)    { return x & ~(1 << k); }
    static int toggleBit(int x, int k)   { return x ^ (1 << k); }

    public static void main(String[] args) {
        System.out.println(singleNumber(new int[]{4, 1, 2, 1, 2}));   // 4
        System.out.println(countBits(44) + " " + isPowerOfTwo(64));    // 3 true
        System.out.println(-8 >> 1);    // -4: arithmetic shift keeps the sign
        System.out.println(-8 >>> 28);  // 15: logical shift fills with zeros
    }
}`,
      javascript: `const singleNumber = (nums) => nums.reduce((acc, x) => acc ^ x, 0);

function countBits(x) {
  let count = 0;
  while (x) { x &= x - 1; count++; }
  return count;
}

const isPowerOfTwo = (x) => x > 0 && (x & (x - 1)) === 0;

function subsets(items) {
  const out = [];
  for (let mask = 0; mask < 1 << items.length; mask++)
    out.push(items.filter((_, i) => (mask >> i) & 1));
  return out;
}

// Note: JavaScript bitwise operators work on 32-bit signed integers.
console.log(singleNumber([4, 1, 2, 1, 2]), countBits(44), isPowerOfTwo(64), subsets(["a", "b", "c"]).length);`,
    },
  };

  X["string-matching"] = {
    story: {
      when: "1970 Morris's editor · 1977 KMP and Boyer–Moore · 1987 Rabin–Karp",
      who: "James Morris and, independently, Donald Knuth (with Vaughan Pratt they published it together); Robert Boyer & J Strother Moore; Michael Rabin & Richard Karp; Alfred Aho & Margaret Corasick (many patterns, 1975)",
      before: "Text editors searched by brute force and backed up in the input after every mismatch, which was slow and awkward when the text was streaming from tape.",
      why: "Morris needed a search for a text editor that never re-read input. Knuth reached the same linear-time method from automata theory. Rabin and Karp took another route, using randomized fingerprints so that a whole window can be compared in one step, which extends naturally to many patterns and to two-dimensional search.",
    },
    uses: [
      ["🔎", "Find in editors & grep", "grep uses Boyer–Moore-style skipping; Ctrl+F is the same problem."],
      ["🧬", "Bioinformatics", "Searching genomes for gene sequences and repeated motifs."],
      ["🛡️", "Intrusion detection & antivirus", "Aho–Corasick scans traffic for thousands of signatures at once."],
      ["📝", "Plagiarism & deduplication", "Rolling hashes fingerprint chunks (rsync, content-defined chunking)."],
    ],
    code: {
      python: `def build_lps(p):
    lps, length = [0] * len(p), 0
    for i in range(1, len(p)):
        while length and p[i] != p[length]:
            length = lps[length - 1]
        if p[i] == p[length]:
            length += 1
        lps[i] = length
    return lps

def kmp_search(text, p):
    lps, j, out = build_lps(p), 0, []
    for i, ch in enumerate(text):
        while j and ch != p[j]:
            j = lps[j - 1]
        if ch == p[j]:
            j += 1
        if j == len(p):
            out.append(i - j + 1)
            j = lps[j - 1]
    return out

def rabin_karp(text, p, base=256, mod=1_000_000_007):
    n, m = len(text), len(p)
    if m > n:
        return []
    high = pow(base, m - 1, mod)
    hp = ht = 0
    for i in range(m):
        hp = (hp * base + ord(p[i])) % mod
        ht = (ht * base + ord(text[i])) % mod
    out = []
    for i in range(n - m + 1):
        if hp == ht and text[i:i + m] == p:          # verify to rule out a collision
            out.append(i)
        if i + m < n:                                # roll the window by one
            ht = ((ht - ord(text[i]) * high) * base + ord(text[i + m])) % mod
    return out

print(build_lps("ABABCABAB"))                        # [0, 0, 1, 2, 0, 1, 2, 3, 4]
print(kmp_search("ABABDABACDABABCABAB", "ABABCABAB"), rabin_karp("abracadabra", "abra"))`,
      java: `import java.util.*;

class KMP {
    static int[] buildLps(String p) {
        int[] lps = new int[p.length()];
        for (int i = 1, len = 0; i < p.length(); i++) {
            while (len > 0 && p.charAt(i) != p.charAt(len)) len = lps[len - 1];
            if (p.charAt(i) == p.charAt(len)) len++;
            lps[i] = len;
        }
        return lps;
    }

    static List<Integer> search(String text, String p) {
        int[] lps = buildLps(p);
        List<Integer> out = new ArrayList<>();
        for (int i = 0, j = 0; i < text.length(); i++) {
            while (j > 0 && text.charAt(i) != p.charAt(j)) j = lps[j - 1];
            if (text.charAt(i) == p.charAt(j)) j++;
            if (j == p.length()) {
                out.add(i - j + 1);
                j = lps[j - 1];
            }
        }
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(buildLps("ABABCABAB")));
        System.out.println(search("ABABDABACDABABCABAB", "ABABCABAB"));   // [10]
    }
}`,
      javascript: `function buildLps(p) {
  const lps = new Array(p.length).fill(0);
  for (let i = 1, len = 0; i < p.length; i++) {
    while (len && p[i] !== p[len]) len = lps[len - 1];
    if (p[i] === p[len]) len++;
    lps[i] = len;
  }
  return lps;
}

function kmpSearch(text, p) {
  const lps = buildLps(p), out = [];
  for (let i = 0, j = 0; i < text.length; i++) {
    while (j && text[i] !== p[j]) j = lps[j - 1];
    if (text[i] === p[j]) j++;
    if (j === p.length) {
      out.push(i - j + 1);
      j = lps[j - 1];
    }
  }
  return out;
}

console.log(buildLps("ABABCABAB"));                       // [0,0,1,2,0,1,2,3,4]
console.log(kmpSearch("ABABDABACDABABCABAB", "ABABCABAB")); // [10]`,
    },
  };

  X["union-find"] = {
    story: {
      when: "1956 Kruskal · 1957 Prim · 1964 Union-Find · 1975 Tarjan's analysis",
      who: "Bernard Galler & Michael Fischer (the disjoint-set forest); Robert Tarjan (proved the inverse-Ackermann bound); Joseph Kruskal and Robert Prim at Bell Labs (minimum spanning trees; Vojtěch Jarník found Prim's method in 1930, Otakar Borůvka another in 1926)",
      before: "To check whether two items were in the same group you relabelled a whole group on every merge, or re-ran a graph search for each question.",
      why: "Borůvka wanted the cheapest way to electrify Moravia; Bell Labs wanted the cheapest telephone wiring. Kruskal's method needs one fast test, 'are these two already connected?', asked millions of times. Galler and Fischer's forest with path compression answers it in effectively constant time. Their original use was a compiler tracking which variable names referred to the same storage.",
    },
    uses: [
      ["🕸️", "Network design", "Cheapest cabling, pipelines and road networks (MST)."],
      ["🖼️", "Image segmentation", "Merging neighbouring pixels of similar colour into regions."],
      ["🧩", "Compilers & type inference", "Unifying type variables; tracking equivalent names."],
      ["👥", "Entity resolution", "Merging duplicate customer records that share an email or phone."],
    ],
    code: {
      python: `class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.count = n                      # number of disjoint sets

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path halving
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                # smaller tree under the larger
        self.size[ra] += self.size[rb]
        self.count -= 1
        return True

def kruskal(n, edges):
    """edges: list of (weight, u, v). Returns (total weight, chosen edges)."""
    dsu, total, chosen = DSU(n), 0, []
    for w, u, v in sorted(edges):
        if dsu.union(u, v):
            total += w
            chosen.append((u, v, w))
    return total, chosen

edges = [(1, 0, 1), (4, 0, 2), (2, 1, 2), (7, 1, 3), (3, 2, 3)]
print(kruskal(4, edges))        # (6, [(0, 1, 1), (1, 2, 2), (2, 3, 3)])`,
      java: `import java.util.*;

class DSU {
    private final int[] parent, size;
    int count;

    DSU(int n) {
        parent = new int[n]; size = new int[n]; count = n;
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    }

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];      // path halving
            x = parent[x];
        }
        return x;
    }

    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        size[ra] += size[rb];
        count--;
        return true;
    }

    // Kruskal: edges are {weight, u, v}
    static int mst(int n, int[][] edges) {
        Arrays.sort(edges, (x, y) -> Integer.compare(x[0], y[0]));
        DSU dsu = new DSU(n);
        int total = 0;
        for (int[] e : edges) if (dsu.union(e[1], e[2])) total += e[0];
        return total;
    }

    public static void main(String[] args) {
        System.out.println(mst(4, new int[][]{{1, 0, 1}, {4, 0, 2}, {2, 1, 2}, {7, 1, 3}, {3, 2, 3}}));   // 6
    }
}`,
      javascript: `class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);
    this.count = n;
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];   // path halving
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    this.size[ra] += this.size[rb];
    this.count--;
    return true;
  }
}

// Kruskal: edges are [weight, u, v]
function mst(n, edges) {
  const dsu = new DSU(n);
  let total = 0;
  for (const [w, u, v] of [...edges].sort((a, b) => a[0] - b[0])) if (dsu.union(u, v)) total += w;
  return total;
}

console.log(mst(4, [[1, 0, 1], [4, 0, 2], [2, 1, 2], [7, 1, 3], [3, 2, 3]]));   // 6`,
    },
  };

  X["topological-sort"] = {
    story: {
      when: "1958 PERT charts · 1962 Kahn's algorithm · 1976 DFS version",
      who: "The US Navy's Polaris programme (PERT scheduling); Arthur Kahn ('Topological sorting of large networks'); Robert Tarjan (the depth-first version)",
      before: "Project planners ordered thousands of interdependent tasks by hand on wall charts, and a circular dependency was discovered only when work got stuck.",
      why: "The Polaris missile programme involved thousands of contractors and tasks that depended on one another. Planning it needed a mechanical way to produce a valid order of work and to flag impossible, circular requirements. Kahn published an efficient method for exactly these large task networks, and it became a staple of compilers and build tools.",
    },
    uses: [
      ["🏗️", "Build systems", "make, Bazel and Gradle compile targets in dependency order."],
      ["📦", "Package managers", "npm, pip and apt install dependencies before dependants."],
      ["📊", "Spreadsheets", "Recalculate cells in dependency order; report circular references."],
      ["🔄", "Data pipelines", "Airflow and dbt run tasks as a DAG."],
    ],
    code: {
      python: `from collections import deque

def topo_sort(n, edges):
    """Kahn's algorithm. Returns an order, or None if the graph has a cycle."""
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    queue = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    return order if len(order) == n else None

def topo_sort_dfs(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
    WHITE, GREY, BLACK = 0, 1, 2
    color, out = [WHITE] * n, []
    def visit(u):
        color[u] = GREY
        for v in graph[u]:
            if color[v] == GREY or (color[v] == WHITE and not visit(v)):
                return False                 # back edge → cycle
        color[u] = BLACK
        out.append(u)                        # post-order
        return True
    for u in range(n):
        if color[u] == WHITE and not visit(u):
            return None
    return out[::-1]

edges = [(0, 1), (0, 2), (1, 3), (2, 3)]
print(topo_sort(4, edges), topo_sort_dfs(4, edges), topo_sort(2, [(0, 1), (1, 0)]))`,
      java: `import java.util.*;

class TopoSort {
    /** Kahn's algorithm. Returns an empty array if the graph has a cycle. */
    static int[] sort(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] e : edges) { graph.get(e[0]).add(e[1]); indeg[e[1]]++; }

        Deque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) queue.add(i);

        int[] order = new int[n];
        int k = 0;
        while (!queue.isEmpty()) {
            int u = queue.poll();
            order[k++] = u;
            for (int v : graph.get(u)) if (--indeg[v] == 0) queue.add(v);
        }
        return k == n ? order : new int[0];
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(sort(4, new int[][]{{0, 1}, {0, 2}, {1, 3}, {2, 3}})));   // [0, 1, 2, 3]
        System.out.println(sort(2, new int[][]{{0, 1}, {1, 0}}).length);                             // 0 → cycle
    }
}`,
      javascript: `// Kahn's algorithm. Returns null when the graph has a cycle.
function topoSort(n, edges) {
  const graph = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  for (const [u, v] of edges) { graph[u].push(v); indeg[v]++; }

  const queue = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);

  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const v of graph[u]) if (--indeg[v] === 0) queue.push(v);
  }
  return order.length === n ? order : null;
}

console.log(topoSort(4, [[0, 1], [0, 2], [1, 3], [2, 3]]));   // [0, 1, 2, 3]
console.log(topoSort(2, [[0, 1], [1, 0]]));                   // null`,
    },
  };

  X["range-queries"] = {
    story: {
      when: "1977 segment tree · 1994 Fenwick tree",
      who: "Jon Bentley (segment trees, for a geometry problem about overlapping rectangles); Peter Fenwick, University of Auckland ('A new data structure for cumulative frequency tables'); Boris Ryabko described the same idea in 1989",
      before: "Running totals lived in a prefix-sum table that had to be rebuilt after every change, or were recomputed by scanning the range each time.",
      why: "Fenwick was working on arithmetic coding for data compression, which needs cumulative symbol frequencies that change after every symbol. He found that the binary representation of an index tells you exactly which partial sums to combine, giving logarithmic updates and queries in a few lines of code and no extra memory.",
    },
    uses: [
      ["🗜️", "Data compression", "Adaptive arithmetic coding keeps cumulative frequencies in a Fenwick tree."],
      ["📈", "Analytics & leaderboards", "Live rank and 'how many scores below X' queries."],
      ["🗺️", "Computational geometry & GIS", "Counting points or intervals in a range; sweep-line algorithms."],
      ["🗄️", "Databases", "Range aggregates; ordered-statistics over changing data."],
    ],
    code: {
      python: `class Fenwick:
    def __init__(self, values):
        self.n = len(values)
        self.t = [0] * (self.n + 1)
        for i, v in enumerate(values, 1):
            self.update(i, v)

    def update(self, i, delta):            # a[i] += delta   (1-based)
        while i <= self.n:
            self.t[i] += delta
            i += i & -i

    def query(self, i):                    # sum of a[1..i]
        s = 0
        while i > 0:
            s += self.t[i]
            i -= i & -i
        return s

    def range_sum(self, l, r):
        return self.query(r) - self.query(l - 1)

class SegTree:                             # range minimum, 0-based, half-open [l, r)
    def __init__(self, a):
        self.n = len(a)
        self.t = [float("inf")] * self.n + list(a)
        for i in range(self.n - 1, 0, -1):
            self.t[i] = min(self.t[2 * i], self.t[2 * i + 1])

    def update(self, i, value):
        i += self.n
        self.t[i] = value
        while i > 1:
            i //= 2
            self.t[i] = min(self.t[2 * i], self.t[2 * i + 1])

    def query(self, l, r):
        res, l, r = float("inf"), l + self.n, r + self.n
        while l < r:
            if l & 1:
                res = min(res, self.t[l]); l += 1
            if r & 1:
                r -= 1; res = min(res, self.t[r])
            l //= 2; r //= 2
        return res

f = Fenwick([5, 3, 7, 9, 6, 2])
print(f.range_sum(2, 5))        # 25
f.update(3, 10)
print(f.range_sum(2, 5))        # 35
print(SegTree([5, 3, 7, 9, 6, 2]).query(2, 5))   # 6`,
      java: `class Fenwick {
    private final long[] t;

    Fenwick(int n) { t = new long[n + 1]; }

    void update(int i, long delta) {            // a[i] += delta (1-based)
        for (; i < t.length; i += i & -i) t[i] += delta;
    }

    long query(int i) {                         // sum of a[1..i]
        long s = 0;
        for (; i > 0; i -= i & -i) s += t[i];
        return s;
    }

    long rangeSum(int l, int r) { return query(r) - query(l - 1); }

    public static void main(String[] args) {
        int[] a = {5, 3, 7, 9, 6, 2};
        Fenwick f = new Fenwick(a.length);
        for (int i = 0; i < a.length; i++) f.update(i + 1, a[i]);
        System.out.println(f.rangeSum(2, 5));   // 25
        f.update(3, 10);
        System.out.println(f.rangeSum(2, 5));   // 35
    }
}`,
      javascript: `class Fenwick {
  constructor(n) { this.t = new Array(n + 1).fill(0); }
  update(i, delta) {                 // a[i] += delta (1-based)
    for (; i < this.t.length; i += i & -i) this.t[i] += delta;
  }
  query(i) {                         // sum of a[1..i]
    let s = 0;
    for (; i > 0; i -= i & -i) s += this.t[i];
    return s;
  }
  rangeSum(l, r) { return this.query(r) - this.query(l - 1); }
}

// Difference array: many range additions, one read at the end
function applyRangeAdds(n, adds) {   // adds: [l, r, value], 0-based inclusive
  const d = new Array(n + 1).fill(0);
  for (const [l, r, v] of adds) { d[l] += v; d[r + 1] -= v; }
  const out = [];
  let run = 0;
  for (let i = 0; i < n; i++) out.push((run += d[i]));
  return out;
}

const f = new Fenwick(6);
[5, 3, 7, 9, 6, 2].forEach((v, i) => f.update(i + 1, v));
console.log(f.rangeSum(2, 5));                             // 25
console.log(applyRangeAdds(5, [[1, 3, 2], [0, 1, 5]]));    // [5, 7, 2, 2, 0]`,
    },
  };

  X["bloom-filter"] = {
    story: {
      when: "1970 Bloom filter · 2000 counting Bloom filter · 2007 HyperLogLog · 2014 cuckoo filter",
      who: "Burton Howard Bloom ('Space/time trade-offs in hash coding with allowable errors'); Li Fan and colleagues (counting variant, for web caches); Philippe Flajolet (HyperLogLog)",
      before: "Membership tests needed the full set in memory, or a disk access for every lookup. On 1970 hardware a large dictionary simply did not fit in core memory.",
      why: "Bloom's example was a hyphenation program: 90% of words follow simple rules, 10% need a dictionary lookup on slow disk. A small in-memory filter could say 'this word certainly isn't in the exception list' and avoid most disk reads; an occasional false alarm only cost one unnecessary lookup. The same idea now protects databases, caches and networks from wasted work.",
    },
    uses: [
      ["🗄️", "Databases", "Cassandra, HBase, RocksDB: skip SSTables that can't contain the key."],
      ["🌐", "CDNs & caches", "Cache an object only on its second request ('one-hit wonders' are filtered out)."],
      ["🛡️", "Safe browsing & passwords", "Check a URL or password against a huge blocklist locally."],
      ["📊", "Analytics", "HyperLogLog counts unique visitors in Redis, BigQuery and Presto."],
    ],
    code: {
      python: `import hashlib, math

class BloomFilter:
    def __init__(self, expected_items, false_positive_rate=0.01):
        self.m = math.ceil(-expected_items * math.log(false_positive_rate) / math.log(2) ** 2)
        self.k = max(1, round(self.m / expected_items * math.log(2)))
        self.bits = bytearray((self.m + 7) // 8)

    def _positions(self, item):
        digest = hashlib.sha256(str(item).encode()).digest()
        h1 = int.from_bytes(digest[:8], "big")
        h2 = int.from_bytes(digest[8:16], "big") | 1
        return ((h1 + i * h2) % self.m for i in range(self.k))     # double hashing

    def add(self, item):
        for p in self._positions(item):
            self.bits[p >> 3] |= 1 << (p & 7)

    def __contains__(self, item):
        return all(self.bits[p >> 3] >> (p & 7) & 1 for p in self._positions(item))

bf = BloomFilter(expected_items=10_000, false_positive_rate=0.01)
for i in range(10_000):
    bf.add("user" + str(i))

print(bf.m, "bits,", bf.k, "hashes")                   # ~95851 bits, 7 hashes
print("user42" in bf)                                  # True: no false negatives
false_pos = sum(("ghost" + str(i)) in bf for i in range(10_000))
print("false positive rate:", false_pos / 10_000)      # ≈ 0.01`,
      java: `import java.util.BitSet;

class BloomFilter {
    private final BitSet bits;
    private final int m, k;

    BloomFilter(int expectedItems, double fpRate) {
        m = (int) Math.ceil(-expectedItems * Math.log(fpRate) / (Math.log(2) * Math.log(2)));
        k = Math.max(1, (int) Math.round((double) m / expectedItems * Math.log(2)));
        bits = new BitSet(m);
    }

    private int position(String item, int i) {
        int h1 = item.hashCode();
        int h2 = (h1 >>> 16) * 0x85ebca6b | 1;                 // second hash derived from the first
        return Math.floorMod(h1 + i * h2, m);                  // double hashing
    }

    void add(String item) {
        for (int i = 0; i < k; i++) bits.set(position(item, i));
    }

    boolean mightContain(String item) {
        for (int i = 0; i < k; i++) if (!bits.get(position(item, i))) return false;
        return true;
    }

    public static void main(String[] args) {
        BloomFilter bf = new BloomFilter(10_000, 0.01);
        for (int i = 0; i < 10_000; i++) bf.add("user" + i);
        System.out.println(bf.mightContain("user42"));         // true
        int fp = 0;
        for (int i = 0; i < 10_000; i++) if (bf.mightContain("ghost" + i)) fp++;
        System.out.println("false positives: " + fp);          // on the order of 100
    }
}`,
      javascript: `class BloomFilter {
  constructor(expectedItems, fpRate = 0.01) {
    this.m = Math.ceil((-expectedItems * Math.log(fpRate)) / Math.log(2) ** 2);
    this.k = Math.max(1, Math.round((this.m / expectedItems) * Math.log(2)));
    this.bits = new Uint8Array(Math.ceil(this.m / 8));
  }
  static fnv(str, seed) {
    let h = 2166136261 ^ seed;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
    return h >>> 0;
  }
  positions(item) {
    const h1 = BloomFilter.fnv(item, 0), h2 = BloomFilter.fnv(item, 0x9e3779b1) | 1;
    return Array.from({ length: this.k }, (_, i) => (h1 + i * h2) % this.m);   // double hashing
  }
  add(item) { for (const p of this.positions(item)) this.bits[p >> 3] |= 1 << (p & 7); }
  mightContain(item) { return this.positions(item).every((p) => (this.bits[p >> 3] >> (p & 7)) & 1); }
}

const bf = new BloomFilter(10000, 0.01);
for (let i = 0; i < 10000; i++) bf.add("user" + i);
let falsePositives = 0;
for (let i = 0; i < 10000; i++) if (bf.mightContain("ghost" + i)) falsePositives++;
console.log(bf.m, bf.k, bf.mightContain("user42"), falsePositives / 10000);   // 95851 7 true, then a small rate (theory: about 0.01)`,
    },
  };
})();
