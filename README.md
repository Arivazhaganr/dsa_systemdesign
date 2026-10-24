# AlgoQuest: DSA & System Design, visually

An interactive, offline learning app covering 30 key topics:

- **16 DSA topics:** Big-O, arrays & two pointers, sliding window, binary search, sorting (6 algorithms), linked lists, stacks & queues, hash tables, recursion & backtracking (N-Queens), trees & BST, heaps, tries, graphs (BFS/DFS), shortest paths (Dijkstra), dynamic programming (LCS, coin change, knapsack), greedy & intervals.
- **14 system design topics:** interview framework & capacity estimation, load balancing, caching (LRU/LFU/FIFO), databases/sharding/replication, consistent hashing, CAP, message queues, rate limiting, networking/DNS/CDN, APIs & microservices, reliability (circuit breaker), and case studies: URL shortener, news feed, chat system.

Every topic has four tabs: **Learn** (short lesson + code), **Visualize** (step-by-step animations or live simulators), **Quiz** (157 questions total, with explanations) and **Practice** (interview problems with hint + approach).
XP, levels, a daily streak and a mixed "Daily challenge" are saved in your browser.

## Run it

No install, no build. Just open `index.html` in any modern browser (double-click it).

## Structure

```
index.html
css/style.css
js/core.js         helpers, step player, quiz engine, architecture diagrams
js/viz-dsa.js      DSA visualizers
js/viz-sd.js       system design simulators
js/content-dsa.js  DSA lessons, quizzes, practice
js/content-sd.js   system design lessons, quizzes, exercises
js/app.js          navigation and pages
```
