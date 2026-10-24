/* DSA topics: lessons, quizzes, practice problems */
(function () {
  const Q = (q, options, answer, explain) => ({ q, options, answer, explain });
  const P = (name, diff, desc, hint, sol) => ({ name, diff, desc, hint, sol });
  const T = (t) => L.topics.push({ track: "dsa", ...t });

  T({
    id: "big-o", title: "Big-O & Complexity", icon: "📈", summary: "Measure how time and memory grow with input size.",
    viz: "bigO",
    learn: `
<p>Big-O describes how an algorithm's cost <b>grows</b> as the input size <code>n</code> grows. We drop constants and lower-order terms: <code>3n² + 5n + 2</code> is <b>O(n²)</b>.</p>
<h2>Common classes (fastest → slowest)</h2>
<table><tr><th>Class</th><th>Name</th><th>Example</th></tr>
<tr><td>O(1)</td><td>constant</td><td>array index, hash lookup</td></tr>
<tr><td>O(log n)</td><td>logarithmic</td><td>binary search, balanced BST</td></tr>
<tr><td>O(n)</td><td>linear</td><td>single loop over the input</td></tr>
<tr><td>O(n log n)</td><td>linearithmic</td><td>merge sort, heap sort</td></tr>
<tr><td>O(n²)</td><td>quadratic</td><td>nested loops over pairs</td></tr>
<tr><td>O(2ⁿ)</td><td>exponential</td><td>all subsets, naive Fibonacci</td></tr>
<tr><td>O(n!)</td><td>factorial</td><td>all permutations</td></tr></table>
<h2>Rules of thumb</h2>
<ul><li><b>Sequential steps add:</b> O(n) then O(n) = O(n).</li>
<li><b>Nested loops multiply:</b> a loop inside a loop = O(n·m).</li>
<li><b>Halving each step</b> → O(log n).</li>
<li><b>Recursion</b>: count calls × work per call. Two calls each halving n with O(n) merge work → O(n log n).</li>
<li><b>Space complexity</b> counts extra memory, including the recursion stack.</li></ul>
<div class="callout tip">Interview cheat sheet for n: ≤ 10 → O(n!) ok · ≤ 20 → O(2ⁿ) · ≤ 500 → O(n³) · ≤ 10⁴ → O(n²) · ≤ 10⁶ → O(n log n) · ≥ 10⁸ → O(n) or O(log n).</div>
<h2>Best, average, worst</h2>
<p>Quick sort is O(n log n) on average but O(n²) worst case. <b>Amortized</b> cost averages over a sequence: appending to a dynamic array is O(1) amortized even though an occasional resize costs O(n).</p>
<pre>def has_duplicate(nums):          # O(n²) time, O(1) space
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]: return True
    return False

def has_duplicate_fast(nums):     # O(n) time, O(n) space
    return len(set(nums)) != len(nums)</pre>
<p>That trade (more memory for less time) is one of the most common optimizations you'll make.</p>`,
    quiz: [
      Q("What is the time complexity of <code>for i in range(n): for j in range(i, n): ...</code>?", ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], 2, "The inner loop runs n + (n−1) + … + 1 = n(n+1)/2 times, which is O(n²)."),
      Q("An algorithm halves the problem size each step and does O(1) work per step. Its complexity?", ["O(n)", "O(log n)", "O(√n)", "O(1)"], 1, "Halving n repeatedly takes log₂ n steps."),
      Q("Simplify O(5n³ + 100n² + 7)", ["O(5n³)", "O(n³ + n²)", "O(n³)", "O(100n²)"], 2, "Drop constants and lower-order terms."),
      Q("Appending to a Python list / Java ArrayList is:", ["O(n) always", "O(1) amortized", "O(log n)", "O(1) worst case"], 1, "Occasional resizes cost O(n), but doubling capacity makes the average per append O(1)."),
      Q("n = 10⁵. Which complexity is safest for a ~1 second limit?", ["O(n²)", "O(n log n)", "O(2ⁿ)", "O(n³)"], 1, "10⁵ × 17 ≈ 1.7M ops. O(n²) = 10¹⁰ ops is far too slow."),
      Q("What's the space complexity of a recursive DFS on a path-shaped tree with n nodes?", ["O(1)", "O(log n)", "O(n)", "O(n²)"], 2, "The recursion stack grows to depth n."),
    ],
    practice: [
      P("Contains Duplicate", "easy", "Return true if any value appears at least twice.", "Trade space for time.", "Put elements in a hash set; if one is already present, return true. O(n) time, O(n) space."),
      P("Analyze: nested loop with j *= 2", "medium", "for i in 0..n: j = 1; while j < n: j *= 2. What's the complexity?", "The inner loop doubles j.", "Outer O(n) × inner O(log n) = O(n log n)."),
      P("Fibonacci three ways", "easy", "Compare naive recursion, memoization and an iterative loop.", "Count how many times fib(2) is computed naively.", "Naive O(2ⁿ); memo O(n) time & space; iterative with two variables O(n) time, O(1) space."),
    ],
  });

  T({
    id: "arrays", title: "Arrays & Two Pointers", icon: "🧮", summary: "Contiguous memory, O(1) indexing, and the two-pointer trick.",
    viz: "twoPointers",
    learn: `
<p>An <b>array</b> stores elements in contiguous memory, so <code>arr[i]</code> is O(1). Inserting or deleting in the middle is O(n) because elements must shift.</p>
<table><tr><th>Operation</th><th>Cost</th></tr><tr><td>Access by index</td><td>O(1)</td></tr><tr><td>Search (unsorted)</td><td>O(n)</td></tr><tr><td>Search (sorted, binary search)</td><td>O(log n)</td></tr><tr><td>Insert/delete at end</td><td>O(1) amortized</td></tr><tr><td>Insert/delete in middle</td><td>O(n)</td></tr></table>
<h2>The two-pointer pattern</h2>
<p>Use two indices that move toward each other (or in the same direction) to avoid a nested loop. Typical signals: <b>sorted array</b>, <b>pairs</b>, <b>in-place</b>, <b>palindrome</b>.</p>
<pre>def two_sum_sorted(a, target):
    l, r = 0, len(a) - 1
    while l < r:
        s = a[l] + a[r]
        if s == target: return [l, r]
        if s < target: l += 1      # need a bigger sum
        else: r -= 1               # need a smaller sum
    return []</pre>
<h2>Variants</h2>
<ul><li><b>Opposite ends:</b> two sum (sorted), container with most water, valid palindrome.</li>
<li><b>Fast & slow:</b> remove duplicates in place, move zeroes, linked-list cycle.</li>
<li><b>Prefix sums:</b> precompute <code>pre[i] = a[0]+…+a[i-1]</code> so any range sum is <code>pre[r+1] − pre[l]</code> in O(1).</li></ul>
<div class="callout tip">Unsorted two-sum? Use a hash map of value → index for O(n). Sorted? Two pointers give O(n) with O(1) space.</div>`,
    quiz: [
      Q("Why is <code>arr[i]</code> O(1)?", ["Arrays are sorted", "The address is base + i × elementSize", "Arrays are hashed", "The CPU caches everything"], 1, "Contiguous memory lets you compute the address directly."),
      Q("Two-sum on a sorted array: the sum is too small. What do you do?", ["Move right pointer left", "Move left pointer right", "Move both", "Restart"], 1, "Moving left rightwards increases the sum."),
      Q("Range-sum queries on a static array are fastest with:", ["Sorting", "Prefix sums", "A stack", "Binary search"], 1, "O(n) preprocessing, then O(1) per query."),
      Q("Removing an element from the middle of an array of size n costs:", ["O(1)", "O(log n)", "O(n)", "O(n²)"], 2, "Elements after it must shift left."),
      Q("Best approach for 'is this string a palindrome?' with O(1) space:", ["Reverse and compare", "Two pointers from both ends", "Hash map of counts", "Sort it"], 1, "Compare s[l] and s[r], moving inward."),
    ],
    practice: [
      P("Two Sum", "easy", "Find indices of two numbers adding to target (unsorted).", "What do you need to have seen before?", "Hash map value→index; for each x check if target−x is in the map. O(n)."),
      P("Container With Most Water", "medium", "Pick two lines that hold the most water.", "Width shrinks either way, so move the shorter line.", "Two pointers at both ends; area = min(h[l],h[r])·(r−l); move the shorter side. O(n)."),
      P("3Sum", "medium", "Find all unique triplets summing to 0.", "Sort, fix one number, then two-pointer the rest.", "Sort; for each i, run two pointers on i+1..n−1; skip duplicates. O(n²)."),
      P("Product of Array Except Self", "medium", "Without division, O(n).", "Prefix products and suffix products.", "ans[i] = prefix[i] × suffix[i]; can be done with the output array plus one variable."),
      P("Trapping Rain Water", "hard", "Total water trapped between bars.", "Water at i = min(maxLeft, maxRight) − h[i].", "Two pointers tracking leftMax/rightMax; move the side with the smaller max. O(n), O(1)."),
    ],
  });

  T({
    id: "sliding-window", title: "Sliding Window", icon: "🪟", summary: "Process contiguous subarrays and substrings in O(n).",
    viz: "slidingWindow",
    learn: `
<p>A <b>sliding window</b> is a range <code>[L, R]</code> over an array or string that moves forward. Instead of recomputing each subarray from scratch (O(n·k)), you <b>add the new element</b> on the right and <b>remove the old one</b> on the left.</p>
<h2>Two flavours</h2>
<ul><li><b>Fixed size k:</b> max sum of k consecutive elements, averages, anagram detection.</li>
<li><b>Variable size:</b> expand R; while the window is invalid, shrink L. Longest substring without repeats, minimum window substring, longest subarray with sum ≤ k.</li></ul>
<pre>def longest_unique(s):
    seen = {}               # char -> last index
    l = best = 0
    for r, c in enumerate(s):
        if c in seen and seen[c] >= l:
            l = seen[c] + 1     # shrink past the duplicate
        seen[c] = r
        best = max(best, r - l + 1)
    return best</pre>
<div class="callout tip">Signals: "contiguous", "substring", "subarray", "longest/shortest/at most k". Each index enters and leaves the window once → O(n).</div>
<div class="callout warn">Sliding window needs a monotonic validity: shrinking must never make an invalid window valid in a way you'd miss. With negative numbers in sum problems, use prefix sums + hash map instead.</div>`,
    quiz: [
      Q("Max sum of k consecutive elements. Naive is O(n·k). Sliding window is:", ["O(n log n)", "O(n)", "O(k)", "O(n²)"], 1, "Each step adds one element and removes one."),
      Q("In a variable window, when the window becomes invalid you:", ["Reset both pointers", "Move R back", "Shrink from the left until valid", "Sort the window"], 2, "Expand right, shrink left."),
      Q("Which problem is NOT a good sliding-window fit?", ["Longest substring with ≤ 2 distinct chars", "Min window containing all chars of T", "Subarray sum equals k with negative numbers", "Max average subarray of length k"], 2, "Negatives break monotonicity; use prefix sums + hashmap."),
      Q("Longest substring without repeating characters of 'pwwkew'?", ["2", "3", "4", "6"], 1, "'wke' has length 3."),
      Q("Data structure usually used to track window contents for string problems:", ["Stack", "Hash map / counter", "Heap", "Linked list"], 1, "Counts or last-seen indices per character."),
    ],
    practice: [
      P("Longest Substring Without Repeating Characters", "medium", "Classic variable window.", "Track last index of each char.", "See the code in Learn. O(n)."),
      P("Minimum Window Substring", "hard", "Smallest window of s containing all chars of t.", "Count needed chars; track how many are satisfied.", "Expand R until all satisfied, then shrink L while still satisfied, recording the best. O(|s|+|t|)."),
      P("Permutation in String", "medium", "Does s2 contain a permutation of s1?", "Fixed window of len(s1).", "Compare 26-letter count arrays as the window slides. O(n)."),
      P("Sliding Window Maximum", "hard", "Max of each window of size k.", "Keep a deque of indices in decreasing value order.", "Pop smaller values from the back; pop front if out of window; front is the max. O(n)."),
    ],
  });

  T({
    id: "binary-search", title: "Binary Search", icon: "🔍", summary: "Halve the search space every step: O(log n).",
    viz: "binarySearch",
    learn: `
<p>On a <b>sorted</b> array, look at the middle. If it's too small, the answer must be on the right; if too big, on the left. Each step throws away half → <b>O(log n)</b>. 1 billion items need only ~30 steps!</p>
<pre>def binary_search(a, t):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2      # in Java/C++: lo + (hi - lo) / 2 avoids overflow
        if a[mid] == t: return mid
        if a[mid] < t: lo = mid + 1
        else: hi = mid - 1
    return -1</pre>
<h2>Binary search on the answer</h2>
<p>The real power: whenever you can ask "<i>is answer ≥ x feasible?</i>" and the answer is monotonic (false, false, true, true…), you can binary search x. Examples: minimum ship capacity, Koko eating bananas, square root, split array largest sum.</p>
<pre>def first_true(lo, hi, ok):      # smallest x in [lo, hi] with ok(x) True
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid): hi = mid
        else: lo = mid + 1
    return lo</pre>
<div class="callout warn">Off-by-one bugs live here. Pick one template (<code>lo ≤ hi</code> for exact match, <code>lo &lt; hi</code> for boundaries) and stick to it. Always check that the loop shrinks the range.</div>`,
    quiz: [
      Q("Max comparisons to binary search 1,000,000 sorted items?", ["~20", "~100", "~1,000", "~500,000"], 0, "log₂(10⁶) ≈ 20."),
      Q("Binary search requires the data to be:", ["Unique", "Sorted (or monotonic)", "Stored in a linked list", "Small"], 1, "You must know which half to discard."),
      Q("Why write <code>mid = lo + (hi - lo) / 2</code>?", ["It's faster", "Avoids integer overflow", "Rounds up", "Required by Python"], 1, "lo + hi can overflow 32-bit ints."),
      Q("'Find the minimum capacity to ship packages in D days' is solved by:", ["DP", "Binary search on the answer", "BFS", "Greedy sort"], 1, "Feasibility is monotonic in capacity."),
      Q("Searching for 7 in [1,3,5,7,9,11,13]: first mid value?", ["5", "7", "9", "3"], 1, "mid = (0+6)/2 = 3 → a[3] = 7. Found in one step!"),
      Q("Rotated sorted array [4,5,6,7,0,1,2]: can you still get O(log n)?", ["No, must be linear", "Yes: one half is always sorted", "Only if no duplicates matter", "Only with a hash map"], 1, "Check which half is sorted and whether target lies in it."),
    ],
    practice: [
      P("Binary Search", "easy", "Classic exact search.", "lo ≤ hi template.", "See Learn."),
      P("Search in Rotated Sorted Array", "medium", "Find target in a rotated array.", "One side of mid is always sorted.", "If a[lo] ≤ a[mid], left half is sorted: check if target is in it, else go right. Mirror for the other case."),
      P("Find Minimum in Rotated Sorted Array", "medium", "", "Compare mid with hi.", "If a[mid] > a[hi], min is right of mid (lo = mid+1); else hi = mid."),
      P("Koko Eating Bananas", "medium", "Minimum eating speed to finish in h hours.", "Is speed k enough? That's monotonic.", "Binary search k in [1, max(piles)]; feasibility = Σ ceil(p/k) ≤ h."),
      P("Median of Two Sorted Arrays", "hard", "O(log(min(m,n))).", "Binary search the partition of the smaller array.", "Partition both so left halves have (m+n+1)/2 elements and maxLeft ≤ minRight."),
    ],
  });

  T({
    id: "sorting", title: "Sorting Algorithms", icon: "📊", summary: "Watch bubble, insertion, merge, quick and heap sort race.",
    viz: "sorting",
    learn: `
<table><tr><th>Algorithm</th><th>Best</th><th>Average</th><th>Worst</th><th>Space</th><th>Stable</th></tr>
<tr><td>Bubble</td><td>O(n)</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td><td>✅</td></tr>
<tr><td>Selection</td><td>O(n²)</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td><td>❌</td></tr>
<tr><td>Insertion</td><td>O(n)</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td><td>✅</td></tr>
<tr><td>Merge</td><td>O(n log n)</td><td>O(n log n)</td><td>O(n log n)</td><td>O(n)</td><td>✅</td></tr>
<tr><td>Quick</td><td>O(n log n)</td><td>O(n log n)</td><td>O(n²)</td><td>O(log n)</td><td>❌</td></tr>
<tr><td>Heap</td><td>O(n log n)</td><td>O(n log n)</td><td>O(n log n)</td><td>O(1)</td><td>❌</td></tr>
<tr><td>Counting/Radix</td><td colspan="3">O(n + k) for small integer ranges</td><td>O(n + k)</td><td>✅</td></tr></table>
<h2>Key ideas</h2>
<ul><li><b>Divide & conquer:</b> merge sort splits in half, sorts each, then merges two sorted lists in O(n).</li>
<li><b>Partitioning:</b> quick sort places a pivot so smaller items go left and larger go right. A random pivot avoids the O(n²) worst case on sorted input.</li>
<li><b>Stable</b> = equal elements keep their original order (matters when sorting by multiple keys).</li>
<li>Comparison sorts can't beat <b>Ω(n log n)</b>. Counting/radix sort beat it by not comparing.</li>
<li>Real libraries use hybrids: <b>Timsort</b> (Python, Java objects) = merge + insertion; <b>Introsort</b> (C++) = quick + heap + insertion.</li></ul>
<pre>def merge_sort(a):
    if len(a) <= 1: return a
    mid = len(a) // 2
    L, R = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(L) and j < len(R):
        if L[i] <= R[j]: out.append(L[i]); i += 1
        else: out.append(R[j]); j += 1
    return out + L[i:] + R[j:]</pre>
<div class="callout tip">Try "Nearly sorted" input in the visualizer with Insertion vs Quick sort, then "Reversed" with Quick sort to see the worst case.</div>`,
    quiz: [
      Q("Which sort is O(n log n) in the worst case AND stable?", ["Quick sort", "Heap sort", "Merge sort", "Selection sort"], 2, "Merge sort is always O(n log n) and stable (at the cost of O(n) space)."),
      Q("Quick sort with the last element as pivot on an already-sorted array is:", ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], 2, "Every partition is maximally unbalanced. Use a random pivot."),
      Q("Best sort for a nearly-sorted array?", ["Selection", "Insertion", "Heap", "Quick with fixed pivot"], 1, "Insertion sort runs in O(n + inversions)."),
      Q("Lower bound for comparison-based sorting:", ["Ω(n)", "Ω(n log n)", "Ω(n²)", "Ω(log n)"], 1, "A decision tree needs log₂(n!) ≈ n log n levels."),
      Q("Sorting 10 million ages (0–120) fastest with:", ["Merge sort", "Quick sort", "Counting sort", "Bubble sort"], 2, "Tiny key range → O(n + k) counting sort."),
      Q("'Stable' sorting means:", ["Never crashes", "Equal keys keep their relative order", "Uses O(1) space", "Same speed every time"], 1, "Important when sorting records by a secondary key."),
    ],
    practice: [
      P("Sort Colors (Dutch flag)", "medium", "Sort 0s, 1s, 2s in one pass.", "Three pointers: low, mid, high.", "0 → swap with low, low++, mid++; 1 → mid++; 2 → swap with high, high--."),
      P("Merge Intervals", "medium", "Merge overlapping intervals.", "Sort by start.", "Sweep and extend the last merged interval if overlapping. See Greedy topic."),
      P("Kth Largest Element", "medium", "Without fully sorting.", "Quickselect or a min-heap of size k.", "Quickselect avg O(n); heap O(n log k)."),
      P("Count of Smaller Numbers After Self", "hard", "", "Merge sort can count inversions.", "During merge, count how many right-side elements jump ahead of each left element."),
    ],
  });

  T({
    id: "linked-list", title: "Linked Lists", icon: "🔗", summary: "Nodes and pointers: insert, delete, reverse, fast & slow.",
    viz: "linkedList",
    learn: `
<p>A <b>linked list</b> is a chain of nodes, each holding a value and a pointer to the next node. No contiguous memory → O(1) insert/delete <i>if you have the node</i>, but O(n) access by position.</p>
<table><tr><th></th><th>Array</th><th>Linked list</th></tr><tr><td>Access i-th</td><td>O(1)</td><td>O(n)</td></tr><tr><td>Insert at head</td><td>O(n)</td><td>O(1)</td></tr><tr><td>Insert after known node</td><td>O(n)</td><td>O(1)</td></tr><tr><td>Cache friendly</td><td>✅</td><td>❌</td></tr></table>
<h2>Must-know techniques</h2>
<ul><li><b>Dummy head node</b> removes edge cases when the head itself may change.</li>
<li><b>Reverse in place</b> with prev / cur / next pointers.</li>
<li><b>Fast & slow pointers</b>: find the middle, detect a cycle (Floyd), find the k-th from the end.</li>
<li><b>Merge two sorted lists</b> by repeatedly attaching the smaller head.</li></ul>
<pre>def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next     # 1. save
        cur.next = prev    # 2. reverse the pointer
        prev, cur = cur, nxt   # 3. advance
    return prev

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast: return True
    return False</pre>
<div class="callout tip">Doubly linked list + hash map = LRU cache with O(1) get/put (see the Caching topic in System Design!).</div>`,
    quiz: [
      Q("Getting the 1000th element of a singly linked list is:", ["O(1)", "O(log n)", "O(n)", "O(n²)"], 2, "You must walk from the head."),
      Q("Floyd's cycle detection uses:", ["A hash set", "Two pointers moving at different speeds", "Recursion", "Sorting"], 1, "If there's a cycle, the fast pointer eventually laps the slow one."),
      Q("Why use a dummy (sentinel) head?", ["Saves memory", "Avoids special cases when the head changes", "Makes it doubly linked", "Faster search"], 1, "You always have a node before the real head."),
      Q("How many pointers do you need to reverse a list iteratively?", ["1", "2", "3 (prev, cur, next)", "n"], 2, "Save next before overwriting cur.next."),
      Q("Find the middle node in one pass:", ["Count then walk", "Slow moves 1, fast moves 2", "Recursion", "Reverse first"], 1, "When fast reaches the end, slow is at the middle."),
    ],
    practice: [
      P("Reverse Linked List", "easy", "Iterative and recursive.", "prev/cur/next.", "See Learn. Recursive: reverse(rest), then head.next.next = head; head.next = None."),
      P("Merge Two Sorted Lists", "easy", "", "Dummy head.", "Attach the smaller node each step; append leftovers."),
      P("Remove Nth Node From End", "medium", "One pass.", "Gap of n between two pointers.", "Advance fast n steps, then move both until fast hits the end; slow.next is the target."),
      P("Linked List Cycle II", "medium", "Return the node where the cycle begins.", "After meeting, reset one pointer to head.", "Move both 1 step; they meet at the cycle start (math of distances)."),
      P("Merge k Sorted Lists", "hard", "", "Min-heap of current heads.", "Push each head; pop min, push its next. O(N log k)."),
    ],
  });

  T({
    id: "stack-queue", title: "Stacks & Queues", icon: "📚", summary: "LIFO and FIFO, plus monotonic stacks and deques.",
    viz: "stackQueue",
    learn: `
<ul><li><b>Stack (LIFO):</b> push/pop at the top. Used for undo, function calls, DFS, parsing expressions, matching brackets.</li>
<li><b>Queue (FIFO):</b> enqueue at back, dequeue at front. Used for BFS, task scheduling, buffers.</li>
<li><b>Deque:</b> push/pop at both ends in O(1). In Python use <code>collections.deque</code> (not <code>list.pop(0)</code>, which is O(n)).</li></ul>
<h2>Monotonic stack</h2>
<p>Keep the stack sorted (e.g. decreasing). When a new element breaks the order, pop. Each popped element just found its "next greater element". Every element is pushed and popped once → <b>O(n)</b>.</p>
<pre>def next_greater(nums):
    res, st = [-1] * len(nums), []    # st holds indices, values decreasing
    for i, x in enumerate(nums):
        while st and nums[st[-1]] < x:
            res[st.pop()] = x
        st.append(i)
    return res</pre>
<div class="callout tip">Signals for a monotonic stack: "next greater/smaller", "daily temperatures", "largest rectangle in histogram", "stock span".</div>
<p>Interview classic: <b>implement a queue using two stacks</b>. Push onto <i>in</i>; to pop, if <i>out</i> is empty, move everything from <i>in</i> to <i>out</i>. Amortized O(1).</p>`,
    quiz: [
      Q("Which structure does BFS use?", ["Stack", "Queue", "Heap", "Set"], 1, "BFS processes nodes in the order discovered (FIFO)."),
      Q("Undo in a text editor is naturally a:", ["Queue", "Stack", "Heap", "Graph"], 1, "The last action is undone first."),
      Q("In Python, why avoid <code>list.pop(0)</code> for a queue?", ["It's a syntax error", "It's O(n)", "It's not thread-safe", "It returns None"], 1, "All elements shift. Use deque.popleft()."),
      Q("'Daily temperatures: days until a warmer day' is best solved with:", ["Sorting", "Monotonic stack", "Binary search", "DP"], 1, "Pop colder days when a warmer one arrives. O(n)."),
      Q("Is '(]' a valid bracket string?", ["Yes", "No"], 1, "']' doesn't match the top '('."),
    ],
    practice: [
      P("Valid Parentheses", "easy", "", "Stack of open brackets.", "See the visualizer."),
      P("Min Stack", "medium", "push, pop, top, getMin all O(1).", "Store the current min alongside each element.", "Push (x, min(x, prevMin)) tuples."),
      P("Daily Temperatures", "medium", "", "Monotonic decreasing stack of indices.", "Pop while today is warmer; answer = i − popped index."),
      P("Evaluate Reverse Polish Notation", "medium", "", "Numbers push; operators pop two.", "Careful with operand order for − and ÷."),
      P("Largest Rectangle in Histogram", "hard", "", "Monotonic increasing stack.", "When popping bar h, its width spans from the new stack top+1 to i−1."),
    ],
  });

  T({
    id: "hashing", title: "Hash Tables", icon: "#️⃣", summary: "O(1) average lookup: hash functions, collisions, load factor.",
    viz: "hashTable",
    learn: `
<p>A <b>hash table</b> (dict, HashMap, unordered_map) maps keys to values with <b>O(1) average</b> insert, lookup and delete. A hash function turns the key into an integer; <code>hash % capacity</code> picks a bucket.</p>
<h2>Collisions</h2>
<ul><li><b>Separate chaining:</b> each bucket holds a list (shown in the visualizer). Java's HashMap turns long chains into trees.</li>
<li><b>Open addressing:</b> on collision, probe the next slot (linear/quadratic probing, double hashing). Python dicts use this.</li></ul>
<h2>Load factor & resizing</h2>
<p>Load factor α = n / m. When α grows past a threshold (~0.75), the table doubles and <b>rehashes</b> every key: O(n) once, O(1) amortized overall. Worst case (all keys collide) is O(n).</p>
<h2>Patterns</h2>
<ul><li><b>Frequency counting:</b> anagrams, top-k frequent, majority element.</li>
<li><b>Seen-before / complement:</b> two-sum, contains duplicate.</li>
<li><b>Grouping by a signature:</b> group anagrams by sorted string.</li>
<li><b>Prefix sum + map:</b> count subarrays with sum k.</li></ul>
<pre>from collections import Counter, defaultdict
def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups[''.join(sorted(w))].append(w)
    return list(groups.values())</pre>
<div class="callout warn">Keys must be immutable/hashable (no lists as dict keys in Python). Hash tables don't keep sorted order: use a balanced BST / TreeMap if you need ordering.</div>`,
    quiz: [
      Q("Average time for lookup in a hash table:", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], 0, "With a good hash function and a bounded load factor."),
      Q("Worst-case lookup when every key collides:", ["O(1)", "O(log n)", "O(n)", "O(n²)"], 2, "Everything is in one chain."),
      Q("What triggers a resize/rehash?", ["Too many deletes", "Load factor exceeds a threshold", "A collision", "Every insert"], 1, "Typically α > 0.75."),
      Q("Group anagrams: what's a good key?", ["Word length", "Sorted letters of the word", "First letter", "Hash of the word"], 1, "'eat', 'tea', 'ate' all become 'aet'."),
      Q("Count subarrays with sum = k (with negatives):", ["Sliding window", "Prefix sum + hash map of counts", "Sorting", "Two pointers"], 1, "For each prefix p, add count[p − k]."),
      Q("You need keys in sorted order with O(log n) ops. Use:", ["Hash map", "Balanced BST / TreeMap", "Array", "Queue"], 1, "Hash maps are unordered."),
    ],
    practice: [
      P("Valid Anagram", "easy", "", "Count characters.", "Compare Counter(s) == Counter(t), or a 26-int array."),
      P("Group Anagrams", "medium", "", "Signature key.", "See Learn."),
      P("Top K Frequent Elements", "medium", "", "Count, then bucket by frequency.", "Bucket sort: index = frequency. O(n)."),
      P("Longest Consecutive Sequence", "medium", "O(n).", "Only start counting at numbers whose x−1 isn't in the set.", "Set lookup; extend runs from sequence starts only."),
      P("Subarray Sum Equals K", "medium", "", "Prefix sums.", "count += seen[prefix − k]; seen[prefix] += 1."),
    ],
  });

  T({
    id: "recursion", title: "Recursion & Backtracking", icon: "🌀", summary: "Solve by trying, recursing, and undoing: N-Queens, subsets.",
    viz: "nQueens",
    learn: `
<p><b>Recursion</b>: a function that calls itself on a smaller input, with a <b>base case</b> to stop. Think: "If I trust the function works for n−1, how do I build n?"</p>
<p><b>Backtracking</b> builds a solution step by step and <b>undoes</b> a choice when it leads to a dead end. It explores a decision tree, pruning branches early.</p>
<pre>def backtrack(path, choices):
    if is_solution(path):
        results.append(path[:])   # copy!
        return
    for c in choices:
        if not valid(c, path): continue   # prune
        path.append(c)                    # choose
        backtrack(path, next_choices)     # explore
        path.pop()                        # un-choose</pre>
<h2>Classic problems</h2>
<table><tr><th>Problem</th><th>Count of results</th></tr><tr><td>Subsets</td><td>2ⁿ</td></tr><tr><td>Permutations</td><td>n!</td></tr><tr><td>Combinations (n choose k)</td><td>C(n,k)</td></tr><tr><td>N-Queens, Sudoku</td><td>pruned search</td></tr><tr><td>Word search in grid</td><td>DFS with visited marks</td></tr></table>
<div class="callout tip">If the same sub-problems repeat in the recursion tree, add memoization → that's Dynamic Programming.</div>
<div class="callout warn">Deep recursion can overflow the stack (Python's default limit ≈ 1000). Convert to iteration or raise the limit.</div>`,
    quiz: [
      Q("What does every recursive function need to terminate?", ["A loop", "A base case", "A global variable", "Memoization"], 1, "Without it, recursion never stops."),
      Q("Number of subsets of a set with n elements:", ["n", "n²", "2ⁿ", "n!"], 2, "Each element is either in or out."),
      Q("The 'un-choose' step in backtracking:", ["Is optional", "Restores state so the next choice starts clean", "Sorts the results", "Adds memoization"], 1, "path.pop() undoes the choice."),
      Q("In N-Queens, why place exactly one queen per row?", ["It's a rule of chess", "Two queens in a row attack each other, so it prunes the search", "It's faster to draw", "It makes it DP"], 1, "Encoding constraints into the structure shrinks the search space."),
      Q("Why append <code>path[:]</code> rather than <code>path</code>?", ["Style", "path is mutated later; you need a snapshot", "It's faster", "Python requires it"], 1, "Otherwise every stored result is the same (eventually empty) list."),
    ],
    practice: [
      P("Subsets", "medium", "", "Include / exclude each element.", "Backtrack with a start index; record path at every node. O(n·2ⁿ)."),
      P("Permutations", "medium", "", "Track used elements.", "Choose any unused element at each level."),
      P("Combination Sum", "medium", "Reuse allowed.", "Stay on the same index when reusing.", "Recurse with i (not i+1) after choosing candidates[i]; stop when sum > target."),
      P("Word Search", "medium", "", "DFS from every cell, mark visited.", "Temporarily overwrite the cell, then restore it after exploring."),
      P("N-Queens", "hard", "", "Sets for columns and both diagonals.", "Diagonals: r−c and r+c are constant. O(1) safety check."),
    ],
  });

  T({
    id: "trees", title: "Trees & BST", icon: "🌳", summary: "Binary trees, BSTs, traversals, and height.",
    viz: "bst",
    learn: `
<p>A <b>tree</b> is a connected acyclic graph with a root. In a <b>binary tree</b> each node has ≤ 2 children. A <b>Binary Search Tree</b> adds the rule: <i>left subtree &lt; node &lt; right subtree</i>.</p>
<h2>Traversals</h2>
<table><tr><th>Order</th><th>Visit</th><th>Use</th></tr><tr><td>Pre-order</td><td>node, left, right</td><td>copy/serialize a tree</td></tr><tr><td>In-order</td><td>left, node, right</td><td><b>sorted</b> output for a BST</td></tr><tr><td>Post-order</td><td>left, right, node</td><td>delete/free, compute heights/sizes</td></tr><tr><td>Level-order</td><td>BFS by depth</td><td>shortest depth, level views</td></tr></table>
<h2>BST operations</h2>
<p>Search, insert, delete are <b>O(h)</b>, where h = height. Balanced: h = log n. Degenerate (sorted inserts): h = n. Self-balancing trees (<b>AVL</b>, <b>Red-Black</b>) keep h = O(log n); that's what TreeMap / std::map use.</p>
<pre>def max_depth(root):
    if not root: return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

def is_valid_bst(node, lo=float('-inf'), hi=float('inf')):
    if not node: return True
    if not (lo < node.val < hi): return False
    return is_valid_bst(node.left, lo, node.val) and is_valid_bst(node.right, node.val, hi)</pre>
<div class="callout tip">Most tree problems are "do something for left, do something for right, combine". Ask: what should my recursive function <b>return</b> to its parent?</div>`,
    quiz: [
      Q("In-order traversal of a BST gives:", ["Random order", "Sorted order", "Reverse insertion order", "Level order"], 1, "Left (smaller) → node → right (larger)."),
      Q("Inserting 1,2,3,4,5 in order into a plain BST produces height:", ["3", "log 5", "5", "1"], 2, "It degenerates into a linked list."),
      Q("Deleting a BST node with two children: replace it with", ["Its parent", "Its in-order successor (or predecessor)", "The root", "Any leaf"], 1, "The smallest value in its right subtree keeps the BST property."),
      Q("Which traversal would you use to compute each subtree's size?", ["Pre-order", "In-order", "Post-order", "Level-order"], 2, "You need the children's answers first."),
      Q("Level-order traversal uses a:", ["Stack", "Queue", "Heap", "Hash map"], 1, "It's BFS."),
      Q("Checking only <code>left.val &lt; node.val &lt; right.val</code> at each node to validate a BST is:", ["Correct", "Wrong: must check against ancestors' bounds", "Correct only for balanced trees", "Correct for in-order"], 1, "A deep left descendant could still be larger than the root."),
    ],
    practice: [
      P("Maximum Depth of Binary Tree", "easy", "", "1 + max(left, right).", "See Learn."),
      P("Invert Binary Tree", "easy", "", "Swap children recursively.", "node.left, node.right = invert(node.right), invert(node.left)."),
      P("Validate BST", "medium", "", "Pass down (lo, hi) bounds.", "See Learn."),
      P("Lowest Common Ancestor of a BST", "medium", "", "Use the ordering.", "If both < node go left; both > go right; else node is the LCA."),
      P("Binary Tree Level Order Traversal", "medium", "", "Queue; process level by level.", "for _ in range(len(q)) collects one level."),
      P("Binary Tree Maximum Path Sum", "hard", "", "Return the best downward path; update a global with left + right + node.", "gain = max(0, child gains); ans = max(ans, node + l + r); return node + max(l, r)."),
    ],
  });

  T({
    id: "heaps", title: "Heaps & Priority Queues", icon: "⛰️", summary: "Always get the min/max fast: top-k, scheduling, merging.",
    viz: "heap",
    learn: `
<p>A <b>binary heap</b> is a complete binary tree where every parent is ≤ its children (min-heap) or ≥ (max-heap). It's stored in an <b>array</b>: children of i at 2i+1 and 2i+2.</p>
<table><tr><th>Operation</th><th>Cost</th></tr><tr><td>peek min/max</td><td>O(1)</td></tr><tr><td>insert (sift up)</td><td>O(log n)</td></tr><tr><td>extract (sift down)</td><td>O(log n)</td></tr><tr><td>build heap from n items</td><td>O(n)</td></tr></table>
<h2>Patterns</h2>
<ul><li><b>Top-k largest:</b> keep a <i>min</i>-heap of size k; pop when it exceeds k. O(n log k).</li>
<li><b>Merge k sorted lists:</b> heap of the current heads.</li>
<li><b>Two heaps for a running median:</b> max-heap for the lower half, min-heap for the upper half.</li>
<li><b>Scheduling / Dijkstra:</b> always process the cheapest/earliest item next.</li></ul>
<pre>import heapq
def k_largest(nums, k):
    h = []
    for x in nums:
        heapq.heappush(h, x)
        if len(h) > k: heapq.heappop(h)   # drop the smallest
    return h   # the k largest
# Python's heapq is a min-heap; push -x for a max-heap.</pre>`,
    quiz: [
      Q("Peeking at the min of a min-heap:", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], 0, "It's always at index 0."),
      Q("Children of index i in an array heap:", ["i+1, i+2", "2i, 2i+1", "2i+1, 2i+2", "i/2, i/2+1"], 2, "With 0-based indexing."),
      Q("Find the k largest of n numbers efficiently:", ["Max-heap of all n, pop k", "Min-heap of size k", "Sort descending", "Any of these, but min-heap of size k is O(n log k)"], 3, "All work; the size-k min-heap is the most memory and time efficient for small k."),
      Q("Building a heap from n elements bottom-up costs:", ["O(n log n)", "O(n)", "O(log n)", "O(n²)"], 1, "Most nodes are near the bottom and sift down only a little."),
      Q("Running median of a stream uses:", ["One heap", "Two heaps", "A BST only", "A stack"], 1, "Max-heap (lower half) + min-heap (upper half)."),
    ],
    practice: [
      P("Kth Largest Element in a Stream", "easy", "", "Min-heap of size k.", "Top of the heap is the answer."),
      P("Last Stone Weight", "easy", "", "Max-heap.", "Pop two, push the difference."),
      P("K Closest Points to Origin", "medium", "", "Max-heap of size k by distance.", "Or quickselect for O(n) average."),
      P("Task Scheduler", "medium", "", "Greedy with the most frequent task.", "Formula: max((maxFreq−1)·(n+1) + countOfMax, len(tasks))."),
      P("Find Median from Data Stream", "hard", "", "Two heaps.", "Balance so sizes differ by at most 1."),
    ],
  });

  T({
    id: "tries", title: "Tries (Prefix Trees)", icon: "🔤", summary: "Autocomplete and prefix search in O(word length).",
    viz: "trie",
    learn: `
<p>A <b>trie</b> stores strings character by character. Each edge is a letter; words sharing a prefix share a path. A flag marks where a word ends.</p>
<table><tr><th>Operation</th><th>Cost (L = word length)</th></tr><tr><td>insert</td><td>O(L)</td></tr><tr><td>search word</td><td>O(L)</td></tr><tr><td>startsWith(prefix)</td><td>O(L)</td></tr></table>
<p>Independent of how many words are stored! Uses more memory than a hash set, but answers <b>prefix</b> questions a hash set can't.</p>
<pre>class Trie:
    def __init__(self): self.root = {}
    def insert(self, w):
        node = self.root
        for c in w: node = node.setdefault(c, {})
        node['$'] = True
    def starts_with(self, p):
        node = self.root
        for c in p:
            if c not in node: return False
            node = node[c]
        return True</pre>
<div class="callout tip">Uses: autocomplete, spell check, IP routing (longest prefix match), word games (Boggle / Word Search II).</div>`,
    quiz: [
      Q("Searching a word of length L in a trie with N words costs:", ["O(N)", "O(L)", "O(log N)", "O(N·L)"], 1, "Only the word's length matters."),
      Q("Why can't a plain hash set efficiently answer 'any word starting with car?'", ["It can, in O(1)", "It would need to scan all keys", "Hash sets don't store strings", "It needs sorting"], 1, "Hashing destroys prefix structure."),
      Q("In a trie, how do you know 'car' is a word and not just a prefix of 'cart'?", ["Its length", "An end-of-word flag", "It's a leaf", "Its depth is odd"], 1, "'car' is not a leaf, so you need a flag."),
      Q("Best structure for Word Search II (many words on a grid)?", ["Hash set of words", "Trie + DFS", "Heap", "Sorting"], 1, "The trie prunes DFS paths that aren't prefixes of any word."),
    ],
    practice: [
      P("Implement Trie", "medium", "insert / search / startsWith.", "Dict of children + end flag.", "See Learn."),
      P("Design Add and Search Words", "medium", "'.' matches any letter.", "DFS over all children on '.'.", "Recursive search with an index."),
      P("Word Search II", "hard", "", "Build a trie of the words, DFS the board.", "Remove found words from the trie to avoid duplicates and prune."),
      P("Search Suggestions System", "medium", "Top 3 suggestions per typed prefix.", "Sort products + binary search, or a trie storing top 3 per node.", "Either approach works; trie nodes can cache suggestions."),
    ],
  });

  T({
    id: "graphs", title: "Graphs: BFS & DFS", icon: "🕸️", summary: "Model networks; explore with BFS (levels) and DFS (depth).",
    viz: "graphTraversal",
    learn: `
<p>A <b>graph</b> is a set of vertices V connected by edges E. It can be directed or undirected, weighted or unweighted. Trees, grids, social networks, maps and dependencies are all graphs.</p>
<h2>Representations</h2>
<ul><li><b>Adjacency list:</b> <code>{A: [B, D], …}</code>, O(V + E) space. Default choice.</li>
<li><b>Adjacency matrix:</b> V×V booleans, O(1) edge check, O(V²) space. Good for dense graphs.</li>
<li><b>Implicit grids:</b> neighbours are (r±1, c), (r, c±1).</li></ul>
<h2>BFS vs DFS</h2>
<table><tr><th></th><th>BFS</th><th>DFS</th></tr><tr><td>Structure</td><td>Queue</td><td>Stack / recursion</td></tr><tr><td>Explores</td><td>level by level</td><td>deep first</td></tr><tr><td>Shortest path (unweighted)</td><td>✅</td><td>❌</td></tr><tr><td>Great for</td><td>min steps, nearest X</td><td>cycles, topological sort, components, backtracking</td></tr><tr><td>Time</td><td colspan="2">O(V + E)</td></tr></table>
<pre>from collections import deque
def bfs(graph, start):
    dist = {start: 0}
    q = deque([start])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if v not in dist:        # mark when ENQUEUED
                dist[v] = dist[u] + 1
                q.append(v)
    return dist</pre>
<h2>More graph algorithms</h2>
<ul><li><b>Topological sort</b> (Kahn's: repeatedly remove nodes with in-degree 0): course schedules, build systems.</li>
<li><b>Union-Find (Disjoint Set)</b>: number of connected components, Kruskal's MST, detect cycles. Nearly O(1) with path compression + union by rank.</li>
<li><b>Multi-source BFS</b>: rotting oranges, distance to nearest gate.</li></ul>
<div class="callout warn">Always track visited nodes. Graphs (unlike trees) have cycles, so you'd loop forever.</div>`,
    quiz: [
      Q("Shortest path in an unweighted graph:", ["DFS", "BFS", "Dijkstra required", "Topological sort"], 1, "BFS reaches nodes in order of distance."),
      Q("Time complexity of BFS/DFS with an adjacency list:", ["O(V)", "O(E)", "O(V + E)", "O(V·E)"], 2, "Every vertex and edge is processed once."),
      Q("Course schedule (prerequisites) uses:", ["Dijkstra", "Topological sort / cycle detection", "Binary search", "Heap"], 1, "Can you order the courses? Only if the dependency graph is a DAG."),
      Q("Counting islands in a grid:", ["Sort cells", "Run BFS/DFS from each unvisited land cell", "Use a heap", "DP"], 1, "Each traversal floods one island."),
      Q("Union-Find is ideal for:", ["Shortest paths", "Dynamic connectivity / components", "Sorting", "String matching"], 1, "union(a, b) and find(a) in near-constant time."),
      Q("Why mark nodes visited when enqueuing in BFS (not when dequeuing)?", ["It's required for correctness of DFS", "Prevents adding the same node to the queue many times", "It sorts the queue", "No reason"], 1, "Otherwise nodes can be enqueued multiple times."),
    ],
    practice: [
      P("Number of Islands", "medium", "", "Flood fill.", "DFS/BFS from each '1', marking visited. O(rows·cols)."),
      P("Rotting Oranges", "medium", "", "Multi-source BFS.", "Start the queue with all rotten oranges; count levels."),
      P("Course Schedule", "medium", "", "Cycle detection in a directed graph.", "Kahn's algorithm: if you can't remove all nodes, there's a cycle."),
      P("Clone Graph", "medium", "", "Map old node → new node.", "BFS/DFS; create clones on first visit."),
      P("Word Ladder", "hard", "", "BFS where words are nodes.", "Neighbours differ by one letter; use wildcard patterns like h*t for speed."),
      P("Number of Connected Components", "medium", "", "Union-Find.", "Start with n components; each successful union decrements."),
    ],
  });

  T({
    id: "shortest-path", title: "Shortest Paths (Dijkstra)", icon: "🗺️", summary: "Weighted graphs: Dijkstra, Bellman-Ford, MSTs.",
    viz: "dijkstra",
    learn: `
<p><b>Dijkstra's algorithm</b> finds the shortest distance from a source to every node in a graph with <b>non-negative</b> edge weights. It greedily finalizes the closest unfinished node using a min-priority-queue.</p>
<pre>import heapq
def dijkstra(graph, src):            # graph[u] = [(v, w), ...]
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float('inf')): continue   # stale entry
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist</pre>
<h2>Which algorithm when?</h2>
<table><tr><th>Situation</th><th>Algorithm</th><th>Time</th></tr>
<tr><td>Unweighted</td><td>BFS</td><td>O(V + E)</td></tr>
<tr><td>Weights 0 or 1</td><td>0-1 BFS (deque)</td><td>O(V + E)</td></tr>
<tr><td>Non-negative weights</td><td>Dijkstra</td><td>O((V + E) log V)</td></tr>
<tr><td>Negative weights</td><td>Bellman-Ford (detects negative cycles)</td><td>O(V·E)</td></tr>
<tr><td>All pairs, small V</td><td>Floyd-Warshall</td><td>O(V³)</td></tr>
<tr><td>Heuristic available (maps, games)</td><td>A*</td><td>often much faster</td></tr></table>
<h2>Minimum Spanning Tree</h2>
<p>Connect all nodes with minimum total edge weight. <b>Kruskal</b>: sort edges, add if it doesn't form a cycle (Union-Find). <b>Prim</b>: grow from a node using a heap.</p>
<div class="callout warn">Dijkstra fails with negative edges: a node "finalized" early could later be reached more cheaply.</div>`,
    quiz: [
      Q("Dijkstra requires edge weights to be:", ["Integers", "Non-negative", "Unique", "Less than V"], 1, "Negative edges break the greedy finalization."),
      Q("Data structure at the heart of efficient Dijkstra:", ["Stack", "Min-priority-queue (heap)", "Trie", "Hash set only"], 1, "Always expand the closest node next."),
      Q("Graph with negative weights, need single-source shortest paths:", ["Dijkstra", "BFS", "Bellman-Ford", "Prim"], 2, "It relaxes all edges V−1 times and detects negative cycles."),
      Q("Kruskal's algorithm uses which helper to avoid cycles?", ["Heap", "Union-Find", "Stack", "Trie"], 1, "Skip an edge whose endpoints are already connected."),
      Q("In the visualizer, why skip a popped entry whose distance is larger than dist[u]?", ["Bug", "It's a stale duplicate; a shorter path was already found", "To save memory", "It's a negative edge"], 1, "Lazy deletion: we push duplicates instead of decreasing keys."),
    ],
    practice: [
      P("Network Delay Time", "medium", "Time for a signal to reach all nodes.", "Plain Dijkstra.", "Answer = max(dist) or −1 if unreachable."),
      P("Path With Minimum Effort", "medium", "Grid, cost = max height difference on the path.", "Dijkstra where path cost = max edge.", "Or binary search on effort + BFS."),
      P("Cheapest Flights Within K Stops", "medium", "", "Bellman-Ford limited to k+1 rounds.", "Copy distances each round so you use at most one more edge."),
      P("Min Cost to Connect All Points", "medium", "", "MST.", "Prim's with a heap, or Kruskal on all pairs."),
    ],
  });

  T({
    id: "dp", title: "Dynamic Programming", icon: "🧩", summary: "Overlapping sub-problems + optimal substructure = DP tables.",
    viz: "dp",
    learn: `
<p>Use <b>DP</b> when a problem can be broken into sub-problems that <b>repeat</b> and the optimal answer is built from optimal sub-answers. Store each sub-answer once.</p>
<h2>Recipe</h2>
<ol><li><b>Define the state:</b> what does <code>dp[i]</code> (or <code>dp[i][j]</code>) mean, in words?</li>
<li><b>Recurrence:</b> how does a state depend on smaller ones?</li>
<li><b>Base cases.</b></li>
<li><b>Order:</b> fill so dependencies are computed first (or memoize recursion).</li>
<li><b>Answer</b> location, then optimize space if only the last row is needed.</li></ol>
<pre># Top-down (memoization)               # Bottom-up (tabulation)
from functools import cache            def climb(n):
@cache                                     a, b = 1, 1
def climb(n):                              for _ in range(n): a, b = b, a + b
    if n <= 1: return 1                    return a
    return climb(n-1) + climb(n-2)</pre>
<h2>Common DP families</h2>
<table><tr><th>Family</th><th>Examples</th><th>State</th></tr>
<tr><td>1D linear</td><td>climbing stairs, house robber, coin change</td><td>dp[i]</td></tr>
<tr><td>Two strings</td><td>LCS, edit distance</td><td>dp[i][j] prefixes</td></tr>
<tr><td>Knapsack</td><td>0/1 knapsack, partition equal subset</td><td>dp[i][capacity]</td></tr>
<tr><td>Grid</td><td>unique paths, min path sum</td><td>dp[r][c]</td></tr>
<tr><td>Intervals</td><td>burst balloons, matrix chain</td><td>dp[l][r]</td></tr>
<tr><td>Subsequence</td><td>longest increasing subsequence</td><td>dp[i] ending at i</td></tr></table>
<div class="callout tip">Signals: "number of ways", "min/max cost", "is it possible", and choices at each step that affect the future. If greedy feels tempting but you can find a counterexample, it's DP.</div>`,
    quiz: [
      Q("The two properties that make DP applicable:", ["Sorted input & small n", "Overlapping sub-problems & optimal substructure", "Recursion & loops", "Graphs & trees"], 1, "Repeated sub-problems make caching worthwhile."),
      Q("Memoized Fibonacci runs in:", ["O(2ⁿ)", "O(n)", "O(log n)", "O(n²)"], 1, "Each fib(k) is computed once."),
      Q("LCS of 'ABCBDAB' and 'BDCABA' has length:", ["3", "4", "5", "6"], 1, "e.g. 'BCBA'. Run it in the visualizer!"),
      Q("In 0/1 knapsack, dp[i][w] = max(dp[i-1][w], v_i + dp[i-1][w − w_i]). Why i−1 in the second term?", ["Typo", "Each item can be used at most once", "To save memory", "Items are sorted"], 1, "Unbounded knapsack would use dp[i][w − w_i]."),
      Q("Coins {1, 3, 4}, amount 6. Greedy (largest first) gives 3 coins. Optimal is:", ["1", "2", "3", "4"], 1, "3 + 3. Greedy fails, DP wins."),
      Q("Edit distance between two strings is typically:", ["O(n + m)", "O(n·m)", "O(2ⁿ)", "O(log n)"], 1, "A 2D table over prefixes."),
    ],
    practice: [
      P("Climbing Stairs", "easy", "1 or 2 steps at a time.", "dp[i] = dp[i-1] + dp[i-2].", "It's Fibonacci."),
      P("House Robber", "medium", "No two adjacent houses.", "Rob i or skip i.", "dp[i] = max(dp[i-1], dp[i-2] + nums[i])."),
      P("Coin Change", "medium", "", "Unbounded min coins.", "See visualizer. O(amount × coins)."),
      P("Longest Increasing Subsequence", "medium", "", "dp[i] = LIS ending at i, or patience sorting.", "O(n²) DP or O(n log n) with binary search on tails."),
      P("Edit Distance", "hard", "", "Insert / delete / replace.", "dp[i][j] = dp[i-1][j-1] if equal, else 1 + min(three neighbours)."),
      P("Partition Equal Subset Sum", "medium", "", "Is there a subset summing to total/2?", "Boolean knapsack; iterate capacity downward for 1D."),
    ],
  });

  T({
    id: "greedy", title: "Greedy & Intervals", icon: "🎯", summary: "Make the locally best choice: scheduling, merging, jumps.",
    viz: "intervals",
    learn: `
<p>A <b>greedy</b> algorithm makes the best-looking choice at each step and never looks back. It's fast and simple, but only correct when a <b>greedy-choice property</b> holds (you can prove a local best choice is part of some global optimum, often by an exchange argument).</p>
<h2>Classic greedy wins</h2>
<ul><li><b>Activity selection:</b> sort by end time, pick non-overlapping (visualizer).</li>
<li><b>Merge intervals:</b> sort by start, sweep.</li>
<li><b>Jump game:</b> track the farthest reachable index.</li>
<li><b>Gas station, Huffman coding, Dijkstra, Kruskal/Prim.</b></li></ul>
<pre>def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    out = []
    for s, e in intervals:
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out</pre>
<h2>Interval tricks</h2>
<ul><li>Overlap test: <code>a.start &lt; b.end and b.start &lt; a.end</code>.</li>
<li>Min meeting rooms: sort starts and ends separately (or a min-heap of end times) and sweep.</li>
<li>Sort by <b>end</b> to maximize count, by <b>start</b> to merge.</li></ul>
<div class="callout warn">Greedy often fails: coin change with {1, 3, 4} is a counterexample. If you can't prove it, test small cases or fall back to DP.</div>`,
    quiz: [
      Q("To maximize the number of non-overlapping meetings, sort by:", ["Start time", "End time", "Duration", "Random"], 1, "Finishing earliest leaves the most room."),
      Q("To merge overlapping intervals, sort by:", ["Start time", "End time", "Length", "No sort needed"], 0, "Then a single sweep merges neighbours."),
      Q("Do [1,5] and [5,8] overlap (closed intervals)?", ["Yes", "No"], 0, "They share point 5. Problems define this differently, so always clarify!"),
      Q("Minimum meeting rooms for [[0,30],[5,10],[15,20]]:", ["1", "2", "3", "0"], 1, "[0,30] overlaps both others, but those two don't overlap each other."),
      Q("A greedy algorithm is guaranteed correct when:", ["It runs fast", "The greedy-choice property & optimal substructure hold", "Input is sorted", "Never"], 1, "Usually proven by an exchange argument."),
    ],
    practice: [
      P("Jump Game", "medium", "Can you reach the last index?", "Track the farthest reach.", "If i > farthest, fail; else farthest = max(farthest, i + nums[i])."),
      P("Non-overlapping Intervals", "medium", "Min removals to make intervals non-overlapping.", "n − max non-overlapping.", "Sort by end, count picks."),
      P("Meeting Rooms II", "medium", "", "Min-heap of end times.", "For each meeting (by start), pop rooms that ended; push this end. Heap size max = answer."),
      P("Gas Station", "medium", "", "If total gas ≥ total cost, a solution exists.", "Reset the start whenever the running tank goes negative."),
      P("Partition Labels", "medium", "", "Last occurrence of each char.", "Extend the current part's end to the max last index; cut when i == end."),
    ],
  });
})();
