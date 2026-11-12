# AlgoQuest: DSA, System Design, ML & AI, visually

An interactive, offline learning app covering 61 key topics:

- **22 DSA topics:** Big-O, arrays & two pointers, sliding window, binary search, sorting (6 algorithms), linked lists, stacks & queues, hash tables, recursion & backtracking (N-Queens), trees & BST, heaps, tries, graphs (BFS/DFS), shortest paths (Dijkstra), dynamic programming (LCS, coin change, knapsack), greedy & intervals, bit manipulation, string matching (KMP, Rabin–Karp), union-find & minimum spanning trees, topological sort, range queries (prefix sums, Fenwick & segment trees), Bloom filters.
- **22 system design topics:** interview framework & capacity estimation, load balancing, caching (LRU/LFU/FIFO), databases/sharding/replication, consistent hashing, CAP, message queues, rate limiting, networking/DNS/CDN, APIs & microservices, reliability (circuit breaker), consensus (Raft), distributed transactions (2PC, sagas, outbox), authentication & security (OAuth, JWT), observability (percentiles, SLOs), storage engines (B-tree, LSM), and case studies: URL shortener, news feed, chat system, video streaming, ride sharing, payment system.
- **8 machine learning topics:** what ML is (with a k-NN playground), linear regression & gradient descent, classification & logistic regression, overfitting / bias–variance / regularization, decision trees & ensembles, k-means clustering, neural networks & backpropagation, model evaluation (confusion matrix, precision/recall, ROC).
- **9 AI & LLM topics:** the AI landscape, search & planning (A*), reinforcement learning (Q-learning), embeddings & vector search, tokenization (BPE), attention & transformers, LLM generation / prompting / fine-tuning, RAG, and AI agents & tool use.

Every topic has these tabs:

- **Learn**: short lesson with code
- **Visualize**: step-by-step animations or live simulators
- **In memory** (data structures): how it's laid out in RAM, with addresses, pointers, stack vs heap and cache lines
- **Code**: the same idea in Python, Java, TypeScript and JavaScript (the newer topics have Python and JavaScript, plus Java for DSA)
- **Story & uses**: who invented it and when, what people did before, why it was created, and where it's used today
- **Quiz**: 312 questions total, with explanations and a review of the ones you missed
- **Practice**: 225 interview problems and design exercises with hint + approach (DSA problems link to a LeetCode search)
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
js/viz-dsa2.js     more DSA visualizers (bits, KMP, union-find, topological sort, Fenwick tree, Bloom filter)
js/viz-sd2.js      more simulators (Raft, LSM tree, latency percentiles, sagas, OAuth, 3 case studies)
js/viz-ml.js       machine learning playgrounds (k-NN, gradient descent, trees, k-means, neural net, ROC…)
js/viz-ai.js       AI visualizers (A*, Q-learning, embeddings, BPE, attention, sampling, RAG, agents)
js/memory.js       "In memory" RAM views
js/extras-dsa.js   DSA code samples, history, real-world uses
js/extras-sd.js    system design code samples, history, real-world uses
js/content-dsa.js  DSA lessons, quizzes, practice
js/content-sd.js   system design lessons, quizzes, exercises
js/*-dsa2.js, js/*-sd2.js   lessons, quizzes and extras for the topics added later
js/content-ml.js   machine learning lessons, quizzes, exercises
js/content-ai.js   AI & LLM lessons, quizzes, exercises
js/extras-ml.js    machine learning code samples, history, real-world uses
js/extras-ai.js    AI & LLM code samples, history, real-world uses
js/app.js          navigation and pages
```
