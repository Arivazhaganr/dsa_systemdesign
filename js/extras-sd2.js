/* Extras for the additional system design topics: history, real-world uses, code in Python and JavaScript */
(function () {
  const X = (L.extras = L.extras || {});

  X["consensus"] = {
    story: {
      when: "1985 FLP impossibility · 1989 Paxos · 2014 Raft",
      who: "Fischer, Lynch & Paterson (proved consensus can't be guaranteed in a fully asynchronous system with even one crash); Leslie Lamport (Paxos); Brian Oki & Barbara Liskov (Viewstamped Replication, 1988); Diego Ongaro & John Ousterhout at Stanford (Raft)",
      before: "High availability meant a primary and a standby with manual or timer-based failover. A network glitch could leave both believing they were primary, and their data silently diverged.",
      why: "Lamport's Paxos proved a cluster could agree safely despite crashes and message loss, but it was notoriously hard to understand and to implement correctly. Ongaro and Ousterhout designed Raft with understandability as an explicit goal: a strong leader, numbered terms and a simple log-matching rule. It quickly became the default in new infrastructure such as etcd, Consul and CockroachDB.",
    },
    uses: [
      ["☸️", "Kubernetes (etcd)", "All cluster state lives in a Raft-replicated key-value store."],
      ["🔒", "Locks & leader election", "ZooKeeper, Consul and etcd provide leases for other systems."],
      ["🗄️", "Distributed SQL", "CockroachDB, TiDB, Spanner replicate each data range with consensus."],
      ["📨", "Kafka (KRaft)", "Cluster metadata is managed by a built-in Raft quorum."],
    ],
    code: {
      python: `import random

class Node:
    def __init__(self, name):
        self.name, self.term, self.voted_for, self.log = name, 0, None, []

    def request_vote(self, term, candidate, last_index):
        """Grant at most one vote per term, and only to a candidate whose log is not behind ours."""
        if term < self.term:
            return False
        if term > self.term:
            self.term, self.voted_for = term, None
        up_to_date = last_index >= len(self.log)
        if self.voted_for in (None, candidate) and up_to_date:
            self.voted_for = candidate
            return True
        return False

def run_election(nodes, alive):
    majority = len(nodes) // 2 + 1
    candidate = random.choice(alive)
    candidate.term += 1
    candidate.voted_for = candidate.name
    votes = 1 + sum(n.request_vote(candidate.term, candidate.name, len(candidate.log))
                    for n in alive if n is not candidate)
    return candidate if votes >= majority else None

def replicate(leader, alive, entry, total):
    """An entry is committed once a majority of ALL nodes has stored it."""
    leader.log.append(entry)
    acks = 1
    for n in alive:
        if n is not leader:
            n.log = list(leader.log)
            acks += 1
    return acks >= total // 2 + 1

nodes = [Node("n" + str(i)) for i in range(5)]
leader = run_election(nodes, nodes)
print("leader:", leader.name, "term", leader.term)
print("committed with 5 up:", replicate(leader, nodes, "x=1", 5))
print("committed with 2 up:", replicate(leader, [leader, nodes[0] if nodes[0] is not leader else nodes[1]], "x=2", 5))`,
      javascript: `// Leader election with a lease in a shared store (how most apps actually "use consensus")
// 'store' stands for etcd / ZooKeeper / Consul: compareAndSet must be atomic on the server.
class LeaderLease {
  constructor(store, key, nodeId, ttlMs = 10000) {
    Object.assign(this, { store, key, nodeId, ttlMs });
  }
  // Try to become (or stay) leader. Returns a fencing token when we hold the lease.
  async tryAcquire() {
    const now = Date.now();
    const current = await this.store.get(this.key);            // { owner, expires, token } or null
    if (current && current.expires > now && current.owner !== this.nodeId) return null;
    const next = { owner: this.nodeId, expires: now + this.ttlMs, token: (current ? current.token : 0) + 1 };
    const ok = await this.store.compareAndSet(this.key, current, next);
    return ok ? next.token : null;
  }
}

// The resource being protected rejects stale leaders by comparing fencing tokens
class FencedStorage {
  constructor() { this.highestToken = 0; this.value = null; }
  write(value, token) {
    if (token < this.highestToken) throw new Error("stale leader: token " + token + " < " + this.highestToken);
    this.highestToken = token;
    this.value = value;
  }
}

const majority = (clusterSize) => Math.floor(clusterSize / 2) + 1;
console.log([3, 4, 5, 7].map((n) => n + " nodes: majority " + majority(n) + ", tolerates " + (n - majority(n))));`,
    },
  };

  X["distributed-transactions"] = {
    story: {
      when: "1978 two-phase commit · 1987 sagas · 2007 'Life beyond Distributed Transactions'",
      who: "Jim Gray (2PC, and the ACID foundations of transaction processing); Hector Garcia-Molina & Kenneth Salem (sagas, for long-lived transactions); Pat Helland (the case for avoiding distributed transactions at scale)",
      before: "A business operation lived in one mainframe database and one transaction covered it. As companies split systems across machines, a failure midway left money debited in one place and never credited in another.",
      why: "2PC gave atomicity across databases but locked resources while waiting on the slowest participant. Garcia-Molina and Salem observed that long business processes can't hold locks for hours, and proposed chains of short transactions with compensations. When microservices gave every service its own database, sagas plus idempotent messaging became the mainstream approach.",
    },
    uses: [
      ["🛒", "E-commerce orders", "Payment, inventory and shipping coordinated as a saga."],
      ["✈️", "Travel booking", "Flight + hotel + car with cancellations as compensations."],
      ["🏦", "Banking transfers", "Between banks there is no shared transaction: messages + reconciliation."],
      ["🔄", "Workflow engines", "Temporal, AWS Step Functions and Camunda run durable sagas."],
    ],
    code: {
      python: `class SagaFailed(Exception):
    pass

def run_saga(steps, ctx):
    """steps: list of (name, action, compensation). Undo completed steps in reverse on failure."""
    done = []
    for name, action, compensate in steps:
        try:
            action(ctx)
            done.append((name, compensate))
        except Exception as err:
            for prev_name, undo in reversed(done):
                if undo:
                    undo(ctx)                    # compensations must be idempotent and retried until they succeed
            raise SagaFailed(name + " failed: " + str(err) + "; compensated " + str([n for n, _ in done]))
    return ctx

stock = {"widget": 0}

def charge(ctx):   ctx["charged"] = True
def refund(ctx):   ctx["charged"] = False
def reserve(ctx):
    if stock[ctx["item"]] < 1:
        raise RuntimeError("out of stock")
    stock[ctx["item"]] -= 1
def release(ctx):  stock[ctx["item"]] += 1
def ship(ctx):     ctx["shipped"] = True

order = {"item": "widget"}
try:
    run_saga([("charge", charge, refund), ("reserve", reserve, release), ("ship", ship, None)], order)
except SagaFailed as e:
    print(e, "| charged:", order["charged"])    # the charge was refunded

# Idempotent consumer: at-least-once delivery + dedupe = effectively exactly-once
processed = set()
def handle(event):
    if event["id"] in processed:
        return "duplicate ignored"
    processed.add(event["id"])                   # in production: same DB transaction as the side effect
    return "processed"
print(handle({"id": "evt-1"}), handle({"id": "evt-1"}))`,
      javascript: `// Transactional outbox: the state change and the event are saved in ONE local transaction
async function payOrder(db, orderId) {
  await db.transaction(async (tx) => {
    await tx.query("UPDATE orders SET status = 'PAID' WHERE id = $1", [orderId]);
    await tx.query("INSERT INTO outbox (id, topic, payload) VALUES ($1, $2, $3)",
      [crypto.randomUUID(), "order-events", JSON.stringify({ type: "OrderPaid", orderId })]);
  });
}

// A relay publishes pending outbox rows. It may publish a row twice (crash after send, before mark),
// so consumers must dedupe by event id.
async function relayOutbox(db, broker) {
  const rows = await db.query("SELECT * FROM outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 100");
  for (const row of rows) {
    await broker.publish(row.topic, { id: row.id, ...JSON.parse(row.payload) });
    await db.query("UPDATE outbox SET sent_at = now() WHERE id = $1", [row.id]);
  }
}

// Idempotent consumer
async function onOrderPaid(db, event) {
  await db.transaction(async (tx) => {
    const fresh = await tx.query(
      "INSERT INTO processed_events (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id", [event.id]);
    if (fresh.length === 0) return;               // already handled
    await tx.query("INSERT INTO shipments (order_id) VALUES ($1)", [event.orderId]);
  });
}`,
    },
  };

  X["auth-security"] = {
    story: {
      when: "1961 passwords on CTSS · 1988 Kerberos · 1999 bcrypt · 2012 OAuth 2.0 · 2015 JWT",
      who: "Fernando Corbató (the first computer passwords, at MIT); Robert Morris & Ken Thompson (salted password hashing in Unix, 1979); MIT's Project Athena (Kerberos); Niels Provos & David Mazières (bcrypt); the IETF OAuth working group (Dick Hardt, editor of OAuth 2.0)",
      before: "To let one website use your data on another you typed your password for the second site into the first, which then stored it and could do anything as you. Passwords were often kept in plain text.",
      why: "The 'password anti-pattern' was everywhere in the mid-2000s: apps asked for your email password to import contacts. OAuth was created so a user could grant limited, revocable access without revealing the password. Signed tokens such as JWT then let many services verify identity locally, without calling a central session database on every request.",
    },
    uses: [
      ["🔑", "'Sign in with Google / GitHub'", "OpenID Connect on top of OAuth 2.0."],
      ["📱", "Mobile & single-page apps", "Authorization code + PKCE, short-lived access tokens."],
      ["🏢", "Enterprise single sign-on", "SAML / OIDC with an identity provider (Okta, Entra ID)."],
      ["🔌", "Service-to-service calls", "Client credentials, mutual TLS, workload identity."],
    ],
    code: {
      python: `import base64, hashlib, hmac, json, os, time

# --- Password storage: slow, salted hash (scrypt is in the standard library) ---
def hash_password(password):
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return salt + digest

def verify_password(password, stored):
    salt, digest = stored[:16], stored[16:]
    candidate = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return hmac.compare_digest(candidate, digest)          # constant-time comparison

# --- A minimal HS256 JWT, to show what is inside one (use a vetted library in production) ---
b64 = lambda raw: base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
unb64 = lambda txt: base64.urlsafe_b64decode(txt + "=" * (-len(txt) % 4))

def sign_jwt(payload, secret):
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64(json.dumps(payload).encode())
    sig = hmac.new(secret, (head + "." + body).encode(), hashlib.sha256).digest()
    return head + "." + body + "." + b64(sig)

def verify_jwt(token, secret):
    head, body, sig = token.split(".")
    expected = hmac.new(secret, (head + "." + body).encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(expected, unb64(sig)):
        raise ValueError("bad signature")
    payload = json.loads(unb64(body))
    if payload["exp"] < time.time():
        raise ValueError("token expired")
    return payload

stored = hash_password("correct horse battery staple")
print(verify_password("correct horse battery staple", stored), verify_password("guess", stored))
token = sign_jwt({"sub": "user_42", "scope": "orders:read", "exp": int(time.time()) + 600}, b"server-secret")
print(verify_jwt(token, b"server-secret")["sub"])`,
      javascript: `// Express-style middleware: authenticate, then authorize
// verifyJwt(token) is your library call: it must check signature, exp, iss and aud.
function authenticate(verifyJwt) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "missing token" });
    try {
      req.user = verifyJwt(token);                 // { sub, scope, roles, exp }
      next();
    } catch (err) {
      res.status(401).json({ error: "invalid or expired token" });
    }
  };
}

// Authorization 1: does the token carry the scope this endpoint needs?
const requireScope = (scope) => (req, res, next) =>
  (req.user.scope || "").split(" ").includes(scope) ? next() : res.status(403).json({ error: "forbidden" });

// Authorization 2: object-level check. Always filter by the owner on the server.
async function getOrder(req, res, db) {
  const rows = await db.query("SELECT * FROM orders WHERE id = $1 AND owner_id = $2", [req.params.id, req.user.sub]);
  if (rows.length === 0) return res.status(404).json({ error: "not found" });   // don't reveal that it exists
  res.json(rows[0]);
}

// 401 = we don't know who you are.  403 = we know, and you may not do this.`,
    },
  };

  X["observability"] = {
    story: {
      when: "1960 'observability' in control theory · 2010 Dapper · 2012 Prometheus · 2016 the SRE book · 2019 OpenTelemetry",
      who: "Rudolf Kálmán (the control-theory term); Ben Sigelman and colleagues at Google (Dapper, distributed tracing); Matt Proud & Julius Volz at SoundCloud (Prometheus); Betsy Beyer, Niall Murphy and others (Google's Site Reliability Engineering book)",
      before: "Operators logged in to individual servers, tailed log files and watched CPU graphs. Checks were binary (up or down) and alerts fired on machine symptoms that often had nothing to do with what users experienced.",
      why: "With microservices, one click fans out to dozens of services and no single machine's logs tell the story. Google built Dapper to follow a request across them, and its SRE teams turned 'how reliable should we be?' into measurable objectives and error budgets. The open-source world followed with Prometheus, Jaeger and a common instrumentation standard, OpenTelemetry.",
    },
    uses: [
      ["🚨", "Incident response", "Dashboards, alerts and traces shorten time to detect and repair."],
      ["🚀", "Safe deploys", "Canary analysis compares error and latency metrics before full rollout."],
      ["💰", "Capacity & cost", "Saturation metrics drive autoscaling and capacity planning."],
      ["📜", "SLA reporting", "Measured SLOs back contractual uptime commitments."],
    ],
    code: {
      python: `import math, random

def percentile(values, p):
    """Nearest-rank percentile, p in 0..100."""
    ordered = sorted(values)
    rank = max(1, math.ceil(p / 100 * len(ordered)))
    return ordered[rank - 1]

random.seed(1)
latencies = [random.lognormvariate(4.0, 0.35) for _ in range(970)]        # ~55 ms typical
latencies += [random.uniform(1500, 4000) for _ in range(30)]              # 3% hit a slow dependency

mean = sum(latencies) / len(latencies)
print("mean %.0f ms | p50 %.0f | p95 %.0f | p99 %.0f" % (
    mean, percentile(latencies, 50), percentile(latencies, 95), percentile(latencies, 99)))

def error_budget(slo, window_days=30):
    """Minutes of unavailability the SLO allows in the window."""
    return (1 - slo) * window_days * 24 * 60

for slo in (0.99, 0.999, 0.9999):
    print("SLO %.2f%% -> %.1f minutes per 30 days" % (slo * 100, error_budget(slo)))

def burn_rate(bad, total, slo):
    """1.0 = spending the budget exactly on schedule; 14.4 for an hour is a classic page threshold."""
    return (bad / total) / (1 - slo)

print("burn rate:", round(burn_rate(bad=120, total=10_000, slo=0.999), 1))

# Chance that a page making n backend calls hits at least one p99-slow call
print("50 calls:", round(1 - 0.99 ** 50, 2))`,
      javascript: `// A tiny metrics registry + request middleware: the RED method (Rate, Errors, Duration)
class Histogram {
  constructor(buckets = [10, 25, 50, 100, 250, 500, 1000, 2500]) {
    this.buckets = buckets;
    this.counts = new Array(buckets.length + 1).fill(0);
    this.sum = 0; this.total = 0;
  }
  observe(ms) {
    const i = this.buckets.findIndex((b) => ms <= b);
    this.counts[i === -1 ? this.buckets.length : i]++;
    this.sum += ms; this.total++;
  }
  quantile(q) {                                   // estimate from the buckets, like Prometheus does
    let seen = 0;
    for (let i = 0; i < this.counts.length; i++) {
      seen += this.counts[i];
      if (seen >= q * this.total) return this.buckets[i] ?? Infinity;
    }
  }
}

const metrics = { requests: 0, errors: 0, duration: new Histogram() };

function instrument(handler) {
  return async (req, res) => {
    const start = performance.now();
    const traceId = req.headers["x-trace-id"] || crypto.randomUUID();    // propagate to every downstream call
    try {
      await handler(req, res, traceId);
    } catch (err) {
      metrics.errors++;
      console.log(JSON.stringify({ level: "error", traceId, path: req.url, msg: err.message }));   // structured log
      throw err;
    } finally {
      metrics.requests++;
      metrics.duration.observe(performance.now() - start);
    }
  };
}

const h = new Histogram();
[12, 30, 45, 48, 52, 60, 75, 90, 400, 2200].forEach((ms) => h.observe(ms));
console.log("p50 <=", h.quantile(0.5), "ms, p99 <=", h.quantile(0.99), "ms");`,
    },
  };

  X["storage-engines"] = {
    story: {
      when: "1970 B-tree · 1996 LSM-tree · 2006 Bigtable · 2011 LevelDB · 2012 RocksDB",
      who: "Rudolf Bayer & Edward McCreight at Boeing (B-trees); Patrick O'Neil, Edward Cheng, Dieter Gawlick & Elizabeth O'Neil (the log-structured merge-tree); Jeff Dean & Sanjay Ghemawat (Bigtable, LevelDB); Facebook (RocksDB)",
      before: "Files were sequential: finding a record meant scanning a tape or a file, and binary trees were far too deep for slow disks where each node costs one seek.",
      why: "Bayer and McCreight made tree nodes as large as a disk block so a huge index needs only a few seeks. B-trees ruled for decades. As write volumes exploded (logs, events, web-scale stores), random in-place updates became the bottleneck. The LSM-tree turned all writes into sequential appends and deferred the sorting to background merges; Google's Bigtable made it famous.",
    },
    uses: [
      ["🐘", "Relational databases", "PostgreSQL, MySQL InnoDB, SQLite: B-trees for tables and indexes."],
      ["🪨", "Embedded key-value stores", "RocksDB underlies Kafka Streams, CockroachDB, TiKV and many more."],
      ["📈", "Wide-column & time-series DBs", "Cassandra, HBase, ScyllaDB, InfluxDB: LSM for heavy writes."],
      ["📊", "Analytics", "Columnar formats (Parquet, ORC) and engines (ClickHouse, BigQuery)."],
    ],
    code: {
      python: `import bisect

class LSMTree:
    """A toy log-structured merge-tree: memtable + immutable sorted runs + compaction."""
    TOMBSTONE = object()

    def __init__(self, memtable_limit=4):
        self.limit = memtable_limit
        self.memtable = {}
        self.sstables = []                 # newest first; each is a sorted list of (key, value)
        self.wal = []                      # stands in for the write-ahead log file

    def put(self, key, value):
        self.wal.append((key, value))      # 1) durable, sequential append
        self.memtable[key] = value         # 2) in-memory update
        if len(self.memtable) >= self.limit:
            self.flush()

    def delete(self, key):
        self.put(key, self.TOMBSTONE)      # a delete is just another write

    def flush(self):
        self.sstables.insert(0, sorted(self.memtable.items()))
        self.memtable, self.wal = {}, []

    def get(self, key):
        if key in self.memtable:
            value = self.memtable[key]
            return None if value is self.TOMBSTONE else value
        for table in self.sstables:        # newest to oldest; real engines skip files using Bloom filters
            i = bisect.bisect_left(table, (key,))
            if i < len(table) and table[i][0] == key:
                value = table[i][1]
                return None if value is self.TOMBSTONE else value
        return None

    def compact(self):
        merged = {}
        for table in reversed(self.sstables):      # oldest first, so newer values overwrite
            merged.update(table)
        live = sorted((k, v) for k, v in merged.items() if v is not self.TOMBSTONE)
        self.sstables = [live]

db = LSMTree()
for i in range(10):
    db.put("k" + str(i % 5), i)
db.delete("k0")
db.flush()
print(db.get("k1"), db.get("k0"), len(db.sstables), "tables")     # 6 None 3 tables
db.compact()
print(len(db.sstables), "table,", len(db.sstables[0]), "live keys")   # 1 table, 4 live keys`,
      javascript: `// B-tree search: each node is one disk page holding many sorted keys
function btreeSearch(node, key) {
  let pagesRead = 0;
  while (node) {
    pagesRead++;
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;       // real engines binary-search within the page
    if (i < node.keys.length && node.keys[i] === key) return { found: true, pagesRead };
    node = node.children ? node.children[i] : null;                // descend, or stop at a leaf
  }
  return { found: false, pagesRead };
}

const tree = {
  keys: [30, 60],
  children: [
    { keys: [10, 20] },
    { keys: [40, 50] },
    { keys: [70, 80, 90] },
  ],
};
console.log(btreeSearch(tree, 50), btreeSearch(tree, 65));

// Why B-trees are shallow: height needed for N keys with a given fan-out
const height = (n, fanout) => Math.ceil(Math.log(n) / Math.log(fanout));
console.log("1 billion keys, fan-out 500 →", height(1e9, 500), "levels");   // 4
console.log("1 billion keys, binary tree →", height(1e9, 2), "levels");     // 30

// Leftmost-prefix rule for a composite index (a, b, c)
function indexUsable(indexCols, filterCols) {
  let used = 0;
  while (used < indexCols.length && filterCols.includes(indexCols[used])) used++;
  return used;                                  // how many leading columns the query can use
}
console.log(indexUsable(["country", "city", "zip"], ["country", "city"]));   // 2
console.log(indexUsable(["country", "city", "zip"], ["city"]));              // 0 → full scan`,
    },
  };

  X["video-streaming"] = {
    story: {
      when: "2005 YouTube · 2007 Netflix streaming · 2009 HLS · 2012 MPEG-DASH and Netflix Open Connect",
      who: "Chad Hurley, Steve Chen & Jawed Karim (YouTube); Netflix's streaming team; Apple (HTTP Live Streaming, created for the iPhone); Move Networks (early adaptive HTTP streaming); the MPEG group (DASH)",
      before: "Video online meant downloading a whole file before watching, or dedicated streaming servers with special protocols (RTSP/RTMP) that didn't pass through firewalls well, couldn't use ordinary web caches and stalled whenever bandwidth dipped.",
      why: "The breakthrough was to stop treating video as a stream and treat it as lots of small files served over plain HTTP. Ordinary CDNs could then cache it, and the player could choose a different quality for every few seconds of video. That made video work on phones and bad networks, and let Netflix and YouTube scale using the web's existing infrastructure.",
    },
    uses: [
      ["▶️", "YouTube & Netflix", "Adaptive bitrate over HTTP from edge caches inside ISPs."],
      ["🎮", "Live streaming", "Twitch and sports: the same segments with low-latency tuning."],
      ["🎓", "Online courses & meetings", "Recorded lectures and webinar replays."],
      ["📱", "Short-video apps", "Preload the next clips at low bitrate for instant swipes."],
    ],
    code: {
      python: `LADDER = [(240, 400), (360, 800), (480, 1400), (720, 2800), (1080, 5000), (2160, 16000)]   # (height, kbps)

def pick_quality(throughput_kbps, buffer_seconds, safety=0.8):
    """Simple adaptive-bitrate rule: stay under measured throughput; be careful when the buffer is low."""
    budget = throughput_kbps * (safety if buffer_seconds > 10 else safety * 0.6)
    choice = LADDER[0]
    for height, kbps in LADDER:
        if kbps <= budget:
            choice = (height, kbps)
    return choice

def play(network_kbps, segment_seconds=4):
    buffer, log = 0.0, []
    for throughput in network_kbps:
        height, kbps = pick_quality(throughput, buffer)
        download_time = kbps * segment_seconds / throughput        # seconds to fetch one segment
        buffer = max(0.0, buffer - download_time) + segment_seconds
        log.append(str(height) + "p")
    return log

print(play([6000, 6000, 6000, 900, 900, 900, 3500, 8000, 8000]))

def storage_per_hour_gb():
    """One hour of video stored at every rung of the ladder."""
    return sum(kbps for _, kbps in LADDER) * 3600 / 8 / 1e6

print(round(storage_per_hour_gb(), 1), "GB per hour of content across all renditions")`,
      javascript: `// Build an HLS master playlist: the manifest a player downloads first
function masterPlaylist(renditions) {
  const lines = ["#EXTM3U"];
  for (const r of renditions) {
    lines.push("#EXT-X-STREAM-INF:BANDWIDTH=" + r.kbps * 1000 + ",RESOLUTION=" + r.width + "x" + r.height);
    lines.push(r.height + "p/index.m3u8");
  }
  return lines.join("\\n");
}

console.log(masterPlaylist([
  { width: 426, height: 240, kbps: 400 },
  { width: 1280, height: 720, kbps: 2800 },
  { width: 1920, height: 1080, kbps: 5000 },
]));

// Resumable chunked upload: only the chunks the server doesn't have yet are sent
async function uploadVideo(file, api, chunkSize = 8 * 1024 * 1024) {
  const { uploadId, done } = await api.startOrResume(file.name, file.size);   // done = chunk numbers already stored
  const total = Math.ceil(file.size / chunkSize);
  for (let n = 0; n < total; n++) {
    if (done.includes(n)) continue;
    const url = await api.presignedUrl(uploadId, n);                          // straight to object storage
    await fetch(url, { method: "PUT", body: file.slice(n * chunkSize, (n + 1) * chunkSize) });
  }
  return api.complete(uploadId);                                              // triggers the transcoding job
}`,
    },
  };

  X["ride-sharing"] = {
    story: {
      when: "2008 geohash · 2009 Uber founded · 2011 Google S2 · 2018 Uber open-sources H3",
      who: "Garrett Camp & Travis Kalanick (Uber); Gustavo Niemeyer (geohash); Eric Veach at Google (the S2 geometry library); Uber's engineering team (the H3 hexagonal grid)",
      before: "You phoned a taxi company; a dispatcher talked to drivers over the radio and assigned whoever said they were closest. Nobody could see where the car was or when it would arrive.",
      why: "Smartphones put GPS and a data connection in every driver's and rider's pocket. That made it possible to track every car continuously and match by computer in seconds. The engineering challenge became handling a firehose of location updates and answering 'who is nearby?' instantly, which pushed the development of fast geospatial indexing such as S2 and H3.",
    },
    uses: [
      ["🚕", "Ride hailing", "Uber, Lyft, Ola, Grab: match riders with nearby drivers."],
      ["🍔", "Food & grocery delivery", "Assign couriers, batch orders, live tracking."],
      ["📦", "Logistics & fleets", "Dispatch, routing and ETA for parcels and trucks."],
      ["🛴", "Maps & 'near me' search", "Nearby places, scooters, friends, charging stations."],
    ],
    code: {
      python: `import math
from collections import defaultdict

BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"

def geohash(lat, lon, precision=6):
    """Interleave longitude and latitude bits; nearby points share a prefix."""
    lat_range, lon_range = [-90.0, 90.0], [-180.0, 180.0]
    bits, out, even = [], [], True
    while len(out) < precision:
        rng, value = (lon_range, lon) if even else (lat_range, lat)
        mid = (rng[0] + rng[1]) / 2
        if value >= mid:
            bits.append(1); rng[0] = mid
        else:
            bits.append(0); rng[1] = mid
        even = not even
        if len(bits) == 5:
            out.append(BASE32[int("".join(map(str, bits)), 2)])
            bits = []
    return "".join(out)

def haversine_km(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))

class DriverIndex:
    def __init__(self, precision=5):                 # ~5 km cells
        self.precision, self.cells, self.where = precision, defaultdict(set), {}

    def update(self, driver, lat, lon):
        cell = geohash(lat, lon, self.precision)
        old = self.where.get(driver)
        if old and old[0] != cell:
            self.cells[old[0]].discard(driver)
        self.cells[cell].add(driver)
        self.where[driver] = (cell, (lat, lon))

    def nearby(self, lat, lon, radius_km=3, step=0.03):
        # cover the neighbourhood by sampling points around the rider (real systems compute neighbour cells)
        cells = {geohash(lat + dy * step, lon + dx * step, self.precision) for dy in (-1, 0, 1) for dx in (-1, 0, 1)}
        found = [(haversine_km((lat, lon), self.where[d][1]), d) for c in cells for d in self.cells[c]]
        return sorted(x for x in found if x[0] <= radius_km)

index = DriverIndex()
index.update("d1", 13.0827, 80.2707); index.update("d2", 13.0900, 80.2800); index.update("d3", 12.9716, 77.5946)
print(geohash(13.0827, 80.2707), [(round(km, 2), d) for km, d in index.nearby(13.0850, 80.2750)])`,
      javascript: `// Matching: offer the trip to the best candidate, and claim the driver atomically
async function matchRider(request, geoIndex, drivers, eta, offer) {
  const candidates = await geoIndex.nearby(request.pickup, 3 /* km */);
  const ranked = (await Promise.all(candidates.map(async (id) => ({ id, eta: await eta(id, request.pickup) }))))
    .sort((a, b) => a.eta - b.eta);

  for (const { id } of ranked.slice(0, 5)) {
    // compare-and-set: succeeds only if the driver is still AVAILABLE, so two riders can't get the same driver
    const claimed = await drivers.compareAndSet(id, { status: "AVAILABLE" }, { status: "OFFERED", trip: request.id });
    if (!claimed) continue;
    const accepted = await offer(id, request, 15000);              // wait up to 15 s for the driver to accept
    if (accepted) {
      await drivers.set(id, { status: "ON_TRIP", trip: request.id });
      return { driver: id, status: "MATCHED" };
    }
    await drivers.set(id, { status: "AVAILABLE" });                // declined or timed out → release
  }
  return { status: "NO_DRIVERS" };
}

// Surge multiplier per map cell: demand vs supply in a sliding window
function surge(openRequests, availableDrivers, cap = 3) {
  if (availableDrivers === 0) return cap;
  const ratio = openRequests / availableDrivers;
  return Math.min(cap, Math.max(1, Math.round(ratio * 10) / 10));
}
console.log(surge(10, 20), surge(30, 20), surge(100, 10));   // 1 1.5 3`,
    },
  };

  X["payment-system"] = {
    story: {
      when: "1494 double-entry bookkeeping · 1950 Diners Club · 1958 Visa's precursor · 2004 PCI DSS · 2010 Stripe",
      who: "Luca Pacioli (published the double-entry method Venetian merchants used); Frank McNamara (Diners Club, the first charge card); Dee Hock (the Visa network); Patrick & John Collison (Stripe, which made payments a developer API)",
      before: "Accepting cards online required a merchant bank account, a gateway contract, weeks of paperwork and handling raw card numbers on your own servers. Before cards, every shop kept its own paper ledger of customer credit.",
      why: "Card networks solved trust between strangers: the bank guarantees the merchant gets paid. Online commerce then needed that to be programmable. Payment service providers hid the banking complexity behind an API, and patterns such as idempotency keys and webhooks grew out of one hard fact: a network call that moves money can fail in ways where neither side knows the outcome.",
    },
    uses: [
      ["🛍️", "Online checkout", "Cards, wallets and bank transfers behind one API."],
      ["🏪", "Marketplaces", "Split a payment between seller, platform fee and taxes; pay out later."],
      ["🔁", "Subscriptions", "Recurring billing, retries of failed charges, proration."],
      ["📲", "Real-time bank payments", "UPI, Pix, SEPA Instant: push payments confirmed in seconds."],
    ],
    code: {
      python: `import uuid

class Ledger:
    """Append-only double-entry ledger. Amounts are integers in minor units (paise / cents)."""
    def __init__(self):
        self.entries = []

    def post(self, description, lines):
        """lines: list of (account, debit, credit). Debits must equal credits."""
        if sum(d for _, d, _ in lines) != sum(c for _, _, c in lines):
            raise ValueError("unbalanced entry")
        txn = str(uuid.uuid4())
        self.entries += [(txn, description, account, d, c) for account, d, c in lines]
        return txn

    def balance(self, account):
        return sum(d - c for _, _, acc, d, c in self.entries if acc == account)

class PaymentService:
    def __init__(self, provider, ledger):
        self.provider, self.ledger = provider, ledger
        self.by_key = {}                                   # idempotency key -> payment (a unique index in a real DB)

    def pay(self, idempotency_key, order_id, amount, fee):
        if idempotency_key in self.by_key:
            return self.by_key[idempotency_key]            # retry → same result, no second charge
        payment = {"id": "pay_" + order_id, "status": "PENDING", "amount": amount}
        self.by_key[idempotency_key] = payment
        try:
            self.provider(idempotency_key, amount)         # the provider dedupes on the same key too
        except TimeoutError:
            return payment                                 # stays PENDING; resolved by webhook / reconciliation
        self.ledger.post("payment " + order_id, [
            ("cash_at_provider", amount, 0),
            ("seller_payable", 0, amount - fee),
            ("fee_revenue", 0, fee),
        ])
        payment["status"] = "SUCCEEDED"
        return payment

charges = []
ledger = Ledger()
svc = PaymentService(lambda key, amount: charges.append((key, amount)), ledger)
print(svc.pay("key-1", "o_981", 499900, 25000)["status"])
print(svc.pay("key-1", "o_981", 499900, 25000)["status"], "| provider was called", len(charges), "time")
print(ledger.balance("cash_at_provider"), ledger.balance("seller_payable"), ledger.balance("fee_revenue"))`,
      javascript: `// Webhook handler: verify the signature, dedupe, then advance the payment state machine
// (Node.js: crypto = require("node:crypto"))
function verifySignature(rawBody, header, secret, crypto) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(header || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);     // constant-time comparison
}

const TRANSITIONS = {
  CREATED: ["PENDING"],
  PENDING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

async function handleWebhook(req, db, secret, crypto) {
  if (!verifySignature(req.rawBody, req.headers["x-signature"], secret, crypto)) return { status: 400 };
  const event = JSON.parse(req.rawBody);

  await db.transaction(async (tx) => {
    const fresh = await tx.query("INSERT INTO webhook_events (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id", [event.id]);
    if (fresh.length === 0) return;                                 // duplicate delivery: already processed

    const [payment] = await tx.query("SELECT * FROM payments WHERE id = $1 FOR UPDATE", [event.paymentId]);
    const next = event.type === "charge.succeeded" ? "SUCCEEDED" : "FAILED";
    if (!TRANSITIONS[payment.status].includes(next)) return;        // out-of-order or repeated event: ignore

    await tx.query("UPDATE payments SET status = $1 WHERE id = $2", [next, payment.id]);
    await tx.query("INSERT INTO outbox (topic, payload) VALUES ('payments', $1)", [JSON.stringify({ id: payment.id, status: next })]);
  });
  return { status: 200 };                                           // acknowledge quickly so the provider stops retrying
}

// Money: integers in minor units, never floats
console.log(0.1 + 0.2 === 0.3, 10 + 20 === 30);   // false true`,
    },
  };
})();
