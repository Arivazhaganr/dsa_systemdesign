/* System design topics: lessons, quizzes, design exercises */
(function () {
  const Q = (q, options, answer, explain) => ({ q, options, answer, explain });
  const P = (name, diff, desc, hint, sol) => ({ name, diff, desc, hint, sol });
  const T = (t) => L.topics.push({ track: "sd", ...t });

  T({
    id: "sd-basics", title: "Interview Framework & Estimation", icon: "🧭", summary: "How to approach any design question, plus capacity math.",
    viz: "estimation",
    learn: `
<p>System design interviews are open-ended on purpose. A clear structure matters more than a perfect answer.</p>
<h2>The 5-step framework (~45 min)</h2>
<ol><li><b>Clarify requirements (5 min).</b> Functional (what it does) and non-functional (scale, latency, availability, consistency). Ask: How many users? Read-heavy or write-heavy? Global?</li>
<li><b>Estimate (5 min).</b> QPS, storage, bandwidth. Use the calculator on the Visualize tab.</li>
<li><b>API & data model (5 min).</b> Key endpoints and tables/entities.</li>
<li><b>High-level design (10–15 min).</b> Boxes and arrows: clients → LB → services → cache → DB → queues.</li>
<li><b>Deep dive & trade-offs (15 min).</b> Bottlenecks, scaling, failure modes, and <i>why</i> you chose X over Y.</li></ol>
<h2>Non-functional vocabulary</h2>
<table><tr><th>Term</th><th>Meaning</th></tr>
<tr><td>Scalability</td><td>Handle more load by adding resources</td></tr>
<tr><td>Availability</td><td>% of time the system works. 99.9% ≈ 8.8 h downtime/yr; 99.99% ≈ 53 min/yr</td></tr>
<tr><td>Latency vs throughput</td><td>Time per request vs requests per second</td></tr>
<tr><td>Consistency</td><td>Do all readers see the latest write?</td></tr>
<tr><td>Durability</td><td>Data isn't lost once acknowledged</td></tr></table>
<h2>Handy numbers</h2>
<ul><li>1 day ≈ 86,400 s ≈ <b>10⁵ s</b>. 1M req/day ≈ 12 QPS.</li>
<li>2¹⁰ ≈ 1 thousand, 2²⁰ ≈ 1 million, 2³⁰ ≈ 1 billion, 2⁴⁰ ≈ 1 trillion.</li>
<li>Memory is ~100× faster than SSD; a cross-continent round trip is ~150 ms.</li>
<li>A single well-tuned server handles roughly 1k–10k simple QPS; a single relational DB primary maybe a few thousand writes/s.</li></ul>
<div class="callout tip">Say your assumptions out loud and round aggressively. Interviewers care about the order of magnitude, not decimals.</div>`,
    quiz: [
      Q("First thing to do in a system design interview:", ["Draw the database schema", "Clarify requirements and scale", "Pick Kafka", "Write code"], 1, "Designs depend heavily on requirements."),
      Q("10 million requests per day is roughly:", ["12 QPS", "115 QPS", "1,200 QPS", "10,000 QPS"], 1, "10⁷ / 10⁵ ≈ 100 (precisely ~115)."),
      Q("99.99% availability allows about how much downtime per year?", ["8.8 hours", "53 minutes", "5 minutes", "3.6 days"], 1, "'Four nines' ≈ 52.6 minutes."),
      Q("Latency is:", ["Requests per second", "Time to serve one request", "Amount of data stored", "Number of servers"], 1, "Throughput is requests per second."),
      Q("1 billion users × 1 KB profile each ≈", ["1 GB", "1 TB", "1 PB", "1 MB"], 1, "10⁹ × 10³ B = 10¹² B = 1 TB."),
    ],
    practice: [
      P("Estimate: photo storage for Instagram-like app", "medium", "500M DAU, 10% post 1 photo/day at 2 MB. Storage per year?", "Writes/day × size × 365.", "50M × 2 MB = 100 TB/day → ~36 PB/year (before replication ×3)."),
      P("Estimate: QPS for a search box", "easy", "100M DAU, 5 searches each, 3× peak.", "Divide by 10⁵.", "5×10⁸ / 10⁵ ≈ 5,000 avg QPS → ~15,000 peak."),
      P("Practice the framework", "medium", "Pick any app you use daily; spend 5 minutes on requirements only.", "Functional vs non-functional.", "List 3–5 core features, then scale, latency, availability, and consistency needs."),
    ],
  });

  T({
    id: "load-balancing", title: "Scaling & Load Balancing", icon: "⚖️", summary: "Vertical vs horizontal scaling, LB algorithms, health checks.",
    viz: "loadBalancer",
    learn: `
<h2>Vertical vs horizontal scaling</h2>
<table><tr><th></th><th>Vertical (scale up)</th><th>Horizontal (scale out)</th></tr>
<tr><td>How</td><td>Bigger machine (CPU/RAM)</td><td>More machines</td></tr>
<tr><td>Limit</td><td>Hardware ceiling, single point of failure</td><td>Practically unlimited</td></tr>
<tr><td>Complexity</td><td>Simple</td><td>Needs load balancing, stateless services</td></tr></table>
<p>To scale out, make app servers <b>stateless</b>: store sessions in Redis/DB/JWT, not in server memory. Then any server can handle any request.</p>
<h2>Load balancer algorithms</h2>
<ul><li><b>Round robin:</b> take turns. Simple; assumes equal servers and requests.</li>
<li><b>Weighted round robin:</b> bigger servers get more.</li>
<li><b>Least connections:</b> send to the least busy. Good when request durations vary.</li>
<li><b>IP / consistent hash:</b> same client → same server (sticky sessions, cache locality).</li></ul>
<h2>L4 vs L7</h2>
<p><b>Layer 4</b> balances TCP/UDP connections (fast, protocol-agnostic). <b>Layer 7</b> understands HTTP, so it can route by path/header/cookie, terminate TLS, and do retries.</p>
<h2>Health checks & redundancy</h2>
<p>The LB pings servers (e.g. <code>GET /health</code>) and removes failing ones. The LB itself is made redundant with an active-passive pair or DNS across several LBs. <b>Auto-scaling</b> adds/removes servers based on CPU or queue depth.</p>
<div class="callout tip">In the simulator: crank traffic up, switch between Round robin and Least connections, then crash a server and watch the others absorb the load.</div>`,
    quiz: [
      Q("What must app servers be for easy horizontal scaling?", ["Large", "Stateless", "Written in Go", "On the same rack"], 1, "Any server can handle any request when no per-user state lives in memory."),
      Q("Requests have very different processing times. Best LB algorithm?", ["Round robin", "Least connections", "Random", "Always the first server"], 1, "Busy servers get fewer new requests."),
      Q("Which LB can route /api/* and /images/* to different backends?", ["Layer 4", "Layer 7", "DNS only", "None"], 1, "L7 understands HTTP paths."),
      Q("How does an LB know a server died?", ["The server emails it", "Health checks", "Users complain", "It doesn't"], 1, "Periodic probes; failing servers are removed from rotation."),
      Q("A downside of vertical scaling:", ["Requires code changes", "Hardware ceiling and single point of failure", "Needs a load balancer", "More network hops"], 1, "One huge box can still fail and can only get so big."),
    ],
    practice: [
      P("Make a stateful app scalable", "medium", "Your app stores shopping carts in server memory. You need 10 servers.", "Where does the state go?", "Move carts to Redis (or the DB) keyed by user/session id; servers become stateless; any LB algorithm now works."),
      P("Design for a flash sale", "hard", "Traffic jumps 50× for 10 minutes.", "Pre-scale, queue, and shed load.", "Pre-warm servers, CDN for static pages, a queue/waiting room for checkout, rate-limit per user, cache inventory counts, degrade non-critical features."),
    ],
  });

  T({
    id: "caching", title: "Caching", icon: "⚡", summary: "Cache-aside, write strategies, eviction (LRU/LFU), invalidation.",
    viz: "cache",
    learn: `
<p>A <b>cache</b> stores the results of expensive operations in fast storage (usually memory) so repeated requests are cheap. It reduces latency and database load.</p>
<h2>Where to cache</h2>
<p>Browser → CDN → load balancer / reverse proxy → application (in-process) → distributed cache (Redis, Memcached) → database buffer pool.</p>
<h2>Read & write strategies</h2>
<table><tr><th>Strategy</th><th>How</th><th>Trade-off</th></tr>
<tr><td><b>Cache-aside</b> (lazy)</td><td>App checks cache; on miss reads DB and fills the cache</td><td>Most common; first read is slow; possible stale data</td></tr>
<tr><td><b>Read-through</b></td><td>Cache itself loads from DB on miss</td><td>Simpler app code</td></tr>
<tr><td><b>Write-through</b></td><td>Write to cache and DB together</td><td>Consistent; slower writes</td></tr>
<tr><td><b>Write-back</b> (write-behind)</td><td>Write to cache; flush to DB later</td><td>Fast writes; risk of data loss</td></tr>
<tr><td><b>Write-around</b></td><td>Write to DB only; cache fills on read</td><td>Avoids caching data never read</td></tr></table>
<h2>Eviction policies</h2>
<ul><li><b>LRU:</b> evict the least recently used (hash map + doubly linked list = O(1)).</li>
<li><b>LFU:</b> evict the least frequently used.</li>
<li><b>FIFO</b>, <b>TTL</b> (expire after time).</li></ul>
<pre>from collections import OrderedDict
class LRUCache:
    def __init__(self, cap): self.cap, self.d = cap, OrderedDict()
    def get(self, k):
        if k not in self.d: return -1
        self.d.move_to_end(k); return self.d[k]
    def put(self, k, v):
        self.d[k] = v; self.d.move_to_end(k)
        if len(self.d) > self.cap: self.d.popitem(last=False)</pre>
<h2>Gotchas</h2>
<ul><li><b>Invalidation</b>: "There are only two hard things in computer science: cache invalidation and naming things." Use TTLs + delete on write.</li>
<li><b>Thundering herd / cache stampede</b>: a hot key expires and thousands hit the DB. Use locks, request coalescing, or jittered TTLs.</li>
<li><b>Hot keys</b>: replicate them or add a local in-process cache.</li></ul>`,
    quiz: [
      Q("In cache-aside, on a cache miss the application:", ["Returns an error", "Reads the DB, then stores the result in the cache", "Waits for the cache to fill itself", "Writes to the DB"], 1, "That's lazy loading."),
      Q("Which write strategy risks losing data if the cache crashes?", ["Write-through", "Write-around", "Write-back", "Cache-aside"], 2, "Writes sit only in the cache until flushed."),
      Q("O(1) LRU cache is built from:", ["Array + binary search", "Hash map + doubly linked list", "Heap", "Trie"], 1, "Map finds nodes; list keeps recency order."),
      Q("A popular key expires and 10k requests hit the DB at once. This is:", ["Cache warming", "Thundering herd / stampede", "Write-back", "Sharding"], 1, "Mitigate with locks/coalescing or staggered TTLs."),
      Q("Good thing to cache:", ["Bank balances needing strict consistency", "A trending product page read 1M times per hour", "One-time passwords", "Random numbers"], 1, "Read-heavy, slightly-stale-OK data is ideal."),
      Q("In the simulator, the cache serves hits in 1 ms and misses take 50 ms. With 90% hit rate, average latency ≈", ["5.9 ms", "25 ms", "45 ms", "1 ms"], 0, "0.9 × 1 + 0.1 × 50 = 5.9 ms."),
    ],
    practice: [
      P("LRU Cache", "medium", "Implement get/put in O(1).", "OrderedDict or map + linked list.", "See Learn."),
      P("Cache a user profile service", "medium", "100k reads/s, 100 writes/s. Users edit profiles occasionally.", "Cache-aside + invalidate on write.", "Redis cache-aside, TTL 1 h, delete key on update (not update-in-place, to avoid races), local cache for the hottest profiles."),
      P("Prevent cache stampede", "hard", "A homepage key is rebuilt in 2 s and requested 5k/s.", "Only one rebuilder.", "Mutex/lease on miss, serve stale-while-revalidate, refresh early with probability (jitter)."),
    ],
  });

  T({
    id: "databases", title: "Databases: SQL, NoSQL, Sharding", icon: "🗄️", summary: "Choosing a database, indexes, replication, partitioning.",
    viz: "sharding",
    learn: `
<h2>SQL vs NoSQL</h2>
<table><tr><th></th><th>Relational (PostgreSQL, MySQL)</th><th>NoSQL</th></tr>
<tr><td>Model</td><td>Tables, rows, joins, fixed schema</td><td>Key-value, document, wide-column, graph</td></tr>
<tr><td>Guarantees</td><td>ACID transactions</td><td>Often BASE / tunable consistency</td></tr>
<tr><td>Scaling</td><td>Vertical + read replicas; sharding is manual</td><td>Built for horizontal scale</td></tr>
<tr><td>Best for</td><td>Complex queries, money, relationships</td><td>Huge scale, simple access patterns, flexible schema</td></tr></table>
<p>NoSQL types: <b>key-value</b> (Redis, DynamoDB), <b>document</b> (MongoDB), <b>wide-column</b> (Cassandra, HBase), <b>graph</b> (Neo4j), plus <b>search</b> (Elasticsearch) and <b>time-series</b> stores.</p>
<h2>ACID</h2>
<p><b>A</b>tomicity (all or nothing), <b>C</b>onsistency (constraints hold), <b>I</b>solation (concurrent transactions don't interfere), <b>D</b>urability (committed data survives crashes).</p>
<h2>Indexes</h2>
<p>An index (usually a <b>B+ tree</b>) turns an O(n) table scan into O(log n). Cost: extra storage and slower writes. Index columns used in WHERE, JOIN and ORDER BY.</p>
<h2>Replication</h2>
<ul><li><b>Primary–replica:</b> writes to primary, reads from replicas. Watch for <b>replication lag</b> (read-your-own-writes issues).</li>
<li><b>Multi-primary:</b> writes anywhere; needs conflict resolution.</li>
<li><b>Sync vs async:</b> sync = no data loss but slower; async = fast but may lose recent writes on failover.</li></ul>
<h2>Sharding (partitioning)</h2>
<ul><li><b>Hash-based:</b> even spread; range queries hit all shards; resharding moves lots of data (use consistent hashing).</li>
<li><b>Range-based:</b> good for range scans; risk of hot spots.</li>
<li><b>Directory-based:</b> a lookup service maps key → shard. Flexible, but another component.</li></ul>
<div class="callout warn">Sharding costs: cross-shard joins and transactions become hard, and a celebrity user can create a hot shard. Shard only when replicas + caching + vertical scaling aren't enough.</div>`,
    quiz: [
      Q("Best fit for a banking ledger:", ["Eventually consistent KV store", "Relational DB with ACID transactions", "In-memory cache", "Document store with no transactions"], 1, "Money needs atomicity and strong consistency."),
      Q("A user updates their profile, refreshes, and sees the old one. Likely cause:", ["Index missing", "Reading from a lagging replica", "Sharding", "Too much cache memory"], 1, "Route a user's reads to the primary briefly after their write."),
      Q("What does a database index trade off?", ["Faster reads for slower writes and more storage", "Nothing", "Consistency for availability", "Durability for speed"], 0, "Every write must update the index too."),
      Q("Range sharding by signup id has a problem when ids keep increasing:", ["Even spread", "All new writes hit the last shard (hot spot)", "Range queries are slow", "No problem"], 1, "Try '+10 new signups' in the simulator."),
      Q("With hash mod N sharding, going from 3 to 4 shards moves about:", ["0% of keys", "25% of keys", "75% of keys", "100% of keys"], 2, "Most keys change their mod result. Consistent hashing moves ~1/N."),
      Q("Which DB type suits 'friends of friends who like jazz'?", ["Key-value", "Graph database", "Time-series", "Blob storage"], 1, "Graph traversals are native."),
    ],
    practice: [
      P("Choose the DB", "medium", "An e-commerce site: catalog, orders, product search, sessions, click analytics.", "Use the right tool for each.", "Orders → PostgreSQL (ACID); catalog → Postgres or document DB; search → Elasticsearch; sessions → Redis; clicks → Kafka → columnar/time-series store."),
      P("Shard a users table", "hard", "2 billion users, mostly lookups by user_id.", "Pick a shard key and a scheme.", "Shard by hash(user_id) with consistent hashing or many logical shards mapped to physical nodes; secondary lookups (by email) via a separate index table."),
    ],
  });

  T({
    id: "consistent-hashing", title: "Consistent Hashing", icon: "💍", summary: "Add or remove servers while moving only ~1/N of the keys.",
    viz: "consistentHashing",
    learn: `
<p>With <code>server = hash(key) % N</code>, changing N remaps almost every key. That's a disaster for caches (everything misses) and databases (massive data movement).</p>
<h2>The ring</h2>
<ol><li>Hash servers onto a circle (0 … 2³²).</li>
<li>Hash each key onto the same circle.</li>
<li>A key belongs to the <b>first server clockwise</b>.</li></ol>
<p>Adding a server only takes keys from its clockwise neighbour; removing one hands its keys to the next server. On average only <b>K / N</b> keys move.</p>
<h2>Virtual nodes</h2>
<p>With few servers, arcs are uneven. Give each physical server many positions (<b>virtual nodes</b>, e.g. 100–200). Load evens out, and when a server dies its keys spread across many survivors instead of crushing one neighbour. Stronger machines can get more vnodes.</p>
<h2>Where it's used</h2>
<p>Amazon Dynamo / DynamoDB, Apache Cassandra, Riak, Memcached clients, CDNs, and load balancers with sticky routing (e.g. Maglev-style hashing).</p>
<div class="callout tip">In the simulator, add a server with 1 vnode, then switch to 8 vnodes and compare the key counts per server.</div>`,
    quiz: [
      Q("Main problem consistent hashing solves:", ["Hash collisions", "Massive key remapping when servers change", "Slow hash functions", "Security"], 1, "Only ~K/N keys move."),
      Q("On the ring, a key is stored on:", ["The nearest server counter-clockwise", "The first server clockwise", "A random server", "All servers"], 1, "By convention, clockwise."),
      Q("Why use virtual nodes?", ["Fewer servers needed", "More even load and smoother rebalancing", "Faster hashing", "To encrypt data"], 1, "Many small arcs per server average out."),
      Q("Which system popularized consistent hashing for databases?", ["MySQL", "Amazon Dynamo", "SQLite", "Excel"], 1, "The 2007 Dynamo paper; Cassandra uses it too."),
      Q("10 servers, 1M keys, add 1 server. Roughly how many keys move?", ["~1M", "~500K", "~91K", "0"], 2, "About K/(N+1) ≈ 1M/11."),
    ],
    practice: [
      P("Implement a consistent hash ring", "medium", "addNode, removeNode, getNode(key).", "Sorted list of (hash, node) + binary search.", "Keep a sorted array of vnode hashes; getNode = bisect for the first hash ≥ hash(key), wrap to 0."),
      P("Distributed cache cluster", "hard", "Design a memcached cluster that scales from 10 to 50 nodes without a cold cache.", "Ring + replication.", "Consistent hashing with vnodes; replicate each key to the next R nodes; add nodes gradually; warm new nodes by reading through."),
    ],
  });

  T({
    id: "cap", title: "CAP & Consistency Models", icon: "🔺", summary: "During a partition, choose consistency or availability.",
    viz: "cap",
    learn: `
<p>The <b>CAP theorem</b>: in a distributed system, when a <b>network Partition</b> happens you must choose between <b>Consistency</b> (every read sees the latest write) and <b>Availability</b> (every request gets a non-error response). Partitions are inevitable, so the real choice is <b>CP vs AP</b>.</p>
<table><tr><th></th><th>CP</th><th>AP</th></tr>
<tr><td>On partition</td><td>Refuse/timeout some requests</td><td>Serve possibly stale data</td></tr>
<tr><td>Examples</td><td>ZooKeeper, etcd, HBase, Spanner, banking</td><td>Cassandra, DynamoDB (default), DNS, shopping carts</td></tr></table>
<h2>PACELC</h2>
<p>Extends CAP: if <b>P</b>artition → choose <b>A</b> or <b>C</b>; <b>E</b>lse (normal operation) → choose <b>L</b>atency or <b>C</b>onsistency. Even without failures, synchronous replication costs latency.</p>
<h2>Consistency models (strong → weak)</h2>
<ul><li><b>Linearizable / strong:</b> behaves like a single copy.</li>
<li><b>Sequential / causal:</b> operations respect causal order (a reply never appears before its question).</li>
<li><b>Read-your-writes:</b> you always see your own updates.</li>
<li><b>Eventual:</b> replicas converge if writes stop.</li></ul>
<h2>Quorums</h2>
<p>With N replicas, write to W and read from R. If <b>R + W &gt; N</b>, every read overlaps the latest write. Example: N=3, W=2, R=2. Tune W/R for read-heavy or write-heavy workloads.</p>
<h2>Resolving conflicts</h2>
<p>Last-write-wins (simple, loses data), vector clocks (detect concurrency), CRDTs (data types that merge automatically, used in collaborative editors).</p>`,
    quiz: [
      Q("Under a network partition, a CP system will:", ["Serve stale data", "Reject or delay some requests to stay consistent", "Lose all data", "Ignore the partition"], 1, "Consistency is kept by sacrificing availability."),
      Q("A shopping cart that must always accept 'add item' should be:", ["CP", "AP", "Neither", "CA"], 1, "Merge carts later; never refuse a customer."),
      Q("N = 3 replicas. Which (W, R) guarantees reads see the latest write?", ["W=1, R=1", "W=2, R=2", "W=1, R=2", "W=2, R=1"], 1, "R + W must exceed N: 2 + 2 = 4 > 3."),
      Q("PACELC says that without a partition you trade:", ["Availability vs partition tolerance", "Latency vs consistency", "Cost vs speed", "Nothing"], 1, "Waiting for replicas adds latency."),
      Q("Last-write-wins conflict resolution can:", ["Never lose data", "Silently drop concurrent writes", "Guarantee linearizability", "Require consensus"], 1, "Try it in the simulator in AP mode: write on both sides, then heal."),
    ],
    practice: [
      P("Classify: CP or AP?", "easy", "Seat booking, social likes counter, distributed lock, DNS.", "What's worse: an error or a wrong answer?", "Seat booking CP; likes AP; lock CP; DNS AP."),
      P("Design a globally replicated counter", "hard", "Likes on a post across 3 regions.", "Avoid coordination.", "G-Counter CRDT: each region increments its own slot; value = sum; merge = max per slot. Eventually consistent, always available."),
    ],
  });

  T({
    id: "message-queues", title: "Message Queues & Async", icon: "📬", summary: "Decouple services, absorb spikes, pub/sub, delivery guarantees.",
    viz: "messageQueue",
    learn: `
<p>A <b>message queue</b> lets a producer hand off work without waiting for the consumer. Benefits: <b>decoupling</b>, <b>buffering spikes</b>, <b>retries</b>, and scaling consumers independently.</p>
<h2>Queue vs pub/sub vs log</h2>
<table><tr><th>Model</th><th>Delivery</th><th>Examples</th></tr>
<tr><td>Work queue</td><td>Each message to <b>one</b> consumer</td><td>RabbitMQ, SQS</td></tr>
<tr><td>Pub/sub</td><td>Each message to <b>every</b> subscriber</td><td>SNS, Redis pub/sub, Google Pub/Sub</td></tr>
<tr><td>Distributed log</td><td>Ordered, replayable, partitioned; consumer groups track offsets</td><td>Kafka, Kinesis, Pulsar</td></tr></table>
<h2>Delivery guarantees</h2>
<ul><li><b>At-most-once:</b> may lose messages, never duplicates.</li>
<li><b>At-least-once:</b> never loses, may duplicate. <b>Most common.</b> Make consumers <b>idempotent</b> (dedupe by message id).</li>
<li><b>Exactly-once:</b> hard; approximated with idempotency + transactions.</li></ul>
<h2>Important concepts</h2>
<ul><li><b>Ack / visibility timeout:</b> a message is removed only after the consumer acknowledges it.</li>
<li><b>Dead-letter queue (DLQ):</b> messages that keep failing go aside for inspection.</li>
<li><b>Ordering:</b> Kafka guarantees order within a partition; choose a partition key (e.g. user_id).</li>
<li><b>Back-pressure:</b> if consumers fall behind, the backlog (consumer lag) grows. Scale consumers or slow producers.</li></ul>
<div class="callout tip">In the simulator, hit "Traffic spike". The queue absorbs it and consumers drain it later. Then set consumers to 0 and watch the backlog explode.</div>`,
    quiz: [
      Q("Main benefit of putting a queue between upload and video transcoding:", ["Faster transcoding", "Upload returns immediately; workers process at their own pace", "Less storage", "Stronger consistency"], 1, "Decoupling and buffering."),
      Q("With at-least-once delivery, consumers should be:", ["Fast", "Idempotent", "Stateless only", "Single-threaded"], 1, "Processing the same message twice must be safe."),
      Q("Kafka guarantees message ordering:", ["Globally", "Within a partition", "Never", "Only with one consumer"], 1, "Pick a partition key to keep related events ordered."),
      Q("A message that fails processing 5 times should go to:", ["/dev/null", "A dead-letter queue", "The front of the queue forever", "The database"], 1, "Inspect and replay later."),
      Q("Producers send 10 msg/s; 2 consumers each handle 3 msg/s. What happens?", ["Queue stays empty", "Backlog grows by ~4 msg/s", "Messages are lost", "Consumers speed up"], 1, "Capacity 6/s < 10/s input."),
    ],
    practice: [
      P("Design an email notification system", "medium", "Many services need to send emails; provider rate-limits you.", "Queue + workers + retries.", "Services publish to a queue; workers send with rate limiting and exponential backoff; DLQ for bounces; idempotency key per email."),
      P("Order processing pipeline", "hard", "Order → payment → inventory → shipping, reliably.", "Events and sagas.", "Event-driven saga with compensating actions (refund if inventory fails); outbox pattern so DB write + event publish are atomic."),
    ],
  });

  T({
    id: "rate-limiting", title: "Rate Limiting", icon: "🚦", summary: "Token bucket, fixed and sliding windows, distributed limits.",
    viz: "rateLimiter",
    learn: `
<p>A <b>rate limiter</b> caps how many requests a client can make in a time period, protecting services from abuse, bugs and overload. Exceeding the limit returns <b>HTTP 429 Too Many Requests</b> (with a <code>Retry-After</code> header).</p>
<h2>Algorithms</h2>
<table><tr><th>Algorithm</th><th>Idea</th><th>Pros / cons</th></tr>
<tr><td><b>Token bucket</b></td><td>Bucket refills at r tokens/s up to capacity b; each request spends 1</td><td>Allows short bursts; memory-light. Used widely (AWS, Stripe)</td></tr>
<tr><td>Leaky bucket</td><td>Requests queue and leave at a fixed rate</td><td>Smooth output; bursts get delayed</td></tr>
<tr><td>Fixed window counter</td><td>Count per minute window</td><td>Simple; 2× burst at window edges</td></tr>
<tr><td>Sliding window log</td><td>Store timestamps, count the last T seconds</td><td>Accurate; memory heavy</td></tr>
<tr><td>Sliding window counter</td><td>Weighted mix of current and previous window</td><td>Good approximation, cheap</td></tr></table>
<h2>Distributed rate limiting</h2>
<p>With many API servers, keep counters in a shared store like <b>Redis</b> (atomic <code>INCR</code> + <code>EXPIRE</code>, or a Lua script for a token bucket). Limit by user id, API key or IP. Place it in the API gateway.</p>
<pre># Fixed window in Redis
key = f"rl:{user}:{int(time.time() // 60)}"
count = redis.incr(key)
if count == 1: redis.expire(key, 60)
if count > LIMIT: return 429</pre>`,
    quiz: [
      Q("HTTP status for rate-limited requests:", ["403", "404", "429", "500"], 2, "429 Too Many Requests."),
      Q("Which algorithm naturally allows short bursts up to a cap?", ["Fixed window", "Token bucket", "Leaky bucket", "None"], 1, "Saved-up tokens can be spent at once."),
      Q("Weakness of the fixed window counter:", ["Uses lots of memory", "Up to 2× the limit at window boundaries", "Can't be distributed", "Too accurate"], 1, "A burst at 0:59 and another at 1:00 both pass."),
      Q("With 20 API servers, where should counters live?", ["In each server's memory", "In a shared store like Redis", "In the browser", "In logs"], 1, "Otherwise each server enforces its own limit."),
      Q("Sliding window log's main cost:", ["CPU", "Memory: one timestamp per request", "Network", "Accuracy"], 1, "It's exact but stores every request."),
    ],
    practice: [
      P("Design an API rate limiter", "medium", "100 requests/min per API key across 50 servers.", "Redis + token bucket.", "Gateway middleware; Redis Lua script for atomic token bucket per key; return 429 with Retry-After; fail-open if Redis is down (or local fallback)."),
      P("Login brute-force protection", "easy", "", "Limit per account AND per IP.", "e.g. 5 failed attempts per account per 15 min, exponential lockout, plus a per-IP limit and CAPTCHA."),
    ],
  });

  T({
    id: "networking-cdn", title: "Networking, DNS & CDN", icon: "🌍", summary: "What happens when you type a URL; HTTP, TCP, CDNs.",
    viz: "cdnFlow",
    learn: `
<h2>What happens when you type a URL?</h2>
<ol><li><b>DNS</b> resolves the domain to an IP (browser cache → OS → resolver → root → TLD → authoritative).</li>
<li><b>TCP</b> 3-way handshake (SYN, SYN-ACK, ACK), then a <b>TLS</b> handshake for HTTPS.</li>
<li>Browser sends an <b>HTTP</b> request; it may hit a CDN, then a load balancer, then app servers.</li>
<li>Server responds; the browser parses HTML and fetches CSS/JS/images (often from the CDN).</li></ol>
<h2>Protocols</h2>
<table><tr><th>Protocol</th><th>Notes</th></tr>
<tr><td>TCP</td><td>Reliable, ordered, connection-based. HTTP/1.1, HTTP/2</td></tr>
<tr><td>UDP</td><td>No guarantees, low latency. Video calls, games, DNS, QUIC (HTTP/3)</td></tr>
<tr><td>HTTP/2</td><td>Multiplexes many requests over one connection</td></tr>
<tr><td>HTTP/3</td><td>Runs over QUIC (UDP): faster handshakes, no head-of-line blocking</td></tr>
<tr><td>WebSocket</td><td>Full-duplex persistent connection for real-time apps</td></tr></table>
<h2>CDN (Content Delivery Network)</h2>
<p>Servers around the world cache content close to users. <b>Push CDN</b>: you upload content ahead of time. <b>Pull CDN</b>: the edge fetches from your origin on the first miss and caches it with a TTL. Version your file names (<code>app.3f9a.js</code>) so you can cache forever and still deploy updates.</p>
<h2>Proxies</h2>
<p><b>Forward proxy</b> acts for clients (corporate filtering, VPN). <b>Reverse proxy</b> (Nginx, Envoy) acts for servers: TLS termination, caching, compression, load balancing.</p>`,
    quiz: [
      Q("First network step when visiting a new domain:", ["TLS handshake", "DNS lookup", "HTTP GET", "TCP FIN"], 1, "You need the IP address first."),
      Q("Which transport does HTTP/3 use?", ["TCP", "QUIC over UDP", "SCTP", "WebSocket"], 1, "QUIC fixes TCP head-of-line blocking."),
      Q("A CDN mostly helps by:", ["Encrypting data", "Serving cached content from servers near the user", "Running database queries", "Compressing images only"], 1, "Less distance means lower latency, and the origin gets less load."),
      Q("Best protocol for a live multiplayer game's position updates:", ["TCP with retries", "UDP-based", "SMTP", "FTP"], 1, "A late packet is useless; low latency wins."),
      Q("Nginx sitting in front of your app servers is a:", ["Forward proxy", "Reverse proxy", "DNS server", "CDN"], 1, "It represents the servers to clients."),
    ],
    practice: [
      P("Explain 'type google.com and press enter'", "medium", "A classic interview warm-up. Explain it in 2 minutes.", "DNS → TCP → TLS → HTTP → render.", "Use the 4 steps in Learn and mention caching at each layer."),
      P("Serve video to a global audience", "hard", "", "CDN + adaptive bitrate.", "Transcode into multiple bitrates/segments (HLS/DASH), store in object storage, distribute via CDN, players switch bitrate based on bandwidth."),
    ],
  });

  T({
    id: "api-design", title: "APIs & Microservices", icon: "🔌", summary: "REST, GraphQL, gRPC, idempotency, pagination, gateways.",
    viz: "apiGateway",
    learn: `
<h2>API styles</h2>
<table><tr><th>Style</th><th>Strengths</th><th>Use when</th></tr>
<tr><td><b>REST</b> (HTTP + JSON)</td><td>Simple, cacheable, universal</td><td>Public APIs, CRUD</td></tr>
<tr><td><b>GraphQL</b></td><td>Client asks for exactly the fields it needs</td><td>Many clients with different data needs</td></tr>
<tr><td><b>gRPC</b></td><td>Binary (protobuf), fast, streaming, typed</td><td>Internal service-to-service calls</td></tr>
<tr><td><b>WebSocket / SSE</b></td><td>Server push</td><td>Chat, live dashboards</td></tr></table>
<h2>Good REST design</h2>
<ul><li>Nouns for resources: <code>GET /users/42/orders</code>, verbs via methods (GET, POST, PUT, PATCH, DELETE).</li>
<li><b>Idempotency:</b> GET, PUT and DELETE are idempotent; make POST safe to retry with an <code>Idempotency-Key</code> header (crucial for payments).</li>
<li><b>Pagination:</b> cursor-based (<code>?after=abc&limit=20</code>) is stable under inserts; offset is simple but slow on deep pages.</li>
<li>Versioning (<code>/v1/</code>), proper status codes, consistent errors.</li></ul>
<h2>Monolith vs microservices</h2>
<table><tr><th></th><th>Monolith</th><th>Microservices</th></tr>
<tr><td>Deploy</td><td>One unit</td><td>Independently per service</td></tr>
<tr><td>Scaling</td><td>All together</td><td>Per service</td></tr>
<tr><td>Complexity</td><td>In the code</td><td>In the network: discovery, tracing, partial failures</td></tr>
<tr><td>Good for</td><td>Small teams, early products</td><td>Many teams, clear domain boundaries</td></tr></table>
<p>Supporting pieces: <b>API gateway</b> (auth, routing, rate limits), <b>service discovery</b>, <b>service mesh</b> (mTLS, retries), <b>distributed tracing</b>, and <b>database per service</b>.</p>`,
    quiz: [
      Q("Which HTTP method is NOT idempotent by default?", ["GET", "PUT", "DELETE", "POST"], 3, "Two POSTs may create two resources. Use an idempotency key."),
      Q("Paginating a feed where new items keep arriving:", ["Offset pagination", "Cursor pagination", "No pagination", "Return everything"], 1, "Cursors don't shift when new rows are inserted."),
      Q("Best fit for high-performance internal service calls:", ["SOAP", "gRPC", "FTP", "GraphQL over email"], 1, "Binary protobuf over HTTP/2."),
      Q("An API gateway typically handles:", ["Database replication", "Auth, routing, rate limiting", "Disk compaction", "Video encoding"], 1, "It's the single front door."),
      Q("A startup with 4 engineers building an MVP should usually start with:", ["50 microservices", "A well-structured monolith", "Serverless only", "Blockchain"], 1, "Split later along proven boundaries."),
    ],
    practice: [
      P("Design the API for a to-do app", "easy", "Lists, tasks, sharing.", "Resources and methods.", "GET/POST /lists, GET/PATCH/DELETE /lists/{id}, POST /lists/{id}/tasks, PATCH /tasks/{id}, POST /lists/{id}/members; cursor pagination."),
      P("Safe payment retries", "medium", "Client times out after POST /payments. Did it go through?", "Idempotency keys.", "Client sends Idempotency-Key; server stores key → result; retries return the stored result instead of charging again."),
    ],
  });

  T({
    id: "reliability", title: "Reliability & Fault Tolerance", icon: "🛡️", summary: "Circuit breakers, retries with backoff, redundancy, monitoring.",
    viz: "circuitBreaker",
    learn: `
<p>At scale, something is <b>always</b> failing. Design so failures are contained and the system degrades gracefully.</p>
<h2>Patterns</h2>
<ul><li><b>Timeouts</b> on every network call. Never wait forever.</li>
<li><b>Retries with exponential backoff + jitter</b> (wait 100 ms, 200 ms, 400 ms… ± random) to avoid synchronized retry storms. Only retry idempotent operations.</li>
<li><b>Circuit breaker:</b> after repeated failures, stop calling the broken dependency (<b>OPEN</b>), fail fast with a fallback, then try a single request (<b>HALF-OPEN</b>) before resuming (<b>CLOSED</b>).</li>
<li><b>Bulkheads:</b> isolate resources (separate thread pools/connection pools) so one slow dependency can't sink everything.</li>
<li><b>Graceful degradation:</b> show cached recommendations if the recommender is down.</li>
<li><b>Load shedding:</b> drop low-priority traffic under overload.</li></ul>
<h2>Redundancy</h2>
<p>No single points of failure: multiple servers, replicas, availability zones and regions. <b>Active-active</b> (all serve traffic) vs <b>active-passive</b> (standby takes over).</p>
<h2>Observability</h2>
<p><b>Metrics</b> (latency p50/p99, error rate, saturation), <b>logs</b>, and <b>traces</b> across services. Define <b>SLIs/SLOs</b> (e.g. 99.9% of requests under 300 ms) and alert on them.</p>
<h2>Consensus</h2>
<p>For leader election and replicated config, systems use <b>Raft</b> or <b>Paxos</b> (etcd, ZooKeeper, Consul). They need a majority (quorum), so run 3 or 5 nodes.</p>`,
    quiz: [
      Q("A circuit breaker in the OPEN state:", ["Sends all requests normally", "Fails fast without calling the dependency", "Restarts the dependency", "Doubles the timeout"], 1, "It gives the dependency time to recover."),
      Q("Why add jitter to retry backoff?", ["Makes retries faster", "Prevents clients from retrying in sync (thundering herd)", "Required by HTTP", "Saves memory"], 1, "Spread retries over time."),
      Q("Which operation is safest to retry automatically?", ["Charge credit card (no idempotency key)", "GET /profile", "Send SMS", "Append to a log without ids"], 1, "Reads are idempotent."),
      Q("Why run 3 or 5 nodes for Raft, not 2 or 4?", ["Odd numbers are faster", "A majority quorum tolerates the same failures with fewer nodes", "Raft requires prime numbers", "Licensing"], 1, "3 nodes tolerate 1 failure; 4 nodes still tolerate only 1."),
      Q("The 'bulkhead' pattern means:", ["Bigger servers", "Isolating resources so one failure can't exhaust everything", "Encrypting traffic", "Caching"], 1, "Named after ship compartments."),
    ],
    practice: [
      P("Make a checkout page resilient", "medium", "It calls payment, inventory, recommendations and reviews.", "What's critical vs optional?", "Timeouts + circuit breakers on all; payment & inventory critical (retry idempotently); recommendations/reviews optional (hide or use cache on failure); bulkhead pools per dependency."),
      P("Design a health-check & failover system", "hard", "Primary DB fails at 3 a.m.", "Detection, election, fencing.", "Heartbeats + consensus (etcd) to elect a new primary; fence the old one (STONITH) to avoid split brain; update service discovery; alert on-call."),
    ],
  });

  T({
    id: "url-shortener", title: "Case Study: URL Shortener", icon: "🔗", summary: "Design bit.ly end to end: ids, base62, caching, scale.",
    viz: "urlShortener",
    learn: `
<h2>1. Requirements</h2>
<ul><li>Functional: shorten a long URL, redirect a short URL, optional custom alias & expiry, click analytics.</li>
<li>Non-functional: very low redirect latency, high availability, short links must never collide. Read-heavy (~100:1).</li></ul>
<h2>2. Estimates</h2>
<p>100M new URLs/month ≈ 40 writes/s; 100:1 reads → ~4,000 redirects/s (peak ×3). 500 bytes per row × 100M × 12 × 5 years ≈ <b>3 TB</b>.</p>
<h2>3. API</h2>
<pre>POST /api/v1/shorten   { "url": "https://...", "alias"?: "...", "expiresAt"?: ... } → { "short": "sho.rt/aZ9x2" }
GET  /{code}           → 302 Location: https://...</pre>
<p><b>301</b> (permanent) lets browsers cache → less load but no analytics. <b>302</b> (temporary) hits you every time → analytics.</p>
<h2>4. Generating codes</h2>
<table><tr><th>Approach</th><th>Pros</th><th>Cons</th></tr>
<tr><td>Hash (MD5) + take 7 chars</td><td>Same URL → same code</td><td>Collisions need checks</td></tr>
<tr><td>Unique id → base62</td><td>No collisions, short</td><td>Needs a distributed id generator; sequential ids are guessable</td></tr>
<tr><td>Pre-generated key service</td><td>Fast, no collisions</td><td>Extra service; must not hand out a key twice</td></tr></table>
<h2>5. Scale it</h2>
<ul><li>Redis cache for hot codes (cache-aside), CDN/edge for the most popular redirects.</li>
<li>Key-value DB sharded by code; replicas for reads.</li>
<li>Analytics via an async queue so redirects stay fast.</li>
<li>Rate-limit creation to prevent abuse; scan URLs for malware.</li></ul>`,
    quiz: [
      Q("How many URLs can 7 base62 characters represent?", ["~62 million", "~3.5 trillion", "~1 billion", "~7 million"], 1, "62⁷ ≈ 3.52 × 10¹²."),
      Q("To collect click analytics on every redirect, return:", ["301 Moved Permanently", "302 Found", "404", "200 with HTML"], 1, "Browsers cache 301s and skip your server."),
      Q("Why use a unique id + base62 instead of random strings?", ["Prettier", "No collision checks needed", "More secure", "Shorter URLs always"], 1, "Unique ids map to unique codes."),
      Q("The system is read-heavy. Most important optimization?", ["Bigger write DB", "Caching hot short codes", "More analytics", "Longer codes"], 1, "A few links get most of the traffic."),
      Q("Why send click events to a queue instead of writing analytics synchronously?", ["Cheaper storage", "Keeps redirect latency low and decouples analytics", "Required by HTTP", "Better consistency"], 1, "Users shouldn't wait for analytics writes."),
    ],
    practice: [
      P("Design Pastebin", "medium", "Users paste text and get a link.", "Very similar to a URL shortener.", "Same id/base62 scheme; store content in object storage (S3) and metadata in a DB; CDN for popular pastes; expiry via TTL + cleanup job."),
      P("Distributed unique id generator", "hard", "Generate 10k unique ids/s across many servers.", "Snowflake.", "64-bit: timestamp (41) + machine id (10) + sequence (12). Sortable by time, no coordination."),
    ],
  });

  T({
    id: "news-feed", title: "Case Study: News Feed", icon: "📰", summary: "Fan-out on write vs read, the celebrity problem, ranking.",
    viz: "newsFeed",
    learn: `
<h2>Requirements</h2>
<p>Users post; followers see posts in a feed (reverse-chronological or ranked). Feed loads must be fast (&lt; 200 ms). Hundreds of millions of DAU, read-heavy.</p>
<h2>Core question: when do we build the feed?</h2>
<table><tr><th></th><th>Fan-out on write (push)</th><th>Fan-out on read (pull)</th></tr>
<tr><td>On post</td><td>Insert post id into every follower's feed cache</td><td>Just store the post</td></tr>
<tr><td>On read</td><td>Read one precomputed list</td><td>Fetch recent posts of everyone you follow and merge</td></tr>
<tr><td>Good</td><td>Very fast reads</td><td>Cheap writes, no wasted work for inactive users</td></tr>
<tr><td>Bad</td><td>Celebrity with 100M followers = 100M writes</td><td>Slow reads for users following many</td></tr></table>
<p><b>Hybrid:</b> push for normal users; for celebrities, pull their posts at read time and merge. Skip pushing to inactive users.</p>
<h2>Components</h2>
<ul><li>Post service + posts DB; media in object storage + CDN.</li>
<li>Social graph service (followers).</li>
<li>Fan-out workers consuming a queue.</li>
<li>Feed cache (Redis lists of post ids, capped length).</li>
<li>Ranking service (engagement predictions), pagination with cursors.</li></ul>`,
    quiz: [
      Q("Fan-out on write struggles most with:", ["Users with few followers", "Celebrities with millions of followers", "Image uploads", "Login"], 1, "One post triggers millions of writes."),
      Q("Fan-out on read makes which operation expensive?", ["Posting", "Loading the feed", "Following someone", "Deleting a post"], 1, "The feed must be assembled at read time."),
      Q("What do feed caches usually store?", ["Full post content with images", "Post ids (then hydrate)", "User passwords", "Raw HTML"], 1, "Ids are small; content is fetched in batches."),
      Q("Why process fan-out through a queue?", ["To reorder posts", "So posting returns instantly and work happens asynchronously", "It's required by Redis", "To encrypt posts"], 1, "Workers can scale and retry."),
    ],
    practice: [
      P("Design Twitter timeline", "hard", "Home timeline for 300M users.", "Hybrid fan-out.", "Push to followers' Redis timelines for normal accounts, pull for celebrities, merge + rank at read, cursor pagination, CDN for media."),
      P("Design Instagram", "hard", "Photos + feed + likes.", "Object storage + CDN + feed design.", "Upload to S3 via pre-signed URL, async thumbnails via queue, metadata in a sharded DB, feed with hybrid fan-out, likes counter with eventual consistency."),
    ],
  });

  T({
    id: "chat-system", title: "Case Study: Chat System", icon: "💬", summary: "WebSockets, presence, message storage, delivery receipts.",
    viz: "chatSystem",
    learn: `
<h2>Requirements</h2>
<p>1:1 and group chat, online presence, delivery/read receipts, message history, push notifications when offline. Low latency (&lt; 100 ms), messages must never be lost and should be ordered per conversation.</p>
<h2>Real-time transport</h2>
<table><tr><th>Option</th><th>How</th><th>Verdict</th></tr>
<tr><td>Short polling</td><td>Ask every few seconds</td><td>Wasteful, laggy</td></tr>
<tr><td>Long polling</td><td>Server holds the request until data arrives</td><td>OK fallback</td></tr>
<tr><td><b>WebSocket</b></td><td>Persistent two-way connection</td><td>✅ Standard choice</td></tr></table>
<h2>Key design points</h2>
<ul><li><b>Chat servers are stateful</b> (they hold sockets). A session registry (Redis) maps user → server.</li>
<li>Servers route messages to each other via pub/sub (Redis, Kafka).</li>
<li><b>Persist before delivering.</b> Store in a wide-column DB (Cassandra/HBase-style) partitioned by <code>conversation_id</code>, clustered by message id/time.</li>
<li>Message ids: time-sortable (Snowflake) for ordering within a conversation.</li>
<li>Receipts: sent ✓ (server stored) → delivered ✓✓ (device acked) → read (opened).</li>
<li>Offline users: push notification (APNs/FCM); on reconnect, sync from the last seen message id.</li>
<li>Groups: fan out to members' servers; for huge groups/channels, pull instead.</li>
<li>Presence: heartbeats every ~30 s; mark offline after missed beats; only broadcast to friends who are online.</li></ul>`,
    quiz: [
      Q("Best transport for real-time chat:", ["SMTP", "WebSocket", "Short polling every minute", "FTP"], 1, "Persistent, bidirectional, low overhead."),
      Q("How does server 1 know where to deliver Bob's message?", ["Broadcast to every server", "Session/presence registry maps user → server", "DNS", "It can't"], 1, "Then route via pub/sub."),
      Q("Message history is usually stored partitioned by:", ["Message length", "Conversation id", "Sender's country", "Random"], 1, "Fetching a conversation's history becomes one partition scan."),
      Q("Bob is offline when Alice messages. What should happen?", ["Drop the message", "Store it and send a push notification", "Retry every second forever", "Email Alice"], 1, "Bob syncs on reconnect."),
      Q("How is online presence typically detected?", ["Users click 'I'm online'", "Periodic heartbeats over the connection", "IP geolocation", "Database triggers"], 1, "Missing heartbeats → offline."),
    ],
    practice: [
      P("Design WhatsApp", "hard", "1:1 + groups, 2B users, end-to-end encryption.", "WebSockets + registry + store-and-forward.", "As in Learn; E2E encryption (Signal protocol) means the server only stores ciphertext; media via object storage + CDN with encrypted blobs."),
      P("Design a live comment system for a stream", "medium", "1M viewers on one stream.", "Fan-out and sampling.", "Pub/sub per stream, edge servers hold sockets, batch messages every ~200 ms, sample/rate-limit when volume is huge."),
    ],
  });
})();
