/* More system design topics (consensus, transactions, auth, observability, storage engines, three case studies)
   plus extra design exercises for the original topics */
(function () {
  const Q = (q, options, answer, explain) => ({ q, options, answer, explain });
  const P = (name, diff, desc, hint, sol) => ({ name, diff, desc, hint, sol });
  // Concept topics go before the first case study; case studies go at the end of the track
  const T = (t) => { const i = L.topics.findIndex((x) => x.id === "url-shortener"); L.topics.splice(i < 0 ? L.topics.length : i, 0, { track: "sd", ...t }); };
  const CASE = (t) => L.topics.push({ track: "sd", ...t });

  T({
    id: "consensus", title: "Consensus & Leader Election (Raft)", icon: "🗳️", summary: "How a cluster agrees on one history even when machines crash.",
    viz: "raft",
    learn: `
<p>Replication keeps copies of data on several machines. <b>Consensus</b> is how those machines agree on a single sequence of changes, so that losing a machine loses neither data nor consistency. It is what sits underneath "who is the leader?", distributed locks and configuration stores.</p>
<h2>Why it is hard</h2>
<p>Messages can be delayed, lost or reordered; machines crash and come back with old state; and nobody can tell a dead node from a slow one. If two nodes both believe they are the leader (<b>split brain</b>) they can accept conflicting writes.</p>
<h2>Quorums</h2>
<p>The key idea: require a <b>majority</b> (quorum) for every decision. Any two majorities share at least one node, so two conflicting decisions can never both win.</p>
<table><tr><th>Cluster size</th><th>Majority</th><th>Failures tolerated</th></tr>
<tr><td>3</td><td>2</td><td>1</td></tr><tr><td>5</td><td>3</td><td>2</td></tr><tr><td>7</td><td>4</td><td>3</td></tr></table>
<p>A cluster of 2f + 1 nodes survives f failures. Even sizes add cost without adding tolerance (4 nodes still tolerate only 1), so clusters are odd-sized.</p>
<h2>Raft in three parts</h2>
<ol><li><b>Leader election.</b> Time is divided into numbered <b>terms</b>. Followers expect regular heartbeats from the leader. If one times out (the timeouts are randomized), it becomes a <b>candidate</b>, increments the term and asks for votes. Each node votes once per term; a majority wins.</li>
<li><b>Log replication.</b> All writes go to the leader, which appends them to its log and sends them to the followers. Once an entry is stored on a majority it is <b>committed</b>: applied to the state machine and acknowledged to the client.</li>
<li><b>Safety.</b> A node only votes for a candidate whose log is at least as up to date as its own, so a new leader always has every committed entry. Uncommitted entries from an old leader may be overwritten.</li></ol>
<pre>client → leader:  append "x=5"
leader → followers: AppendEntries(term, entry)
followers → leader: ack
leader: stored on 3 of 5 → COMMIT → reply OK to the client</pre>
<h2>What you give up</h2>
<ul><li>If no majority is reachable, the cluster <b>stops accepting writes</b>. Consensus chooses consistency over availability (CP in CAP terms).</li>
<li>Every write costs a network round trip to a majority, so throughput is modest. Use consensus for small, critical data (metadata, leader leases, config), not for bulk data.</li></ul>
<h2>Where you meet it</h2>
<table><tr><th>System</th><th>Protocol</th><th>Used for</th></tr>
<tr><td>etcd, Consul</td><td>Raft</td><td>Kubernetes state, service discovery, locks</td></tr>
<tr><td>ZooKeeper</td><td>ZAB</td><td>Coordination for Kafka (older versions), HBase</td></tr>
<tr><td>Kafka (KRaft), CockroachDB, TiKV</td><td>Raft</td><td>Metadata; one Raft group per data range</td></tr>
<tr><td>Google Spanner, Chubby</td><td>Paxos</td><td>Replicated databases and locks</td></tr></table>
<div class="callout tip">In an interview you rarely implement Raft. Say "store it in etcd / ZooKeeper" for leader election and locks, and explain the majority rule. Mention <b>fencing tokens</b>: a monotonically increasing number with each lock or lease, so a paused old leader's late writes are rejected.</div>`,
    quiz: [
      Q("A 5-node Raft cluster can keep working after how many node failures?", ["1", "2", "3", "4"], 1, "It needs a majority of 3, so it tolerates 2 failures."),
      Q("Why must decisions be made by a majority?", ["It is faster", "Any two majorities overlap, so conflicting decisions can't both succeed", "To save storage", "To balance load"], 1, "The overlapping node prevents split brain."),
      Q("An entry in Raft is 'committed' when:", ["The leader receives it", "It is stored on a majority of nodes", "Every node has it", "The client sends it twice"], 1, "From then on it survives any minority of failures."),
      Q("Only 2 of 5 nodes can talk to each other. They:", ["Elect a leader and continue", "Cannot elect a leader and refuse writes", "Merge later automatically", "Delete their logs"], 1, "No majority → no progress. Consistency is preferred over availability."),
      Q("Why are consensus clusters usually odd-sized?", ["Odd numbers are faster", "An even size adds a node without tolerating more failures", "Even sizes are impossible", "For load balancing"], 1, "4 nodes need 3 for a majority and still tolerate just 1 failure, like 3 nodes."),
    ],
    practice: [
      P("Leader election for a scheduler", "medium", "You run 3 copies of a cron scheduler but each job must run once.", "Only one copy should be active.", "Each instance tries to acquire a lease in etcd / ZooKeeper (a key with a TTL). The holder is the leader and renews the lease; if it dies the lease expires and another takes over. Pass a fencing token with each job run so a paused ex-leader can't act."),
      P("Why not 2 nodes?", "easy", "A colleague proposes a 2-node cluster 'for redundancy'. What's the problem?", "What is the majority of 2?", "Majority of 2 is 2: if either node fails, the cluster can't make progress. It is less available than a single node. Use 3 (tolerates 1) or 5 (tolerates 2)."),
      P("Distributed lock safety", "hard", "A worker takes a lock with a 10 s TTL, then pauses for 15 s (GC). What goes wrong, and the fix?", "Two holders at once.", "The lock expires, another worker takes it, then the first wakes up and writes: both believe they hold the lock. Fix: the lock service issues an increasing fencing token; the storage layer rejects writes carrying a token lower than the highest it has seen."),
    ],
  });

  T({
    id: "distributed-transactions", title: "Distributed Transactions: 2PC, Sagas & Outbox", icon: "🧾", summary: "Keeping several services or databases consistent without one big transaction.",
    viz: "saga",
    learn: `
<p>Inside one database a transaction is easy: <code>BEGIN … COMMIT</code> and you get atomicity. Once an operation spans <b>several services, each with its own database</b>, there is no shared commit. Placing an order must charge a card, reserve stock and create a shipment: what if step 2 fails after step 1 succeeded?</p>
<h2>Option 1: two-phase commit (2PC)</h2>
<ol><li><b>Prepare:</b> a coordinator asks every participant "can you commit?". Each one does the work, holds its locks, and votes yes or no.</li>
<li><b>Commit:</b> if everyone voted yes the coordinator says "commit"; otherwise "abort".</li></ol>
<p>It gives real atomicity, but: participants hold locks for the whole protocol, throughput is low, and if the coordinator crashes after "prepare" the participants are <b>blocked</b>, unable to commit or abort on their own. It also requires every participant to support it. Used inside databases (distributed SQL), rarely across microservices.</p>
<h2>Option 2: sagas</h2>
<p>Break the operation into a sequence of <b>local transactions</b>. Each service commits its own step and triggers the next. If a step fails, run <b>compensating transactions</b> to undo the earlier steps in reverse order.</p>
<pre>T1 charge card      →  C1 refund
T2 reserve stock    →  C2 release stock
T3 create shipment  →  (pivot: can't be undone, so do it last)</pre>
<table><tr><th>Style</th><th>How</th><th>Trade-off</th></tr>
<tr><td><b>Orchestration</b></td><td>A central coordinator tells each service what to do and tracks the state</td><td>Easy to follow and monitor; the orchestrator is one more component</td></tr>
<tr><td><b>Choreography</b></td><td>Services react to each other's events; no coordinator</td><td>Loosely coupled; the overall flow is hard to see and debug</td></tr></table>
<p>Sagas give <b>eventual consistency</b>, not isolation: between steps, other requests can see half-finished state (money taken, order not yet confirmed). Model it explicitly with states such as PENDING.</p>
<h2>The dual-write problem and the outbox pattern</h2>
<p>A service must update its database <b>and</b> publish an event. Doing them as two separate calls means a crash in between loses the event or publishes one for a change that rolled back.</p>
<pre>BEGIN;
  UPDATE orders SET status = 'PAID' WHERE id = 42;
  INSERT INTO outbox (event) VALUES ('{"type":"OrderPaid","id":42}');
COMMIT;
-- a separate relay reads the outbox table (or the DB's change log) and publishes to the broker</pre>
<p>The event is written in the <b>same local transaction</b> as the data, so either both happen or neither.</p>
<h2>Idempotency makes retries safe</h2>
<p>Networks deliver <b>at least once</b>, so every step and every consumer must tolerate duplicates: carry an <b>idempotency key</b> (or event id), store which keys were processed, and ignore repeats. "Exactly-once" in practice means at-least-once delivery + idempotent processing.</p>
<div class="callout tip">Best fix of all: avoid the distributed transaction. Keep data that must change together in the same service and database.</div>`,
    quiz: [
      Q("The main weakness of two-phase commit is:", ["It is not atomic", "Participants hold locks and block if the coordinator fails", "It needs no coordinator", "It only works for reads"], 1, "Blocking and low throughput are why it is avoided across services."),
      Q("In a saga, when step 3 fails, steps 1 and 2 are:", ["Rolled back by the database", "Undone by compensating transactions", "Left as they are", "Retried forever"], 1, "They already committed locally; you must run explicit undo actions."),
      Q("The outbox pattern solves:", ["Slow queries", "Atomically updating the database and publishing an event", "Load balancing", "Password storage"], 1, "The event row is written in the same local transaction as the data."),
      Q("Message brokers usually guarantee at-least-once delivery. Consumers therefore must be:", ["Stateless", "Idempotent", "Single-threaded", "Synchronous"], 1, "Processing the same message twice must have the same effect as once."),
      Q("Sagas provide:", ["Full isolation", "Eventual consistency without isolation", "Linearizability", "No consistency"], 1, "Intermediate states are visible to others."),
    ],
    practice: [
      P("Design a travel booking saga", "medium", "Book a flight, a hotel and a car as one trip.", "Define each step and its compensation.", "Orchestrated saga: reserve flight → reserve hotel → reserve car → charge. Compensations: cancel car, cancel hotel, cancel flight. Use reservations with expiry rather than final bookings, and put the non-reversible step (charge / ticketing) last."),
      P("Fix the dual write", "medium", "A service saves an order, then calls kafka.send(). Sometimes orders exist with no event. Fix it.", "Make both writes one atomic step.", "Transactional outbox: insert the event into an outbox table in the same transaction; a relay (polling, or change data capture such as Debezium) publishes it. Consumers dedupe by event id because the relay may send twice."),
      P("Exactly-once money transfer", "hard", "Transfer $100 between accounts held in two different services. No double debit, no lost credit.", "Idempotency + a state machine.", "Create a transfer record with a unique id (PENDING). Debit A using the transfer id as idempotency key → publish via outbox → credit B idempotently by the same id → mark COMPLETED. If the credit can't succeed, compensate by re-crediting A. A reconciliation job checks for stuck transfers."),
    ],
  });

  T({
    id: "auth-security", title: "Authentication, Authorization & Security", icon: "🔐", summary: "Sessions vs JWTs, OAuth 2.0 / OIDC, password storage and the basics of securing an API.",
    viz: "authFlow",
    learn: `
<p><b>Authentication</b> (authn): who are you? <b>Authorization</b> (authz): what are you allowed to do? Mixing them up is the source of many breaches: a logged-in user is not automatically allowed to read <i>someone else's</i> order.</p>
<h2>Storing passwords</h2>
<ul><li>Never store them in plain text, never with a fast hash such as MD5 or SHA-256.</li>
<li>Use a slow, salted password hash: <b>argon2id</b>, <b>bcrypt</b> or <b>scrypt</b>. The salt defeats precomputed tables; the slowness makes guessing expensive.</li>
<li>Add <b>MFA</b> (TOTP, push, passkeys) and rate-limit login attempts.</li></ul>
<h2>Keeping a user logged in</h2>
<table><tr><th></th><th>Server-side session</th><th>JWT (stateless token)</th></tr>
<tr><td>What the client holds</td><td>A random session id (in a cookie)</td><td>A signed token containing the claims (user id, roles, expiry)</td></tr>
<tr><td>Server check</td><td>Look the id up in a session store (Redis)</td><td>Verify the signature locally: no lookup</td></tr>
<tr><td>Revocation</td><td>Easy: delete the session</td><td>Hard: valid until it expires</td></tr>
<tr><td>Fits</td><td>Classic web apps</td><td>APIs and many services behind a gateway</td></tr></table>
<p>The usual compromise: a <b>short-lived access token</b> (5–15 minutes, JWT) plus a <b>long-lived refresh token</b> that is stored server-side, rotated on use and revocable.</p>
<pre>JWT = base64(header) . base64(payload) . signature
payload: { "sub": "user_42", "scope": "orders:read", "exp": 1767225600, "iss": "https://auth.example.com" }</pre>
<div class="callout warn">A JWT is <b>signed, not encrypted</b>: anyone can read the payload. Never put secrets in it. Always verify the signature, <code>exp</code>, issuer and audience, and pin the allowed algorithm.</div>
<h2>OAuth 2.0 and OpenID Connect</h2>
<p><b>OAuth 2.0</b> lets a user grant an app limited access to their data on another service <b>without sharing the password</b>. <b>OpenID Connect</b> adds identity on top (an ID token saying who logged in): this is "Sign in with Google".</p>
<ol><li>The app redirects the user to the authorization server.</li>
<li>The user logs in <i>there</i> and approves the requested scopes.</li>
<li>The app receives a one-time <b>authorization code</b> and exchanges it (with <b>PKCE</b>) for tokens.</li>
<li>The app calls APIs with the access token.</li></ol>
<p>Service-to-service calls use the <b>client credentials</b> flow or mutual TLS.</p>
<h2>Authorization models</h2>
<ul><li><b>RBAC</b>: roles (admin, editor, viewer) carry permissions.</li>
<li><b>ABAC / policies</b>: rules over attributes ("managers can approve expenses under $1,000 in their own department").</li>
<li>Always check <b>ownership</b> on the server: <code>WHERE id = ? AND owner_id = current_user</code>. Skipping it is the #1 API vulnerability (broken object-level authorization).</li></ul>
<h2>Security checklist for any design</h2>
<ul><li><b>TLS everywhere</b>, including between internal services; encrypt sensitive data at rest.</li>
<li><b>Validate input</b>; use parameterized queries (SQL injection); escape output (XSS).</li>
<li>Cookies: <code>HttpOnly</code>, <code>Secure</code>, <code>SameSite</code>; CSRF protection for cookie-based auth.</li>
<li><b>Least privilege</b> for users, services and database accounts.</li>
<li>Secrets in a secret manager, never in code or images; rotate them.</li>
<li>Rate limiting, audit logs, and alerts on unusual access.</li></ul>`,
    quiz: [
      Q("Authentication answers ___; authorization answers ___.", ["'What can you do?'; 'Who are you?'", "'Who are you?'; 'What can you do?'", "Both the same question", "'Where are you?'; 'When?'"], 1, "Authn = identity, authz = permissions."),
      Q("How should passwords be stored?", ["Encrypted with AES", "Hashed with SHA-256", "Hashed with a slow, salted algorithm such as argon2 or bcrypt", "In plain text in a private table"], 2, "Fast hashes can be brute-forced; the salt and work factor are essential."),
      Q("A drawback of stateless JWT access tokens is:", ["They need a database lookup per request", "They are hard to revoke before they expire", "They can't carry a user id", "They are always encrypted"], 1, "That is why they are kept short-lived and paired with refresh tokens."),
      Q("OAuth 2.0 lets a third-party app:", ["Learn the user's password", "Get limited, delegated access without the user's password", "Bypass the API", "Skip TLS"], 1, "The user logs in at the provider and the app receives tokens with scopes."),
      Q("A logged-in user changes /orders/1001 to /orders/1002 and sees another customer's order. The bug is:", ["Missing authentication", "Missing authorization (ownership) check", "A weak password hash", "No TLS"], 1, "The user is authenticated, but the server never checked that the object belongs to them."),
    ],
    practice: [
      P("Design login for a web + mobile app", "medium", "Users log in on web and mobile; 20 backend services need to know who is calling.", "Where is the token verified?", "An auth service issues a short-lived JWT access token (10 min) + a rotating refresh token stored server-side. The API gateway verifies the JWT signature with the auth service's public keys and forwards the user id and scopes; services enforce authorization. Web keeps tokens in HttpOnly cookies; mobile in the secure keystore."),
      P("Instant logout everywhere", "medium", "A stolen phone must lose access immediately, but your access tokens are valid for 15 minutes.", "What can you revoke?", "Revoke the device's refresh token (so no new access tokens), and for the remaining minutes keep a small denylist of revoked token ids or a per-user 'tokens valid after' timestamp in Redis that the gateway checks. Shorter access-token lifetimes shrink the window."),
      P("Secure a public API for partners", "hard", "Third-party developers will call your API on behalf of your users.", "Don't hand out passwords or permanent keys.", "OAuth 2.0 authorization code + PKCE with fine-grained scopes; per-client rate limits and quotas; signed webhooks; object-level authorization on every endpoint; audit logs; the ability to revoke a client or a single grant."),
    ],
  });

  T({
    id: "observability", title: "Observability: Metrics, Logs, Traces & SLOs", icon: "🔭", summary: "Knowing what your system is doing in production, and deciding when to wake someone up.",
    viz: "percentiles",
    learn: `
<p>You can't fix what you can't see. <b>Monitoring</b> tells you <i>that</i> something is wrong; <b>observability</b> lets you ask <i>why</i>, including questions you didn't plan for.</p>
<h2>The three pillars</h2>
<table><tr><th>Signal</th><th>What it is</th><th>Good for</th><th>Cost</th></tr>
<tr><td><b>Metrics</b></td><td>Numbers over time (request rate, error rate, CPU)</td><td>Dashboards, alerts, trends</td><td>Cheap; fixed size regardless of traffic</td></tr>
<tr><td><b>Logs</b></td><td>Timestamped event records</td><td>Detail about one specific event</td><td>Grows with traffic; sample or tier them</td></tr>
<tr><td><b>Traces</b></td><td>One request's path through every service, as timed spans</td><td>Finding <i>which</i> service made a request slow</td><td>Usually sampled (e.g. 1%)</td></tr></table>
<p>Tie them together with a <b>trace / correlation id</b> generated at the edge and passed in every call and every log line. Emit <b>structured</b> logs (JSON), not free text.</p>
<h2>What to measure</h2>
<ul><li><b>Four golden signals</b> (user-facing services): <b>latency, traffic, errors, saturation</b>.</li>
<li><b>RED</b> per service: Rate, Errors, Duration. <b>USE</b> per resource: Utilization, Saturation, Errors.</li></ul>
<h2>Percentiles, not averages</h2>
<p>If 99 requests take 50 ms and one takes 5 s, the average is ~100 ms and describes nobody's experience. Use percentiles:</p>
<ul><li><b>p50</b>: the typical request. <b>p95 / p99</b>: the slow tail.</li>
<li>Tails matter more than they look: a page that makes 50 backend calls hits at least one p99-slow call about 40% of the time.</li></ul>
<h2>SLI, SLO, SLA and the error budget</h2>
<table><tr><th>Term</th><th>Meaning</th><th>Example</th></tr>
<tr><td><b>SLI</b></td><td>The measurement</td><td>% of requests answered correctly in under 300 ms</td></tr>
<tr><td><b>SLO</b></td><td>Your internal target for it</td><td>99.9% over 30 days</td></tr>
<tr><td><b>SLA</b></td><td>A contract with consequences</td><td>99.5%, or the customer gets credits</td></tr></table>
<p>The <b>error budget</b> is what the SLO lets you spend: 99.9% over 30 days allows about 43 minutes of failure. Budget left → ship features faster. Budget gone → freeze risky changes and fix reliability. It turns "how reliable is reliable enough?" into a number.</p>
<h2>Alerting</h2>
<ul><li>Alert on <b>symptoms users feel</b> (error rate, latency, error-budget burn), not on every cause (CPU at 80%).</li>
<li>Every page must be <b>urgent and actionable</b>; everything else is a ticket or a dashboard. Alert fatigue makes people ignore real incidents.</li></ul>
<h2>Typical stack</h2>
<p>Instrument with <b>OpenTelemetry</b> → metrics in Prometheus (dashboards in Grafana) → logs in Elasticsearch / Loki → traces in Jaeger / Tempo. Add health checks, synthetic probes and a clear on-call rotation with blameless postmortems.</p>
<div class="callout tip">In the visualizer: push "slow dependency" to 5% and compare the mean, the median and p99. Then tighten the SLO and watch the error budget go negative.</div>`,
    quiz: [
      Q("Which signal best shows which service made one request slow?", ["Metrics", "Logs", "A distributed trace", "CPU graphs"], 2, "A trace shows the timed spans of that request across services."),
      Q("Why prefer p99 latency over the average?", ["It is easier to compute", "The average hides the slow tail that real users hit", "It is always smaller", "Averages are illegal"], 1, "A few very slow requests barely move the mean but ruin some users' experience."),
      Q("An SLO of 99.9% availability over 30 days allows roughly:", ["4 seconds of downtime", "43 minutes", "7 hours", "3 days"], 1, "0.1% of 43,200 minutes ≈ 43 minutes."),
      Q("The four golden signals are:", ["CPU, RAM, disk, network", "Latency, traffic, errors, saturation", "Logs, metrics, traces, alerts", "Read, write, update, delete"], 1, "From Google's SRE practice."),
      Q("A good page-worthy alert is one that is:", ["Triggered by any CPU spike", "Urgent, actionable and tied to user impact", "Sent to everyone", "Based on averages only"], 1, "Otherwise people learn to ignore pages."),
    ],
    practice: [
      P("Define SLOs for a checkout API", "medium", "What would you measure and promise?", "Pick SLIs users feel.", "Availability SLI: % of requests returning non-5xx. Latency SLI: % under 500 ms. SLOs: 99.95% and 99% over 30 days, measured at the load balancer. Alert on fast error-budget burn (e.g. 2% of the monthly budget in 1 hour), not on raw CPU."),
      P("Debug a slow endpoint", "medium", "p99 for /search went from 300 ms to 3 s after a deploy. How do you investigate?", "Go from broad to narrow.", "Dashboard: when did it start, which instances / regions? Compare with the deploy time. Open traces for slow requests to find the slow span (a new N+1 query, a cold cache, a downstream call). Check logs for that span's trace id. Roll back first if users are affected, diagnose after."),
      P("Tame logging costs", "hard", "Log volume is 5 TB/day and the bill is out of control.", "Not every line deserves the same treatment.", "Structured logs with levels; drop DEBUG in production; sample high-volume success logs (keep all errors); turn repeated events into metrics; short retention in hot storage and cheap object storage for the rest; keep trace ids so sampled data can still be joined."),
    ],
  });

  T({
    id: "storage-engines", title: "Storage Engines: B-Trees, LSM Trees & Indexes", icon: "💽", summary: "What a database does on disk, and why some are built for reads and others for writes.",
    viz: "lsm",
    learn: `
<p>Under the SQL or key-value API, every database has a <b>storage engine</b> that decides how bytes are laid out on disk. Two designs dominate, and knowing them explains most database trade-offs.</p>
<h2>First, the write-ahead log</h2>
<p>Almost every engine appends each change to a <b>write-ahead log (WAL)</b> before applying it. Appending is sequential and fast; after a crash the log is replayed. This is what makes a committed write <b>durable</b>.</p>
<h2>B-tree: update in place</h2>
<p>A balanced tree of fixed-size <b>pages</b> (4–16 KB). Each page holds sorted keys and pointers to child pages; with hundreds of keys per page, a table of billions of rows is only 3–4 levels deep.</p>
<ul><li><b>Read:</b> walk from the root to a leaf: O(log n), a handful of page reads. Range scans follow the leaves in order.</li>
<li><b>Write:</b> find the leaf and modify the page in place (random I/O); a full page splits in two.</li></ul>
<p>Used by PostgreSQL, MySQL (InnoDB), SQL Server, Oracle, SQLite.</p>
<h2>LSM tree: never modify, always append</h2>
<ol><li>Writes go to an in-memory sorted structure, the <b>memtable</b> (plus the WAL).</li>
<li>When it fills up it is flushed to disk as an immutable sorted file, an <b>SSTable</b>.</li>
<li>Background <b>compaction</b> merges SSTables, discarding overwritten values and deleted keys (<b>tombstones</b>).</li>
<li>Reads check the memtable, then SSTables from newest to oldest. A <b>Bloom filter</b> per file skips files that can't contain the key.</li></ol>
<p>Used by RocksDB, LevelDB, Cassandra, HBase, ScyllaDB, and many newer databases.</p>
<h2>The trade-off</h2>
<table><tr><th></th><th>B-tree</th><th>LSM tree</th></tr>
<tr><td>Writes</td><td>Random I/O, in place</td><td><b>Sequential, very fast</b></td></tr>
<tr><td>Point reads</td><td><b>Predictable, one path</b></td><td>May check several files</td></tr>
<tr><td>Range scans</td><td><b>Good</b></td><td>Good, merging several files</td></tr>
<tr><td>Space</td><td>Fragmentation, half-full pages</td><td><b>Compact, compresses well</b></td></tr>
<tr><td>Background work</td><td>Little</td><td>Compaction can cause latency spikes</td></tr>
<tr><td>Choose for</td><td>Read-heavy, transactional workloads</td><td>Write-heavy: logs, events, time series, metrics</td></tr></table>
<h2>Indexes</h2>
<p>An <b>index</b> is an extra structure (usually a B-tree) that maps column values to rows so the database doesn't scan the whole table.</p>
<ul><li>Every index <b>speeds up reads and slows down writes</b> (it must be updated too) and takes space.</li>
<li><b>Composite index</b> (a, b, c): usable for queries on a, on (a, b), on (a, b, c): the <b>leftmost-prefix rule</b>. Not for b alone.</li>
<li><b>Covering index</b>: contains every column the query needs, so the table itself is never read.</li>
<li><b>Clustered index</b>: the table rows are stored in index order (the primary key in InnoDB).</li></ul>
<h2>Row vs column storage</h2>
<p><b>Row stores</b> keep each row together: ideal for transactions (OLTP) that read or write whole rows. <b>Column stores</b> (Parquet, ClickHouse, BigQuery, Redshift) keep each column together: analytics (OLAP) that aggregate a few columns over billions of rows read far less data and compress it 10× or more.</p>
<div class="callout tip">In the visualizer: do several puts to trigger flushes, overwrite a key, read it (newest wins), delete it (a tombstone), then compact.</div>`,
    quiz: [
      Q("Why are LSM trees fast for writes?", ["They skip durability", "Writes are sequential: memory first, then whole sorted files", "They have no index", "They store less data"], 1, "No random in-place page updates."),
      Q("In an LSM tree, deleting a key:", ["Removes it from every file immediately", "Writes a tombstone that compaction later cleans up", "Is impossible", "Rewrites the newest SSTable"], 1, "SSTables are immutable, so the delete is itself a write."),
      Q("The write-ahead log exists to:", ["Speed up reads", "Make committed writes survive a crash", "Compress data", "Balance the tree"], 1, "Changes are appended to the log first and replayed on recovery."),
      Q("An index on (country, city) can efficiently serve a query filtering on:", ["city only", "country, or country and city", "Any column", "Neither"], 1, "The leftmost-prefix rule."),
      Q("For analytics that sum one column over a billion rows, the better layout is:", ["Row-oriented", "Column-oriented", "A linked list", "A hash table"], 1, "Only that column is read, and it compresses very well."),
    ],
    practice: [
      P("Pick an engine", "medium", "(a) A banking ledger with many point lookups and transactions. (b) Ingesting 200k sensor readings per second.", "Read-optimized vs write-optimized.", "(a) A B-tree relational database (PostgreSQL / InnoDB): predictable reads, mature transactions. (b) An LSM-based store (Cassandra, RocksDB, a time-series DB): sequential writes, good compression, TTL-based expiry."),
      P("Index for a query", "medium", "SELECT * FROM orders WHERE user_id = ? AND status = 'OPEN' ORDER BY created_at DESC LIMIT 20 is slow on 500M rows.", "Equality columns first, then the sort column.", "Composite index (user_id, status, created_at DESC): the database jumps to the user's open orders already in order and reads 20 entries. Selecting only indexed columns makes it covering."),
      P("Too many indexes", "hard", "Inserts into a table with 12 indexes have become slow. What do you do?", "Each index is an extra write.", "Find unused and duplicate indexes with the database's index-usage statistics and drop them; merge overlapping ones into a composite index; consider batching inserts. For a truly write-heavy workload, reconsider the engine (LSM)."),
    ],
  });

  CASE({
    id: "video-streaming", title: "Case Study: Video Streaming", icon: "🎬", summary: "Design YouTube / Netflix: uploads, transcoding, CDN delivery and adaptive bitrate.",
    viz: "videoStreaming",
    learn: `
<h2>1. Requirements</h2>
<ul><li><b>Functional:</b> upload a video; watch it on any device and network; search and browse.</li>
<li><b>Non-functional:</b> fast start (under ~2 s), no buffering, high availability, global audience, cost-efficient bandwidth. Reads ≫ writes (roughly 1 upload per hundreds of views).</li></ul>
<h2>2. Estimates</h2>
<p>Say 1 B daily views averaging 5 minutes at ~2 Mbps: about 75 MB per view → ~75 PB of egress per day. Uploads: 500 hours per minute of raw video, each stored in several renditions. <b>Bandwidth and storage dominate</b>; the metadata is tiny by comparison.</p>
<h2>3. Upload path (write)</h2>
<ol><li>The client requests an upload; the service returns <b>pre-signed URLs</b> so chunks go straight to object storage, resumably.</li>
<li>On completion an event lands on a <b>queue</b>.</li>
<li><b>Transcoding workers</b> split the video into short segments (2–10 s) and encode each at several resolutions/bitrates and codecs (H.264, VP9, AV1). The work is a DAG of parallel tasks: split → encode → thumbnails → captions → assemble.</li>
<li>Segments and a <b>manifest</b> are stored; the video is marked ready.</li></ol>
<h2>4. Watch path (read)</h2>
<p><b>Adaptive bitrate streaming</b> (HLS / DASH): the player downloads the manifest listing every quality level, then fetches segments one by one over plain HTTP, choosing a quality for each based on measured throughput and buffer level. A slow network gets lower quality instead of a spinner.</p>
<pre>manifest.m3u8
  240p/seg_001.ts   400 kbps
  720p/seg_001.ts   2.5 Mbps
  1080p/seg_001.ts  5 Mbps</pre>
<p>Segments are static files, so a <b>CDN</b> serves nearly all of them from edges near the viewer.</p>
<h2>5. Data</h2>
<ul><li><b>Blobs</b> (raw + encoded): object storage, tiered (hot / cold).</li>
<li><b>Metadata</b> (titles, channels): relational or wide-column DB, cached heavily.</li>
<li><b>View counts, likes</b>: counted asynchronously through a stream and aggregated; approximate in real time, exact later.</li>
<li><b>Search</b>: a search index fed from the metadata.</li></ul>
<h2>6. Deep dives</h2>
<ul><li><b>Popularity is extremely skewed:</b> a small share of videos gets most views. Pre-position popular content at the edges; encode rarely watched videos in fewer renditions.</li>
<li><b>Fast start:</b> begin with a low bitrate and short first segments; preload the manifest and first segment.</li>
<li><b>Failures in transcoding:</b> idempotent, retryable tasks per segment; one failed segment doesn't redo the whole video.</li>
<li><b>Live streaming</b> uses the same segments with a tiny delay: latency vs stability trade-off.</li>
<li><b>Protection:</b> signed URLs with expiry, DRM for licensed content.</li></ul>`,
    quiz: [
      Q("Why is a video split into small segments at several bitrates?", ["To save disk space", "So the player can switch quality per segment as the network changes", "To make upload faster", "For search indexing"], 1, "That is adaptive bitrate streaming."),
      Q("Who decides which quality to fetch next in HLS/DASH?", ["The CDN", "The origin server", "The player on the client", "The transcoder"], 2, "The client measures its own throughput and buffer."),
      Q("Uploads go directly to object storage with pre-signed URLs because:", ["It is more secure than TLS", "Huge files shouldn't flow through application servers", "Object storage can transcode", "It avoids the CDN"], 1, "App servers stay small and stateless."),
      Q("Transcoding is done asynchronously through a queue because:", ["It takes minutes and must absorb bursts and retries", "Queues are faster than CPUs", "Users must wait for it", "It needs strong consistency"], 0, "The upload returns immediately; processing happens in the background."),
      Q("The largest cost in a video platform is typically:", ["The metadata database", "Bandwidth and storage for video bytes", "Search", "Authentication"], 1, "Which is why CDN strategy and encoding efficiency matter so much."),
    ],
    practice: [
      P("Resume playback across devices", "medium", "A user pauses on the TV and continues on the phone at the same position.", "How often to save, and where?", "The player reports its position every ~10 s (and on pause) to a small service; store (user, video) → position in a key-value store, last write wins. Eventual consistency is fine. Batch the writes: it is a very high-volume, low-value signal."),
      P("View counter", "medium", "Show a view count that can handle a video with a million views per minute.", "Don't do UPDATE count = count + 1 per view.", "Emit a view event to a stream; aggregate in windows (stream processor) and add to the counter in batches; cache the displayed number. Dedupe / filter bots in the pipeline. Approximate now, exact after batch reconciliation."),
      P("Cut the CDN bill", "hard", "Bandwidth cost is growing faster than revenue. Options?", "Fewer bytes, cheaper bytes.", "Better codecs (AV1 / HEVC) and per-title encoding ladders; cap bitrate by device and screen size; multi-CDN with cost-aware routing; own caches inside ISPs for the top content; tier cold videos to cheaper storage with fewer renditions."),
    ],
  });

  CASE({
    id: "ride-sharing", title: "Case Study: Ride Sharing", icon: "🚕", summary: "Design Uber / Ola: live driver locations, geospatial search, matching and trips.",
    viz: "rideSharing",
    learn: `
<h2>1. Requirements</h2>
<ul><li><b>Functional:</b> riders request a trip; nearby drivers are matched; both see live location and ETA; fare and payment at the end.</li>
<li><b>Non-functional:</b> matching within seconds; location updates in near real time; a driver is never assigned to two trips; highly available in every city.</li></ul>
<h2>2. Estimates</h2>
<p>5 M active drivers each sending a location every 4 s → <b>1.25 M writes per second</b>. That number shapes the design: location updates are the heaviest load by far, and each one is small and soon obsolete.</p>
<h2>3. The core problem: "who is near me?"</h2>
<p>Scanning all drivers and computing distances is too slow. Use a <b>geospatial index</b> that divides the map into cells:</p>
<table><tr><th>Scheme</th><th>Idea</th></tr>
<tr><td><b>Geohash</b></td><td>Interleave latitude/longitude bits into a string; nearby points share a prefix. Simple; works with any key-value store or sorted set</td></tr>
<tr><td><b>Quadtree</b></td><td>Recursively split dense areas into four; adapts to city centres vs countryside</td></tr>
<tr><td><b>S2 / H3</b></td><td>Cells on a sphere (H3 uses hexagons: every neighbour is the same distance away)</td></tr></table>
<p>"Nearby drivers" = look up the rider's cell <b>and its neighbours</b> (a driver just across a cell border is still close), then rank by real ETA from a routing service.</p>
<h2>4. Storing locations</h2>
<ul><li>Keep only the <b>latest</b> position per driver in an in-memory store (e.g. Redis geo sets) with a TTL, sharded by city/region. Losing a few seconds of data on a crash is acceptable: the next update repairs it.</li>
<li>Send the raw stream to a log (Kafka) for trip history, analytics and ETA models.</li></ul>
<h2>5. Matching and trips</h2>
<ol><li>Rider requests → matching service queries the geo index.</li>
<li>Rank candidates by ETA and offer the trip to the best one; on reject or timeout, try the next.</li>
<li>On accept, create the trip and mark the driver busy in <b>one atomic operation</b> (a transaction or compare-and-set), so two riders can't get the same driver.</li></ol>
<p>The trip is a <b>state machine</b> (REQUESTED → MATCHED → ARRIVING → IN_PROGRESS → COMPLETED / CANCELLED) in a durable, strongly consistent database.</p>
<h2>6. Real-time communication</h2>
<p>Both apps hold a <b>persistent connection</b> (WebSocket or similar) to a gateway so the server can push "trip offered", "driver is 2 min away". The gateway tier is stateful: a registry maps user → gateway node.</p>
<h2>7. Deep dives</h2>
<ul><li><b>Different consistency for different data:</b> locations are AP (fast, lossy is fine); trips and payments are CP.</li>
<li><b>Surge pricing:</b> per cell, compare open requests with available drivers in a sliding window.</li>
<li><b>Hot spots:</b> a stadium at closing time overloads one cell. Use finer cells in dense areas and shard by cell, not just by city.</li>
<li><b>Regional isolation:</b> a city's traffic stays in a nearby region; an outage in one region must not stop others.</li>
<li><b>Unreliable mobile networks:</b> idempotent requests with client-generated ids; the app re-syncs trip state on reconnect.</li></ul>`,
    quiz: [
      Q("The heaviest write load in a ride-sharing system is:", ["Trip creation", "Driver location updates", "Payments", "Ratings"], 1, "Millions of drivers reporting every few seconds."),
      Q("To find nearby drivers efficiently, the system uses:", ["A full table scan with distance maths", "A geospatial index that buckets the map into cells", "A B-tree on driver name", "A Bloom filter"], 1, "Geohash, quadtree, S2 or H3."),
      Q("Why also search the neighbouring cells?", ["To add latency", "A close driver may be just across a cell boundary", "Cells are always empty", "For surge pricing"], 1, "Proximity doesn't respect grid lines."),
      Q("Assigning a driver to a trip must be atomic to prevent:", ["Slow ETAs", "The same driver being matched to two riders", "GPS drift", "Surge pricing"], 1, "Use a transaction or compare-and-set on the driver's status."),
      Q("Which data can tolerate eventual consistency and some loss?", ["Payment records", "Trip state", "The latest driver location", "The driver's assignment"], 2, "A new position arrives a few seconds later anyway."),
    ],
    practice: [
      P("Geohash lookup", "medium", "Implement 'drivers within ~1 km of a point' on top of a key-value store.", "Choose a cell size close to the radius.", "Store each driver under its 6-character geohash (~1.2 km × 0.6 km cells). Query the rider's cell plus its 8 neighbours, then filter by exact distance. On each location update, move the driver between cell sets if the cell changed."),
      P("ETA service", "hard", "Show an accurate arrival time for thousands of requests per second.", "Straight-line distance is not travel time.", "Model roads as a weighted graph; precompute (contraction hierarchies / partitioned shortest paths) so queries take milliseconds; weight edges with live traffic from the drivers' own location stream; correct the result with an ML model trained on real trips. Cache by (origin cell, destination cell, time bucket)."),
      P("Driver goes offline mid-trip", "medium", "The driver's phone loses signal in a tunnel for two minutes.", "The trip must survive.", "Trip state lives on the server, not the phone. Location entries expire by TTL but an IN_PROGRESS trip is not cancelled on missing heartbeats. The app buffers GPS points and uploads them on reconnect; the fare uses the reconstructed route. The rider's app shows the last known position."),
    ],
  });

  CASE({
    id: "payment-system", title: "Case Study: Payment System", icon: "💳", summary: "Design a payment service: idempotency, the ledger, external providers and reconciliation.",
    viz: "paymentSystem",
    learn: `
<h2>1. Requirements</h2>
<ul><li><b>Functional:</b> charge a customer for an order; refund; pay out to sellers; show payment status and history.</li>
<li><b>Non-functional:</b> <b>correctness above everything</b>: never charge twice, never lose a payment, every cent traceable. Then availability and auditability. Volume is modest (hundreds to thousands per second), so this is a consistency problem, not a scale problem.</li></ul>
<h2>2. The players</h2>
<p>You rarely move money yourself. A <b>payment service provider</b> (PSP: Stripe, Adyen, Razorpay…) talks to the card networks and banks. Card details go straight from the browser to the PSP (tokenization), so your servers never see card numbers and most of <b>PCI DSS</b> stays out of scope.</p>
<h2>3. Idempotency: the heart of the design</h2>
<p>The client sends "pay", the network times out. Did it work? The only safe move is to <b>retry</b>, so a retry must not charge again.</p>
<pre>POST /payments
Idempotency-Key: 7f3c9a1e-…        ← generated once per purchase by the client
{ "order_id": "o_981", "amount": 4999, "currency": "INR" }</pre>
<ul><li>The server stores the key with a unique constraint. First time: process and save the result. Same key again: return the saved result.</li>
<li>Pass the same key on to the PSP, which dedupes on its side too.</li>
<li>Amounts are <b>integers in minor units</b> (paise, cents) plus a currency. Never floating point.</li></ul>
<h2>4. Payment state machine</h2>
<pre>CREATED → PENDING → SUCCEEDED → (REFUNDED)
                  ↘ FAILED</pre>
<p>Persist every transition. An explicit PENDING state is what lets you recover from "we called the PSP and don't know what happened".</p>
<h2>5. The ledger</h2>
<p>The source of truth for money is an <b>append-only, double-entry ledger</b>: every movement is recorded as a debit to one account and an equal credit to another.</p>
<table><tr><th>Entry</th><th>Account</th><th>Debit</th><th>Credit</th></tr>
<tr><td>Customer pays ₹4,999</td><td>Cash at PSP</td><td>4,999</td><td></td></tr>
<tr><td></td><td>Seller payable</td><td></td><td>4,749</td></tr>
<tr><td></td><td>Platform fee revenue</td><td></td><td>250</td></tr></table>
<p>Debits always equal credits, so errors show up as an imbalance. Rows are never updated or deleted; a mistake is fixed by a new, opposite entry. Balances are derived from the entries.</p>
<h2>6. Asynchronous results: webhooks</h2>
<p>Many outcomes arrive later (3-D Secure, bank transfers, chargebacks). The PSP calls your <b>webhook</b>: verify its signature, dedupe by event id (delivery is at-least-once and can be out of order), then advance the state machine.</p>
<h2>7. Reconciliation: trust, but verify</h2>
<p>Every day, compare your ledger with the PSP's settlement report, line by line. Mismatches (a payment you think failed but the PSP captured) go to a queue for automatic or manual repair. However careful the online path is, reconciliation is what guarantees the books are right.</p>
<h2>8. Deep dives</h2>
<ul><li><b>Database:</b> a relational DB with ACID transactions and strong consistency; update the payment state and write ledger rows in one transaction.</li>
<li><b>Notifying other services:</b> the transactional outbox, so "payment succeeded" is published exactly when it is committed.</li>
<li><b>PSP outage:</b> timeouts, retries with backoff, circuit breaker, a second provider for failover.</li>
<li><b>Fraud:</b> risk scoring before authorization; velocity limits.</li>
<li><b>Security &amp; audit:</b> encryption, least privilege, immutable audit logs, separate duties for refunds.</li></ul>`,
    quiz: [
      Q("An idempotency key ensures that:", ["Payments are faster", "Retrying the same request does not charge the customer twice", "Card numbers are encrypted", "Refunds are automatic"], 1, "The server returns the stored result for a repeated key."),
      Q("Monetary amounts should be stored as:", ["Floating-point numbers", "Integers in the smallest currency unit, plus a currency code", "Strings with a currency symbol", "Rounded doubles"], 1, "Floats can't represent 0.1 exactly; rounding errors add up."),
      Q("In a double-entry ledger, a mistake is corrected by:", ["Editing the wrong row", "Deleting the row", "Adding a new compensating entry", "Restoring a backup"], 2, "The ledger is append-only, which keeps a complete audit trail."),
      Q("Webhook handlers must dedupe events because:", ["Webhooks are encrypted", "Providers deliver at least once and may resend", "Events are always in order", "It reduces latency"], 1, "Process each event id once."),
      Q("Reconciliation is:", ["Retrying failed payments immediately", "Comparing your records with the provider's settlement data to find mismatches", "Encrypting card data", "Load-testing the API"], 1, "The safety net behind every other mechanism."),
    ],
    practice: [
      P("Timeout from the provider", "medium", "You called the PSP's charge API and the request timed out. What now?", "You don't know whether the charge happened.", "Leave the payment PENDING. Retry the same call with the same idempotency key (safe), or query the PSP for the charge by your reference. Never create a new charge with a new key. A background job resolves payments stuck in PENDING; the webhook and reconciliation are further safety nets."),
      P("Design refunds", "medium", "Support full and partial refunds.", "It is a new money movement, not an edit.", "A refund is its own record linked to the payment, with its own idempotency key and state machine. Enforce sum(refunds) ≤ captured amount inside a transaction with a row lock. Post reversing ledger entries; never modify the original ones."),
      P("Wallet balance under concurrency", "hard", "Two requests spend from the same ₹100 wallet at the same moment, ₹80 each.", "Prevent the lost update.", "Do the check and the debit atomically: UPDATE wallets SET balance = balance − 80 WHERE id = ? AND balance >= 80 (check rows affected), or SELECT … FOR UPDATE, or optimistic locking with a version column. Append the ledger entry in the same transaction; one request succeeds and the other fails cleanly."),
    ],
  });

  /* ---------- Extra design exercises for the original topics ---------- */
  const more = (id, ...items) => { const t = L.topics.find((x) => x.id === id); if (t) t.practice.push(...items); };
  more("load-balancing", P("Zero-downtime deploys", "medium", "Roll out a new version to 50 servers behind a load balancer without dropping requests.", "Take servers out of rotation gracefully.", "Rolling deploy: mark a batch as draining (health check fails, LB stops sending new requests), wait for in-flight requests, upgrade, health-check, re-add. Or blue-green / canary: route 1% → 10% → 100% of traffic to the new fleet and roll back instantly on errors."));
  more("databases", P("Choose a shard key", "hard", "A multi-tenant SaaS has 10,000 customers; a few are 1,000× larger than the rest.", "Even distribution vs query locality.", "Shard by tenant_id so each tenant's queries hit one shard, but map tenants to shards through a lookup table so whales can get dedicated shards and tenants can be moved. Avoid cross-shard joins; use globally unique ids."));
  more("consistent-hashing", P("Uneven servers", "medium", "Your cache nodes have 16 GB, 32 GB and 64 GB of RAM. How do you spread keys fairly?", "Virtual nodes are a dial.", "Give each server virtual nodes in proportion to its capacity (e.g. 100 / 200 / 400). Load then follows capacity, and adding or removing a node still moves only about 1/N of the keys."));
  more("cap", P("Classify the feature", "medium", "For each, pick consistency or availability during a partition: (a) shopping cart, (b) seat booking, (c) like counter, (d) bank balance.", "What does a wrong answer cost?", "(a) Availability: merge carts later. (b) Consistency: no double-sold seats. (c) Availability: an approximate count is fine. (d) Consistency: never show or spend money that isn't there."));
  more("message-queues", P("Poison messages", "medium", "One malformed message makes a consumer crash and retry forever, blocking the queue.", "Limit the retries.", "Retry with backoff a limited number of times, then move the message to a dead-letter queue with the error attached, alert, and continue. Make the consumer idempotent so replays from the DLQ are safe after the fix."));
  more("rate-limiting", P("Distributed rate limiter", "hard", "Enforce 100 requests/min per API key across 20 gateway instances.", "Where does the counter live?", "A shared store (Redis) with an atomic script per request: sliding-window counter or token bucket keyed by API key. To save a network hop, let each instance hold a small local token allowance refilled from Redis. Return 429 with Retry-After."));
  more("networking-cdn", P("Invalidate a cached file", "medium", "You shipped a broken app.js that CDNs and browsers cache for a year.", "You can't reach into browsers.", "Use content-hashed filenames (app.3f9a1c.js) with long TTLs and a short-TTL index.html that references them: a new deploy is a new URL, so no invalidation is needed. For the incident: purge the CDN path and deploy a fixed build under a new name."));
  more("api-design", P("Paginate a huge list", "medium", "GET /orders returns millions of rows that change constantly.", "Offsets get slow and skip rows.", "Cursor (keyset) pagination: ORDER BY (created_at, id) and return an opaque next_cursor encoding the last row seen; the query uses WHERE (created_at, id) < cursor LIMIT n. Stable under inserts and fast at any depth."));
  more("reliability", P("Retry storm", "hard", "A brief database blip turned into a 30-minute outage because every client retried at once.", "Retries multiply load.", "Exponential backoff with jitter, a retry budget (e.g. at most 10% extra requests), timeouts shorter than the caller's, circuit breakers to fail fast, and load shedding at the server so it can recover."));
  more("url-shortener", P("Analytics for clicks", "medium", "Show clicks per link per day without slowing down redirects.", "Don't write to the main DB on the hot path.", "The redirect handler emits a click event to a queue and returns immediately; a stream job aggregates counts per (link, day) into an analytics store. The dashboard reads the aggregates."));
  more("news-feed", P("Ranked feed", "hard", "Move from a chronological feed to one ranked by relevance.", "Split into stages.", "Candidate generation (recent posts from follows, a few thousand) → light filtering → ranking with an ML model predicting engagement → re-ranking for diversity and freshness. Cache the candidate list; compute features offline where possible to keep latency low."));
  more("chat-system", P("Group chat with 100k members", "hard", "Fan-out to every member per message is too expensive.", "Don't push to everyone.", "For huge groups store the message once in the channel's log; online members receive it through a pub/sub topic for that channel, and others pull on open with a per-user read cursor. Reserve per-recipient fan-out for small groups."));
  more("sd-basics", P("Estimate: chat storage", "medium", "200M daily users send 40 messages each at ~100 bytes. Storage per year and average write QPS?", "Multiply, then divide by 10⁵.", "8 × 10⁹ messages/day ≈ 93k writes/s on average (maybe 3× at peak). 800 GB/day ≈ 290 TB/year before replication and indexes."));
  more("caching", P("Cache a hot celebrity profile", "hard", "One key gets 50k reads/s and expires every minute, hammering the DB each time.", "Prevent the stampede.", "Refresh ahead of expiry in the background, or let one request rebuild behind a lock while others serve the stale value (stale-while-revalidate); add jitter to TTLs; keep a short-lived in-process copy on each app server for the hottest keys."));
})();
