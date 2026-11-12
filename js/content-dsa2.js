/* More DSA topics: bit manipulation, string matching, union-find, topological sort, range queries, Bloom filters */
(function () {
  const Q = (q, options, answer, explain) => ({ q, options, answer, explain });
  const P = (name, diff, desc, hint, sol) => ({ name, diff, desc, hint, sol });
  const T = (t) => L.topics.push({ track: "dsa", ...t });

  T({
    id: "bit-manipulation", title: "Bit Manipulation", icon: "🔢", summary: "AND, OR, XOR, shifts and the classic tricks built from them.",
    viz: "bits",
    learn: `
<p>Every integer is a row of bits. Bitwise operators work on all of those bits at once in a single CPU instruction, which makes them the fastest and most compact tools you have.</p>
<h2>The operators</h2>
<table><tr><th>Operator</th><th>Meaning</th><th>Example (4-bit)</th></tr>
<tr><td><code>a & b</code></td><td>AND: 1 where both are 1</td><td>1100 & 1010 = 1000</td></tr>
<tr><td><code>a | b</code></td><td>OR: 1 where either is 1</td><td>1100 | 1010 = 1110</td></tr>
<tr><td><code>a ^ b</code></td><td>XOR: 1 where they differ</td><td>1100 ^ 1010 = 0110</td></tr>
<tr><td><code>~a</code></td><td>NOT: flip every bit (= −a − 1)</td><td>~1100 = 0011</td></tr>
<tr><td><code>a << k</code></td><td>Shift left: multiply by 2ᵏ</td><td>0011 << 2 = 1100</td></tr>
<tr><td><code>a >> k</code></td><td>Shift right: divide by 2ᵏ (floor)</td><td>1100 >> 2 = 0011</td></tr></table>
<h2>Working with a single bit k</h2>
<pre>test:    (x >> k) & 1
set:     x | (1 << k)
clear:   x & ~(1 << k)
toggle:  x ^ (1 << k)</pre>
<h2>Tricks worth memorizing</h2>
<table><tr><th>Expression</th><th>What it does</th></tr>
<tr><td><code>x & 1</code></td><td>Is x odd?</td></tr>
<tr><td><code>x & (x − 1)</code></td><td>Clear the lowest set bit. Zero ⇔ x is a power of two (for x > 0)</td></tr>
<tr><td><code>x & −x</code></td><td>Isolate the lowest set bit</td></tr>
<tr><td><code>a ^ a = 0</code>, <code>a ^ 0 = a</code></td><td>XOR cancels pairs: XOR of a whole array leaves the element that appears once</td></tr>
<tr><td><code>1 << n</code></td><td>2ⁿ, also the number of subsets of n items</td></tr></table>
<h2>Bitmasks as sets</h2>
<p>An integer can represent a subset of up to 32 or 64 items: bit i is 1 if item i is in the set. Union is <code>|</code>, intersection is <code>&</code>, and you can loop over all subsets with <code>for mask in range(1 << n)</code>. This powers "bitmask DP" (e.g. travelling salesman for n ≤ 20).</p>
<pre>def subsets(nums):
    n = len(nums)
    return [[nums[i] for i in range(n) if mask >> i & 1] for mask in range(1 << n)]</pre>
<h2>Counting set bits</h2>
<pre>def popcount(x):
    count = 0
    while x:
        x &= x - 1      # remove the lowest 1
        count += 1
    return count</pre>
<div class="callout warn">Language traps: Python integers are unbounded, so <code>~x</code> is negative and there is no overflow; mask with <code>& 0xFFFFFFFF</code> when you need 32-bit behaviour. In Java, <code>>></code> keeps the sign and <code>>>></code> shifts in zeros. JavaScript bitwise operators work on 32-bit signed integers.</div>
<div class="callout tip">In the visualizer: pick each operator, then step through Kernighan's loop and see that it runs once per 1-bit.</div>`,
    quiz: [
      Q("What does x & (x − 1) do?", ["Sets the lowest bit", "Clears the lowest set bit", "Doubles x", "Flips all bits"], 1, "Subtracting 1 flips the lowest 1 and the zeros below it; AND removes that 1."),
      Q("5 ^ 5 ^ 9 equals:", ["0", "5", "9", "19"], 2, "5 ^ 5 = 0, and 0 ^ 9 = 9. XOR cancels pairs."),
      Q("How do you test whether bit k of x is set?", ["x | (1 << k)", "(x >> k) & 1", "x ^ k", "x << k"], 1, "Shift bit k down to position 0 and mask it."),
      Q("x > 0 is a power of two exactly when:", ["x & 1 == 0", "x & (x − 1) == 0", "x ^ x == 0", "x >> 1 == 0"], 1, "A power of two has a single 1-bit; clearing it leaves 0."),
      Q("How many subsets does a set of 10 items have?", ["20", "100", "1,024", "3,628,800"], 2, "Each item is in or out: 2¹⁰ = 1 << 10 = 1,024."),
    ],
    practice: [
      P("Single Number", "easy", "Every element appears twice except one. Find it in O(1) space.", "What cancels pairs?", "XOR all elements together: pairs cancel to 0 and the lone value remains. O(n) time, O(1) space."),
      P("Number of 1 Bits", "easy", "Return the number of set bits in an integer.", "Remove one set bit per iteration.", "Loop n &= n − 1 and count iterations (Kernighan). Runs once per set bit."),
      P("Counting Bits", "easy", "For every i in 0..n return the number of 1-bits.", "Reuse a smaller answer.", "dp[i] = dp[i >> 1] + (i & 1), or dp[i] = dp[i & (i − 1)] + 1. O(n)."),
      P("Subsets", "medium", "Return all subsets of distinct integers.", "Count from 0 to 2ⁿ − 1.", "For mask in 0..(1 << n) − 1, include nums[i] when bit i of mask is set. O(n·2ⁿ)."),
      P("Sum of Two Integers", "medium", "Add two integers without + or −.", "XOR adds without carry; AND finds the carries.", "Repeat: carry = (a & b) << 1; a = a ^ b; b = carry, until b is 0. In Python mask to 32 bits."),
    ],
  });

  T({
    id: "string-matching", title: "String Matching (KMP & Rabin–Karp)", icon: "🧵", summary: "Find a pattern in a text in linear time: prefix tables and rolling hashes.",
    viz: "kmp",
    learn: `
<p><b>Problem:</b> find where a pattern of length m occurs in a text of length n. It's what Ctrl+F, <code>grep</code>, plagiarism checkers and DNA search all do.</p>
<h2>Naive search: O(n·m)</h2>
<p>Try the pattern at every position; on a mismatch slide by one and start over. Text <code>AAAAAAAAAB</code> with pattern <code>AAAB</code> re-compares the same characters again and again.</p>
<h2>KMP: never move backwards in the text</h2>
<p>When a mismatch happens after matching j characters, we already know those j characters. KMP precomputes, for the pattern alone, how much of that work can be reused.</p>
<p><b>LPS table</b> (also called the failure or prefix function): <code>lps[i]</code> = length of the longest <i>proper prefix</i> of <code>pattern[0..i]</code> that is also a <i>suffix</i> of it.</p>
<pre>pattern:  A B A B C A B A B
lps:      0 0 1 2 0 1 2 3 4</pre>
<pre>def build_lps(p):
    lps, length = [0] * len(p), 0
    for i in range(1, len(p)):
        while length and p[i] != p[length]:
            length = lps[length - 1]
        if p[i] == p[length]:
            length += 1
        lps[i] = length
    return lps

def kmp(text, p):
    lps, j, out = build_lps(p), 0, []
    for i, ch in enumerate(text):
        while j and ch != p[j]:
            j = lps[j - 1]            # reuse the matched prefix
        if ch == p[j]:
            j += 1
        if j == len(p):
            out.append(i - j + 1)
            j = lps[j - 1]
    return out</pre>
<p>The text pointer only moves forward, so the total work is <b>O(n + m)</b>.</p>
<h2>Rabin–Karp: compare hashes, not characters</h2>
<p>Hash the pattern. Slide a window over the text and keep its hash up to date in O(1) with a <b>rolling hash</b>:</p>
<pre>hash(s) = (s₀·Bᵐ⁻¹ + s₁·Bᵐ⁻² + … + sₘ₋₁) mod M
slide:   h = ((h − out·Bᵐ⁻¹)·B + in) mod M</pre>
<p>Only when the hashes are equal do you compare characters (to rule out a collision). Average O(n + m), worst case O(n·m). Its strength: searching for <b>many patterns at once</b> or for repeated substrings.</p>
<h2>Which one?</h2>
<table><tr><th>Algorithm</th><th>Time</th><th>Best for</th></tr>
<tr><td>Naive</td><td>O(n·m)</td><td>Short strings; it is what most <code>indexOf</code> calls effectively do well enough</td></tr>
<tr><td>KMP</td><td>O(n + m)</td><td>Guaranteed linear; streaming text</td></tr>
<tr><td>Rabin–Karp</td><td>O(n + m) average</td><td>Multiple patterns, duplicate detection</td></tr>
<tr><td>Boyer–Moore</td><td>Sub-linear in practice</td><td>What real <code>grep</code> uses: skips ahead from the pattern's end</td></tr>
<tr><td>Aho–Corasick</td><td>O(n + total pattern length)</td><td>Thousands of patterns at once (a trie + KMP-style links)</td></tr></table>
<div class="callout tip">In the visualizer: run KMP and naive on the same input and compare the comparison counts. Then try text <code>AAAAAAAAAAAAAAAAAB</code> with pattern <code>AAAAB</code>.</div>`,
    quiz: [
      Q("KMP's running time for text n and pattern m is:", ["O(n·m)", "O(n + m)", "O(n log m)", "O(m²)"], 1, "O(m) to build the table, O(n) to scan; the text pointer never moves back."),
      Q("The LPS value for the pattern 'AAAA' at its last position is:", ["0", "1", "3", "4"], 2, "The longest proper prefix that is also a suffix is 'AAA' (length 3). 'Proper' excludes the whole string."),
      Q("After a mismatch, KMP:", ["Restarts the pattern and moves the text pointer back", "Keeps the text pointer and shifts the pattern using the LPS table", "Skips the rest of the text", "Rehashes the window"], 1, "That is the whole trick."),
      Q("Rabin–Karp slides its window in O(1) thanks to:", ["Sorting", "A rolling hash", "A trie", "Binary search"], 1, "Remove the outgoing character's contribution, add the incoming one."),
      Q("Why must Rabin–Karp verify characters when hashes match?", ["Hashes are slow", "Different strings can share a hash (collision)", "The text may be sorted", "To build the LPS table"], 1, "A hash match is only a strong hint."),
    ],
    practice: [
      P("Find the Index of the First Occurrence in a String", "easy", "Return the first index of needle in haystack, or −1.", "Implement KMP rather than calling find().", "Build the LPS table, scan with two pointers. O(n + m)."),
      P("Repeated Substring Pattern", "easy", "Can s be built by repeating one of its substrings?", "Look at the last LPS value.", "Let k = lps[n − 1]. If k > 0 and n % (n − k) == 0 the answer is true (the period is n − k)."),
      P("Longest Happy Prefix", "hard", "Longest prefix of s that is also a suffix (not the whole string).", "It is literally one LPS entry.", "Compute the LPS array; the answer is s[:lps[n − 1]]."),
      P("Repeated DNA Sequences", "medium", "Find all 10-letter sequences that occur more than once.", "Fixed-size window; hash it.", "Slide a window of 10, keep seen windows in a set (or use a rolling hash with 2 bits per letter). O(n)."),
      P("Shortest Palindrome", "hard", "Add the fewest characters in front of s to make a palindrome.", "Find the longest palindromic prefix with KMP.", "Build LPS for s + '#' + reverse(s). The last value is the longest palindromic prefix length; prepend the reverse of the rest."),
    ],
  });

  T({
    id: "union-find", title: "Union-Find & Minimum Spanning Trees", icon: "🤝", summary: "Track connected groups in near-constant time; Kruskal's and Prim's algorithms.",
    viz: "unionFind",
    learn: `
<p><b>Union-Find</b> (disjoint set union, DSU) maintains a collection of non-overlapping groups and answers two questions very fast:</p>
<ul><li><b>find(x)</b>: which group is x in? (returns the group's representative, its <i>root</i>)</li>
<li><b>union(a, b)</b>: merge the groups containing a and b.</li></ul>
<h2>Representation</h2>
<p>A <code>parent</code> array forms a forest: each element points to its parent and a root points to itself. Two elements are connected exactly when they have the same root.</p>
<h2>Two optimizations make it almost O(1)</h2>
<ul><li><b>Path compression</b>: during find, point every visited node directly at the root.</li>
<li><b>Union by rank / size</b>: always hang the smaller tree under the larger one.</li></ul>
<pre>class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path halving
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return False          # already connected
        if self.size[ra] < self.size[rb]: ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        return True</pre>
<p>With both, m operations cost O(m·α(n)), where α is the inverse Ackermann function: at most 4 for any input that fits in the universe.</p>
<h2>When to reach for it</h2>
<ul><li>Counting <b>connected components</b> as edges arrive (dynamic connectivity).</li>
<li><b>Cycle detection</b> in an undirected graph: an edge whose endpoints already share a root closes a cycle.</li>
<li>Grouping equivalent items: merging accounts, equal variables, pixels of the same region.</li></ul>
<div class="callout warn">Union-Find can merge but not split. If edges are also deleted you need a different tool (or process the queries offline in reverse).</div>
<h2>Minimum spanning tree (MST)</h2>
<p>Given a connected, weighted, undirected graph, an MST connects all V vertices with V − 1 edges of the smallest total weight (cheapest way to wire up a network).</p>
<table><tr><th>Algorithm</th><th>Idea</th><th>Time</th></tr>
<tr><td><b>Kruskal</b></td><td>Sort edges by weight; take each edge unless it would form a cycle (Union-Find check)</td><td>O(E log E)</td></tr>
<tr><td><b>Prim</b></td><td>Grow one tree from a start vertex, always adding the cheapest edge leaving it (min-heap)</td><td>O(E log V)</td></tr></table>
<pre>def kruskal(n, edges):                 # edges: (weight, u, v)
    dsu, total = DSU(n), 0
    for w, u, v in sorted(edges):
        if dsu.union(u, v):            # skips edges that would close a cycle
            total += w
    return total</pre>
<p>Both are greedy and both are correct because of the <b>cut property</b>: the lightest edge crossing any cut of the graph belongs to some MST.</p>
<div class="callout tip">In the visualizer: do several random unions, then call Find on a deep node and watch its whole path re-attach to the root.</div>`,
    quiz: [
      Q("Two elements are in the same set exactly when:", ["They have the same parent", "They have the same root", "They have the same rank", "They are adjacent in the array"], 1, "Parents can differ; the root is the set's identity."),
      Q("Path compression:", ["Sorts the elements", "Points visited nodes directly at the root during find", "Deletes the smaller tree", "Balances a BST"], 1, "It flattens the tree so later finds are faster."),
      Q("With path compression and union by rank, each operation costs roughly:", ["O(n)", "O(log n)", "O(α(n)), effectively constant", "O(n log n)"], 2, "α(n) ≤ 4 for any practical n."),
      Q("In Kruskal's algorithm an edge is skipped when:", ["It is the heaviest", "Its endpoints are already in the same set", "It touches the start vertex", "Its weight is odd"], 1, "Adding it would create a cycle."),
      Q("A spanning tree of a connected graph with V vertices has how many edges?", ["V", "V − 1", "V + 1", "E − V"], 1, "A tree on V nodes always has V − 1 edges."),
    ],
    practice: [
      P("Number of Provinces", "medium", "Given an adjacency matrix, count the connected groups of cities.", "Union every connected pair.", "DSU over n cities; union(i, j) when connected[i][j] = 1; answer = number of distinct roots (or n minus successful unions)."),
      P("Redundant Connection", "medium", "A tree had one extra edge added. Return an edge that can be removed.", "Which edge joins two already-connected nodes?", "Process edges in order; the first edge whose union returns false closes the cycle. Return it."),
      P("Accounts Merge", "medium", "Merge accounts that share at least one email.", "Union emails, not accounts.", "Map each email to an id; union all emails within one account; group emails by root; sort each group and prefix the name."),
      P("Min Cost to Connect All Points", "medium", "Connect all points with minimum total Manhattan distance.", "It is an MST on a complete graph.", "Kruskal over all O(n²) edges with DSU, or Prim with a min-distance array in O(n²), which is better for dense graphs."),
      P("Number of Islands II", "hard", "Land cells are added one at a time; report the island count after each.", "Dynamic connectivity.", "DSU over grid cells. For each new land cell: count += 1, then union with each land neighbour and decrement count for every successful union."),
    ],
  });

  T({
    id: "topological-sort", title: "Topological Sort", icon: "📋", summary: "Order tasks so every dependency comes first; detect cycles in directed graphs.",
    viz: "topoSort",
    learn: `
<p>A <b>topological order</b> of a directed graph lists the nodes so that for every edge u → v, u appears before v. Think "prerequisites first": courses, build steps, package installs.</p>
<p>It exists <b>only for a DAG</b> (directed acyclic graph). If A needs B and B needs A, no order can satisfy both. So a topological sort doubles as a <b>cycle detector</b>.</p>
<h2>Kahn's algorithm (BFS)</h2>
<ol><li>Compute every node's <b>in-degree</b> (number of incoming edges).</li>
<li>Put all nodes with in-degree 0 in a queue: nothing blocks them.</li>
<li>Pop a node, add it to the order, and decrement the in-degree of each neighbour. Any neighbour that reaches 0 joins the queue.</li>
<li>If the order contains fewer than V nodes, the graph has a cycle.</li></ol>
<pre>from collections import deque

def topo_sort(n, edges):
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v); indeg[v] += 1
    queue = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    return order if len(order) == n else None      # None → cycle</pre>
<h2>DFS version</h2>
<p>Run DFS; add a node to the result <b>after</b> all its descendants are finished (post-order), then reverse. Use three colours to detect cycles: white = unvisited, grey = on the current path, black = done. Reaching a <b>grey</b> node means a back edge, i.e. a cycle.</p>
<p>Both run in <b>O(V + E)</b>.</p>
<h2>Good to know</h2>
<ul><li>The order is usually <b>not unique</b>. Use a min-heap instead of a queue to get the lexicographically smallest one.</li>
<li>Processing Kahn's queue level by level gives the <b>minimum number of rounds</b> when independent tasks run in parallel (e.g. semesters needed).</li>
<li><b>Longest / shortest paths in a DAG</b>: relax edges in topological order for an O(V + E) solution, even with negative weights. This is also how DP over a dependency graph works.</li></ul>
<div class="callout tip">In the visualizer: step through Kahn's algorithm, then press "Add a back edge" and watch the queue run dry before every node is placed.</div>`,
    quiz: [
      Q("A topological order exists if and only if the graph is:", ["Connected", "A DAG (directed, no cycles)", "A tree", "Undirected"], 1, "Any cycle makes the ordering impossible."),
      Q("Kahn's algorithm starts with the nodes that have:", ["The most edges", "In-degree 0", "Out-degree 0", "The smallest label"], 1, "They have no prerequisites."),
      Q("Kahn's algorithm finishes having output fewer than V nodes. This means:", ["The graph is disconnected", "The graph has a cycle", "The queue overflowed", "The graph is a tree"], 1, "Nodes on a cycle never reach in-degree 0."),
      Q("The time complexity of topological sort is:", ["O(V²)", "O(V + E)", "O(E log V)", "O(V·E)"], 1, "Each node and each edge is handled once."),
      Q("In the DFS version, a node is added to the result:", ["When first visited", "After all its descendants are finished", "Before its parent", "At random"], 1, "Post-order, then reverse the list."),
    ],
    practice: [
      P("Course Schedule", "medium", "Given prerequisite pairs, can you finish all courses?", "It is asking whether the graph has a cycle.", "Kahn's algorithm; return processed == numCourses."),
      P("Course Schedule II", "medium", "Return an order in which to take the courses, or an empty list.", "Same algorithm; keep the order.", "Kahn's algorithm; return the order if it contains every course, else []."),
      P("Alien Dictionary", "hard", "Words are sorted in an unknown alphabet. Recover the letter order.", "Adjacent words give one edge each.", "Compare each adjacent pair: the first differing letters give an edge a → b (if a word is a prefix of the earlier longer word, the input is invalid). Topologically sort the letters."),
      P("Parallel Courses", "medium", "Minimum number of semesters if you can take any number of available courses at once.", "Process Kahn's queue level by level.", "BFS by levels: each level is one semester. Answer = number of levels, or −1 if a cycle remains."),
      P("Longest Increasing Path in a Matrix", "hard", "Longest path where each step moves to a strictly larger neighbour.", "Edges small → large form a DAG.", "Memoized DFS (dp[cell] = 1 + max over larger neighbours), or peel cells in topological order by in-degree. O(m·n)."),
    ],
  });

  T({
    id: "range-queries", title: "Range Queries: Prefix Sums, Fenwick & Segment Trees", icon: "📶", summary: "Answer 'sum / min of a[l..r]' fast, even while the array keeps changing.",
    viz: "fenwick",
    learn: `
<p><b>Problem:</b> answer many queries about a range of an array: sum of a[l..r], minimum of a[l..r], and so on.</p>
<h2>Static array: prefix sums</h2>
<pre>prefix[i] = a[0] + … + a[i−1]
sum(l..r) = prefix[r+1] − prefix[l]      # O(1) per query</pre>
<p>Perfect until a value changes: one update forces O(n) work to rebuild the prefix array.</p>
<h2>The trade-off</h2>
<table><tr><th>Structure</th><th>Query</th><th>Point update</th><th>Notes</th></tr>
<tr><td>Plain array</td><td>O(n)</td><td>O(1)</td><td></td></tr>
<tr><td>Prefix sums</td><td>O(1)</td><td>O(n)</td><td>Static data only</td></tr>
<tr><td><b>Fenwick tree</b> (BIT)</td><td>O(log n)</td><td>O(log n)</td><td>Tiny code; sums (anything invertible)</td></tr>
<tr><td><b>Segment tree</b></td><td>O(log n)</td><td>O(log n)</td><td>Any associative operation (min, max, gcd); range updates with lazy propagation</td></tr>
<tr><td>Sparse table</td><td>O(1)</td><td>–</td><td>Static min/max after O(n log n) preprocessing</td></tr></table>
<h2>Fenwick tree (binary indexed tree)</h2>
<p>Uses 1-based indexing. <code>tree[i]</code> stores the sum of the last <code>lowbit(i)</code> elements ending at i, where <code>lowbit(i) = i & −i</code> (the lowest set bit).</p>
<pre>class Fenwick:
    def __init__(self, n):
        self.t = [0] * (n + 1)
    def update(self, i, delta):          # a[i] += delta
        while i < len(self.t):
            self.t[i] += delta
            i += i & -i                  # jump to the next range that contains i
    def query(self, i):                  # sum of a[1..i]
        s = 0
        while i > 0:
            s += self.t[i]
            i -= i & -i                  # strip the lowest set bit
        return s
    def range_sum(self, l, r):
        return self.query(r) - self.query(l - 1)</pre>
<p>A prefix of length i is covered by one block per 1-bit of i, so both operations touch at most log₂ n entries.</p>
<h2>Segment tree</h2>
<p>A binary tree where each node stores the answer for a segment; the root covers the whole array and each leaf one element. A query combines O(log n) nodes that exactly tile [l, r]. It handles operations with no inverse (min, max) and, with <b>lazy propagation</b>, range updates such as "add 5 to every element in [l, r]".</p>
<pre>class SegTree:                           # iterative, range minimum
    def __init__(self, a):
        self.n = len(a)
        self.t = [float("inf")] * self.n + a
        for i in range(self.n - 1, 0, -1):
            self.t[i] = min(self.t[2 * i], self.t[2 * i + 1])
    def update(self, i, v):
        i += self.n; self.t[i] = v
        while i > 1:
            i //= 2
            self.t[i] = min(self.t[2 * i], self.t[2 * i + 1])
    def query(self, l, r):               # min of a[l..r), half-open
        res, l, r = float("inf"), l + self.n, r + self.n
        while l < r:
            if l & 1: res = min(res, self.t[l]); l += 1
            if r & 1: r -= 1; res = min(res, self.t[r])
            l //= 2; r //= 2
        return res</pre>
<div class="callout tip">Also know the <b>difference array</b>: to add v to a whole range [l, r] many times and read the array once at the end, do <code>d[l] += v; d[r+1] −= v</code> and take a prefix sum.</div>
<div class="callout tip">In the visualizer: query index 11 (binary 1011) and count the three blocks it adds; then update an index and watch which blocks change.</div>`,
    quiz: [
      Q("With a prefix-sum array, sum(l..r) costs:", ["O(n)", "O(log n)", "O(1)", "O(n log n)"], 2, "One subtraction: prefix[r+1] − prefix[l]."),
      Q("Why not use prefix sums when the array changes often?", ["They use too much memory", "Each update costs O(n) to rebuild", "They can't handle negatives", "They need sorting"], 1, "Every later prefix value changes."),
      Q("A Fenwick tree supports point update and prefix query in:", ["O(1) and O(n)", "O(log n) each", "O(n) each", "O(√n) each"], 1, "Each touches one node per bit."),
      Q("In a Fenwick tree, i & −i gives:", ["The parent index", "The lowest set bit of i: the length of the range stored at i", "The highest set bit", "The array value"], 1, "That block size drives both loops."),
      Q("You need range-minimum queries with updates. Best choice:", ["Prefix sums", "Fenwick tree", "Segment tree", "Hash map"], 2, "Min has no inverse, so the subtract trick of prefix sums / Fenwick doesn't work."),
    ],
    practice: [
      P("Range Sum Query - Immutable", "easy", "Many sum(l, r) queries on a fixed array.", "Precompute.", "Prefix sums; answer prefix[r + 1] − prefix[l] in O(1)."),
      P("Range Sum Query - Mutable", "medium", "Support update(i, val) and sumRange(l, r).", "You need both operations in O(log n).", "Fenwick tree: update with delta = val − current; sumRange = query(r + 1) − query(l)."),
      P("Corporate Flight Bookings", "medium", "Each booking adds seats to flights first..last. Return the final seats per flight.", "Range add, read once.", "Difference array: d[first] += seats; d[last + 1] −= seats; prefix sum at the end. O(n + bookings)."),
      P("Count of Smaller Numbers After Self", "hard", "For each element count the smaller elements to its right.", "Scan from the right, counting values seen so far.", "Coordinate-compress the values; iterate right to left: answer = fenwick.query(rank − 1), then fenwick.update(rank, 1). O(n log n)."),
      P("Range Minimum Query", "medium", "Support point updates and minimum of a[l..r].", "Which structure handles min?", "Segment tree storing the minimum of each segment; update walks up from the leaf, query combines O(log n) nodes."),
    ],
  });

  T({
    id: "bloom-filter", title: "Bloom Filters & Probabilistic Structures", icon: "🌸", summary: "Answer 'have I seen this?' with a few bits per item, at the price of rare false positives.",
    viz: "bloom", links: false,
    learn: `
<p>A hash set of a billion URLs needs tens of gigabytes. A <b>Bloom filter</b> answers the same membership question in about 1.2 GB, by allowing a small, controlled error.</p>
<h2>How it works</h2>
<p>A bit array of <b>m</b> bits (all 0) and <b>k</b> independent hash functions.</p>
<ul><li><b>add(x)</b>: compute the k hashes and set those k bits to 1.</li>
<li><b>contains(x)</b>: compute the k hashes. If <b>any</b> bit is 0 → x was <b>definitely never added</b>. If all are 1 → x is <b>probably</b> present.</li></ul>
<pre>class BloomFilter:
    def __init__(self, m, k):
        self.m, self.k, self.bits = m, k, bytearray(m)
    def _positions(self, item):
        return [hash((seed, item)) % self.m for seed in range(self.k)]
    def add(self, item):
        for p in self._positions(item): self.bits[p] = 1
    def __contains__(self, item):
        return all(self.bits[p] for p in self._positions(item))</pre>
<h2>The guarantee</h2>
<table><tr><th>Filter says</th><th>Truth</th></tr>
<tr><td>"No"</td><td>Always correct: <b>no false negatives</b></td></tr>
<tr><td>"Yes"</td><td>Usually correct; sometimes a <b>false positive</b> (other items set those same bits)</td></tr></table>
<h2>Sizing</h2>
<pre>false-positive rate  p ≈ (1 − e^(−k·n/m))^k
best k               = (m / n) · ln 2
bits per item        m / n ≈ 1.44 · log₂(1 / p)</pre>
<p>Rule of thumb: <b>~10 bits per item with 7 hashes gives about 1% false positives</b>, no matter how large the items themselves are.</p>
<h2>Limitations</h2>
<ul><li><b>No deletes</b>: clearing a bit might remove other items. A <b>counting Bloom filter</b> (small counters instead of bits) or a <b>cuckoo filter</b> supports deletion.</li>
<li>You can't list the items or count them exactly.</li>
<li>If you add far more than the planned n, the false-positive rate climbs toward 100%.</li></ul>
<h2>The classic use: skip expensive lookups</h2>
<p>Put the filter in front of something slow (disk, network). "No" answers skip the slow path entirely; a rare false positive just costs one wasted lookup. LSM-tree databases keep one per file so a read doesn't touch files that can't contain the key.</p>
<h2>Relatives</h2>
<table><tr><th>Structure</th><th>Answers</th><th>Memory</th></tr>
<tr><td><b>HyperLogLog</b></td><td>How many <i>distinct</i> items? (±1–2%)</td><td>~12 KB for billions</td></tr>
<tr><td><b>Count-Min Sketch</b></td><td>About how often did x occur?</td><td>A small grid of counters</td></tr>
<tr><td><b>Cuckoo filter</b></td><td>Membership, with deletion</td><td>Similar to Bloom</td></tr></table>
<div class="callout tip">In the visualizer: add a dozen words, then press "Hunt for a false positive" and see a word that was never added pass the check.</div>`,
    quiz: [
      Q("A Bloom filter says an item is NOT present. That answer is:", ["Probably right", "Always right", "Usually wrong", "Random"], 1, "If the item had been added, all its bits would be 1."),
      Q("A false positive happens when:", ["A hash function fails", "Other items happened to set all k of the queried bits", "The array is empty", "An item is added twice"], 1, "The bits are shared between items."),
      Q("Why can't a plain Bloom filter delete items?", ["Bits can't be changed", "Clearing a bit could erase evidence of other items", "Hashes aren't reversible", "It would be too slow"], 1, "Counting Bloom filters and cuckoo filters solve this."),
      Q("About how many bits per item give a 1% false-positive rate?", ["1", "10", "100", "1,000"], 1, "≈ 9.6 bits per item with 7 hash functions."),
      Q("To estimate the number of distinct visitors with a few kilobytes, use:", ["A hash set", "HyperLogLog", "A Bloom filter", "A linked list"], 1, "HyperLogLog is built for cardinality estimation."),
    ],
    practice: [
      P("Size a filter", "easy", "You expect 10 million usernames and want about 1% false positives. How much memory and how many hashes?", "~9.6 bits per item.", "m ≈ 9.6 × 10⁷ bits ≈ 12 MB; k = (m/n)·ln 2 ≈ 7. A hash set of the strings would need hundreds of MB."),
      P("Implement a Bloom filter", "medium", "Write add and contains using only two base hash functions.", "Combine them to make k hashes.", "Double hashing: position_i = (h1 + i·h2) mod m for i in 0..k−1. Store the bits in a byte array or bitset."),
      P("'Username taken?' at scale", "medium", "Design a fast check for a sign-up form with 1 billion existing usernames.", "Avoid hitting the database for most requests.", "Bloom filter in memory in front of the DB. 'No' → available immediately. 'Maybe' → confirm with a DB lookup. Rebuild or use a counting filter to handle deletions."),
      P("Unique visitors per day", "medium", "Count distinct user IDs across billions of events with tiny memory.", "You only need an estimate.", "HyperLogLog (e.g. Redis PFADD / PFCOUNT): ~12 KB per counter, ~1% error, and sketches from different servers can be merged."),
    ],
  });
})();
