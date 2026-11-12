/* AI & LLM extras: history ("story"), real-world uses, and code samples (Python + JavaScript) */
(function () {
  const X = (L.extras = L.extras || {});

  X["ai-landscape"] = {
    story: {
      when: "1950 Turing's paper · 1956 the name 'artificial intelligence' · 2012 deep learning · 2022 ChatGPT",
      who: "Alan Turing ('Computing Machinery and Intelligence'); John McCarthy, Marvin Minsky, Claude Shannon & Nathaniel Rochester (the Dartmouth workshop); later Geoffrey Hinton, Yann LeCun, Yoshua Bengio and many others",
      before: "Computers were seen as fast calculators that did exactly what a programmer spelled out. 'Thinking' was assumed to be uniquely human.",
      why: "Turing argued that if a machine's conversation can't be told apart from a person's, we should call it intelligent. The Dartmouth group proposed that every aspect of learning could be described precisely enough for a machine to simulate it. Progress came in waves: logic and search, expert systems, statistical learning, then deep learning once data and GPUs were available.",
    },
    uses: [
      ["🗺️", "Symbolic AI", "Route planners, compilers' optimizers, schedulers, chess engines."],
      ["📈", "Machine learning", "Fraud scores, recommendations, demand forecasts."],
      ["📷", "Deep learning", "Vision, speech recognition, translation."],
      ["💬", "Generative AI", "Chat assistants, code completion, image generation."],
    ],
    code: {
      python: `# The same task three ways: is this message spam?

# 1) Symbolic AI: a human writes the rules
def spam_rules(text):
    return any(w in text.lower() for w in ("free money", "winner", "click here"))

# 2) Machine learning: rules are learned from labelled examples
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline

texts = ["free money now", "meeting at 3pm", "you are a winner", "lunch tomorrow?"]
labels = [1, 0, 1, 0]
model = make_pipeline(TfidfVectorizer(), LogisticRegression()).fit(texts, labels)
print(model.predict(["claim your free prize"]))

# 3) Generative AI: describe the task in words to an LLM
#    (ask_llm is a placeholder for a call to your model provider's API)
def spam_llm(text, ask_llm):
    prompt = "Answer with exactly SPAM or OK. Is this message spam?\\n\\n" + text
    return ask_llm(prompt).strip() == "SPAM"`,
      javascript: `// Symbolic AI in miniature: a tiny forward-chaining rule engine
const rules = [
  { if: ["has_fur", "says_meow"], then: "is_cat" },
  { if: ["is_cat"], then: "is_mammal" },
  { if: ["is_mammal"], then: "is_animal" },
];

function infer(facts) {
  const known = new Set(facts);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rules) {
      if (!known.has(r.then) && r.if.every((f) => known.has(f))) {
        known.add(r.then);     // a new fact was derived
        changed = true;
      }
    }
  }
  return [...known];
}

console.log(infer(["has_fur", "says_meow"]));
// ["has_fur", "says_meow", "is_cat", "is_mammal", "is_animal"]`,
    },
  };

  X["ai-search"] = {
    story: {
      when: "1959 Dijkstra · 1968 A*",
      who: "Peter Hart, Nils Nilsson & Bertram Raphael at Stanford Research Institute, for Shakey the robot",
      before: "Dijkstra's algorithm found shortest paths but explored equally in all directions; greedy methods were fast but could return poor routes.",
      why: "Shakey, the first general-purpose mobile robot, had to plan routes through rooms on a very slow computer. The team added a heuristic estimate of the remaining distance to Dijkstra's cost-so-far and proved that, as long as the estimate never overestimates, the result is still optimal while exploring far fewer states.",
    },
    uses: [
      ["🗺️", "Maps & navigation", "Route planning (A* with preprocessing such as contraction hierarchies)."],
      ["🎮", "Game AI", "Path-finding for characters in almost every game engine."],
      ["🤖", "Robotics", "Motion planning for arms, drones and warehouse robots."],
      ["♟️", "Game playing", "Minimax and Monte Carlo tree search in chess and Go engines."],
    ],
    code: {
      python: `import heapq

def a_star(grid, start, goal):
    """grid: list of strings, '#' = wall. Returns the shortest path as a list of cells."""
    h = lambda p: abs(p[0] - goal[0]) + abs(p[1] - goal[1])   # Manhattan: admissible
    open_heap = [(h(start), 0, start)]
    g = {start: 0}
    parent = {}
    while open_heap:
        f, cost, cur = heapq.heappop(open_heap)
        if cur == goal:
            path = [cur]
            while cur in parent:
                cur = parent[cur]
                path.append(cur)
            return path[::-1]
        if cost > g[cur]:
            continue                                   # stale queue entry
        r, c = cur
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] != "#":
                if cost + 1 < g.get((nr, nc), float("inf")):
                    g[(nr, nc)] = cost + 1
                    parent[(nr, nc)] = cur
                    heapq.heappush(open_heap, (cost + 1 + h((nr, nc)), cost + 1, (nr, nc)))
    return None

grid = ["....#....",
        "....#....",
        "........."]
print(a_star(grid, (0, 0), (0, 8)))`,
      javascript: `function aStar(grid, start, goal) {
  const key = ([r, c]) => r + "," + c;
  const h = ([r, c]) => Math.abs(r - goal[0]) + Math.abs(c - goal[1]);
  const g = new Map([[key(start), 0]]), parent = new Map();
  const open = [start];                       // use a binary heap for large grids
  while (open.length) {
    open.sort((a, b) => g.get(key(a)) + h(a) - (g.get(key(b)) + h(b)));
    const cur = open.shift();
    if (key(cur) === key(goal)) {
      const path = [cur];
      let k = key(cur);
      while (parent.has(k)) { path.unshift(parent.get(k)); k = key(parent.get(k)); }
      return path;
    }
    const [r, c] = cur;
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (grid[nr]?.[nc] === undefined || grid[nr][nc] === "#") continue;
      const cost = g.get(key(cur)) + 1;
      if (cost < (g.get(key([nr, nc])) ?? Infinity)) {
        g.set(key([nr, nc]), cost);
        parent.set(key([nr, nc]), cur);
        open.push([nr, nc]);
      }
    }
  }
  return null;
}`,
    },
  };

  X["reinforcement-learning"] = {
    story: {
      when: "1957 dynamic programming · 1988 TD learning · 1989 Q-learning · 2015 DQN · 2016 AlphaGo",
      who: "Richard Bellman (Bellman equation); Richard Sutton & Andrew Barto (temporal-difference learning, the field's textbook); Chris Watkins (Q-learning); DeepMind (DQN, AlphaGo)",
      before: "Optimal control required a complete mathematical model of the system. Animal-learning researchers described trial-and-error learning but had no algorithm for it.",
      why: "Many problems have no model and no teacher, only consequences: a game is won or lost, a robot falls or stays up. Sutton's temporal-difference methods and Watkins' Q-learning let an agent learn long-term value directly from experience. Combined with deep networks, the approach mastered Atari games from pixels and beat the world champion at Go.",
    },
    uses: [
      ["♟️", "Games", "AlphaGo/AlphaZero, Atari, StarCraft and Dota agents."],
      ["🦾", "Robotics", "Walking, grasping and drone control trained in simulation."],
      ["💬", "Tuning LLMs", "Reinforcement learning from human feedback shapes chat models."],
      ["⚙️", "Operations", "Data-centre cooling, chip floor-planning, ad bidding, recommendations."],
    ],
    code: {
      python: `import random

# Tabular Q-learning on a 1-D corridor: states 0..5, start at 0, reward at state 5
N, ACTIONS = 6, (-1, +1)                 # move left / right
Q = [[0.0, 0.0] for _ in range(N)]
alpha, gamma, eps = 0.5, 0.9, 0.2

for episode in range(300):
    s = 0
    while s != N - 1:
        # epsilon-greedy action choice
        a = random.randrange(2) if random.random() < eps else max((0, 1), key=lambda i: Q[s][i])
        s2 = min(max(s + ACTIONS[a], 0), N - 1)
        r = 10 if s2 == N - 1 else -1
        target = r + (0 if s2 == N - 1 else gamma * max(Q[s2]))
        Q[s][a] += alpha * (target - Q[s][a])      # temporal-difference update
        s = s2

print(["<>"[max((0, 1), key=lambda i: q[i])] for q in Q[:-1]])   # learned policy: all '>' (go right)`,
      javascript: `// Tabular Q-learning: generic over any small environment
function qLearning(env, { episodes = 500, alpha = 0.5, gamma = 0.9, eps = 0.2 } = {}) {
  const Q = Array.from({ length: env.states }, () => new Array(env.actions).fill(0));
  const argmax = (row) => row.indexOf(Math.max(...row));
  for (let e = 0; e < episodes; e++) {
    let s = env.reset();
    for (let t = 0; t < 200; t++) {
      const a = Math.random() < eps ? Math.floor(Math.random() * env.actions) : argmax(Q[s]);
      const { next, reward, done } = env.step(s, a);
      const target = reward + (done ? 0 : gamma * Math.max(...Q[next]));
      Q[s][a] += alpha * (target - Q[s][a]);
      s = next;
      if (done) break;
    }
  }
  return Q;
}

// Corridor of 6 cells; reaching the last one ends the episode
const corridor = {
  states: 6, actions: 2, reset: () => 0,
  step(s, a) {
    const next = Math.min(5, Math.max(0, s + (a ? 1 : -1)));
    return { next, reward: next === 5 ? 10 : -1, done: next === 5 };
  },
};
console.log(qLearning(corridor).slice(0, -1).map((row) => (row[1] > row[0] ? "→" : "←")));   // all →`,
    },
  };

  X["embeddings"] = {
    story: {
      when: "1957 the distributional hypothesis · 1990 LSA · 2013 word2vec · 2018 contextual embeddings",
      who: "J. R. Firth ('You shall know a word by the company it keeps'); Deerwester et al. (latent semantic analysis); Tomas Mikolov and colleagues at Google (word2vec); Pennington, Socher & Manning (GloVe)",
      before: "Words were opaque IDs. Search matched exact keywords, so 'car' never found 'automobile', and every NLP system needed hand-built thesauri and features.",
      why: "word2vec showed that a tiny neural network trained to predict neighbouring words produces vectors where distance means similarity and directions mean relationships, and that it can be trained on billions of words in hours. Dense vectors became the common language for text, images, products and users.",
    },
    uses: [
      ["🔎", "Semantic search", "Find documents by meaning, not exact words."],
      ["📚", "RAG", "Retrieve the passages an LLM needs to answer a question."],
      ["🎧", "Recommendations", "Songs, videos and products near what you liked."],
      ["🧹", "Dedup & clustering", "Group similar tickets, detect near-duplicate content."],
    ],
    code: {
      python: `import numpy as np

def cosine(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

# Toy 4-D vectors [royal, male, female, fruit]; real ones come from an embedding model
vec = {
    "king":  np.array([1.0, 1.0, 0.0, 0.0]),
    "queen": np.array([1.0, 0.0, 1.0, 0.0]),
    "man":   np.array([0.0, 1.0, 0.0, 0.0]),
    "woman": np.array([0.0, 0.0, 1.0, 0.0]),
    "apple": np.array([0.0, 0.0, 0.0, 1.0]),
}

def nearest(query, k=3, exclude=()):
    scored = [(cosine(query, v), w) for w, v in vec.items() if w not in exclude]
    return sorted(scored, reverse=True)[:k]

print(nearest(vec["king"], exclude=("king",)))
print(nearest(vec["king"] - vec["man"] + vec["woman"], k=1, exclude=("king", "man", "woman")))   # queen

# Brute-force semantic search over many documents: one matrix product
def search(doc_matrix, query_vec, k=5):
    docs = doc_matrix / np.linalg.norm(doc_matrix, axis=1, keepdims=True)
    q = query_vec / np.linalg.norm(query_vec)
    scores = docs @ q
    top = np.argsort(-scores)[:k]
    return list(zip(top.tolist(), scores[top].tolist()))`,
      javascript: `const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const norm = (a) => Math.sqrt(dot(a, a));
const cosine = (a, b) => dot(a, b) / (norm(a) * norm(b));

// A minimal in-memory vector store
class VectorStore {
  constructor() { this.items = []; }
  add(id, vector, text) {
    const n = norm(vector);
    this.items.push({ id, text, vector: vector.map((v) => v / n) });   // store unit vectors
  }
  search(query, k = 3) {
    const n = norm(query), q = query.map((v) => v / n);
    return this.items
      .map((it) => ({ id: it.id, text: it.text, score: dot(it.vector, q) }))   // dot = cosine for unit vectors
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

const store = new VectorStore();
store.add(1, [0.9, 0.1, 0.0], "How to reset your password");
store.add(2, [0.1, 0.9, 0.1], "Refund policy for annual plans");
console.log(store.search([0.2, 0.8, 0.0], 1));   // the refund document`,
    },
  };

  X["tokenization"] = {
    story: {
      when: "1994 BPE for compression · 2015 BPE for translation · 2018 SentencePiece",
      who: "Philip Gage (byte-pair encoding as a compression algorithm); Rico Sennrich, Barry Haddow & Alexandra Birch (subword units for neural translation); Taku Kudo (SentencePiece)",
      before: "Models used a fixed list of whole words, typically the 50,000 most common. Everything else became a single <UNK> token, so names, typos and rare words were simply lost.",
      why: "Translation systems kept failing on rare and compound words. Sennrich's team reused an old compression trick: repeatedly merge the most frequent pair of symbols. The resulting subword vocabulary can spell any word from pieces while keeping common words whole, and it became the standard for GPT-style models.",
    },
    uses: [
      ["💬", "Every LLM", "GPT-style models use BPE variants; BERT uses WordPiece."],
      ["💵", "API pricing & limits", "Usage is billed and capped per token."],
      ["🌍", "Multilingual models", "One shared subword vocabulary covers 100+ languages."],
      ["🧬", "Beyond text", "DNA, code and audio models tokenize their inputs too."],
    ],
    code: {
      python: `from collections import Counter

def train_bpe(text, num_merges):
    """Learn BPE merge rules. Words are tuples of symbols; '_' marks a word start."""
    words = Counter(tuple("_" + w) for w in text.split())
    merges = []
    for _ in range(num_merges):
        pairs = Counter()
        for word, freq in words.items():
            for a, b in zip(word, word[1:]):
                pairs[a, b] += freq
        if not pairs:
            break
        (a, b), count = pairs.most_common(1)[0]
        if count < 2:
            break
        merges.append((a, b))
        words = Counter({merge_word(word, a, b): freq for word, freq in words.items()})
    return merges

def merge_word(word, a, b):
    out, i = [], 0
    while i < len(word):
        if i + 1 < len(word) and word[i] == a and word[i + 1] == b:
            out.append(a + b); i += 2
        else:
            out.append(word[i]); i += 1
    return tuple(out)

def encode(word, merges):
    symbols = tuple("_" + word)
    for a, b in merges:                 # apply the merges in the order they were learned
        symbols = merge_word(symbols, a, b)
    return list(symbols)

merges = train_bpe("low lower lowest new newer newest wide wider widest", 12)
print(encode("lowest", merges), encode("widen", merges))   # an unseen word still tokenizes`,
      javascript: `function trainBPE(text, numMerges) {
  let words = text.split(/\\s+/).filter(Boolean).map((w) => ["_", ...w]);
  const merges = [];
  for (let m = 0; m < numMerges; m++) {
    const counts = new Map();
    for (const w of words)
      for (let i = 0; i < w.length - 1; i++) {
        const k = w[i] + " " + w[i + 1];
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    let best = null;
    for (const [k, n] of counts) if (!best || n > best[1]) best = [k, n];
    if (!best || best[1] < 2) break;
    const [a, b] = best[0].split(" ");
    merges.push([a, b]);
    words = words.map((w) => mergeWord(w, a, b));
  }
  return merges;
}

function mergeWord(w, a, b) {
  const out = [];
  for (let i = 0; i < w.length; i++) {
    if (w[i] === a && w[i + 1] === b) { out.push(a + b); i++; } else out.push(w[i]);
  }
  return out;
}

const encode = (word, merges) => merges.reduce((sym, [a, b]) => mergeWord(sym, a, b), ["_", ...word]);

const merges = trainBPE("low lower lowest new newer newest wide wider widest", 12);
console.log(encode("lowest", merges), encode("widen", merges));`,
    },
  };

  X["transformers"] = {
    story: {
      when: "2014 attention for translation · 2017 'Attention Is All You Need' · 2018 BERT & GPT",
      who: "Dzmitry Bahdanau, Kyunghyun Cho & Yoshua Bengio (attention); Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan Gomez, Łukasz Kaiser & Illia Polosukhin at Google (the Transformer)",
      before: "Recurrent networks (RNNs, LSTMs) read text one token at a time, squeezing everything seen so far into a single hidden vector. They forgot long-range context and could not be parallelized, so training was slow.",
      why: "Attention was first added to RNN translators so the decoder could look back at any source word. The 2017 paper removed the recurrence entirely: with attention alone, every token connects directly to every other and all positions are computed in parallel on GPUs. That made it practical to train on vastly more data, and the architecture now underlies language, vision, audio and protein models.",
    },
    uses: [
      ["💬", "LLMs", "GPT, Claude, Gemini, Llama: decoder-only transformers."],
      ["🔎", "Search & embeddings", "BERT-style encoders rank results and produce embeddings."],
      ["🖼️", "Vision & images", "Vision transformers; diffusion models with transformer backbones."],
      ["🧬", "Science", "AlphaFold's protein structure prediction relies on attention."],
    ],
    code: {
      python: `import numpy as np

def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def attention(Q, K, V, causal=False):
    """Scaled dot-product attention. Q, K, V: (seq_len, d)."""
    d = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d)                     # (seq, seq): query i vs key j
    if causal:                                        # decoder: no peeking at later tokens
        mask = np.triu(np.ones_like(scores), k=1).astype(bool)
        scores = np.where(mask, -np.inf, scores)
    weights = softmax(scores)                         # each row sums to 1
    return weights @ V, weights

rng = np.random.default_rng(0)
x = rng.normal(size=(5, 8))                           # 5 tokens, 8-dim embeddings
Wq, Wk, Wv = (rng.normal(size=(8, 8)) for _ in range(3))   # learned in a real model
out, w = attention(x @ Wq, x @ Wk, x @ Wv, causal=True)
print(w.round(2))                                     # lower-triangular weights

# One pre-norm transformer block, in pseudocode:
#   x = x + multi_head_attention(layer_norm(x))
#   x = x + mlp(layer_norm(x))`,
      javascript: `const softmax = (row) => {
  const m = Math.max(...row), e = row.map((v) => Math.exp(v - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
};
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

// Q, K, V: arrays of vectors, one per token
function attention(Q, K, V, causal = false) {
  const d = Q[0].length;
  const weights = Q.map((q, i) =>
    softmax(K.map((k, j) => (causal && j > i ? -Infinity : dot(q, k) / Math.sqrt(d)))));
  const output = weights.map((w) =>
    V[0].map((_, dim) => w.reduce((s, wj, j) => s + wj * V[j][dim], 0)));   // weighted mix of values
  return { weights, output };
}

const x = [[1, 0], [0, 1], [1, 1]];        // three toy token vectors
console.log(attention(x, x, x, true).weights);
// row 0 can only attend to itself; row 2 attends to all three`,
    },
  };

  X["llm-generation"] = {
    story: {
      when: "1948 Shannon's n-gram experiments · 2018 GPT-1 · 2020 GPT-3 · 2022 ChatGPT",
      who: "Claude Shannon (statistical models of English); Yoshua Bengio (neural language models, 2003); OpenAI (the GPT series); Google (BERT, T5); then Anthropic, Meta, Mistral and others",
      before: "Each language task (translation, summarization, sentiment, question answering) needed its own model, its own labelled dataset and its own team. N-gram language models could only look a few words back.",
      why: "Predicting the next word needs no human labels, so a transformer can be trained on essentially all available text. Researchers found that one large pre-trained model, steered only by a text prompt, could do tasks it was never explicitly trained for. ChatGPT put that behind a chat box in November 2022 and reached about 100 million users within two months.",
    },
    uses: [
      ["🧑‍💻", "Coding assistants", "Completion, review, debugging, whole-task agents."],
      ["✍️", "Writing & summarizing", "Drafts, translations, meeting notes, reports."],
      ["🎧", "Customer support", "Assistants grounded in company knowledge bases."],
      ["🗂️", "Extraction & classification", "Turn messy text into structured data at scale."],
    ],
    code: {
      python: `import math, random

def sample_next(logits, temperature=1.0, top_k=None, top_p=None):
    """logits: {token: score}. Returns one sampled token."""
    if temperature == 0:
        return max(logits, key=logits.get)                   # greedy
    items = sorted(logits.items(), key=lambda kv: -kv[1])
    if top_k:
        items = items[:top_k]
    m = items[0][1]
    probs = [math.exp((score - m) / temperature) for _, score in items]
    total = sum(probs)
    probs = [p / total for p in probs]
    if top_p:                                                # nucleus: smallest set with mass >= top_p
        cum, keep = 0.0, 0
        for p in probs:
            cum += p; keep += 1
            if cum >= top_p:
                break
        items, probs = items[:keep], probs[:keep]
    return random.choices([tok for tok, _ in items], weights=probs)[0]

logits = {"mat": 5.0, "floor": 4.3, "sofa": 4.0, "moon": 1.2, "banana": 0.2}
print([sample_next(logits, temperature=0.7, top_p=0.9) for _ in range(8)])

# Autoregressive generation is just this in a loop:
def generate(model, tokens, max_new=50, stop=None, **sampling):
    for _ in range(max_new):
        nxt = sample_next(model(tokens), **sampling)         # model returns next-token logits
        if nxt == stop:
            break
        tokens.append(nxt)
    return tokens`,
      javascript: `function sampleNext(logits, { temperature = 1, topK = Infinity, topP = 1 } = {}) {
  let items = Object.entries(logits).sort((a, b) => b[1] - a[1]);
  if (temperature === 0) return items[0][0];                 // greedy
  items = items.slice(0, topK);
  const max = items[0][1];
  let probs = items.map(([, s]) => Math.exp((s - max) / temperature));
  const sum = probs.reduce((a, b) => a + b, 0);
  probs = probs.map((p) => p / sum);
  // nucleus (top-p): keep the smallest prefix whose mass reaches topP
  let cum = 0, keep = 0;
  while (keep < probs.length && cum < topP) cum += probs[keep++];
  let r = Math.random() * cum;
  for (let i = 0; i < keep; i++) if ((r -= probs[i]) <= 0) return items[i][0];
  return items[keep - 1][0];
}

// A well-structured prompt: role, task, constraints, output format, then the data
const buildPrompt = (ticket) => [
  { role: "system", content: "You are a support triage assistant. Reply with JSON only." },
  { role: "user", content:
      "Classify the ticket below.\\n" +
      "Return {\\"team\\": \\"billing\\" | \\"technical\\" | \\"account\\", \\"urgent\\": boolean}.\\n\\n" +
      "Ticket: " + ticket },
];`,
    },
  };

  X["rag"] = {
    story: {
      when: "1970s–1994 TF-IDF & BM25 · 2017 FAISS · 2020 the RAG paper",
      who: "Karen Spärck Jones and Stephen Robertson (TF-IDF, BM25); Patrick Lewis and colleagues at Facebook AI Research, UCL and NYU (Retrieval-Augmented Generation); Karpukhin et al. (dense passage retrieval)",
      before: "A language model's knowledge was frozen inside its weights at training time. Updating a fact meant retraining, there was no way to cite a source, and when the model didn't know, it made something up.",
      why: "Lewis's team combined a neural retriever with a generator so the model could look things up in an external index, like an open-book exam. Once chat LLMs arrived, every company wanted answers grounded in its own documents, and retrieval turned out to be far cheaper, fresher and more controllable than fine-tuning on that data.",
    },
    uses: [
      ["🏢", "Enterprise knowledge assistants", "Answer questions over wikis, policies and tickets."],
      ["🎧", "Customer support bots", "Grounded in help-centre articles, with links."],
      ["🧑‍💻", "Code assistants", "Retrieve relevant files and docs from a repository."],
      ["⚖️", "Legal & medical research", "Answers with citations professionals can verify."],
    ],
    code: {
      python: `import numpy as np

def chunk(text, size=500, overlap=50):
    """Split into overlapping word windows. Real systems split on headings/paragraphs."""
    words = text.split()
    return [" ".join(words[i:i + size]) for i in range(0, len(words), size - overlap)]

class RAG:
    def __init__(self, embed, llm):
        self.embed, self.llm = embed, llm       # embed(text) -> vector, llm(prompt) -> str
        self.chunks, self.vectors = [], []

    def index(self, documents):                 # offline
        for doc_id, text in documents.items():
            for piece in chunk(text):
                v = np.asarray(self.embed(piece), dtype=float)
                self.chunks.append((doc_id, piece))
                self.vectors.append(v / np.linalg.norm(v))

    def retrieve(self, question, k=4):          # online
        q = np.asarray(self.embed(question), dtype=float)
        scores = np.array(self.vectors) @ (q / np.linalg.norm(q))
        return [self.chunks[i] for i in np.argsort(-scores)[:k]]

    def answer(self, question):
        hits = self.retrieve(question)
        context = "\\n".join(f"[{i + 1}] ({doc}) {text}" for i, (doc, text) in enumerate(hits))
        prompt = ("Answer using only the context. If it is not there, say you don't know. "
                  "Cite sources like [1].\\n\\nContext:\\n" + context + "\\n\\nQuestion: " + question)
        return self.llm(prompt)`,
      javascript: `// Minimal RAG pipeline. embed(text) -> number[] and llm(prompt) -> string are your provider calls.
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const unit = (v) => { const n = Math.sqrt(dot(v, v)); return v.map((x) => x / n); };

function chunk(text, size = 500, overlap = 50) {
  const words = text.split(/\\s+/), out = [];
  for (let i = 0; i < words.length; i += size - overlap) out.push(words.slice(i, i + size).join(" "));
  return out;
}

async function buildIndex(documents, embed) {          // offline
  const index = [];
  for (const [docId, text] of Object.entries(documents))
    for (const piece of chunk(text)) index.push({ docId, text: piece, vector: unit(await embed(piece)) });
  return index;
}

async function answer(question, index, embed, llm, k = 4) {   // online
  const q = unit(await embed(question));
  const hits = index.map((c) => ({ ...c, score: dot(c.vector, q) }))
    .sort((a, b) => b.score - a.score).slice(0, k);
  const context = hits.map((h, i) => "[" + (i + 1) + "] (" + h.docId + ") " + h.text).join("\\n");
  return llm(
    "Answer using only the context. If it is not there, say you don't know. Cite sources like [1].\\n\\n" +
    "Context:\\n" + context + "\\n\\nQuestion: " + question);
}`,
    },
  };

  X["agents"] = {
    story: {
      when: "1966 Shakey · 2022 ReAct · 2023 function calling · 2024 Model Context Protocol",
      who: "SRI's Shakey team (the first robot to plan its own actions); Shunyu Yao and colleagues (ReAct: reasoning + acting); OpenAI, Anthropic and Google (tool-use APIs); Anthropic (the open Model Context Protocol)",
      before: "Chatbots could only talk. To get anything done, a person copied the model's suggestion into another program, ran it, and pasted the result back. Earlier 'agents' in classic AI followed hand-written plans and broke outside their scripted world.",
      why: "Language models turned out to be good at deciding what to do next, but could not look anything up or act. ReAct showed that letting a model alternate between reasoning and calling tools made it far more capable and accurate. Vendors then added structured tool calling to their APIs, and a shared protocol let tools be written once and used by any agent.",
    },
    uses: [
      ["🧑‍💻", "Coding agents", "Read a codebase, edit files, run tests, open pull requests."],
      ["🔬", "Research assistants", "Search, read many sources, write a cited report."],
      ["🎧", "Support automation", "Look up orders, issue refunds within policy, escalate the rest."],
      ["📊", "Data analysis", "Write and run SQL or Python, then explain the results."],
    ],
    code: {
      python: `import json

# 1) Tools: plain functions plus a description the model can read
def calculator(expression: str) -> str:
    allowed = set("0123456789+-*/(). ")
    if not set(expression) <= allowed:
        return "error: unsupported characters"
    return str(eval(expression))            # safe here only because input is restricted

TOOLS = {
    "calculator": {
        "fn": calculator,
        "description": "Evaluate an arithmetic expression. Use for any maths.",
        "input_schema": {"type": "object", "properties": {"expression": {"type": "string"}},
                         "required": ["expression"]},
    },
}

# 2) The agent loop. call_llm(messages, tools) is your provider call; it returns
#    {"text": str} or {"tool_calls": [{"id", "name", "arguments"}]}
def run_agent(goal, call_llm, max_steps=10):
    messages = [{"role": "user", "content": goal}]
    for _ in range(max_steps):
        reply = call_llm(messages, TOOLS)
        if not reply.get("tool_calls"):
            return reply["text"]                              # finished
        messages.append({"role": "assistant", "tool_calls": reply["tool_calls"]})
        for call in reply["tool_calls"]:
            tool = TOOLS.get(call["name"])
            result = tool["fn"](**call["arguments"]) if tool else "error: unknown tool"
            messages.append({"role": "tool", "tool_call_id": call["id"],
                             "content": json.dumps(result)})   # the observation
    return "Stopped: step limit reached"`,
      javascript: `// Tools: a function plus a schema the model can read
const tools = {
  get_order_status: {
    description: "Look up the status of a customer order by its id.",
    inputSchema: { type: "object", properties: { orderId: { type: "string" } }, required: ["orderId"] },
    needsApproval: false,
    run: async ({ orderId }) => ({ orderId, status: "shipped", eta: "2 days" }),
  },
  issue_refund: {
    description: "Refund an order. Only when the user explicitly asks.",
    inputSchema: { type: "object", properties: { orderId: { type: "string" } }, required: ["orderId"] },
    needsApproval: true,                       // side effect → human in the loop
    run: async ({ orderId }) => ({ refunded: orderId }),
  },
};

// callLLM(messages, tools) is your provider call; it returns { text } or { toolCalls: [{ id, name, args }] }
async function runAgent(goal, callLLM, askHuman, maxSteps = 10) {
  const messages = [{ role: "user", content: goal }];
  for (let step = 0; step < maxSteps; step++) {
    const reply = await callLLM(messages, tools);
    if (!reply.toolCalls?.length) return reply.text;              // done
    messages.push({ role: "assistant", toolCalls: reply.toolCalls });
    for (const call of reply.toolCalls) {
      const tool = tools[call.name];
      let result;
      if (!tool) result = { error: "unknown tool" };
      else if (tool.needsApproval && !(await askHuman(call))) result = { error: "denied by user" };
      else result = await tool.run(call.args);
      messages.push({ role: "tool", toolCallId: call.id, content: JSON.stringify(result) });
    }
  }
  return "Stopped: step limit reached";
}`,
    },
  };
})();
