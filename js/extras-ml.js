/* Machine learning extras: history ("story"), real-world uses, and code samples (Python + JavaScript) */
(function () {
  const X = (L.extras = L.extras || {});

  X["ml-basics"] = {
    story: {
      when: "1951 k-NN · 1959 the term 'machine learning'",
      who: "Arthur Samuel (IBM) coined the term for his self-improving checkers program; Evelyn Fix & Joseph Hodges described nearest-neighbour classification; Tom Mitchell gave the standard definition (1997)",
      before: "Every behaviour had to be programmed as explicit rules by an expert. Rule-based 'expert systems' needed thousands of hand-written if/then statements and broke on cases nobody anticipated.",
      why: "Some tasks are easy for people but impossible to write rules for: recognizing a face, a spoken word, or spam. Samuel showed in the 1950s that a program could get better at checkers than its author by learning from experience. As data and compute grew, learning from examples overtook hand-coding for perception, language and prediction.",
    },
    uses: [
      ["📧", "Spam & fraud detection", "Classifiers score every email and card payment in milliseconds."],
      ["🎬", "Recommendations", "Netflix, YouTube and Amazon rank what to show you next."],
      ["🏥", "Medical imaging", "Models flag tumours and eye disease in scans for doctors to review."],
      ["🚚", "Forecasting", "Demand, delivery times, energy load and prices."],
    ],
    code: {
      python: `from collections import Counter
import math

def knn_predict(train, x, k=3):
    """train: list of (features, label). Returns the majority label of the k nearest."""
    nearest = sorted(train, key=lambda p: math.dist(p[0], x))[:k]
    return Counter(label for _, label in nearest).most_common(1)[0][0]

train = [((1.0, 1.2), "A"), ((0.8, 0.9), "A"), ((3.1, 3.0), "B"), ((2.9, 3.4), "B")]
print(knn_predict(train, (1.1, 1.0)))   # A
print(knn_predict(train, (3.0, 3.1)))   # B

# The same with scikit-learn, including an honest train/test split
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

X, y = load_iris(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=0)
model = KNeighborsClassifier(n_neighbors=5).fit(X_tr, y_tr)
print("test accuracy:", model.score(X_te, y_te))`,
      javascript: `function knnPredict(train, x, k = 3) {
  // train: [{ features: [..], label }]
  const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const nearest = [...train].sort((p, q) => dist(p.features, x) - dist(q.features, x)).slice(0, k);
  const votes = {};
  for (const p of nearest) votes[p.label] = (votes[p.label] || 0) + 1;
  return Object.keys(votes).reduce((a, b) => (votes[a] >= votes[b] ? a : b));
}

// Shuffle, then hold out 30% for testing
function trainTestSplit(rows, testFraction = 0.3) {
  const a = [...rows];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const cut = Math.floor(a.length * (1 - testFraction));
  return { train: a.slice(0, cut), test: a.slice(cut) };
}`,
    },
  };

  X["linear-regression"] = {
    story: {
      when: "1805 least squares · 1847 gradient descent",
      who: "Adrien-Marie Legendre and Carl Friedrich Gauss (least squares, used to predict the orbit of Ceres); Augustin-Louis Cauchy (gradient descent); Francis Galton coined 'regression' in the 1880s",
      before: "Astronomers had many slightly inconsistent measurements and no principled way to combine them; they picked a few 'good' observations and ignored the rest.",
      why: "Least squares gave a single best-fit answer from noisy data. Cauchy's method of stepping downhill was a way to solve equations too large to solve directly. Two centuries later that same idea, gradient descent, trains every neural network.",
    },
    uses: [
      ["🏠", "Price prediction", "Houses, used cars, insurance premiums."],
      ["📉", "Trend & forecasting", "Sales, demand and capacity planning baselines."],
      ["🧪", "Science & A/B tests", "Estimating the effect of one variable while controlling for others."],
      ["🧠", "Deep learning", "Gradient descent (as SGD/Adam) trains every modern network."],
    ],
    code: {
      python: `import numpy as np

def fit_linear(X, y, lr=0.1, steps=1000):
    """Gradient descent for y ≈ X @ w + b with mean squared error."""
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(steps):
        err = X @ w + b - y              # prediction error, shape (n,)
        w -= lr * (2 / n) * (X.T @ err)  # dL/dw
        b -= lr * (2 / n) * err.sum()    # dL/db
    return w, b

rng = np.random.default_rng(0)
X = rng.uniform(0, 1, size=(200, 1))
y = 3 * X[:, 0] + 2 + rng.normal(0, 0.1, 200)
print(fit_linear(X, y))   # w ≈ [3.0], b ≈ 2.0

# Closed form for comparison (least squares)
A = np.c_[X, np.ones(len(X))]
print(np.linalg.lstsq(A, y, rcond=None)[0])`,
      javascript: `function fitLine(xs, ys, lr = 0.1, steps = 1000) {
  let w = 0, b = 0;
  const n = xs.length;
  for (let s = 0; s < steps; s++) {
    let dw = 0, db = 0;
    for (let i = 0; i < n; i++) {
      const err = w * xs[i] + b - ys[i];
      dw += (2 / n) * err * xs[i];
      db += (2 / n) * err;
    }
    w -= lr * dw;   // step against the gradient
    b -= lr * db;
  }
  return { w, b };
}

const xs = Array.from({ length: 100 }, () => Math.random());
const ys = xs.map((x) => 3 * x + 2 + (Math.random() - 0.5) * 0.2);
console.log(fitLine(xs, ys));   // w ≈ 3, b ≈ 2`,
    },
  };

  X["classification"] = {
    story: {
      when: "1838 logistic function · 1958 logistic regression",
      who: "Pierre François Verhulst (the logistic curve, for population growth); Joseph Berkson (the 'logit', 1944); David Cox (logistic regression, 1958)",
      before: "Statisticians fitted straight lines to yes/no outcomes, which predicts 'probabilities' below 0 and above 1, or used discriminant analysis with strict assumptions about the data.",
      why: "Medicine and social science needed to model the probability of an event (disease, default, purchase) from several factors at once. Passing a linear score through an S-shaped curve keeps the output between 0 and 1 and makes each weight readable as an effect on the odds.",
    },
    uses: [
      ["💳", "Credit scoring", "Regulators like it because every weight can be explained."],
      ["🖱️", "Ad click prediction", "Billions of sparse features, trained online; a classic at large ad platforms."],
      ["🩺", "Medical risk scores", "Probability of readmission, heart disease, sepsis."],
      ["🧱", "Last layer of neural nets", "Sigmoid / softmax + cross-entropy is logistic regression on learned features."],
    ],
    code: {
      python: `import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def fit_logistic(X, y, lr=0.5, steps=2000):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(steps):
        p = sigmoid(X @ w + b)
        w -= lr * X.T @ (p - y) / n      # gradient of log-loss
        b -= lr * (p - y).mean()
    return w, b

def log_loss(y, p, eps=1e-9):
    return -np.mean(y * np.log(p + eps) + (1 - y) * np.log(1 - p + eps))

def softmax(z):                          # multi-class
    e = np.exp(z - z.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

rng = np.random.default_rng(0)
X = np.r_[rng.normal(-1, 1, (100, 2)), rng.normal(1, 1, (100, 2))]
y = np.r_[np.zeros(100), np.ones(100)]
w, b = fit_logistic(X, y)
print("accuracy:", ((sigmoid(X @ w + b) > 0.5) == y).mean())`,
      javascript: `const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function fitLogistic(X, y, lr = 0.5, steps = 2000) {
  const d = X[0].length, n = X.length;
  const w = new Array(d).fill(0);
  let b = 0;
  for (let s = 0; s < steps; s++) {
    const gw = new Array(d).fill(0);
    let gb = 0;
    X.forEach((x, i) => {
      const p = sigmoid(x.reduce((a, v, j) => a + v * w[j], b));
      x.forEach((v, j) => (gw[j] += (p - y[i]) * v));   // (p - y) * x
      gb += p - y[i];
    });
    gw.forEach((g, j) => (w[j] -= (lr * g) / n));
    b -= (lr * gb) / n;
  }
  return { w, b, predict: (x) => sigmoid(x.reduce((a, v, j) => a + v * w[j], b)) };
}

function softmax(z) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const sum = e.reduce((a, v) => a + v, 0);
  return e.map((v) => v / sum);
}`,
    },
  };

  X["overfitting"] = {
    story: {
      when: "1943 Tikhonov regularization · 1970 ridge · 1992 bias–variance · 1996 lasso",
      who: "Andrey Tikhonov; Arthur Hoerl & Robert Kennard (ridge regression); Stuart Geman, Elie Bienenstock & René Doursat (the bias–variance dilemma); Robert Tibshirani (lasso)",
      before: "Models were judged by how well they fitted the data they were built on. Adding variables always 'improved' the fit, and results often failed to replicate.",
      why: "As models gained more adjustable parameters, they could explain any dataset, including its noise. Statisticians needed a way to prefer simpler explanations and to measure real predictive skill. Held-out data, cross-validation and penalties on large weights became the standard defences.",
    },
    uses: [
      ["⚖️", "Weight decay", "The L2 penalty is switched on in almost every neural-network optimizer (AdamW)."],
      ["🧬", "Genomics", "Lasso selects a handful of genes from tens of thousands."],
      ["🏆", "Kaggle & benchmarks", "Leaderboard overfitting is why private test sets exist."],
      ["📈", "Finance", "Backtests that look brilliant and fail live are overfit strategies."],
    ],
    code: {
      python: `import numpy as np
from sklearn.linear_model import Ridge
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

rng = np.random.default_rng(0)
x = rng.uniform(0, 1, 30)
y = np.sin(2 * np.pi * x) + rng.normal(0, 0.25, 30)
X = x.reshape(-1, 1)

for degree in (1, 3, 9, 15):
    for alpha in (1e-8, 1e-2):            # almost none vs some regularization
        model = make_pipeline(PolynomialFeatures(degree), StandardScaler(), Ridge(alpha=alpha))
        train = model.fit(X, y).score(X, y)                    # R² on training data
        cv = cross_val_score(model, X, y, cv=5).mean()         # R² on held-out folds
        print(f"degree {degree:2d}  alpha {alpha:g}  train R2 {train:.2f}  cv R2 {cv:.2f}")
# High degree + tiny alpha: train R² near 1, cross-validated R² collapses → overfitting.`,
      javascript: `// Ridge gradient step: the L2 penalty simply adds lambda * w to the gradient
function ridgeStep(w, grad, lr, lambda) {
  return w.map((wi, i) => wi - lr * (grad[i] + lambda * wi));
}

// k-fold cross-validation
function kFold(rows, k, trainAndScore) {
  const scores = [];
  for (let f = 0; f < k; f++) {
    const val = rows.filter((_, i) => i % k === f);
    const train = rows.filter((_, i) => i % k !== f);
    scores.push(trainAndScore(train, val));
  }
  return scores.reduce((a, b) => a + b, 0) / k;
}

// Early stopping: keep the best validation loss, stop after 'patience' bad epochs
function earlyStopping(patience = 5) {
  let best = Infinity, bad = 0;
  return (valLoss) => {
    if (valLoss < best) { best = valLoss; bad = 0; } else bad++;
    return bad >= patience;   // true → stop training
  };
}`,
    },
  };

  X["decision-trees"] = {
    story: {
      when: "1984 CART · 1986 ID3 · 2001 random forests & gradient boosting · 2014 XGBoost",
      who: "Leo Breiman, Jerome Friedman, Richard Olshen & Charles Stone (CART); Ross Quinlan (ID3, C4.5); Breiman (random forests); Friedman (gradient boosting); Tianqi Chen (XGBoost)",
      before: "Decision rules were written by hand by domain experts, or analysts used linear models that could not capture 'if this AND that' interactions.",
      why: "Trees learn human-readable rules straight from data and handle mixed feature types with no preparation. Single trees were unstable, so Breiman averaged many randomized trees, and Friedman chained small trees that fix each other's mistakes. Those ensembles became the workhorse for tabular data.",
    },
    uses: [
      ["🏦", "Credit & fraud", "Gradient-boosted trees power most bank risk models."],
      ["🔎", "Search ranking", "LambdaMART (boosted trees) ranked web results for years."],
      ["🏅", "Tabular competitions", "XGBoost / LightGBM win most structured-data contests."],
      ["🩻", "Clinical decision rules", "Shallow trees doctors can follow at the bedside."],
    ],
    code: {
      python: `def gini(labels):
    n = len(labels)
    return 1 - sum((labels.count(c) / n) ** 2 for c in set(labels)) if n else 0

def best_split(rows, labels):
    """Try every feature and threshold; return the split with the lowest weighted Gini."""
    best = (None, None, gini(labels))
    for f in range(len(rows[0])):
        for t in sorted({r[f] for r in rows}):
            left = [l for r, l in zip(rows, labels) if r[f] < t]
            right = [l for r, l in zip(rows, labels) if r[f] >= t]
            if not left or not right:
                continue
            score = (len(left) * gini(left) + len(right) * gini(right)) / len(labels)
            if score < best[2]:
                best = (f, t, score)
    return best

def build(rows, labels, depth=3):
    f, t, _ = best_split(rows, labels)
    if depth == 0 or f is None:
        return max(set(labels), key=labels.count)            # leaf: majority class
    L = [(r, l) for r, l in zip(rows, labels) if r[f] < t]
    R = [(r, l) for r, l in zip(rows, labels) if r[f] >= t]
    return (f, t, build(*map(list, zip(*L)), depth - 1), build(*map(list, zip(*R)), depth - 1))

def predict(node, row):
    while isinstance(node, tuple):
        f, t, left, right = node
        node = left if row[f] < t else right
    return node

# In practice:
# from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier`,
      javascript: `const gini = (labels) => {
  const counts = {};
  labels.forEach((l) => (counts[l] = (counts[l] || 0) + 1));
  return 1 - Object.values(counts).reduce((a, c) => a + (c / labels.length) ** 2, 0);
};

function bestSplit(rows) {            // rows: [{ x: [..], y: label }]
  let best = null;
  for (let f = 0; f < rows[0].x.length; f++) {
    for (const t of new Set(rows.map((r) => r.x[f]))) {
      const left = rows.filter((r) => r.x[f] < t), right = rows.filter((r) => r.x[f] >= t);
      if (!left.length || !right.length) continue;
      const score = (left.length * gini(left.map((r) => r.y)) + right.length * gini(right.map((r) => r.y))) / rows.length;
      if (!best || score < best.score) best = { f, t, score, left, right };
    }
  }
  return best;
}

function build(rows, depth = 3) {
  const split = depth > 0 && gini(rows.map((r) => r.y)) > 0 ? bestSplit(rows) : null;
  if (!split) {                       // leaf: majority vote
    const c = {};
    rows.forEach((r) => (c[r.y] = (c[r.y] || 0) + 1));
    return Object.keys(c).reduce((a, b) => (c[a] >= c[b] ? a : b));
  }
  return { f: split.f, t: split.t, left: build(split.left, depth - 1), right: build(split.right, depth - 1) };
}

const predict = (node, x) => (typeof node === "object" ? predict(x[node.f] < node.t ? node.left : node.right, x) : node);

// A random forest = many trees on bootstrap samples, majority vote
const bootstrap = (rows) => rows.map(() => rows[Math.floor(Math.random() * rows.length)]);`,
    },
  };

  X["clustering"] = {
    story: {
      when: "1957 Lloyd's algorithm · 1967 the name 'k-means' · 2007 k-means++",
      who: "Stuart Lloyd (Bell Labs, for signal quantization; published 1982); Hugo Steinhaus (1956); James MacQueen (named it); David Arthur & Sergei Vassilvitskii (k-means++)",
      before: "Grouping was done by eye on scatter plots or by hand-made taxonomies, which is impossible beyond a few dimensions or a few hundred items.",
      why: "Lloyd wanted to send audio signals using as few bits as possible: pick a small set of representative values and replace each sample by the nearest one. The same 'find k representatives' idea turned out to be a general way to discover groups in any unlabeled data.",
    },
    uses: [
      ["🛍️", "Customer segmentation", "Group shoppers by behaviour for targeted campaigns."],
      ["🖼️", "Image compression", "Colour quantization: replace millions of colours by k centroids."],
      ["🧲", "Vector search indexes", "IVF indexes cluster embeddings so a query scans only nearby cells."],
      ["🚨", "Anomaly detection", "Points far from every centroid are suspicious."],
    ],
    code: {
      python: `import numpy as np

def kmeans(X, k, iters=100, seed=0):
    rng = np.random.default_rng(seed)
    centroids = X[rng.choice(len(X), k, replace=False)]
    for _ in range(iters):
        # assign: index of the nearest centroid for every point
        dist = np.linalg.norm(X[:, None, :] - centroids[None, :, :], axis=2)
        labels = dist.argmin(axis=1)
        # update: mean of each cluster (keep the old centroid if a cluster is empty)
        new = np.array([X[labels == j].mean(axis=0) if (labels == j).any() else centroids[j]
                        for j in range(k)])
        if np.allclose(new, centroids):
            break
        centroids = new
    inertia = ((X - centroids[labels]) ** 2).sum()
    return labels, centroids, inertia

rng = np.random.default_rng(1)
X = np.r_[rng.normal(0, 0.5, (50, 2)), rng.normal(4, 0.5, (50, 2)), rng.normal((0, 4), 0.5, (50, 2))]
for k in range(1, 6):                      # elbow method: watch where inertia stops falling fast
    print(k, round(kmeans(X, k)[2], 1))`,
      javascript: `function kmeans(points, k, iters = 100) {
  const dist2 = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
  let centroids = [...points].sort(() => Math.random() - 0.5).slice(0, k).map((p) => [...p]);
  let labels = new Array(points.length).fill(-1);
  for (let it = 0; it < iters; it++) {
    // assign
    const next = points.map((p) => {
      let best = 0;
      centroids.forEach((c, j) => { if (dist2(p, c) < dist2(p, centroids[best])) best = j; });
      return best;
    });
    if (next.every((l, i) => l === labels[i])) break;   // converged
    labels = next;
    // update
    centroids = centroids.map((c, j) => {
      const mine = points.filter((_, i) => labels[i] === j);
      return mine.length ? c.map((_, d) => mine.reduce((s, p) => s + p[d], 0) / mine.length) : c;
    });
  }
  return { labels, centroids };
}

console.log(kmeans([[1, 1], [1.2, 0.8], [5, 5], [5.1, 4.9]], 2));`,
    },
  };

  X["neural-networks"] = {
    story: {
      when: "1943 artificial neuron · 1958 perceptron · 1986 backpropagation · 2012 AlexNet",
      who: "Warren McCulloch & Walter Pitts; Frank Rosenblatt (perceptron); Seppo Linnainmaa and Paul Werbos (early backprop); David Rumelhart, Geoffrey Hinton & Ronald Williams (popularized it); Yann LeCun (CNNs); Krizhevsky, Sutskever & Hinton (AlexNet)",
      before: "Engineers hand-designed features (edge detectors, SIFT, spectrograms) and fed them to simple classifiers. Quality was capped by how clever the feature designer was.",
      why: "The perceptron could only draw straight lines, and after Minsky and Papert's 1969 critique funding dried up. Backpropagation showed how to train hidden layers, so a network could learn its own features. It took until 2012, with GPUs and the ImageNet dataset, for deep networks to crush hand-engineered vision systems and start the deep-learning era.",
    },
    uses: [
      ["📷", "Computer vision", "Photo search, face unlock, self-driving perception, medical scans."],
      ["🗣️", "Speech", "Voice assistants, dictation, live captions."],
      ["💬", "Language models", "Translation, chatbots and code assistants are giant neural networks."],
      ["🧬", "Science", "AlphaFold predicts protein structures; networks forecast weather."],
    ],
    code: {
      python: `import numpy as np

# A 2 → 8 → 1 network trained on XOR with hand-written backpropagation
rng = np.random.default_rng(0)
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([[0], [1], [1], [0]], dtype=float)

W1, b1 = rng.normal(0, 1, (2, 8)), np.zeros(8)
W2, b2 = rng.normal(0, 1, (8, 1)), np.zeros(1)
sigmoid = lambda z: 1 / (1 + np.exp(-z))

for epoch in range(5000):
    # forward
    h = np.tanh(X @ W1 + b1)
    p = sigmoid(h @ W2 + b2)
    # backward (chain rule), for cross-entropy loss
    dz2 = (p - y) / len(X)
    dW2, db2 = h.T @ dz2, dz2.sum(0)
    dh = dz2 @ W2.T * (1 - h ** 2)        # through tanh
    dW1, db1 = X.T @ dh, dh.sum(0)
    # update
    for param, grad in ((W1, dW1), (b1, db1), (W2, dW2), (b2, db2)):
        param -= 1.0 * grad

print(p.round(2).ravel())   # ≈ [0, 1, 1, 0]

# The same in PyTorch: autograd does the backward pass for you
# model = nn.Sequential(nn.Linear(2, 8), nn.Tanh(), nn.Linear(8, 1))
# loss = nn.BCEWithLogitsLoss()(model(X), y); loss.backward(); optimizer.step()`,
      javascript: `// Forward pass of a small multi-layer perceptron
const relu = (z) => Math.max(0, z);
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function dense(inputs, weights, biases, activation) {
  // weights[j] = weight vector of neuron j
  return weights.map((w, j) => activation(w.reduce((sum, wi, i) => sum + wi * inputs[i], biases[j])));
}

function forward(net, x) {
  const hidden = dense(x, net.W1, net.b1, relu);
  return dense(hidden, net.W2, net.b2, sigmoid)[0];
}

// Hand-set weights that compute XOR with two hidden ReLU neurons:
// h1 = relu(x1 + x2), h2 = relu(x1 + x2 - 1), out = sigmoid(10*h1 - 20*h2 - 5)
const xorNet = { W1: [[1, 1], [1, 1]], b1: [0, -1], W2: [[10, -20]], b2: [-5] };
for (const x of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
  console.log(x, forward(xorNet, x).toFixed(2));   // 0.01, 0.99, 0.99, 0.01
}`,
    },
  };

  X["model-evaluation"] = {
    story: {
      when: "1940s ROC curves · 1955 precision & recall · 1979 F-measure",
      who: "WWII radar engineers (the 'receiver operating characteristic'); Allen Kent and colleagues (precision and recall for document retrieval); C. J. van Rijsbergen (F-measure)",
      before: "Systems were judged with a single 'percent correct', which hides the difference between a false alarm and a miss.",
      why: "Radar operators had to decide whether a blip was an enemy aircraft or noise: turning sensitivity up caught more planes but raised more false alarms. The ROC curve described that trade-off. Librarians building early search systems faced the same tension between finding everything relevant and returning only relevant results.",
    },
    uses: [
      ["🩺", "Medical tests", "Sensitivity and specificity are recall and 1 − FPR."],
      ["🔍", "Search & recommendations", "Precision@k, recall@k and NDCG score ranked results."],
      ["🛡️", "Fraud & security alerts", "Teams tune thresholds to what analysts can review per day."],
      ["🧪", "A/B testing", "The final judge: does the model move the real business metric?"],
    ],
    code: {
      python: `def confusion(y_true, y_pred):
    tp = sum(t == 1 and p == 1 for t, p in zip(y_true, y_pred))
    fp = sum(t == 0 and p == 1 for t, p in zip(y_true, y_pred))
    fn = sum(t == 1 and p == 0 for t, p in zip(y_true, y_pred))
    tn = sum(t == 0 and p == 0 for t, p in zip(y_true, y_pred))
    return tp, fp, fn, tn

def report(y_true, scores, threshold=0.5):
    tp, fp, fn, tn = confusion(y_true, [int(s >= threshold) for s in scores])
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"accuracy": (tp + tn) / len(y_true), "precision": precision, "recall": recall, "f1": f1}

def roc_auc(y_true, scores):
    """Probability that a random positive is scored above a random negative."""
    pos = [s for t, s in zip(y_true, scores) if t == 1]
    neg = [s for t, s in zip(y_true, scores) if t == 0]
    wins = sum((p > n) + 0.5 * (p == n) for p in pos for n in neg)
    return wins / (len(pos) * len(neg))

y = [1, 1, 1, 0, 0, 0, 0, 0]
s = [0.9, 0.7, 0.4, 0.6, 0.3, 0.2, 0.2, 0.1]
print(report(y, s), roc_auc(y, s))

# scikit-learn: classification_report, roc_auc_score, precision_recall_curve`,
      javascript: `function metrics(yTrue, scores, threshold = 0.5) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  yTrue.forEach((t, i) => {
    const p = scores[i] >= threshold;
    if (p && t) tp++; else if (p) fp++; else if (t) fn++; else tn++;
  });
  const precision = tp / (tp + fp || 1), recall = tp / (tp + fn || 1);
  return {
    accuracy: (tp + tn) / yTrue.length,
    precision,
    recall,
    f1: (2 * precision * recall) / (precision + recall || 1),
    falsePositiveRate: fp / (fp + tn || 1),
  };
}

// ROC curve: one (FPR, TPR) point per threshold
function rocCurve(yTrue, scores) {
  const thresholds = [...new Set(scores)].sort((a, b) => b - a);
  return [[0, 0], ...thresholds.map((t) => {
    const m = metrics(yTrue, scores, t);
    return [m.falsePositiveRate, m.recall];
  })];
}

// Area under the curve by the trapezoid rule
const auc = (curve) => curve.slice(1).reduce((a, [x, y], i) => a + ((x - curve[i][0]) * (y + curve[i][1])) / 2, 0);`,
    },
  };
})();
