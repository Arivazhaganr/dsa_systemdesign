/* DSA extras: history ("story"), real-world uses, and code samples in 4 languages */
(function () {
  const X = (L.extras = L.extras || {});

  X["big-o"] = {
    story: {
      when: "1894 (math) · 1976 (computer science)",
      who: "Paul Bachmann & Edmund Landau; popularized for algorithms by Donald Knuth",
      before: "Programmers compared programs by timing them with a stopwatch on one specific machine. Results changed with the hardware, the compiler and the input, so nobody could compare ideas fairly.",
      why: "Mathematicians invented O-notation to describe how functions grow in number theory. Knuth adopted it (and added Ω and Θ) so we could compare <i>algorithms</i> independently of machines: an O(n log n) sort beats an O(n²) sort on any computer once n is big enough.",
    },
    uses: [
      ["🎯", "Choosing algorithms", "Deciding whether a solution will finish in time before writing it (the interview cheat sheet)."],
      ["🗄️", "Database query planners", "PostgreSQL/MySQL estimate the cost of a full scan vs an index lookup and pick the cheaper plan."],
      ["🐢", "Performance reviews", "Spotting a hidden O(n²) loop (e.g. list.contains inside a loop) that slows a page as data grows."],
      ["🔐", "Cryptography", "Security relies on attacks being exponential: brute-forcing a 128-bit key needs ~2¹²⁸ tries."],
      ["📈", "Capacity planning", "Knowing how cost grows tells you whether 10× more users needs 10× or 100× more servers."],
    ],
    code: {
      python: `# O(n^2): compare every pair
def has_dup_slow(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False

# O(n) time, O(n) extra space: trade memory for speed
def has_dup_fast(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False`,
      java: `import java.util.*;

class BigO {
    // O(n^2) time, O(1) space
    static boolean hasDupSlow(int[] nums) {
        for (int i = 0; i < nums.length; i++)
            for (int j = i + 1; j < nums.length; j++)
                if (nums[i] == nums[j]) return true;
        return false;
    }

    // O(n) time, O(n) space
    static boolean hasDupFast(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums)
            if (!seen.add(x)) return true; // add() returns false if present
        return false;
    }
}`,
      typescript: `// O(n^2) time, O(1) space
function hasDupSlow(nums: number[]): boolean {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] === nums[j]) return true;
  return false;
}

// O(n) time, O(n) space
function hasDupFast(nums: number[]): boolean {
  const seen = new Set<number>();
  for (const x of nums) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}`,
      javascript: `// O(n^2) time, O(1) space
function hasDupSlow(nums) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] === nums[j]) return true;
  return false;
}

// O(n) time, O(n) space
function hasDupFast(nums) {
  return new Set(nums).size !== nums.length;
}

console.time("fast");
hasDupFast(Array.from({ length: 1e6 }, (_, i) => i));
console.timeEnd("fast"); // try the slow one with 1e5 and compare!`,
    },
  };

  X.arrays = {
    story: {
      when: "1940s–1957",
      who: "John von Neumann (EDVAC, 1945); FORTRAN team led by John Backus (1957)",
      before: "Early machines read data sequentially from punched cards or magnetic tape. To reach item 1,000 you had to roll past the first 999.",
      why: "Random-access memory (RAM) made it possible to jump to any address directly. Storing items back to back and computing <code>base + i × size</code> turned 'find item i' into one arithmetic step. FORTRAN made arrays a first-class language feature for scientific computing (matrices, vectors).",
    },
    uses: [
      ["🖼️", "Images", "A photo is a 2D array of pixels; filters and Instagram effects loop over it."],
      ["🎵", "Audio & video buffers", "Sound is an array of samples (44,100 per second for CD quality)."],
      ["📊", "Spreadsheets & dataframes", "NumPy, pandas and Excel columns are contiguous arrays, which is why vectorized math is so fast."],
      ["🎮", "Game engines", "Entity data stored in arrays for cache-friendly updates every frame."],
      ["🧠", "Machine learning", "Tensors are multi-dimensional arrays processed by GPUs."],
      ["🔤", "Strings", "Every string is an array of characters (bytes)."],
    ],
    code: {
      python: `# Two pointers on a sorted array: O(n) time, O(1) space
def two_sum_sorted(a, target):
    l, r = 0, len(a) - 1
    while l < r:
        s = a[l] + a[r]
        if s == target:
            return [l, r]
        if s < target:
            l += 1
        else:
            r -= 1
    return []

# Prefix sums: any range sum in O(1)
def prefix_sums(a):
    pre = [0]
    for x in a:
        pre.append(pre[-1] + x)
    return pre          # sum(a[l..r]) = pre[r+1] - pre[l]

print(two_sum_sorted([1, 3, 4, 6, 9], 10))  # [0, 4]`,
      java: `class ArraysDemo {
    static int[] twoSumSorted(int[] a, int target) {
        int l = 0, r = a.length - 1;
        while (l < r) {
            int s = a[l] + a[r];
            if (s == target) return new int[]{l, r};
            if (s < target) l++; else r--;
        }
        return new int[0];
    }

    static long[] prefixSums(int[] a) {
        long[] pre = new long[a.length + 1];
        for (int i = 0; i < a.length; i++) pre[i + 1] = pre[i] + a[i];
        return pre; // sum(l..r) = pre[r+1] - pre[l]
    }
}`,
      typescript: `function twoSumSorted(a: number[], target: number): [number, number] | null {
  let l = 0, r = a.length - 1;
  while (l < r) {
    const s = a[l] + a[r];
    if (s === target) return [l, r];
    if (s < target) l++; else r--;
  }
  return null;
}

// Typed arrays are real contiguous memory blocks
const pixels = new Uint8Array(1920 * 1080 * 4); // RGBA image
pixels[0] = 255; // red channel of the first pixel`,
      javascript: `function twoSumSorted(a, target) {
  let l = 0, r = a.length - 1;
  while (l < r) {
    const s = a[l] + a[r];
    if (s === target) return [l, r];
    if (s < target) l++; else r--;
  }
  return null;
}

function prefixSums(a) {
  const pre = [0];
  for (const x of a) pre.push(pre[pre.length - 1] + x);
  return pre; // sum(l..r) = pre[r + 1] - pre[l]
}`,
    },
  };

  X["sliding-window"] = {
    story: {
      when: "1970s networking · later a standard algorithm pattern",
      who: "The TCP sliding-window protocol (Vint Cerf & Bob Kahn's TCP, 1974; RFC 793, 1981)",
      before: "'Stop-and-wait': send one packet, wait for its acknowledgement, then send the next. On long links the sender sat idle most of the time.",
      why: "A window lets the sender have several unacknowledged packets in flight, sliding forward as acknowledgements arrive. The same idea (keep a moving range and update it incrementally instead of recomputing) became a core algorithm pattern for subarrays and substrings.",
    },
    uses: [
      ["🌐", "TCP flow control", "Every web page you load uses a sliding window to control how much data is in flight."],
      ["📉", "Moving averages", "Stock charts, server metrics (avg latency over the last 5 minutes)."],
      ["🚦", "Rate limiters", "The sliding window log/counter algorithm (see System Design)."],
      ["🧬", "DNA analysis", "Scanning genomes for patterns of length k (k-mers)."],
      ["🔎", "Text search", "Rabin-Karp uses a rolling hash over a window of characters (plagiarism detection)."],
    ],
    code: {
      python: `def longest_unique(s: str) -> int:
    last = {}            # char -> last index seen
    l = best = 0
    for r, c in enumerate(s):
        if c in last and last[c] >= l:
            l = last[c] + 1
        last[c] = r
        best = max(best, r - l + 1)
    return best

def max_sum_k(a, k):
    window = sum(a[:k]); best = window
    for r in range(k, len(a)):
        window += a[r] - a[r - k]     # add new, drop old
        best = max(best, window)
    return best

print(longest_unique("abcabcbb"))  # 3`,
      java: `import java.util.*;

class SlidingWindow {
    static int longestUnique(String s) {
        Map<Character, Integer> last = new HashMap<>();
        int l = 0, best = 0;
        for (int r = 0; r < s.length(); r++) {
            char c = s.charAt(r);
            if (last.containsKey(c) && last.get(c) >= l) l = last.get(c) + 1;
            last.put(c, r);
            best = Math.max(best, r - l + 1);
        }
        return best;
    }

    static int maxSumK(int[] a, int k) {
        int window = 0;
        for (int i = 0; i < k; i++) window += a[i];
        int best = window;
        for (int r = k; r < a.length; r++) {
            window += a[r] - a[r - k];
            best = Math.max(best, window);
        }
        return best;
    }
}`,
      typescript: `function longestUnique(s: string): number {
  const last = new Map<string, number>();
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    const seen = last.get(c);
    if (seen !== undefined && seen >= l) l = seen + 1;
    last.set(c, r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}

function movingAverage(values: number[], k: number): number[] {
  const out: number[] = [];
  let sum = 0;
  values.forEach((v, i) => {
    sum += v;
    if (i >= k) sum -= values[i - k];
    if (i >= k - 1) out.push(sum / k);
  });
  return out;
}`,
      javascript: `function longestUnique(s) {
  const last = new Map();
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if (last.has(c) && last.get(c) >= l) l = last.get(c) + 1;
    last.set(c, r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}

console.log(longestUnique("pwwkew")); // 3 ("wke")`,
    },
  };

  X["binary-search"] = {
    story: {
      when: "1946 first described · 1960 first correct general version",
      who: "John Mauchly (Moore School Lectures, 1946); D. H. Lehmer (1960)",
      before: "Linear search: check every item. People have used the halving idea for centuries though, flipping to the middle of a dictionary or phone book.",
      why: "Sorted data on random-access machines made it possible to discard half the data per step. It's famously tricky: Jon Bentley found most professional programmers wrote buggy versions, and in 2006 Joshua Bloch reported that Java's own Arrays.binarySearch had an overflow bug in <code>(low + high) / 2</code> for ~9 years.",
    },
    uses: [
      ["🗄️", "Database indexes", "B-tree indexes binary-search inside each page to find rows among billions."],
      ["🐛", "git bisect", "Finds the commit that introduced a bug in log₂(commits) steps."],
      ["📚", "Standard libraries", "Java Arrays.binarySearch, C++ lower_bound, Python bisect."],
      ["🎮", "Games & graphics", "Finding the right animation keyframe for a timestamp."],
      ["⚙️", "Tuning parameters", "'Binary search on the answer': smallest server count that meets a latency target."],
      ["🔢", "Math libraries", "Computing square roots and inverses numerically."],
    ],
    code: {
      python: `def binary_search(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

# The standard library has it built in:
import bisect
a = [3, 9, 14, 21, 27]
print(bisect.bisect_left(a, 14))   # 2 (first index with a[i] >= 14)`,
      java: `class BinarySearch {
    static int search(int[] a, int target) {
        int lo = 0, hi = a.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;   // avoids int overflow
            if (a[mid] == target) return mid;
            if (a[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
    // Built in: java.util.Arrays.binarySearch(a, target)
}`,
      typescript: `function binarySearch(a: number[], target: number): number {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (a[mid] === target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// Binary search on the answer: smallest x in [lo, hi] where ok(x) is true
function firstTrue(lo: number, hi: number, ok: (x: number) => boolean): number {
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(mid)) hi = mid; else lo = mid + 1;
  }
  return lo;
}`,
      javascript: `function binarySearch(a, target) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] === target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// Integer square root with binary search on the answer
function isqrt(n) {
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (mid * mid <= n) lo = mid; else hi = mid - 1;
  }
  return lo;
}`,
    },
  };

  X.sorting = {
    story: {
      when: "1890 (machines) · 1945 merge sort · 1959 quick sort · 2002 Timsort",
      who: "Herman Hollerith (tabulating machines), John von Neumann (merge sort), Tony Hoare (quick sort), J. W. J. Williams (heap sort, 1964), Tim Peters (Timsort)",
      before: "Clerks sorted paper records by hand. Hollerith's punched-card machines for the 1890 US census sorted cards one digit at a time, essentially radix sort, cutting the census from ~8 years to about 2.",
      why: "Sorting was one of the first big jobs for computers (payrolls, census data, bank records). Hoare invented quicksort in 1959 while trying to sort words for a Russian–English machine translation project. Timsort was designed for Python to exploit the partially sorted runs found in real-world data, and is now also used by Java for objects and by Android.",
    },
    uses: [
      ["🛒", "E-commerce", "Sort products by price, rating or relevance."],
      ["🗄️", "Databases", "ORDER BY, merge joins, and building indexes all sort."],
      ["🔍", "Search engines", "Ranking results by score."],
      ["📦", "Big data", "MapReduce/Spark sort-and-shuffle huge datasets with external merge sort."],
      ["🧹", "Deduplication", "Sort, then duplicates are neighbours."],
      ["🗜️", "Compression", "The Burrows-Wheeler transform (bzip2) is built on sorting."],
    ],
    code: {
      python: `def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]

def quick_sort(a):
    if len(a) <= 1:
        return a
    pivot = a[len(a) // 2]
    return (quick_sort([x for x in a if x < pivot])
            + [x for x in a if x == pivot]
            + quick_sort([x for x in a if x > pivot]))

# In real code: sorted(a) or a.sort()  (Timsort)
people = [("ana", 31), ("bo", 25)]
people.sort(key=lambda p: p[1])`,
      java: `import java.util.*;

class Sorting {
    static void quickSort(int[] a, int lo, int hi) {
        if (lo >= hi) return;
        int p = a[hi], i = lo;
        for (int j = lo; j < hi; j++)
            if (a[j] < p) { int t = a[i]; a[i] = a[j]; a[j] = t; i++; }
        int t = a[i]; a[i] = a[hi]; a[hi] = t;   // pivot into place
        quickSort(a, lo, i - 1);
        quickSort(a, i + 1, hi);
    }

    public static void main(String[] args) {
        int[] a = {5, 2, 9, 1, 7};
        quickSort(a, 0, a.length - 1);
        System.out.println(Arrays.toString(a));
        // In real code: Arrays.sort(a) (dual-pivot quicksort for primitives)
        // and list.sort(Comparator.comparing(Person::age)) (Timsort for objects)
    }
}`,
      typescript: `function mergeSort(a: number[]): number[] {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));
  const right = mergeSort(a.slice(mid));
  const out: number[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length)
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  return out.concat(left.slice(i), right.slice(j));
}

interface Product { name: string; price: number }
const products: Product[] = [{ name: "pen", price: 2 }, { name: "book", price: 12 }];
products.sort((a, b) => a.price - b.price); // stable since ES2019`,
      javascript: `function insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
  }
  return a;
}

// Careful: the default sort compares as STRINGS!
console.log([10, 9, 1].sort());              // [1, 10, 9]
console.log([10, 9, 1].sort((a, b) => a - b)); // [1, 9, 10]`,
    },
  };

  X["linked-list"] = {
    story: {
      when: "1955–1956",
      who: "Allen Newell, Cliff Shaw and Herbert Simon (RAND Corporation & Carnegie)",
      before: "Fixed-size arrays. Inserting into the middle meant shifting everything, and you had to know the maximum size in advance, which is hard when memory was tiny and expensive.",
      why: "They needed flexible, growing structures for the <b>Logic Theorist</b>, an early AI program that proved math theorems, and created the IPL language with linked lists. John McCarthy built LISP (1958) entirely on linked lists, 'LISt Processing'.",
    },
    uses: [
      ["⏮️", "Browser history & music playlists", "Back/forward and next/previous song (doubly linked lists)."],
      ["⚡", "LRU caches", "Doubly linked list + hash map gives O(1) eviction (Redis, Memcached, OS page caches)."],
      ["🖥️", "Operating systems", "Linux kernel uses intrusive linked lists for process lists and ready queues."],
      ["🧮", "Memory allocators", "Free blocks are tracked in 'free lists'."],
      ["↩️", "Undo / redo", "Editors keep a chain of edit operations."],
      ["#️⃣", "Hash table chaining", "Each bucket is a small linked list (Java HashMap)."],
    ],
    code: {
      python: `class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev, cur = cur, nxt
    return prev

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            return True
    return False

head = Node(1, Node(2, Node(3)))
head = reverse(head)          # 3 -> 2 -> 1
# Built-in doubly linked list: collections.deque`,
      java: `class ListNode {
    int val; ListNode next;
    ListNode(int v) { val = v; }
}

class LinkedListDemo {
    static ListNode reverse(ListNode head) {
        ListNode prev = null, cur = head;
        while (cur != null) {
            ListNode next = cur.next;
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        return prev;
    }

    static ListNode middle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }
    // Built in: java.util.LinkedList (doubly linked)
}`,
      typescript: `class ListNode<T> {
  constructor(public val: T, public next: ListNode<T> | null = null) {}
}

class LinkedList<T> {
  head: ListNode<T> | null = null;
  size = 0;

  pushFront(val: T): void {
    this.head = new ListNode(val, this.head);
    this.size++;
  }

  reverse(): void {
    let prev: ListNode<T> | null = null, cur = this.head;
    while (cur) {
      const next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }
    this.head = prev;
  }

  *[Symbol.iterator]() {
    for (let n = this.head; n; n = n.next) yield n.val;
  }
}

const list = new LinkedList<number>();
[3, 2, 1].forEach((x) => list.pushFront(x));
console.log([...list]); // [1, 2, 3]`,
      javascript: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function reverse(head) {
  let prev = null, cur = head;
  while (cur) {
    const next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  return prev;
}

function mergeSorted(a, b) {
  const dummy = new ListNode(0);
  let t = dummy;
  while (a && b) {
    if (a.val <= b.val) { t.next = a; a = a.next; }
    else { t.next = b; b = b.next; }
    t = t.next;
  }
  t.next = a || b;
  return dummy.next;
}`,
    },
  };

  X["stack-queue"] = {
    story: {
      when: "1946 (stack idea) · 1955–57 (formalized) · 1909 (queueing theory)",
      who: "Alan Turing ('bury'/'unbury' for subroutines); Friedrich L. Bauer & Klaus Samelson (the 'Kellerprinzip', patented 1957); A. K. Erlang (queueing theory)",
      before: "Subroutine calls used fixed memory locations for return addresses, so a function couldn't call itself (no recursion) and expressions were hard to compile.",
      why: "Bauer and Samelson used a stack to translate arithmetic formulas into machine code, and Dijkstra's shunting-yard algorithm (1961) did the same for operator precedence. Hardware stacks made recursion and nested calls possible (ALGOL 60). Queues came from Erlang's 1909 study of telephone exchanges: calls wait in line to be served.",
    },
    uses: [
      ["📞", "Function calls", "Every program's call stack (and stack traces when it crashes)."],
      ["↩️", "Undo in editors", "Ctrl+Z pops the last action."],
      ["🧮", "Compilers & calculators", "Parsing expressions and checking brackets."],
      ["🖨️", "Print & task queues", "Jobs processed in arrival order."],
      ["🌐", "Web servers & OS schedulers", "Incoming requests and runnable processes wait in queues."],
      ["🔁", "BFS & event loops", "JavaScript's event loop processes a task queue."],
    ],
    code: {
      python: `from collections import deque

stack = []
stack.append(1); stack.append(2)
print(stack.pop())        # 2 (LIFO)

queue = deque()
queue.append("a"); queue.append("b")
print(queue.popleft())    # "a" (FIFO), O(1)

def is_valid(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    st = []
    for c in s:
        if c in "([{":
            st.append(c)
        elif not st or st.pop() != pairs[c]:
            return False
    return not st

print(is_valid("{[()]}"))   # True`,
      java: `import java.util.*;

class StackQueue {
    public static void main(String[] args) {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1); stack.push(2);
        System.out.println(stack.pop());   // 2

        Queue<String> queue = new ArrayDeque<>();
        queue.offer("a"); queue.offer("b");
        System.out.println(queue.poll());  // a
    }

    static int[] nextGreater(int[] a) {          // monotonic stack, O(n)
        int[] res = new int[a.length];
        Arrays.fill(res, -1);
        Deque<Integer> st = new ArrayDeque<>();   // indices
        for (int i = 0; i < a.length; i++) {
            while (!st.isEmpty() && a[st.peek()] < a[i]) res[st.pop()] = a[i];
            st.push(i);
        }
        return res;
    }
}`,
      typescript: `class Queue<T> {
  private data: T[] = [];
  private head = 0;                 // avoids O(n) shift()
  enqueue(x: T) { this.data.push(x); }
  dequeue(): T | undefined {
    if (this.head >= this.data.length) return undefined;
    const x = this.data[this.head++];
    if (this.head > 1024 && this.head * 2 > this.data.length) {
      this.data = this.data.slice(this.head); this.head = 0;   // compact
    }
    return x;
  }
  get size() { return this.data.length - this.head; }
}

const stack: number[] = [];
stack.push(1); stack.push(2);
console.log(stack.pop()); // 2`,
      javascript: `// Arrays work as stacks: push/pop are O(1)
const stack = [];
stack.push("a"); stack.push("b");
console.log(stack.pop()); // "b"

// shift() is O(n): fine for small queues, use an index for big ones
function dailyTemperatures(t) {
  const res = new Array(t.length).fill(0), st = [];
  t.forEach((temp, i) => {
    while (st.length && t[st[st.length - 1]] < temp) {
      const j = st.pop();
      res[j] = i - j;
    }
    st.push(i);
  });
  return res;
}`,
    },
  };

  X.hashing = {
    story: {
      when: "1953–1954",
      who: "Hans Peter Luhn at IBM (chaining, 1953); Gene Amdahl, Elaine McGraw & Arthur Samuel (open addressing with linear probing, 1954)",
      before: "Sorted tables with binary search (O(log n), and inserts were slow) or plain linear search.",
      why: "IBM needed fast lookups for things like compilers' symbol tables and information retrieval. Luhn's idea: 'chop up' the key into a number and use it directly as a location. The word 'hashing' came into print in 1968 (Robert Morris). Today, Python dicts and JavaScript objects are hash tables underneath, so you use them constantly.",
    },
    uses: [
      ["🐍", "Language internals", "Python dicts, JS objects/Maps, Java HashMap: variables, attributes and JSON."],
      ["⚡", "Caches", "Redis and Memcached are giant hash tables in memory."],
      ["🗄️", "Databases", "Hash indexes and hash joins."],
      ["🧩", "Compilers", "Symbol tables map variable names to their info."],
      ["🔐", "Password storage & dedup", "Store hashes, not passwords; detect duplicate files by hash."],
      ["🌍", "Load balancing", "Hash a user id to pick a server (see Consistent Hashing)."],
    ],
    code: {
      python: `from collections import Counter, defaultdict

counts = Counter("mississippi")
print(counts.most_common(2))     # [('i', 4), ('s', 4)]

def two_sum(nums, target):
    seen = {}                      # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat"]))`,
      java: `import java.util.*;

class Hashing {
    static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[]{j, i};
            seen.put(nums[i], i);
        }
        return null;
    }

    // Custom keys need BOTH equals() and hashCode()
    record Point(int x, int y) {}   // records generate them for you

    public static void main(String[] a) {
        Map<Point, String> grid = new HashMap<>();
        grid.put(new Point(1, 2), "tree");
        System.out.println(grid.get(new Point(1, 2)));   // tree
    }
}`,
      typescript: `function twoSum(nums: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return null;
}

// A tiny hash table with separate chaining
class HashTable<V> {
  private buckets: [string, V][][] = Array.from({ length: 8 }, () => []);
  private hash(key: string) {
    let h = 0;
    for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % this.buckets.length;
  }
  set(key: string, val: V) {
    const b = this.buckets[this.hash(key)];
    const e = b.find(([k]) => k === key);
    if (e) e[1] = val; else b.push([key, val]);
  }
  get(key: string): V | undefined {
    return this.buckets[this.hash(key)].find(([k]) => k === key)?.[1];
  }
}`,
      javascript: `// Prefer Map over plain objects for dynamic keys
const freq = new Map();
for (const w of "the cat and the hat".split(" "))
  freq.set(w, (freq.get(w) || 0) + 1);
console.log(freq.get("the")); // 2

function subarraySum(nums, k) {   // count subarrays summing to k
  const seen = new Map([[0, 1]]);
  let prefix = 0, count = 0;
  for (const x of nums) {
    prefix += x;
    count += seen.get(prefix - k) || 0;
    seen.set(prefix, (seen.get(prefix) || 0) + 1);
  }
  return count;
}`,
    },
  };

  X.recursion = {
    story: {
      when: "1930s theory · 1960 in mainstream languages · 1950s 'backtracking'",
      who: "Kurt Gödel, Alonzo Church & Alan Turing (recursive functions); ALGOL 60 committee; D. H. Lehmer coined 'backtrack'",
      before: "Early languages like FORTRAN didn't allow a function to call itself, because each function's variables lived at one fixed memory address.",
      why: "Recursion matches how many problems are defined (trees, grammars, divide and conquer). Once compilers used a call stack, each call got its own variables. Backtracking turned brute-force puzzle solving into a systematic search with pruning. The 8-queens puzzle itself dates to 1848 (Max Bezzel) and was studied by Gauss.",
    },
    uses: [
      ["🧩", "Puzzle & constraint solvers", "Sudoku, crosswords, timetabling, N-Queens."],
      ["📁", "File systems", "Walking folders inside folders (du, find, Explorer search)."],
      ["🧾", "Parsers & compilers", "Recursive-descent parsers for JSON, HTML and programming languages."],
      ["♟️", "Game AI", "Minimax search in chess and tic-tac-toe engines."],
      ["🔤", "Regex engines", "Many regex engines backtrack when a match attempt fails."],
      ["🌳", "UI frameworks", "React renders a component tree recursively."],
    ],
    code: {
      python: `def subsets(nums):
    res, path = [], []
    def backtrack(i):
        if i == len(nums):
            res.append(path[:])      # copy!
            return
        path.append(nums[i])         # choose
        backtrack(i + 1)             # explore
        path.pop()                   # un-choose
        backtrack(i + 1)             # skip nums[i]
    backtrack(0)
    return res

def n_queens(n):
    cols, d1, d2, count = set(), set(), set(), 0
    def place(r):
        nonlocal count
        if r == n:
            count += 1; return
        for c in range(n):
            if c in cols or r - c in d1 or r + c in d2:
                continue
            cols.add(c); d1.add(r - c); d2.add(r + c)
            place(r + 1)
            cols.remove(c); d1.remove(r - c); d2.remove(r + c)
    place(0)
    return count

print(subsets([1, 2]), n_queens(8))   # ... 92`,
      java: `import java.util.*;

class Backtracking {
    static List<List<Integer>> permutations(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        dfs(nums, new boolean[nums.length], new ArrayList<>(), res);
        return res;
    }

    static void dfs(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {
        if (path.size() == nums.length) { res.add(new ArrayList<>(path)); return; }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true; path.add(nums[i]);
            dfs(nums, used, path, res);
            path.remove(path.size() - 1); used[i] = false;   // undo
        }
    }
}`,
      typescript: `function combinationSum(cands: number[], target: number): number[][] {
  const res: number[][] = [];
  const path: number[] = [];
  function dfs(start: number, remain: number) {
    if (remain === 0) { res.push([...path]); return; }
    for (let i = start; i < cands.length; i++) {
      if (cands[i] > remain) continue;     // prune
      path.push(cands[i]);
      dfs(i, remain - cands[i]);           // i, not i + 1: reuse allowed
      path.pop();
    }
  }
  dfs(0, target);
  return res;
}

console.log(combinationSum([2, 3, 6, 7], 7)); // [[2,2,3],[7]]`,
      javascript: `// Recursively walk a nested folder-like object
const tree = { name: "src", children: [
  { name: "app.js" },
  { name: "lib", children: [{ name: "util.js" }] },
]};

function listFiles(node, prefix = "") {
  const path = prefix + node.name;
  if (!node.children) return [path];              // base case
  return node.children.flatMap((c) => listFiles(c, path + "/"));
}

console.log(listFiles(tree)); // ["src/app.js", "src/lib/util.js"]`,
    },
  };

  X.trees = {
    story: {
      when: "~1960 BST · 1962 AVL · 1970–72 B-tree · 1972/78 red-black",
      who: "BST: independently by P. F. Windley, A. D. Booth, A. J. T. Colin & T. N. Hibbard. AVL: Georgy Adelson-Velsky & Evgenii Landis. B-tree: Rudolf Bayer & Edward McCreight. Red-black: Bayer, named by Leonidas Guibas & Robert Sedgewick",
      before: "Sorted arrays: fast binary search, but every insert or delete shifts O(n) elements. Linked lists: fast inserts but O(n) search.",
      why: "Trees combine both: O(log n) search <i>and</i> O(log n) insert/delete, as long as the tree stays balanced. AVL and red-black trees keep it balanced automatically. B-trees were invented at Boeing to minimize slow disk reads, and nearly every database index still uses them.",
    },
    uses: [
      ["🗄️", "Database indexes", "B+ trees in MySQL, PostgreSQL, SQLite."],
      ["📁", "File systems", "Folders are trees; NTFS, ext4, APFS and Btrfs use B-trees internally."],
      ["🌐", "HTML DOM", "Every web page is a tree of elements."],
      ["☕", "Sorted maps", "Java TreeMap and C++ std::map are red-black trees; Linux's scheduler uses one too."],
      ["🧾", "Compilers", "Code is parsed into an Abstract Syntax Tree."],
      ["🤖", "Machine learning", "Decision trees, random forests, XGBoost."],
    ],
    code: {
      python: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def insert(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def inorder(root):                 # sorted order for a BST
    return inorder(root.left) + [root.val] + inorder(root.right) if root else []

def max_depth(root):
    return 1 + max(max_depth(root.left), max_depth(root.right)) if root else 0

root = None
for v in [50, 30, 70, 20, 40]:
    root = insert(root, v)
print(inorder(root), max_depth(root))   # [20, 30, 40, 50, 70] 3`,
      java: `import java.util.*;

class TreeNode {
    int val; TreeNode left, right;
    TreeNode(int v) { val = v; }
}

class Trees {
    static boolean isValidBST(TreeNode n, long lo, long hi) {
        if (n == null) return true;
        if (n.val <= lo || n.val >= hi) return false;
        return isValidBST(n.left, lo, n.val) && isValidBST(n.right, n.val, hi);
    }

    static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res = new ArrayList<>();
        Queue<TreeNode> q = new ArrayDeque<>();
        if (root != null) q.add(root);
        while (!q.isEmpty()) {
            List<Integer> level = new ArrayList<>();
            for (int i = q.size(); i > 0; i--) {
                TreeNode n = q.poll();
                level.add(n.val);
                if (n.left != null) q.add(n.left);
                if (n.right != null) q.add(n.right);
            }
            res.add(level);
        }
        return res;
    }
    // Balanced BST built in: TreeMap<K,V> (red-black tree)
}`,
      typescript: `class TreeNode {
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  constructor(public val: number) {}
}

class BST {
  root: TreeNode | null = null;

  insert(val: number): void {
    const node = new TreeNode(val);
    if (!this.root) { this.root = node; return; }
    let cur = this.root;
    while (true) {
      if (val < cur.val) {
        if (!cur.left) { cur.left = node; return; }
        cur = cur.left;
      } else {
        if (!cur.right) { cur.right = node; return; }
        cur = cur.right;
      }
    }
  }

  has(val: number): boolean {
    let cur = this.root;
    while (cur) {
      if (val === cur.val) return true;
      cur = val < cur.val ? cur.left : cur.right;
    }
    return false;
  }
}`,
      javascript: `// The DOM is a tree: count every element on a page
function countNodes(el) {
  let n = 1;
  for (const child of el.children) n += countNodes(child);
  return n;
}
// countNodes(document.body)

function invertTree(node) {
  if (!node) return null;
  [node.left, node.right] = [invertTree(node.right), invertTree(node.left)];
  return node;
}`,
    },
  };

  X.heaps = {
    story: {
      when: "1964",
      who: "J. W. J. Williams (binary heap & heapsort); Robert W. Floyd (O(n) heap construction, same year)",
      before: "To always grab the smallest item you kept a sorted list (O(n) inserts) or scanned an unsorted list (O(n) per extraction).",
      why: "Williams invented the heap as the engine of heapsort: an in-place O(n log n) sort with no extra memory. The structure turned out to be the perfect <b>priority queue</b>: O(log n) insert and extract-min, stored in a plain array. Later variants (Fibonacci heaps, 1984) improved Dijkstra's theoretical bounds.",
    },
    uses: [
      ["🗺️", "Shortest paths", "Dijkstra and A* (Google Maps style routing) pull the closest node from a heap."],
      ["🖥️", "OS & job schedulers", "Run the highest-priority task next; timers fire in order of deadline."],
      ["🏆", "Top-K / leaderboards", "Top 10 trending items from millions."],
      ["📨", "Merging sorted streams", "External sort and log merging in databases (LSM trees)."],
      ["🗜️", "Huffman coding", "Building compression codes (ZIP, JPEG) repeatedly merges the two smallest."],
      ["📉", "Streaming medians", "Two heaps track the median of live data."],
    ],
    code: {
      python: `import heapq

nums = [5, 1, 8, 3, 9, 2]
heapq.heapify(nums)               # O(n), min-heap in place
print(heapq.heappop(nums))        # 1

def k_largest(arr, k):
    h = []
    for x in arr:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)      # drop the smallest
    return sorted(h, reverse=True)

# Max-heap trick: push negatives
tasks = []
heapq.heappush(tasks, (-5, "urgent"))
heapq.heappush(tasks, (-1, "later"))
print(heapq.heappop(tasks)[1])    # urgent`,
      java: `import java.util.*;

class Heaps {
    public static void main(String[] args) {
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
        for (int x : new int[]{5, 1, 8, 3}) { minHeap.add(x); maxHeap.add(x); }
        System.out.println(minHeap.poll() + " " + maxHeap.poll()); // 1 8
    }

    // Running median with two heaps
    static class MedianFinder {
        PriorityQueue<Integer> low = new PriorityQueue<>(Comparator.reverseOrder());
        PriorityQueue<Integer> high = new PriorityQueue<>();
        void add(int x) {
            low.add(x);
            high.add(low.poll());
            if (high.size() > low.size()) low.add(high.poll());
        }
        double median() {
            return low.size() > high.size() ? low.peek() : (low.peek() + high.peek()) / 2.0;
        }
    }
}`,
      typescript: `class MinHeap {
  private a: number[] = [];
  get size() { return this.a.length; }
  peek() { return this.a[0]; }

  push(x: number) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  pop(): number | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}`,
      javascript: `// JavaScript has no built-in heap; a common trick for small data:
const tasks = [{ p: 3, name: "email" }, { p: 1, name: "fire!" }];
tasks.sort((a, b) => a.p - b.p);   // O(n log n) each time, OK for tiny lists
console.log(tasks[0].name);        // "fire!"

// For real workloads use a binary heap (see the TypeScript tab)
// or a library like 'heap-js' / '@datastructures-js/priority-queue'.`,
    },
  };

  X.tries = {
    story: {
      when: "1959–1960",
      who: "René de la Briandais (1959); name coined by Edward Fredkin (1960)",
      before: "Word lists were stored sorted or in hash tables. Both answer 'is this exact word here?', but 'which words start with <i>pre</i>?' required scanning or extra sorting.",
      why: "De la Briandais wanted faster file searching with variable-length keys. Fredkin named it after re<b>trie</b>val (he pronounced it 'tree'; most people now say 'try' to tell them apart). Sharing prefixes made prefix queries as fast as reading the prefix itself.",
    },
    uses: [
      ["⌨️", "Autocomplete", "Search boxes and phone keyboards suggest completions as you type."],
      ["✍️", "Spell checkers", "Fast dictionary lookup and 'did you mean?' suggestions."],
      ["🌐", "Internet routing", "Routers use tries for longest-prefix matching of IP addresses."],
      ["🧭", "Web frameworks", "URL routers (e.g. httprouter, Fastify) match paths with radix trees."],
      ["🎲", "Word games", "Boggle and Scrabble solvers prune impossible prefixes."],
      ["🧬", "Bioinformatics", "Suffix trees/tries for searching DNA sequences."],
    ],
    code: {
      python: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True                 # end of word

    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node:
                return None
            node = node[ch]
        return node

    def search(self, word):
        node = self._walk(word)
        return bool(node and "$" in node)

    def complete(self, prefix):
        node, out = self._walk(prefix), []
        def dfs(n, path):
            if "$" in n: out.append(path)
            for ch, child in sorted(n.items()):
                if ch != "$": dfs(child, path + ch)
        if node: dfs(node, prefix)
        return out

t = Trie()
for w in ["car", "cart", "care", "cat"]: t.insert(w)
print(t.complete("car"))   # ['car', 'care', 'cart']`,
      java: `import java.util.*;

class Trie {
    private static class Node {
        Node[] next = new Node[26];   // array-of-children layout
        boolean end;
    }
    private final Node root = new Node();

    void insert(String w) {
        Node n = root;
        for (char c : w.toCharArray()) {
            int i = c - 'a';
            if (n.next[i] == null) n.next[i] = new Node();
            n = n.next[i];
        }
        n.end = true;
    }

    boolean startsWith(String p) {
        Node n = root;
        for (char c : p.toCharArray()) {
            n = n.next[c - 'a'];
            if (n == null) return false;
        }
        return true;
    }
}`,
      typescript: `class TrieNode {
  children = new Map<string, TrieNode>();   // map-of-children: saves memory
  end = false;
}

class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    let n = this.root;
    for (const ch of word) {
      if (!n.children.has(ch)) n.children.set(ch, new TrieNode());
      n = n.children.get(ch)!;
    }
    n.end = true;
  }

  search(word: string, prefixOnly = false): boolean {
    let n: TrieNode | undefined = this.root;
    for (const ch of word) {
      n = n.children.get(ch);
      if (!n) return false;
    }
    return prefixOnly || n.end;
  }
}`,
      javascript: `// Autocomplete for a search box
function buildTrie(words) {
  const root = {};
  for (const w of words) {
    let n = root;
    for (const ch of w) n = n[ch] ??= {};
    n.$ = true;
  }
  return root;
}

function suggest(root, prefix, limit = 5) {
  let n = root;
  for (const ch of prefix) { n = n[ch]; if (!n) return []; }
  const out = [];
  (function dfs(node, path) {
    if (out.length >= limit) return;
    if (node.$) out.push(path);
    for (const ch of Object.keys(node).sort()) if (ch !== "$") dfs(node[ch], path + ch);
  })(n, prefix);
  return out;
}`,
    },
  };

  X.graphs = {
    story: {
      when: "1736 graph theory · 1945/1959 BFS · 19th century DFS",
      who: "Leonhard Euler (Seven Bridges of Königsberg); Konrad Zuse & Edward F. Moore (BFS); Charles Pierre Trémaux (DFS for mazes); Robert Tarjan & John Hopcroft (linear-time DFS algorithms, 1970s)",
      before: "Puzzles like 'can you cross every bridge in Königsberg exactly once?' were tackled by trial and error.",
      why: "Euler proved it impossible by abstracting land into dots and bridges into lines, inventing graph theory. Moore rediscovered BFS in 1959 to find shortest paths through mazes, and C. Y. Lee used it to route wires on circuit boards. Tarjan and Hopcroft showed DFS solves many problems (connectivity, planarity) in linear time, winning the 1986 Turing Award.",
    },
    uses: [
      ["👥", "Social networks", "'People you may know' = friends of friends (BFS, 2 hops)."],
      ["🕷️", "Web crawlers", "Google's crawler explores links as a graph."],
      ["📦", "Package managers & builds", "npm, Maven and Make order dependencies with topological sort."],
      ["🧠", "Recommendations", "Graph databases connect users, products and interests."],
      ["🔌", "Networks & circuits", "Routing packets, laying out chip wiring."],
      ["♻️", "Garbage collectors", "Mark-and-sweep GC is a graph traversal from root objects."],
    ],
    code: {
      python: `from collections import deque

graph = {"A": ["B", "D"], "B": ["A", "C", "E"], "C": ["B"],
         "D": ["A", "E"], "E": ["B", "D"]}

def bfs(start):
    dist, q = {start: 0}, deque([start])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist

def dfs(u, seen=None):
    seen = seen or set()
    seen.add(u)
    for v in graph[u]:
        if v not in seen:
            dfs(v, seen)
    return seen

def topo_sort(n, edges):          # Kahn's algorithm
    adj, indeg = [[] for _ in range(n)], [0] * n
    for a, b in edges:
        adj[a].append(b); indeg[b] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == n else None   # None = cycle

print(bfs("A"))`,
      java: `import java.util.*;

class Graphs {
    static int numIslands(char[][] g) {
        int count = 0;
        for (int r = 0; r < g.length; r++)
            for (int c = 0; c < g[0].length; c++)
                if (g[r][c] == '1') { count++; sink(g, r, c); }
        return count;
    }

    static void sink(char[][] g, int r, int c) {           // DFS flood fill
        if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
        g[r][c] = '0';
        sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
    }

    // Union-Find with path compression
    static int[] parent;
    static int find(int x) { return parent[x] == x ? x : (parent[x] = find(parent[x])); }
    static boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        parent[ra] = rb; return true;
    }
}`,
      typescript: `type Graph = Map<string, string[]>;

function shortestPath(g: Graph, from: string, to: string): string[] | null {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i];
    if (u === to) break;
    for (const v of g.get(u) ?? []) {
      if (!prev.has(v)) { prev.set(v, u); queue.push(v); }
    }
  }
  if (!prev.has(to)) return null;
  const path: string[] = [];
  for (let n: string | null = to; n; n = prev.get(n) ?? null) path.unshift(n);
  return path;
}

const g: Graph = new Map([["me", ["ana", "bo"]], ["ana", ["cy"]], ["bo", []], ["cy", []]]);
console.log(shortestPath(g, "me", "cy")); // ["me", "ana", "cy"]`,
      javascript: `// Detect a cycle in a directed graph (e.g. circular imports)
function hasCycle(graph) {
  const state = {}; // undefined = new, 1 = visiting, 2 = done
  function dfs(u) {
    if (state[u] === 1) return true;   // back edge → cycle
    if (state[u] === 2) return false;
    state[u] = 1;
    for (const v of graph[u] || []) if (dfs(v)) return true;
    state[u] = 2;
    return false;
  }
  return Object.keys(graph).some(dfs);
}

console.log(hasCycle({ a: ["b"], b: ["c"], c: ["a"] })); // true`,
    },
  };

  X["shortest-path"] = {
    story: {
      when: "1956 (published 1959)",
      who: "Edsger W. Dijkstra; also Richard Bellman & Lester Ford (Bellman-Ford), Robert Floyd (1962), and Hart, Nilsson & Raphael (A*, 1968)",
      before: "Routes were planned by hand on maps, or by trying all paths, which explodes exponentially.",
      why: "Dijkstra wanted a demonstration for the new ARMAC computer that non-mathematicians could understand: the shortest route between Dutch cities. He said he designed it in about 20 minutes while sitting at a café terrace in Amsterdam, without pencil and paper. A* was developed for the Shakey robot at SRI to navigate rooms faster using a distance estimate.",
    },
    uses: [
      ["🗺️", "Maps & navigation", "Google Maps and Waze use Dijkstra/A* variants with heavy preprocessing (contraction hierarchies)."],
      ["🌐", "Internet routing", "OSPF and IS-IS routers run Dijkstra to compute routes."],
      ["🎮", "Game AI", "A* pathfinding for characters and units."],
      ["🚚", "Logistics", "Delivery routing and supply chains."],
      ["✈️", "Flight search", "Cheapest itineraries with layover limits (Bellman-Ford style)."],
      ["💱", "Currency arbitrage", "Bellman-Ford detects negative cycles in exchange rates."],
    ],
    code: {
      python: `import heapq

def dijkstra(graph, src):
    """graph: {node: [(neighbor, weight), ...]}"""
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")):
            continue                       # stale entry
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist

g = {"A": [("B", 4), ("C", 1)], "B": [("D", 1)],
     "C": [("B", 2), ("D", 5)], "D": []}
print(dijkstra(g, "A"))   # {'A': 0, 'B': 3, 'C': 1, 'D': 4}`,
      java: `import java.util.*;

class Dijkstra {
    record Edge(int to, int w) {}

    static int[] shortest(List<List<Edge>> g, int src) {
        int[] dist = new int[g.size()];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        pq.add(new int[]{0, src});
        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int d = top[0], u = top[1];
            if (d > dist[u]) continue;
            for (Edge e : g.get(u)) {
                if (d + e.w() < dist[e.to()]) {
                    dist[e.to()] = d + e.w();
                    pq.add(new int[]{dist[e.to()], e.to()});
                }
            }
        }
        return dist;
    }
}`,
      typescript: `type Edge = { to: string; w: number };

function bellmanFord(nodes: string[], edges: [string, string, number][], src: string) {
  const dist: Record<string, number> = {};
  nodes.forEach((n) => (dist[n] = Infinity));
  dist[src] = 0;
  for (let i = 0; i < nodes.length - 1; i++)
    for (const [u, v, w] of edges)
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  for (const [u, v, w] of edges)
    if (dist[u] + w < dist[v]) throw new Error("negative cycle");
  return dist;
}

console.log(bellmanFord(["A", "B", "C"], [["A", "B", 4], ["A", "C", 5], ["C", "B", -3]], "A"));
// { A: 0, B: 2, C: 5 }`,
      javascript: `// Dijkstra with a simple array as the priority queue: O(V^2),
// fine for small graphs (and actually optimal for dense ones)
function dijkstra(graph, src) {
  const dist = {}, done = new Set();
  for (const n in graph) dist[n] = Infinity;
  dist[src] = 0;
  while (done.size < Object.keys(graph).length) {
    let u = null;
    for (const n in dist) if (!done.has(n) && (u === null || dist[n] < dist[u])) u = n;
    if (dist[u] === Infinity) break;
    done.add(u);
    for (const [v, w] of graph[u]) dist[v] = Math.min(dist[v], dist[u] + w);
  }
  return dist;
}

console.log(dijkstra({ A: [["B", 4], ["C", 1]], B: [["D", 1]], C: [["B", 2]], D: [] }, "A"));`,
    },
  };

  X.dp = {
    story: {
      when: "1950s",
      who: "Richard Bellman (RAND Corporation)",
      before: "Multi-stage decision problems (inventory, missile trajectories, resource allocation) were solved by enumerating every combination of choices, which grows exponentially.",
      why: "Bellman's insight (the 'principle of optimality'): an optimal plan is built from optimal sub-plans, so solve each sub-problem once and store it. He admitted he picked the name 'dynamic programming' partly because it sounded impressive and hid the fact that he was doing mathematical research from a Secretary of Defense who disliked the word 'research'.",
    },
    uses: [
      ["🧬", "DNA alignment", "Needleman-Wunsch and Smith-Waterman compare genes (like LCS/edit distance)."],
      ["✍️", "Spell check & diff", "Edit distance suggests corrections; git diff uses LCS-style algorithms."],
      ["🗣️", "Speech & text recognition", "The Viterbi algorithm (phones, autocorrect, GPS signals)."],
      ["💰", "Finance & operations", "Portfolio and inventory optimization (knapsack variants)."],
      ["📄", "Text layout", "TeX breaks paragraphs into lines optimally with DP."],
      ["🤖", "Reinforcement learning", "Bellman equations are the foundation of value iteration and Q-learning."],
    ],
    code: {
      python: `from functools import cache

@cache                                 # top-down memoization
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

def coin_change(coins, amount):        # bottom-up, 1D
    dp = [0] + [float("inf")] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x:
                dp[x] = min(dp[x], dp[x - c] + 1)
    return dp[amount] if dp[amount] != float("inf") else -1

def edit_distance(a, b):               # 2D
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1): dp[i][0] = i
    for j in range(len(b) + 1): dp[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[-1][-1]

print(fib(80), coin_change([1, 3, 4], 6), edit_distance("kitten", "sitting"))  # ... 2 3`,
      java: `class DP {
    static int lcs(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 1; i <= a.length(); i++)
            for (int j = 1; j <= b.length(); j++)
                dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1)
                        ? dp[i - 1][j - 1] + 1
                        : Math.max(dp[i - 1][j], dp[i][j - 1]);
        return dp[a.length()][b.length()];
    }

    static int knapsack(int[] w, int[] v, int cap) {   // 1D rolling array
        int[] dp = new int[cap + 1];
        for (int i = 0; i < w.length; i++)
            for (int c = cap; c >= w[i]; c--)              // backwards = each item once
                dp[c] = Math.max(dp[c], dp[c - w[i]] + v[i]);
        return dp[cap];
    }
}`,
      typescript: `function rob(nums: number[]): number {     // House Robber, O(1) space
  let prev = 0, cur = 0;
  for (const x of nums) [prev, cur] = [cur, Math.max(cur, prev + x)];
  return cur;
}

function lengthOfLIS(nums: number[]): number {  // O(n log n)
  const tails: number[] = [];
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1; else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}

console.log(rob([2, 7, 9, 3, 1]), lengthOfLIS([10, 9, 2, 5, 3, 7, 101, 18])); // 12 4`,
      javascript: `// Memoize any pure function
function memo(fn) {
  const cache = new Map();
  return (...args) => {
    const key = args.join(",");
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key);
  };
}

const uniquePaths = memo((r, c) =>
  r === 1 || c === 1 ? 1 : uniquePaths(r - 1, c) + uniquePaths(r, c - 1));

console.log(uniquePaths(3, 7)); // 28`,
    },
  };

  X.greedy = {
    story: {
      when: "1952 Huffman · 1956–57 Kruskal & Prim · formalized via matroids (1971)",
      who: "David Huffman (as an MIT student), Joseph Kruskal, Robert Prim (and Vojtěch Jarník in 1930), Jack Edmonds",
      before: "Optimization problems were solved by exhaustive search or by hand-crafted rules of thumb without proof that they were optimal.",
      why: "Huffman was given the choice of a final exam or a term paper on finding the most efficient binary code; he discovered that greedily merging the two least frequent symbols is optimal, beating his professor's approach. Kruskal and Prim needed cheap ways to connect networks (power, telephone). Edmonds later explained <i>when</i> greedy is guaranteed to work (matroid theory).",
    },
    uses: [
      ["🗜️", "Compression", "Huffman coding inside ZIP/DEFLATE, JPEG and MP3."],
      ["📅", "Scheduling", "Meeting rooms, CPU jobs, and class timetables."],
      ["🔌", "Network design", "Minimum spanning trees for cables, roads and pipelines."],
      ["💵", "Making change", "Cash registers with standard coin systems (where greedy happens to be optimal)."],
      ["☁️", "Cloud resource packing", "Greedy heuristics place VMs/containers on servers (bin packing)."],
      ["🛰️", "Routing", "Dijkstra itself is a greedy algorithm."],
    ],
    code: {
      python: `def merge_intervals(intervals):
    intervals.sort(key=lambda x: x[0])
    out = []
    for s, e in intervals:
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out

def max_meetings(intervals):           # activity selection
    count, end = 0, float("-inf")
    for s, e in sorted(intervals, key=lambda x: x[1]):
        if s >= end:
            count, end = count + 1, e
    return count

def can_jump(nums):
    reach = 0
    for i, x in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + x)
    return True

print(merge_intervals([[1, 3], [2, 6], [8, 10]]))   # [[1, 6], [8, 10]]`,
      java: `import java.util.*;

class Greedy {
    static int minMeetingRooms(int[][] iv) {
        Arrays.sort(iv, Comparator.comparingInt(a -> a[0]));
        PriorityQueue<Integer> ends = new PriorityQueue<>();
        for (int[] m : iv) {
            if (!ends.isEmpty() && ends.peek() <= m[0]) ends.poll(); // reuse a room
            ends.add(m[1]);
        }
        return ends.size();
    }

    public static void main(String[] a) {
        System.out.println(minMeetingRooms(new int[][]{{0, 30}, {5, 10}, {15, 20}})); // 2
    }
}`,
      typescript: `type Interval = [number, number];

function eraseOverlap(intervals: Interval[]): number {
  intervals.sort((a, b) => a[1] - b[1]);
  let kept = 0, end = -Infinity;
  for (const [s, e] of intervals) {
    if (s >= end) { kept++; end = e; }
  }
  return intervals.length - kept;   // minimum removals
}

function partitionLabels(s: string): number[] {
  const last: Record<string, number> = {};
  [...s].forEach((c, i) => (last[c] = i));
  const sizes: number[] = [];
  let start = 0, end = 0;
  [...s].forEach((c, i) => {
    end = Math.max(end, last[c]);
    if (i === end) { sizes.push(end - start + 1); start = i + 1; }
  });
  return sizes;
}`,
      javascript: `// Greedy change-making (optimal for coins like 1, 5, 10, 25)
function makeChange(amount, coins = [25, 10, 5, 1]) {
  const used = {};
  for (const c of coins) {
    while (amount >= c) { amount -= c; used[c] = (used[c] || 0) + 1; }
  }
  return used;
}
console.log(makeChange(68)); // { 1: 3, 5: 1, 10: 1, 25: 2 }
// Warning: with coins [4, 3, 1] and amount 6 greedy gives 4+1+1, but 3+3 is better.`,
    },
  };
})();
