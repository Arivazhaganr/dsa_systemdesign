/* System design extras: history ("story"), real-world uses, and code samples in 4 languages */
(function () {
  const X = (L.extras = L.extras || {});

  X["sd-basics"] = {
    story: {
      when: "1940s Fermi problems · ~2009 'latency numbers'",
      who: "Enrico Fermi (order-of-magnitude estimation); Jeff Dean & Peter Norvig popularized 'Latency Numbers Every Programmer Should Know'",
      before: "Capacity was planned by buying the biggest mainframe you could afford and hoping it was enough.",
      why: "Fermi famously estimated quantities (like the number of piano tuners in Chicago) from simple assumptions. Web-scale companies needed the same skill: before building, roughly estimate QPS, storage and bandwidth so the design fits the load. System design interviews became common at large tech companies in the 2010s to test exactly this reasoning.",
    },
    uses: [
      ["💸", "Cloud budgeting", "How many servers, how much storage, what monthly bill."],
      ["🚀", "Launch planning", "Will the database survive a Super Bowl ad or a product launch?"],
      ["📐", "Architecture reviews", "Rule out designs early (e.g. 'a single DB can't take 200k writes/s')."],
      ["🎤", "Interviews", "The first 10 minutes of almost every system design interview."],
    ],
    code: {
      python: `DAY = 86_400

def estimate(dau, req_per_user, read_write_ratio, bytes_per_write, years, peak=3):
    qps = dau * req_per_user / DAY
    writes = qps / (read_write_ratio + 1)
    storage = writes * DAY * 365 * years * bytes_per_write
    return {
        "avg_qps": round(qps),
        "peak_qps": round(qps * peak),
        "write_qps": round(writes),
        "storage_TB": round(storage / 1e12, 1),
    }

print(estimate(dau=10_000_000, req_per_user=20, read_write_ratio=10,
               bytes_per_write=1_000, years=5))`,
      java: `class Estimate {
    public static void main(String[] args) {
        long dau = 10_000_000, perUser = 20, ratio = 10, bytes = 1_000, years = 5;
        double qps = dau * perUser / 86_400.0;
        double writes = qps / (ratio + 1);
        double storageTB = writes * 86_400 * 365 * years * bytes / 1e12;
        System.out.printf("avg QPS %.0f, peak %.0f, writes %.0f/s, storage %.1f TB%n",
                qps, qps * 3, writes, storageTB);
    }
}`,
      typescript: `interface Inputs { dau: number; reqPerUser: number; readWrite: number; bytesPerWrite: number; years: number }

function estimate(i: Inputs) {
  const qps = (i.dau * i.reqPerUser) / 86_400;
  const writes = qps / (i.readWrite + 1);
  return {
    avgQps: Math.round(qps),
    peakQps: Math.round(qps * 3),
    storageTB: +((writes * 86_400 * 365 * i.years * i.bytesPerWrite) / 1e12).toFixed(1),
    servers: Math.ceil((qps * 3) / 1000),   // assume ~1k QPS per server
  };
}`,
      javascript: `// Availability → allowed downtime per year
const nines = (pct) => ((1 - pct / 100) * 365 * 24 * 60).toFixed(1) + " min/yr";
console.log(nines(99.9));   // 525.6 min/yr (~8.8 h)
console.log(nines(99.99));  // 52.6 min/yr

// Powers of two you should know
for (const [p, name] of [[10, "KB"], [20, "MB"], [30, "GB"], [40, "TB"]])
  console.log(name, 2 ** p);`,
    },
  };

  X["load-balancing"] = {
    story: {
      when: "1990s",
      who: "DNS round-robin (early web); Cisco LocalDirector (1996) and F5 BIG-IP (1997) hardware; software like HAProxy (Willy Tarreau, 2001) and Nginx (Igor Sysoev, 2004)",
      before: "One big server (scale up). When a popular site got slow, you bought a bigger machine, and when that machine died, the site died.",
      why: "The 1990s web boom brought more traffic than any single machine could handle. Spreading requests over many cheap servers was cheaper and survived failures. Nginx was written to solve the 'C10k problem' (10,000 concurrent connections on one server).",
    },
    uses: [
      ["🌍", "Every large website", "Google, Amazon, Netflix put LBs in front of all services."],
      ["☁️", "Cloud services", "AWS ELB/ALB, Google Cloud Load Balancing, Azure Load Balancer."],
      ["☸️", "Kubernetes", "Services and Ingress controllers spread traffic over pods."],
      ["🗄️", "Databases", "Proxies like PgBouncer/ProxySQL spread reads across replicas."],
      ["🎮", "Game servers", "Match players to the least busy server."],
    ],
    code: {
      python: `import itertools, random

class RoundRobin:
    def __init__(self, servers):
        self._it = itertools.cycle(servers)
    def pick(self, _req=None):
        return next(self._it)

class LeastConnections:
    def __init__(self, servers):
        self.active = {s: 0 for s in servers}
    def pick(self, _req=None):
        s = min(self.active, key=self.active.get)
        self.active[s] += 1
        return s
    def done(self, s):
        self.active[s] -= 1

lb = RoundRobin(["s1", "s2", "s3"])
print([lb.pick() for _ in range(5)])   # s1 s2 s3 s1 s2`,
      java: `import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

class RoundRobinBalancer {
    private final List<String> servers;
    private final AtomicInteger next = new AtomicInteger();   // thread-safe

    RoundRobinBalancer(List<String> servers) { this.servers = servers; }

    String pick() {
        int i = Math.floorMod(next.getAndIncrement(), servers.size());
        return servers.get(i);
    }

    String pickSticky(String clientIp) {        // IP hash: same client → same server
        return servers.get(Math.floorMod(clientIp.hashCode(), servers.size()));
    }
}`,
      typescript: `// A tiny HTTP load balancer in Node.js (round robin + health checks)
import http from "node:http";

const backends = [
  { url: "http://localhost:3001", healthy: true },
  { url: "http://localhost:3002", healthy: true },
];
let i = 0;

function pick() {
  const up = backends.filter((b) => b.healthy);
  if (!up.length) return null;
  return up[i++ % up.length];
}

setInterval(() => {
  for (const b of backends)
    fetch(b.url + "/health").then((r) => (b.healthy = r.ok)).catch(() => (b.healthy = false));
}, 5000);

http.createServer((req, res) => {
  const b = pick();
  if (!b) { res.writeHead(503).end("no healthy backends"); return; }
  const proxy = http.request(b.url + req.url, { method: req.method, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  req.pipe(proxy);
}).listen(8080);`,
      javascript: `// Weighted round robin (smooth version used by nginx)
function createBalancer(servers) {           // [{ name, weight }]
  const state = servers.map((s) => ({ ...s, current: 0 }));
  const total = servers.reduce((a, s) => a + s.weight, 0);
  return function pick() {
    for (const s of state) s.current += s.weight;
    const best = state.reduce((a, b) => (b.current > a.current ? b : a));
    best.current -= total;
    return best.name;
  };
}

const pick = createBalancer([{ name: "big", weight: 3 }, { name: "small", weight: 1 }]);
console.log(Array.from({ length: 8 }, pick).join(" "));
// big big small big big big small big  (3:1, spread out)`,
    },
  };

  X.caching = {
    story: {
      when: "1965 idea · 1968 first commercial CPU cache · 2003 Memcached · 2009 Redis",
      who: "Maurice Wilkes ('slave memory', 1965); IBM System/360 Model 85 (1968); Brad Fitzpatrick (Memcached, for LiveJournal); Salvatore Sanfilippo (Redis)",
      before: "Every read went to the slow source: main memory for CPUs, the database (on spinning disks) for web apps.",
      why: "Programs tend to reuse the same data (locality), so keeping a small, fast copy pays off hugely. Fitzpatrick built Memcached because LiveJournal's databases were overloaded by repeated identical queries. Facebook later ran one of the world's largest Memcached deployments, and Redis added data structures and persistence on top of the same idea.",
    },
    uses: [
      ["🧠", "CPUs", "L1/L2/L3 caches between the processor and RAM."],
      ["🌐", "Browsers & CDNs", "HTTP caching of images, CSS and JS (Cache-Control headers)."],
      ["⚡", "App caches", "Redis/Memcached for sessions, user profiles, feeds and leaderboards."],
      ["🗄️", "Databases", "Buffer pools keep hot pages in memory; query result caches."],
      ["📛", "DNS", "Resolvers cache domain lookups for their TTL."],
      ["🤖", "AI apps", "Caching LLM responses or prompt prefixes to cut cost and latency."],
    ],
    code: {
      python: `from collections import OrderedDict
from functools import lru_cache

class LRUCache:
    def __init__(self, capacity):
        self.cap, self.d = capacity, OrderedDict()
    def get(self, key):
        if key not in self.d:
            return None
        self.d.move_to_end(key)              # mark as recently used
        return self.d[key]
    def put(self, key, value):
        self.d[key] = value
        self.d.move_to_end(key)
        if len(self.d) > self.cap:
            self.d.popitem(last=False)       # evict least recently used

# Cache-aside with Redis (pip install redis)
# def get_user(uid):
#     cached = r.get(f"user:{uid}")
#     if cached: return json.loads(cached)
#     user = db.query("SELECT * FROM users WHERE id=%s", uid)
#     r.setex(f"user:{uid}", 3600, json.dumps(user))   # TTL 1 hour
#     return user

@lru_cache(maxsize=1024)                 # built-in memoization cache
def slow_square(n):
    return n * n`,
      java: `import java.util.*;

class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;

    LRUCache(int capacity) {
        super(16, 0.75f, true);          // accessOrder = true → LRU ordering
        this.capacity = capacity;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;        // evict when over capacity
    }

    public static void main(String[] args) {
        LRUCache<String, Integer> c = new LRUCache<>(2);
        c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3);
        System.out.println(c.keySet());  // [a, c]  ("b" was evicted)
    }
}`,
      typescript: `// JS Maps remember insertion order, which makes LRU easy
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, v);          // move to newest
    return v;
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity)
      this.map.delete(this.map.keys().next().value!);   // oldest
  }
}

// Cache-aside with a TTL
const cache = new Map<string, { v: unknown; exp: number }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.v as T;
  const v = await load();
  cache.set(key, { v, exp: Date.now() + ttlMs });
  return v;
}`,
      javascript: `// Memoize an async API call and share in-flight requests
// (prevents a "thundering herd" of identical calls)
const inflight = new Map();

function fetchOnce(url) {
  if (!inflight.has(url)) {
    const p = fetch(url).then((r) => r.json());
    inflight.set(url, p);
    setTimeout(() => inflight.delete(url), 60_000); // 60 s TTL
  }
  return inflight.get(url);
}

// HTTP caching is just a header:
// res.setHeader("Cache-Control", "public, max-age=31536000, immutable");`,
    },
  };

  X.databases = {
    story: {
      when: "1966 IMS · 1970 relational model · 1974 SQL · 2006–07 Bigtable & Dynamo",
      who: "IBM IMS (built for the Apollo program); Edgar F. Codd (relational model); Donald Chamberlin & Raymond Boyce (SEQUEL/SQL); Google (Bigtable) and Amazon (Dynamo)",
      before: "Hierarchical and network databases (IMS, CODASYL): programs navigated records by following hard-coded pointer paths, so every new question meant rewriting code.",
      why: "Codd proposed storing data in simple tables and asking questions declaratively ('what' not 'how'), letting the database choose how to fetch it. In the 2000s, web giants hit limits of a single relational server, so Google's Bigtable and Amazon's Dynamo papers sparked the NoSQL movement: horizontal scaling and high availability first. Sharding itself was popularized by large MySQL deployments at companies like Flickr and Facebook.",
    },
    uses: [
      ["🏦", "Banking & payments", "Relational databases with ACID transactions."],
      ["🛍️", "E-commerce catalogs", "Document stores for flexible product attributes."],
      ["📈", "Analytics", "Columnar warehouses (BigQuery, Snowflake, Redshift)."],
      ["📱", "Messaging at scale", "Wide-column stores (Cassandra, HBase) for huge write volumes."],
      ["🕸️", "Fraud detection", "Graph databases find suspicious connected accounts."],
      ["⏱️", "Monitoring", "Time-series databases (Prometheus, InfluxDB) for metrics."],
    ],
    code: {
      python: `import sqlite3, hashlib

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, city TEXT);
CREATE INDEX idx_users_city ON users(city);   -- O(log n) lookups by city
""")
with db:                                        # transaction: all or nothing
    db.execute("INSERT INTO users (email, city) VALUES (?, ?)", ("a@x.com", "Chennai"))
    db.execute("INSERT INTO users (email, city) VALUES (?, ?)", ("b@x.com", "Pune"))
print(db.execute("EXPLAIN QUERY PLAN SELECT * FROM users WHERE city='Pune'").fetchall())

# Picking a shard for a key
def shard_for(user_id: str, n_shards: int) -> int:
    h = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
    return h % n_shards`,
      java: `import java.sql.*;

class Transfer {
    // Move money atomically: both updates happen, or neither does
    static void transfer(Connection c, long from, long to, long cents) throws SQLException {
        c.setAutoCommit(false);
        try (PreparedStatement debit = c.prepareStatement(
                 "UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?");
             PreparedStatement credit = c.prepareStatement(
                 "UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
            debit.setLong(1, cents); debit.setLong(2, from); debit.setLong(3, cents);
            if (debit.executeUpdate() != 1) throw new SQLException("insufficient funds");
            credit.setLong(1, cents); credit.setLong(2, to);
            credit.executeUpdate();
            c.commit();
        } catch (SQLException e) {
            c.rollback();
            throw e;
        }
    }
}`,
      typescript: `// Route reads to replicas, writes to the primary (read/write splitting)
import { Pool } from "pg";

const primary = new Pool({ connectionString: process.env.PRIMARY_URL });
const replicas = [process.env.REPLICA1_URL, process.env.REPLICA2_URL]
  .map((url) => new Pool({ connectionString: url }));
let n = 0;

export function write(sql: string, params: unknown[] = []) {
  return primary.query(sql, params);
}

export function read(sql: string, params: unknown[] = [], fresh = false) {
  // 'fresh' avoids replication lag right after a user's own write
  const pool = fresh ? primary : replicas[n++ % replicas.length];
  return pool.query(sql, params);
}`,
      javascript: `// Document store (MongoDB) vs relational: same data, different shape
const order = {
  _id: "o_123",
  user: { id: 42, name: "Arivu" },          // embedded, no JOIN needed
  items: [{ sku: "book-1", qty: 2, price: 12 }],
  createdAt: new Date(),
};
// await db.collection("orders").insertOne(order);
// await db.collection("orders").createIndex({ "user.id": 1, createdAt: -1 });

// SQL equivalent needs 3 tables: users, orders, order_items, joined at read time.`,
    },
  };

  X["consistent-hashing"] = {
    story: {
      when: "1997",
      who: "David Karger, Eric Lehman, Tom Leighton, Rina Panigrahy, Matthew Levine & Daniel Lewin (MIT)",
      before: "hash(key) % N. Adding or removing one cache server remapped almost every key, so the whole cache went cold at once and the origin servers got crushed.",
      why: "The MIT team was trying to relieve 'hot spots' on the web (sites overwhelmed by sudden popularity). Their paper led directly to founding <b>Akamai</b> (1998), the first big CDN. Amazon's Dynamo paper (2007) brought consistent hashing with virtual nodes to databases.",
    },
    uses: [
      ["🌍", "CDNs", "Akamai and others map URLs to edge cache servers."],
      ["🗄️", "Distributed databases", "Cassandra, DynamoDB, Riak and ScyllaDB partition data on a ring."],
      ["⚡", "Cache clusters", "Memcached/Redis client libraries (ketama) pick nodes this way."],
      ["⚖️", "Load balancers", "Google's Maglev and Envoy's ring-hash keep users on the same backend."],
      ["💬", "Chat & gaming", "Route all messages for one room/game to the same server."],
    ],
    code: {
      python: `import bisect, hashlib

def h(key: str) -> int:
    return int(hashlib.md5(key.encode()).hexdigest(), 16)

class HashRing:
    def __init__(self, nodes=(), vnodes=100):
        self.vnodes, self.ring, self.keys = vnodes, {}, []
        for n in nodes:
            self.add(n)

    def add(self, node):
        for i in range(self.vnodes):
            k = h(f"{node}#{i}")
            self.ring[k] = node
            bisect.insort(self.keys, k)

    def remove(self, node):
        for i in range(self.vnodes):
            k = h(f"{node}#{i}")
            del self.ring[k]
            self.keys.remove(k)

    def get(self, key):
        i = bisect.bisect(self.keys, h(key)) % len(self.keys)   # first clockwise
        return self.ring[self.keys[i]]

ring = HashRing(["cache-a", "cache-b", "cache-c"])
print(ring.get("user:42"))`,
      java: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

class HashRing {
    private final TreeMap<Long, String> ring = new TreeMap<>();
    private final int vnodes;

    HashRing(int vnodes) { this.vnodes = vnodes; }

    private static long hash(String s) {
        try {
            byte[] d = MessageDigest.getInstance("MD5").digest(s.getBytes(StandardCharsets.UTF_8));
            long h = 0;
            for (int i = 0; i < 8; i++) h = (h << 8) | (d[i] & 0xff);
            return h;
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    void add(String node)    { for (int i = 0; i < vnodes; i++) ring.put(hash(node + "#" + i), node); }
    void remove(String node) { for (int i = 0; i < vnodes; i++) ring.remove(hash(node + "#" + i)); }

    String get(String key) {
        Map.Entry<Long, String> e = ring.ceilingEntry(hash(key));   // first clockwise
        return (e != null ? e : ring.firstEntry()).getValue();      // wrap around
    }
}`,
      typescript: `function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

class HashRing {
  private points: { hash: number; node: string }[] = [];
  constructor(nodes: string[], private vnodes = 100) { nodes.forEach((n) => this.add(n)); }

  add(node: string) {
    for (let i = 0; i < this.vnodes; i++) this.points.push({ hash: fnv1a(node + "#" + i), node });
    this.points.sort((a, b) => a.hash - b.hash);
  }

  get(key: string): string {
    const k = fnv1a(key);
    let lo = 0, hi = this.points.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.points[m].hash < k) lo = m + 1; else hi = m; }
    return this.points[lo % this.points.length].node;
  }
}`,
      javascript: `// Compare: how many keys move when going from 4 to 5 servers?
const keys = Array.from({ length: 10000 }, (_, i) => "key" + i);
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);

const moved = keys.filter((k) => hash(k) % 4 !== hash(k) % 5).length;
console.log("mod-N moved:", moved, "of", keys.length);   // ~80%
// With a consistent hash ring (see the TypeScript tab) only ~20% move.`,
    },
  };

  X.cap = {
    story: {
      when: "2000 conjecture · 2002 proof · 2010 PACELC",
      who: "Eric Brewer (UC Berkeley / Inktomi); proved by Seth Gilbert & Nancy Lynch (MIT); PACELC by Daniel Abadi",
      before: "Database theory assumed one machine or a tightly coupled cluster, where strong consistency (ACID) was a given.",
      why: "Brewer ran Inktomi, a search engine built on clusters of cheap machines, and saw that when the network splits you can't both answer every request and guarantee everyone sees the latest data. His keynote at the PODC 2000 conference framed the trade-off and shaped the NoSQL era. Brewer himself later noted the '2 of 3' framing is oversimplified: the choice only applies during a partition.",
    },
    uses: [
      ["🛒", "Shopping carts (AP)", "Amazon chose availability: never reject 'add to cart', merge later."],
      ["🏦", "Banking & inventory (CP)", "Better to reject a request than double-spend or oversell."],
      ["🔒", "Coordination services (CP)", "ZooKeeper, etcd and Consul for locks and leader election."],
      ["📛", "DNS (AP)", "Stale records for a while are acceptable."],
      ["🌍", "Global databases", "Google Spanner uses GPS/atomic clocks (TrueTime) to offer strong consistency across continents."],
      ["✏️", "Collaborative editing", "Google Docs/Figma-style apps use CRDTs/OT to merge concurrent edits."],
    ],
    code: {
      python: `# Quorum reads/writes over N replicas (R + W > N ⇒ reads see the latest write)
N, W, R = 3, 2, 2
replicas = [{"v": 0, "ver": 0} for _ in range(N)]
up = [True, True, False]          # replica 2 is partitioned away

def write(value, version):
    acks = 0
    for i in range(N):
        if up[i]:
            replicas[i] = {"v": value, "ver": version}
            acks += 1
    if acks < W:
        raise RuntimeError("not enough replicas: unavailable (CP choice)")

def read():
    answers = [replicas[i] for i in range(N) if up[i]]
    if len(answers) < R:
        raise RuntimeError("unavailable")
    return max(answers, key=lambda r: r["ver"])["v"]   # newest version wins

write("hello", 1)
print(read())   # hello`,
      java: `import java.util.*;

// A G-Counter CRDT: each node only increments its own slot, merge = max.
// Always available, and all replicas converge (AP + eventual consistency).
class GCounter {
    private final Map<String, Long> counts = new HashMap<>();
    private final String nodeId;

    GCounter(String nodeId) { this.nodeId = nodeId; }

    void increment() { counts.merge(nodeId, 1L, Long::sum); }

    long value() { return counts.values().stream().mapToLong(Long::longValue).sum(); }

    void merge(GCounter other) {
        other.counts.forEach((k, v) -> counts.merge(k, v, Math::max));
    }
}`,
      typescript: `// Last-write-wins register: simple, but concurrent writes can be lost
type LWW<T> = { value: T; ts: number; node: string };

function mergeLWW<T>(a: LWW<T>, b: LWW<T>): LWW<T> {
  if (a.ts !== b.ts) return a.ts > b.ts ? a : b;
  return a.node > b.node ? a : b;            // deterministic tie-break
}

const onA: LWW<string> = { value: "blue", ts: 1001, node: "A" };
const onB: LWW<string> = { value: "green", ts: 1002, node: "B" };
console.log(mergeLWW(onA, onB).value);      // "green" ("blue" is silently dropped)`,
      javascript: `// Vector clocks detect whether two versions are concurrent (a real conflict)
function compare(a, b) {
  let aBigger = false, bBigger = false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if ((a[k] || 0) > (b[k] || 0)) aBigger = true;
    if ((b[k] || 0) > (a[k] || 0)) bBigger = true;
  }
  if (aBigger && bBigger) return "concurrent: needs merge";
  return aBigger ? "a is newer" : bBigger ? "b is newer" : "equal";
}

console.log(compare({ A: 2, B: 1 }, { A: 1, B: 2 })); // concurrent: needs merge`,
    },
  };

  X["message-queues"] = {
    story: {
      when: "1980s TIBCO · 1993 IBM MQSeries · 2007 RabbitMQ · 2011 Apache Kafka",
      who: "Vivek Ranadivé's Teknekron/TIBCO (Wall Street trading); IBM MQSeries; JPMorgan's AMQP standard (RabbitMQ implements it); Jay Kreps, Neha Narkhede & Jun Rao at LinkedIn (Kafka)",
      before: "Systems called each other directly. If the receiver was slow or down, the sender blocked, failed, or lost the data. Batch files were copied between systems overnight.",
      why: "Trading floors needed market data delivered instantly to many programs: publish once, many subscribe. Banks needed guaranteed delivery between mainframes. LinkedIn built Kafka to move billions of activity events per day into many downstream systems, treating messages as a durable, replayable log.",
    },
    uses: [
      ["🛒", "Order processing", "Checkout publishes 'order placed'; payment, email and shipping consume it."],
      ["🎬", "Media processing", "YouTube-style uploads queue videos for transcoding."],
      ["📊", "Event streaming & analytics", "Clickstreams flow through Kafka into data warehouses."],
      ["📧", "Notifications", "Emails, SMS and push notifications sent by background workers."],
      ["🔁", "Microservice decoupling", "Services communicate via events instead of direct calls."],
      ["🌐", "IoT", "Millions of devices publish sensor data via MQTT brokers."],
    ],
    code: {
      python: `import queue, threading, time

jobs = queue.Queue(maxsize=100)       # bounded = back-pressure

def producer():
    for i in range(10):
        jobs.put({"id": i, "task": "resize-image"})
    jobs.put(None)                     # poison pill: no more work

def worker():
    while (job := jobs.get()) is not None:
        time.sleep(0.1)                # do the work
        print("done", job["id"])
        jobs.task_done()

threading.Thread(target=producer).start()
worker()

# With RabbitMQ (pip install pika):
# ch.basic_publish(exchange="", routing_key="emails", body=json.dumps(msg))
# ch.basic_consume(queue="emails", on_message_callback=handle)  # ack after success`,
      java: `import org.apache.kafka.clients.producer.*;
import java.util.Properties;

class OrderEvents {
    public static void main(String[] args) {
        Properties p = new Properties();
        p.put("bootstrap.servers", "localhost:9092");
        p.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        p.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        p.put("acks", "all");                    // durable: wait for replicas
        p.put("enable.idempotence", "true");     // no duplicates on retry

        try (Producer<String, String> producer = new KafkaProducer<>(p)) {
            // Same key (userId) → same partition → ordered for that user
            producer.send(new ProducerRecord<>("orders", "user-42", "{\\"orderId\\":1001}"));
        }
    }
}`,
      typescript: `// An in-process job queue with retries and a dead-letter list
type Job = { id: string; payload: unknown; attempts: number };

class JobQueue {
  private q: Job[] = [];
  dead: Job[] = [];
  constructor(private handler: (j: Job) => Promise<void>, private maxAttempts = 3) {}

  add(id: string, payload: unknown) { this.q.push({ id, payload, attempts: 0 }); }

  async work() {
    while (this.q.length) {
      const job = this.q.shift()!;
      try {
        await this.handler(job);                       // must be idempotent!
      } catch {
        job.attempts++;
        if (job.attempts >= this.maxAttempts) this.dead.push(job);   // DLQ
        else this.q.push(job);                         // retry later
      }
    }
  }
}`,
      javascript: `// Pub/sub in the browser or Node: every subscriber gets each message
class PubSub {
  constructor() { this.topics = new Map(); }
  subscribe(topic, fn) {
    if (!this.topics.has(topic)) this.topics.set(topic, new Set());
    this.topics.get(topic).add(fn);
    return () => this.topics.get(topic).delete(fn);   // unsubscribe
  }
  publish(topic, msg) {
    for (const fn of this.topics.get(topic) || []) queueMicrotask(() => fn(msg));
  }
}

const bus = new PubSub();
bus.subscribe("order.created", (o) => console.log("email for", o.id));
bus.subscribe("order.created", (o) => console.log("update stock for", o.id));
bus.publish("order.created", { id: 7 });`,
    },
  };

  X["rate-limiting"] = {
    story: {
      when: "1980s telecom/ATM networks · 2000s web APIs",
      who: "Leaky bucket described by Jonathan Turner (1986); token bucket became standard for traffic shaping in ATM and IP networks",
      before: "Networks and servers accepted everything until they fell over. One noisy customer or buggy script could take a service down for everyone.",
      why: "Telecom networks had to guarantee each customer a contracted bandwidth while allowing short bursts. The token bucket did exactly that. Public web APIs (Twitter, GitHub, Stripe) adopted the same algorithms in the 2000s to stop abuse, scraping and runaway clients, which is why you now see HTTP 429 and X-RateLimit headers everywhere.",
    },
    uses: [
      ["🔌", "Public APIs", "GitHub: 5,000 requests/hour per token; Stripe, OpenAI and Anthropic APIs all rate-limit."],
      ["🔐", "Login protection", "Slow down password guessing and OTP brute force."],
      ["🛡️", "DDoS mitigation", "Cloudflare and AWS WAF limit requests per IP."],
      ["🎟️", "Ticket sales & flash sales", "Protect checkout from bots and spikes."],
      ["📶", "Networks", "ISPs shape traffic with token buckets."],
    ],
    code: {
      python: `import time

class TokenBucket:
    def __init__(self, capacity, refill_per_sec):
        self.capacity, self.rate = capacity, refill_per_sec
        self.tokens, self.last = capacity, time.monotonic()

    def allow(self, cost=1):
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False          # → HTTP 429 Too Many Requests

bucket = TokenBucket(capacity=5, refill_per_sec=1)
print([bucket.allow() for _ in range(7)])   # 5 True, then False, False

# Distributed fixed window with Redis:
# key = f"rl:{user}:{int(time.time() // 60)}"
# if r.incr(key) == 1: r.expire(key, 60)`,
      java: `import java.util.concurrent.*;

class RateLimiter {
    private final int limit;
    private final long windowMs;
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>> log = new ConcurrentHashMap<>();

    RateLimiter(int limit, long windowMs) { this.limit = limit; this.windowMs = windowMs; }

    // Sliding window log: exact, but stores one timestamp per request
    boolean allow(String clientId) {
        long now = System.currentTimeMillis();
        ConcurrentLinkedDeque<Long> q = log.computeIfAbsent(clientId, k -> new ConcurrentLinkedDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() >= windowMs) q.pollFirst();
            if (q.size() >= limit) return false;
            q.addLast(now);
            return true;
        }
    }
}`,
      typescript: `// Express middleware: 100 requests per minute per IP (fixed window)
import type { Request, Response, NextFunction } from "express";

const hits = new Map<string, { count: number; windowStart: number }>();
const LIMIT = 100, WINDOW_MS = 60_000;

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return next();
  }
  if (++entry.count > LIMIT) {
    res.set("Retry-After", String(Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000)));
    return res.status(429).json({ error: "Too Many Requests" });
  }
  next();
}`,
      javascript: `// Client side: respect 429s with exponential backoff
async function fetchWithRetry(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get("Retry-After")) || 2 ** i;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
  }
  throw new Error("rate limited too many times");
}`,
    },
  };

  X["networking-cdn"] = {
    story: {
      when: "1969 ARPANET · 1974 TCP/IP · 1983 DNS · 1989–91 the Web · 1998 CDNs",
      who: "Vint Cerf & Bob Kahn (TCP/IP); Paul Mockapetris (DNS); Tim Berners-Lee (HTTP, HTML, URLs); Akamai (first large CDN)",
      before: "Every computer's name-to-address mapping lived in a single HOSTS.TXT file, maintained by hand at the Stanford Research Institute and downloaded by everyone. Popular websites were served from one place, so users far away waited and servers melted under traffic.",
      why: "As the ARPANET grew, one central file couldn't keep up, so DNS distributed naming into a hierarchy (root → .com → example.com). Berners-Lee built the Web at CERN so physicists could share documents. When 1990s sites kept crashing under demand (the 'World Wide Wait'), CDNs placed copies near users.",
    },
    uses: [
      ["🎬", "Video streaming", "Netflix's Open Connect and YouTube serve video from boxes inside ISPs."],
      ["🛍️", "E-commerce", "Product images and scripts from CDNs to load fast worldwide."],
      ["📦", "Software downloads", "Game patches and OS updates distributed via CDNs."],
      ["🛡️", "Security", "CDNs absorb DDoS attacks and terminate TLS at the edge."],
      ["⚙️", "Edge computing", "Cloudflare Workers and Vercel Edge run code close to users."],
    ],
    code: {
      python: `import socket, urllib.request, time

ip = socket.gethostbyname("example.com")     # DNS lookup
print("example.com is at", ip)

t = time.time()
with urllib.request.urlopen("https://example.com") as r:   # TCP + TLS + HTTP GET
    print(r.status, r.headers.get("Cache-Control"), r.headers.get("Age"))
print(f"took {(time.time() - t) * 1000:.0f} ms")
# 'Age' > 0 usually means the response came from a cache/CDN`,
      java: `import java.net.*;
import java.net.http.*;
import java.time.Duration;

class HttpDemo {
    public static void main(String[] args) throws Exception {
        System.out.println(InetAddress.getByName("example.com"));      // DNS

        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        HttpRequest req = HttpRequest.newBuilder(URI.create("https://example.com"))
                .timeout(Duration.ofSeconds(5)).build();
        HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.version());
    }
}`,
      typescript: `// Serve static files with CDN-friendly caching headers (Node + Express)
import express from "express";

const app = express();

// Fingerprinted assets (app.3f9a1c.js) never change → cache for a year
app.use("/assets", express.static("dist/assets", { maxAge: "365d", immutable: true }));

// HTML must stay fresh so users get new asset links after a deploy
app.get("/", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.sendFile("index.html", { root: "dist" });
});

app.listen(3000);`,
      javascript: `// Measure each network phase in the browser
const [nav] = performance.getEntriesByType("navigation");
console.table({
  dns: nav.domainLookupEnd - nav.domainLookupStart,
  tcp: nav.connectEnd - nav.connectStart,
  tls: nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0,
  firstByte: nav.responseStart - nav.requestStart,
  download: nav.responseEnd - nav.responseStart,
});`,
    },
  };

  X["api-design"] = {
    story: {
      when: "1991 CORBA · 1998 SOAP · 2000 REST · 2015 GraphQL & gRPC · ~2011 'microservices'",
      who: "Roy Fielding (REST, PhD dissertation); Facebook (GraphQL, used internally from 2012); Google (gRPC, from its internal 'Stubby'); Amazon's API-only mandate (~2002) and Netflix's cloud migration popularized microservices",
      before: "Remote procedure call systems like CORBA and SOAP: heavy XML, complex tooling, and tight coupling between client and server. Applications were single large deployments (monoliths).",
      why: "Fielding described why the Web itself scaled so well (resources, URLs, standard methods, caching) and called it REST. Mobile apps needing exactly the right data in one round trip led Facebook to GraphQL. As engineering teams grew to thousands, companies split monoliths into independently deployable services so teams could move without blocking each other.",
    },
    uses: [
      ["💳", "Payments", "Stripe's REST API with idempotency keys is the textbook example."],
      ["🐙", "Developer platforms", "GitHub offers both REST and GraphQL APIs."],
      ["🎬", "Streaming platforms", "Netflix runs hundreds of microservices behind an API gateway."],
      ["⚙️", "Internal RPC", "gRPC between services at Google, Uber, Square and others."],
      ["📱", "Mobile backends", "Backend-for-frontend APIs tailored to each app."],
    ],
    code: {
      python: `# FastAPI (pip install fastapi uvicorn): REST + idempotency keys
from fastapi import FastAPI, Header
from pydantic import BaseModel

app = FastAPI()
payments, seen_keys = {}, {}

class Payment(BaseModel):
    amount: int
    currency: str = "INR"

@app.post("/v1/payments", status_code=201)
def create_payment(p: Payment, idempotency_key: str = Header(...)):
    if idempotency_key in seen_keys:          # retry → same result, no double charge
        return seen_keys[idempotency_key]
    pid = f"pay_{len(payments) + 1}"
    payments[pid] = {"id": pid, **p.model_dump()}
    seen_keys[idempotency_key] = payments[pid]
    return payments[pid]

@app.get("/v1/payments")
def list_payments(after: str | None = None, limit: int = 20):   # cursor pagination
    ids = sorted(payments)
    start = ids.index(after) + 1 if after in ids else 0
    page = ids[start:start + limit]
    return {"data": [payments[i] for i in page], "next": page[-1] if page else None}`,
      java: `// Spring Boot REST controller
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/v1/users")
class UserController {
    record User(long id, String name) {}
    private final Map<Long, User> users = new ConcurrentHashMap<>();

    @GetMapping("/{id}")
    ResponseEntity<User> get(@PathVariable long id) {
        User u = users.get(id);
        return u == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(u);
    }

    @PutMapping("/{id}")                       // PUT is idempotent: same result if repeated
    User put(@PathVariable long id, @RequestBody User body) {
        users.put(id, new User(id, body.name()));
        return users.get(id);
    }
}`,
      typescript: `// Express REST API with proper status codes
import express from "express";

const app = express();
app.use(express.json());

type Todo = { id: number; title: string; done: boolean };
const todos = new Map<number, Todo>();
let nextId = 1;

app.get("/v1/todos", (_req, res) => res.json([...todos.values()]));

app.post("/v1/todos", (req, res) => {
  if (typeof req.body.title !== "string") return res.status(400).json({ error: "title required" });
  const todo = { id: nextId++, title: req.body.title, done: false };
  todos.set(todo.id, todo);
  res.status(201).location("/v1/todos/" + todo.id).json(todo);
});

app.patch("/v1/todos/:id", (req, res) => {
  const t = todos.get(Number(req.params.id));
  if (!t) return res.sendStatus(404);
  Object.assign(t, req.body);
  res.json(t);
});

app.delete("/v1/todos/:id", (req, res) => {
  todos.delete(Number(req.params.id));
  res.sendStatus(204);
});

app.listen(3000);`,
      javascript: `// Calling REST vs GraphQL from the browser
const user = await fetch("/v1/users/42").then((r) => r.json());
const posts = await fetch("/v1/users/42/posts?limit=3").then((r) => r.json());
// 2 round trips, and you get every field whether you need it or not

const { data } = await fetch("/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "{ user(id: 42) { name posts(limit: 3) { title } } }",
  }),
}).then((r) => r.json());
// 1 round trip, only the fields you asked for`,
    },
  };

  X.reliability = {
    story: {
      when: "1989/1998 Paxos · 2007 circuit breaker pattern · 2010–12 Chaos Monkey & Hystrix · 2014 Raft",
      who: "Leslie Lamport (Paxos); Michael Nygard (book 'Release It!'); Netflix (Chaos Monkey, Hystrix); Diego Ongaro & John Ousterhout (Raft)",
      before: "Teams tried to make every component perfect and treated failures as rare. One slow dependency could tie up all threads and cascade into a full outage.",
      why: "In large distributed systems something is always broken: disks die, networks drop packets, deploys go wrong. Nygard borrowed the electrical circuit breaker idea to stop cascading failures. Netflix, after moving to AWS, deliberately killed its own servers in production (Chaos Monkey) to force resilient design. Raft was designed to be an understandable alternative to Paxos for agreeing on state across machines.",
    },
    uses: [
      ["🎬", "Streaming", "Netflix shows a generic row if the personalization service is down."],
      ["☸️", "Kubernetes", "etcd (Raft) stores cluster state; liveness probes restart broken pods."],
      ["🕸️", "Service meshes", "Istio/Envoy add retries, timeouts and circuit breaking without code changes."],
      ["💳", "Payments", "Idempotent retries with backoff so customers aren't charged twice."],
      ["🧪", "Chaos engineering", "Teams inject failures (latency, crashes) to test resilience."],
      ["📟", "SRE practice", "SLOs and error budgets decide when to ship features vs fix reliability."],
    ],
    code: {
      python: `import random, time

def retry(fn, attempts=5, base=0.1, cap=5.0):
    for i in range(attempts):
        try:
            return fn()
        except Exception:
            if i == attempts - 1:
                raise
            delay = min(cap, base * 2 ** i)
            time.sleep(random.uniform(0, delay))    # "full jitter"

class CircuitBreaker:
    def __init__(self, threshold=5, cooldown=30):
        self.threshold, self.cooldown = threshold, cooldown
        self.failures, self.opened_at = 0, None

    def call(self, fn, fallback):
        if self.opened_at and time.time() - self.opened_at < self.cooldown:
            return fallback()                       # OPEN: fail fast
        try:
            result = fn()                           # CLOSED or HALF-OPEN trial
            self.failures, self.opened_at = 0, None
            return result
        except Exception:
            self.failures += 1
            if self.failures >= self.threshold or self.opened_at:
                self.opened_at = time.time()        # trip / re-trip
            return fallback()`,
      java: `import java.util.function.Supplier;

class CircuitBreaker {
    enum State { CLOSED, OPEN, HALF_OPEN }
    private State state = State.CLOSED;
    private int failures = 0;
    private long openedAt = 0;
    private final int threshold;
    private final long cooldownMs;

    CircuitBreaker(int threshold, long cooldownMs) { this.threshold = threshold; this.cooldownMs = cooldownMs; }

    synchronized <T> T call(Supplier<T> action, Supplier<T> fallback) {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - openedAt < cooldownMs) return fallback.get();
            state = State.HALF_OPEN;                  // let one trial through
        }
        try {
            T result = action.get();
            state = State.CLOSED; failures = 0;
            return result;
        } catch (RuntimeException e) {
            if (state == State.HALF_OPEN || ++failures >= threshold) {
                state = State.OPEN; openedAt = System.currentTimeMillis();
            }
            return fallback.get();
        }
    }
}
// In production: Resilience4j provides CircuitBreaker, Retry, Bulkhead, RateLimiter.`,
      typescript: `// Timeout + retry with exponential backoff and jitter
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function retry<T>(fn: () => Promise<T>, attempts = 4, baseMs = 100): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await withTimeout(fn(), 2000);
    } catch (e) {
      if (i >= attempts - 1) throw e;
      const delay = Math.random() * baseMs * 2 ** i;   // full jitter
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}`,
      javascript: `// Graceful degradation: show cached or default content if a service fails
async function getRecommendations(userId) {
  try {
    const res = await fetch("/api/recs/" + userId, { signal: AbortSignal.timeout(800) });
    if (!res.ok) throw new Error(res.status);
    const recs = await res.json();
    localStorage.setItem("recs", JSON.stringify(recs));   // remember last good answer
    return recs;
  } catch {
    return JSON.parse(localStorage.getItem("recs") || "[]") // stale but useful
      .concat({ title: "Trending now" });
  }
}`,
    },
  };

  X["url-shortener"] = {
    story: {
      when: "2002 TinyURL · 2008 bit.ly · 2009–2019 goo.gl",
      who: "Kevin Gilbertson (TinyURL); bit.ly (Betaworks); Twitter's t.co (2011)",
      before: "Long URLs broke across lines in emails and newsgroup posts, and were impossible to read aloud or print.",
      why: "Gilbertson built TinyURL to share long links on a newsgroup. Twitter's 140-character limit made shorteners essential and turned them into an analytics business (who clicked, from where). Twitter later wrapped every link in t.co for malware checking and click counting. Google shut down goo.gl in 2019, showing that a shortener must think about link longevity.",
    },
    uses: [
      ["🐦", "Social media", "t.co wraps every link on X/Twitter."],
      ["📣", "Marketing campaigns", "Trackable links in ads, SMS and print (bit.ly, Rebrandly)."],
      ["📱", "QR codes", "Short codes make QR codes smaller and easier to scan."],
      ["🔗", "Deep links", "Short links that open a specific screen in a mobile app."],
      ["📄", "Pastebins & file shares", "Same id → short code design (Pastebin, Google Drive links)."],
    ],
    code: {
      python: `import string

ALPHABET = string.digits + string.ascii_lowercase + string.ascii_uppercase   # 62 chars

def encode(n: int) -> str:
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, r = divmod(n, 62)
        out.append(ALPHABET[r])
    return "".join(reversed(out))

def decode(code: str) -> int:
    n = 0
    for ch in code:
        n = n * 62 + ALPHABET.index(ch)
    return n

class Shortener:
    def __init__(self):
        self.next_id, self.db = 100_000, {}
    def shorten(self, url):
        self.next_id += 1
        code = encode(self.next_id)
        self.db[code] = url
        return "https://sho.rt/" + code
    def resolve(self, code):
        return self.db.get(code)        # → HTTP 302 Location: <url>

s = Shortener()
print(s.shorten("https://example.com/a/very/long/path?with=params"))`,
      java: `class Base62 {
    private static final String ALPHABET =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    static String encode(long n) {
        if (n == 0) return "0";
        StringBuilder sb = new StringBuilder();
        while (n > 0) {
            sb.append(ALPHABET.charAt((int) (n % 62)));
            n /= 62;
        }
        return sb.reverse().toString();
    }

    static long decode(String s) {
        long n = 0;
        for (char c : s.toCharArray()) n = n * 62 + ALPHABET.indexOf(c);
        return n;
    }

    // Snowflake-style id: 41 bits time | 10 bits machine | 12 bits sequence
    static long snowflake(long epochMs, long machineId, long seq) {
        return (epochMs << 22) | (machineId << 12) | seq;
    }
}`,
      typescript: `// Minimal URL shortener service (Express + in-memory store)
import express from "express";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const encode = (n: number): string => (n < 62 ? ALPHABET[n] : encode(Math.floor(n / 62)) + ALPHABET[n % 62]);

const urls = new Map<string, string>();
let counter = 100_000;
const app = express();
app.use(express.json());

app.post("/shorten", (req, res) => {
  const url = String(req.body.url ?? "");
  if (!/^https?:\\/\\//.test(url)) return res.status(400).json({ error: "invalid url" });
  const code = encode(counter++);
  urls.set(code, url);
  res.status(201).json({ short: "http://localhost:3000/" + code });
});

app.get("/:code", (req, res) => {
  const url = urls.get(req.params.code);
  if (!url) return res.sendStatus(404);
  res.redirect(302, url);       // 302 so every click reaches us (analytics)
});

app.listen(3000);`,
      javascript: `const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function encode(n) {
  let s = "";
  do { s = ALPHABET[n % 62] + s; n = Math.floor(n / 62); } while (n > 0);
  return s;
}

console.log(encode(125));            // "21"
console.log(encode(3_521_614_606_207)); // "ZZZZZZZ" (62^7 - 1)

// Random codes are harder to guess than sequential ids:
const randomCode = (len = 7) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len)), (b) => ALPHABET[b % 62]).join("");`,
    },
  };

  X["news-feed"] = {
    story: {
      when: "1999 RSS · 2006 Facebook News Feed · 2010s ranked timelines",
      who: "Netscape/RSS creators; Facebook (News Feed, Sept 2006); Twitter's timeline infrastructure",
      before: "You visited each friend's profile or each website to check for updates. RSS readers pulled updates from subscribed sites on a schedule.",
      why: "Facebook's News Feed brought all friends' updates into one stream. Users protested at first, but engagement soared and every social app copied it. At scale, building feeds became a core infrastructure problem: Twitter described fanning out each tweet into followers' in-memory timelines, with special handling for accounts with millions of followers. Later, feeds moved from chronological to ML-ranked.",
    },
    uses: [
      ["📸", "Social apps", "Instagram, Facebook, X, LinkedIn home feeds."],
      ["🎵", "Content discovery", "TikTok For You and YouTube home pages (pull + ranking heavy)."],
      ["🔔", "Activity feeds", "GitHub dashboard, Slack and Jira activity streams."],
      ["🛍️", "Shopping", "Personalized product feeds."],
      ["📰", "News apps", "Google News and Flipboard aggregate and rank stories."],
    ],
    code: {
      python: `from collections import defaultdict, deque
import heapq, itertools

followers = defaultdict(set)              # author -> followers
timelines = defaultdict(lambda: deque(maxlen=800))   # user -> post ids (newest first)
posts, clock = {}, itertools.count()
CELEBRITY = 10_000

def publish(author, text):
    pid = next(clock)
    posts[pid] = {"id": pid, "author": author, "text": text}
    if len(followers[author]) < CELEBRITY:            # push (fan-out on write)
        for f in followers[author]:
            timelines[f].appendleft(pid)
    return pid

def feed(user, following, limit=20):
    pushed = list(timelines[user])
    celebs = [a for a in following if len(followers[a]) >= CELEBRITY]
    pulled = [p for p in posts.values() if p["author"] in celebs]   # pull at read time
    ids = heapq.nlargest(limit, set(pushed) | {p["id"] for p in pulled})
    return [posts[i] for i in ids]`,
      java: `import java.util.*;

class FeedService {
    private final Map<String, Set<String>> followers = new HashMap<>();
    private final Map<String, Deque<Long>> timelines = new HashMap<>();
    private long nextId = 1;

    void follow(String user, String author) {
        followers.computeIfAbsent(author, k -> new HashSet<>()).add(user);
    }

    long publish(String author) {
        long postId = nextId++;
        for (String f : followers.getOrDefault(author, Set.of())) {
            Deque<Long> t = timelines.computeIfAbsent(f, k -> new ArrayDeque<>());
            t.addFirst(postId);
            if (t.size() > 800) t.removeLast();      // keep timelines bounded
        }
        return postId;
    }

    List<Long> feed(String user, int limit) {
        return timelines.getOrDefault(user, new ArrayDeque<>()).stream().limit(limit).toList();
    }
}`,
      typescript: `// Fan-out on write with Redis lists (ioredis), run inside a queue worker
import Redis from "ioredis";
const redis = new Redis();

export async function onNewPost(postId: string, authorId: string, followerIds: string[]) {
  const pipe = redis.pipeline();
  for (const f of followerIds) {
    pipe.lpush("feed:" + f, postId);
    pipe.ltrim("feed:" + f, 0, 799);         // keep the newest 800
  }
  await pipe.exec();
}

export async function readFeed(userId: string, page = 0, size = 20) {
  const ids = await redis.lrange("feed:" + userId, page * size, page * size + size - 1);
  return ids;   // then batch-load post bodies: SELECT ... WHERE id IN (...)
}`,
      javascript: `// Simple ranking: mix recency with engagement (a "hot" score)
function hotScore(post, now = Date.now()) {
  const hours = (now - post.createdAt) / 36e5;
  const engagement = post.likes + 2 * post.comments + 3 * post.shares;
  return Math.log10(Math.max(engagement, 1)) - hours / 12;
}

const feed = [
  { id: 1, likes: 500, comments: 40, shares: 10, createdAt: Date.now() - 20 * 36e5 },
  { id: 2, likes: 12, comments: 3, shares: 0, createdAt: Date.now() - 1 * 36e5 },
].sort((a, b) => hotScore(b) - hotScore(a));
console.log(feed.map((p) => p.id));`,
    },
  };

  X["chat-system"] = {
    story: {
      when: "1973 Talkomatic · 1988 IRC · 1996 ICQ · 1999 XMPP · 2009 WhatsApp · 2011 WebSocket standard",
      who: "Jarkko Oikarinen (IRC); Mirabilis (ICQ); Jeremie Miller (Jabber/XMPP); Jan Koum & Brian Acton (WhatsApp); IETF RFC 6455 (WebSocket)",
      before: "Email and bulletin boards: store and forward, with minutes or hours of delay. Early web chats polled the server every few seconds, wasting bandwidth and battery.",
      why: "People wanted conversations in real time. IRC created channels on networks of relay servers. Web apps hacked around HTTP with long polling ('Comet') until WebSockets gave browsers a persistent two-way connection. WhatsApp famously served hundreds of millions of users with a small team, running on Erlang (FreeBSD + ejabberd heritage), a language built for telecom switches.",
    },
    uses: [
      ["💬", "Messengers", "WhatsApp, Telegram, Signal, Messenger."],
      ["🏢", "Team chat", "Slack, Microsoft Teams, Discord."],
      ["🎧", "Customer support", "Live chat widgets on websites."],
      ["🎮", "Games & live streams", "In-game chat, Twitch chat."],
      ["📈", "Real-time apps", "The same WebSocket stack powers live dashboards, trading screens and collaborative editors."],
    ],
    code: {
      python: `# WebSocket chat server (pip install websockets)
import asyncio, json, websockets

rooms: dict[str, set] = {}

async def handler(ws):
    room = None
    async for raw in ws:
        msg = json.loads(raw)
        if msg["type"] == "join":
            room = msg["room"]
            rooms.setdefault(room, set()).add(ws)
        elif msg["type"] == "say" and room:
            out = json.dumps({"from": msg["user"], "text": msg["text"]})
            await asyncio.gather(*(c.send(out) for c in rooms[room] if c is not ws))
    if room:
        rooms[room].discard(ws)          # disconnected

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()           # run forever

asyncio.run(main())`,
      java: `// Spring WebSocket handler that broadcasts to everyone connected
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

class ChatHandler extends TextWebSocketHandler {
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession s) { sessions.add(s); }

    @Override
    protected void handleTextMessage(WebSocketSession from, TextMessage msg) throws Exception {
        for (WebSocketSession s : sessions)
            if (s.isOpen() && !s.equals(from)) s.sendMessage(msg);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession s, CloseStatus status) { sessions.remove(s); }
}`,
      typescript: `// Node WebSocket server with presence (npm i ws)
import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });
const online = new Map<string, WebSocket>();   // userId -> socket (the session registry)

wss.on("connection", (ws, req) => {
  const user = new URL(req.url ?? "", "http://x").searchParams.get("user") ?? "anon";
  online.set(user, ws);

  ws.on("message", (raw) => {
    const { to, text } = JSON.parse(raw.toString());
    const target = online.get(to);
    // 1) persist first (DB), 2) deliver if online, else push notification
    if (target?.readyState === WebSocket.OPEN) target.send(JSON.stringify({ from: user, text }));
    else console.log("queue push notification for", to);
    ws.send(JSON.stringify({ ack: true }));        // "sent" tick
  });

  ws.on("close", () => online.delete(user));
});`,
      javascript: `// Browser client with auto-reconnect
function connect(user, onMessage) {
  let ws, retry = 0;
  const open = () => {
    ws = new WebSocket("ws://localhost:8080/?user=" + encodeURIComponent(user));
    ws.onopen = () => (retry = 0);
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = () => setTimeout(open, Math.min(30000, 500 * 2 ** retry++));
  };
  open();
  return { send: (to, text) => ws.readyState === 1 && ws.send(JSON.stringify({ to, text })) };
}

const chat = connect("alice", (m) => console.log(m.from + ": " + m.text));
// chat.send("bob", "hi!");`,
    },
  };
})();
