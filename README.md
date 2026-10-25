# AlgoQuest: DSA & System Design, visually

An interactive, offline learning app covering 30 key topics:

- **16 DSA topics:** Big-O, arrays & two pointers, sliding window, binary search, sorting (6 algorithms), linked lists, stacks & queues, hash tables, recursion & backtracking (N-Queens), trees & BST, heaps, tries, graphs (BFS/DFS), shortest paths (Dijkstra), dynamic programming (LCS, coin change, knapsack), greedy & intervals.
- **14 system design topics:** interview framework & capacity estimation, load balancing, caching (LRU/LFU/FIFO), databases/sharding/replication, consistent hashing, CAP, message queues, rate limiting, networking/DNS/CDN, APIs & microservices, reliability (circuit breaker), and case studies: URL shortener, news feed, chat system.

Every topic has these tabs:

- **Learn**: short lesson with code
- **Visualize**: step-by-step animations or live simulators
- **In memory** (data structures): how it's laid out in RAM, with addresses, pointers, stack vs heap and cache lines
- **Code**: the same idea in Python, Java, TypeScript and JavaScript
- **Story & uses**: who invented it and when, what people did before, why it was created, and where it's used today
- **Quiz**: 157 questions total, with explanations
- **Practice**: interview problems with hint + approach
XP, levels, a daily streak and a mixed "Daily challenge" are saved in your browser.

## Run it

No build step. Either open `index.html` directly, or serve it on **http://localhost:8000**:

| How | Command |
|---|---|
| Windows | double-click `start.bat` (uses Python, or Node if no Python) |
| macOS / Linux | `./start.sh` |
| Python | `python -m http.server 8000` |
| Node.js | `npm start` |

Then visit http://localhost:8000. Stop the server with Ctrl+C.

## Structure

```
index.html
css/style.css
js/core.js         helpers, step player, quiz engine, architecture diagrams
js/viz-dsa.js      DSA visualizers
js/viz-sd.js       system design simulators
js/memory.js       "In memory" RAM views
js/extras-dsa.js   DSA code samples, history, real-world uses
js/extras-sd.js    system design code samples, history, real-world uses
js/content-dsa.js  DSA lessons, quizzes, practice
js/content-sd.js   system design lessons, quizzes, exercises
js/app.js          navigation and pages
```
