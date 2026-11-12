/* Machine learning topics: lessons, quizzes, hands-on exercises */
(function () {
  const Q = (q, options, answer, explain) => ({ q, options, answer, explain });
  const P = (name, diff, desc, hint, sol) => ({ name, diff, desc, hint, sol });
  const T = (t) => L.topics.push({ track: "ml", ...t });

  T({
    id: "ml-basics", title: "What is Machine Learning?", icon: "🤖", summary: "Learning from data instead of hand-written rules; the workflow, and k-NN as a first model.",
    viz: "knn",
    learn: `
<p>In classic programming you write the <b>rules</b>: <code>if "free money" in email: spam</code>. In <b>machine learning</b> you supply <b>examples</b> (emails labelled spam / not spam) and an algorithm finds the rules for you. The result is a <b>model</b>: a function with learned <b>parameters</b>.</p>
<h2>Three kinds of learning</h2>
<table><tr><th>Type</th><th>Data</th><th>Goal</th><th>Examples</th></tr>
<tr><td><b>Supervised</b></td><td>Inputs + correct answers (labels)</td><td>Predict the label of new inputs</td><td>Spam filter, price prediction</td></tr>
<tr><td><b>Unsupervised</b></td><td>Inputs only</td><td>Find structure</td><td>Customer segments, anomaly detection</td></tr>
<tr><td><b>Reinforcement</b></td><td>Rewards from acting in an environment</td><td>Learn a strategy</td><td>Game playing, robotics</td></tr></table>
<p>Supervised problems are <b>regression</b> (predict a number) or <b>classification</b> (predict a category).</p>
<h2>Vocabulary</h2>
<ul><li><b>Features</b> (X): the inputs, e.g. size, bedrooms, location. <b>Label</b> (y): what you predict, e.g. price.</li>
<li><b>Training</b>: adjusting parameters to reduce a <b>loss</b> (how wrong the model is). <b>Inference</b>: using the trained model.</li>
<li><b>Hyperparameters</b>: settings you choose before training (k in k-NN, learning rate, tree depth).</li></ul>
<h2>The golden rule: test on data the model has never seen</h2>
<p>A model that memorizes its training data looks perfect and is useless. So split the data:</p>
<ul><li><b>Training set</b> (~70%): fit the parameters.</li>
<li><b>Validation set</b> (~15%): choose hyperparameters and compare models.</li>
<li><b>Test set</b> (~15%): touch once, at the end, for an honest estimate.</li></ul>
<div class="callout warn"><b>Data leakage</b> is when information from the test set (or from the future) sneaks into training, e.g. scaling with statistics computed on all the data. Scores look great, then collapse in production.</div>
<h2>A first model: k-nearest neighbours</h2>
<p>To classify a new point, find the <b>k</b> closest training points and let them vote. There is no training step at all; the data <i>is</i> the model.</p>
<pre>def knn_predict(train, x, k=3):
    nearest = sorted(train, key=lambda p: dist(p.features, x))[:k]
    return most_common(p.label for p in nearest)</pre>
<p>Small k → jagged boundary that follows noise. Large k → smooth boundary that may miss detail. k-NN needs features on similar <b>scales</b>, and prediction is slow on big data (it scans every point).</p>
<h2>The workflow</h2>
<ol><li>Frame the problem and pick a metric.</li><li>Collect and clean data; split it.</li><li>Start with a simple <b>baseline</b>.</li><li>Engineer features, train, tune on validation data.</li><li>Evaluate once on the test set; deploy; monitor for <b>drift</b>.</li></ol>
<div class="callout tip">In the visualizer: slide k from 1 to 15 and watch train accuracy fall from 100% while test accuracy usually rises, then falls again.</div>`,
    quiz: [
      Q("Predicting tomorrow's temperature in °C is:", ["Classification", "Regression", "Clustering", "Reinforcement learning"], 1, "The target is a continuous number."),
      Q("Why keep a separate test set?", ["To make training faster", "To estimate performance on unseen data", "To have more features", "To reduce storage"], 1, "Training accuracy is optimistic; only unseen data tells you how the model generalizes."),
      Q("With k = 1, k-NN's accuracy on its own training set is:", ["About 50%", "100%", "0%", "Random"], 1, "Each training point is its own nearest neighbour. That is memorization, not skill."),
      Q("Grouping customers by behaviour with no labels is:", ["Supervised learning", "Unsupervised learning", "Regression", "Reinforcement learning"], 1, "No labels, so the algorithm looks for structure by itself."),
      Q("Which is a hyperparameter?", ["A weight learned by gradient descent", "The value of k in k-NN", "A training label", "A prediction"], 1, "Hyperparameters are chosen by you (or a search) before training."),
    ],
    practice: [
      P("Frame the problem", "easy", "A bank wants to flag fraudulent card transactions. Define features, label, problem type and one risk.", "Is the label a number or a category? How common is fraud?", "Binary classification. Features: amount, merchant category, time, distance from home, velocity of recent transactions. Label: fraud / legit from chargebacks. Risk: extreme class imbalance (≈0.1% fraud), so accuracy is meaningless; use precision/recall."),
      P("Spot the leak", "medium", "You normalize all rows with the global mean/std, then split into train and test. What's wrong?", "What did the scaler see?", "The scaler saw test rows, leaking their statistics into training. Split first, fit the scaler on the training set only, then apply it to validation and test (a scikit-learn Pipeline does this for you)."),
      P("k-NN from scratch", "medium", "Implement k-NN classification on the Iris dataset without scikit-learn's KNeighborsClassifier.", "Distance to every training row, sort, vote.", "Compute Euclidean distances with NumPy broadcasting, argsort, take the first k labels, and use np.bincount(...).argmax(). Standardize features first. Expect ~95% test accuracy with k = 5."),
    ],
  });

  T({
    id: "linear-regression", title: "Linear Regression & Gradient Descent", icon: "📈", summary: "Fit a line by minimizing squared error; gradient descent and the learning rate.",
    viz: "gradientDescent",
    learn: `
<p><b>Linear regression</b> predicts a number as a weighted sum of the features:</p>
<pre>ŷ = w₁x₁ + w₂x₂ + … + b</pre>
<p>The <b>weights</b> w say how much each feature matters; the <b>bias</b> b is the prediction when all features are 0.</p>
<h2>The loss: mean squared error</h2>
<pre>MSE = (1/n) · Σ (ŷᵢ − yᵢ)²</pre>
<p>Squaring makes every error positive and punishes big misses more. Training means finding the w and b with the smallest loss.</p>
<h2>Gradient descent</h2>
<p>Picture the loss as a valley over the (w, b) plane. The <b>gradient</b> points uphill, so step the other way:</p>
<pre>repeat:
    dw = (2/n) · Σ (ŷᵢ − yᵢ) · xᵢ      # ∂MSE/∂w
    db = (2/n) · Σ (ŷᵢ − yᵢ)           # ∂MSE/∂b
    w  = w − α · dw
    b  = b − α · db</pre>
<p><b>α</b> is the <b>learning rate</b>, the most important hyperparameter in ML:</p>
<table><tr><th>α</th><th>What happens</th></tr>
<tr><td>Too small</td><td>Tiny steps; takes forever</td></tr>
<tr><td>Just right</td><td>Loss drops quickly and levels off</td></tr>
<tr><td>Too large</td><td>Overshoots the valley; the loss grows without bound (diverges)</td></tr></table>
<h2>Flavours</h2>
<ul><li><b>Batch</b>: use all rows for each step (exact, slow on big data).</li>
<li><b>Stochastic (SGD)</b>: one row per step (noisy, cheap).</li>
<li><b>Mini-batch</b>: 32–512 rows per step. The standard; it is how neural networks are trained.</li></ul>
<h2>Good to know</h2>
<ul><li>Linear regression also has a closed-form answer, <code>w = (XᵀX)⁻¹Xᵀy</code>, but gradient descent scales to millions of features and generalizes to every other model.</li>
<li><b>Scale your features</b> (subtract the mean, divide by the standard deviation). Otherwise the valley is a long narrow canyon and descent zig-zags.</li>
<li>For MSE the valley is <b>convex</b>: one global minimum, no traps.</li>
<li><b>R²</b> reports the share of variance explained (1 = perfect, 0 = no better than predicting the mean).</li></ul>
<div class="callout tip">In the visualizer: run α = 0.02, 0.5 and 0.9 and compare the loss curves. Pink lines are the residuals the model is trying to shrink.</div>`,
    quiz: [
      Q("The gradient of the loss points:", ["Toward the minimum", "In the direction of steepest increase", "Always toward zero", "Randomly"], 1, "That is why we subtract it."),
      Q("The loss rises every step and explodes. Most likely:", ["Learning rate too small", "Learning rate too large", "Too little data", "Too many epochs"], 1, "Each step overshoots the minimum by more than the previous one."),
      Q("Why square the errors in MSE?", ["To make training slower", "So positive and negative errors don't cancel, and large errors count more", "Because gradients need integers", "To shrink the weights"], 1, "It also gives a smooth, convex loss."),
      Q("Mini-batch gradient descent computes each step from:", ["The whole dataset", "One example", "A small random subset", "The test set"], 2, "A balance between noisy SGD and expensive full-batch."),
      Q("Features on very different scales (age vs. salary) cause:", ["Nothing", "Slow, zig-zagging convergence", "Higher accuracy", "Data leakage"], 1, "The loss surface becomes a narrow canyon. Standardize first."),
    ],
    practice: [
      P("Gradient descent by hand", "easy", "Data: (1, 2), (2, 4). Start w = 0, b = 0, α = 0.1. Compute one step.", "Errors are ŷ − y = −2 and −4.", "dw = (2/2)·(−2·1 + −4·2) = −10; db = (2/2)·(−2 + −4) = −6. New w = 0 − 0.1·(−10) = 1.0, b = 0.6."),
      P("Predict house prices", "medium", "Fit a linear regression on the California housing dataset and report RMSE.", "Split, standardize, fit, evaluate on the test set.", "train_test_split → StandardScaler (fit on train only) → LinearRegression (or SGDRegressor) → RMSE on the test set. Then inspect coefficients: the largest standardized weights are the most influential features (median income dominates)."),
      P("Robust regression", "hard", "A few extreme outliers drag your fitted line. What can you change?", "Squared error makes outliers very loud.", "Use a loss that grows linearly for big errors: MAE or Huber loss (quadratic near 0, linear in the tails). Or clip/remove outliers, or log-transform a skewed target."),
    ],
  });

  T({
    id: "classification", title: "Classification & Logistic Regression", icon: "🎯", summary: "Turn a linear score into a probability with the sigmoid; log-loss; decision boundaries.",
    viz: "logistic",
    learn: `
<p>For yes/no questions we want a <b>probability</b>, not an unbounded number. <b>Logistic regression</b> takes the same linear score and squashes it into (0, 1) with the <b>sigmoid</b>:</p>
<pre>z = w·x + b            # the "logit": any real number
p = σ(z) = 1 / (1 + e⁻ᶻ)  # probability of class 1</pre>
<p>σ(0) = 0.5; large positive z → p near 1; large negative z → p near 0. Predict class 1 when p ≥ a <b>threshold</b> (0.5 by default).</p>
<h2>The decision boundary</h2>
<p>p = 0.5 exactly where <code>w·x + b = 0</code>, which is a straight line (a plane in higher dimensions). Logistic regression is a <b>linear classifier</b>: it can only cut space with a flat surface.</p>
<h2>The loss: log-loss (binary cross-entropy)</h2>
<pre>loss = −[ y·log(p) + (1 − y)·log(1 − p) ]</pre>
<p>Being confident and right costs almost nothing; being confident and <b>wrong</b> costs a lot (predicting p = 0.01 for a true positive costs 4.6). MSE is a poor fit here: with a sigmoid it gives vanishing gradients and a non-convex loss.</p>
<p>The gradient turns out beautifully simple: <code>∂loss/∂w = (p − y)·x</code>. Same shape as linear regression.</p>
<h2>More than two classes</h2>
<p>Use one score per class and <b>softmax</b> to turn the scores into probabilities that sum to 1:</p>
<pre>softmax(z)ᵢ = e^zᵢ / Σⱼ e^zⱼ</pre>
<p>This same softmax is the last layer of nearly every neural classifier, and of every LLM when it picks the next token.</p>
<h2>Why it is still everywhere</h2>
<ul><li>Fast, hard to break, and a strong <b>baseline</b>.</li>
<li><b>Interpretable</b>: each weight is the change in log-odds per unit of that feature.</li>
<li>Outputs are reasonably <b>calibrated</b> probabilities, which matter for ranking and risk.</li></ul>
<div class="callout warn">It cannot learn XOR or a circle from raw features. Add engineered features (x², x·y) or use a non-linear model (trees, neural networks).</div>
<div class="callout tip">In the visualizer: train on each dataset. On "Circle" the best a line can do is predict the majority class.</div>`,
    quiz: [
      Q("σ(0) equals:", ["0", "0.5", "1", "Undefined"], 1, "1 / (1 + e⁰) = 1/2."),
      Q("The decision boundary of logistic regression (on raw features) is:", ["A circle", "A straight line / hyperplane", "A step function", "Any curve"], 1, "It is where w·x + b = 0."),
      Q("Which prediction gets the largest log-loss for a true label of 1?", ["p = 0.9", "p = 0.5", "p = 0.01", "p = 0.99"], 2, "−log(0.01) ≈ 4.6. Confident and wrong is punished hardest."),
      Q("Softmax is used to:", ["Scale features", "Turn several scores into probabilities that sum to 1", "Speed up training", "Remove outliers"], 1, "It generalizes the sigmoid to many classes."),
      Q("Logistic regression fails on XOR-shaped data because:", ["Too little data", "No single line separates the classes", "The sigmoid is broken", "The learning rate is wrong"], 1, "It needs a non-linear boundary."),
    ],
    practice: [
      P("Read the weights", "easy", "A churn model has weight +0.8 for 'support tickets last month'. What does it mean?", "Weights act on the log-odds.", "Each extra ticket adds 0.8 to the log-odds of churn, multiplying the odds by e^0.8 ≈ 2.2 (holding other features fixed)."),
      P("Spam classifier", "medium", "Build a spam filter from raw email text.", "Turn text into numbers first.", "TfidfVectorizer → LogisticRegression (class_weight='balanced'). Evaluate with precision/recall, not accuracy. Inspect the largest positive weights: they are the 'spammiest' words."),
      P("Make it non-linear", "medium", "Get logistic regression to classify points inside vs outside a circle.", "What feature makes a circle linear?", "Add x² and y² as features (PolynomialFeatures(2)). In that feature space the boundary x² + y² = r² is a flat plane."),
    ],
  });

  T({
    id: "overfitting", title: "Overfitting, Bias–Variance & Regularization", icon: "🎢", summary: "Why a perfect training score is a warning sign, and how to fix it.",
    viz: "polyfit",
    learn: `
<p>The goal of ML is <b>generalization</b>: doing well on data the model has never seen. Two opposite failures stand in the way.</p>
<table><tr><th></th><th>Underfitting</th><th>Overfitting</th></tr>
<tr><td>Model is</td><td>Too simple</td><td>Too flexible for the amount of data</td></tr>
<tr><td>Train error</td><td>High</td><td>Very low</td></tr>
<tr><td>Test error</td><td>High</td><td>High (big gap from train)</td></tr>
<tr><td>Also called</td><td>High <b>bias</b></td><td>High <b>variance</b></td></tr>
<tr><td>Fix</td><td>More features, bigger model, less regularization</td><td>More data, simpler model, regularization</td></tr></table>
<h2>The bias–variance trade-off</h2>
<p><b>Bias</b> is error from wrong assumptions (a line can't follow a curve). <b>Variance</b> is sensitivity to the particular training sample (a degree-9 polynomial through 12 points changes wildly if you redraw the points). As complexity grows, bias falls and variance rises; test error is U-shaped and you want the bottom.</p>
<h2>Diagnose with train vs validation error</h2>
<ul><li>Both high → underfitting.</li><li>Train low, validation high → overfitting.</li><li>Both low and close → ship it.</li></ul>
<h2>Regularization: penalize complexity</h2>
<pre>loss = data_loss + λ · penalty(weights)</pre>
<table><tr><th>Method</th><th>Penalty</th><th>Effect</th></tr>
<tr><td><b>L2 / ridge / weight decay</b></td><td>Σ w²</td><td>Shrinks all weights smoothly</td></tr>
<tr><td><b>L1 / lasso</b></td><td>Σ |w|</td><td>Drives some weights to exactly 0 (feature selection)</td></tr>
<tr><td><b>Early stopping</b></td><td>–</td><td>Stop when validation loss starts rising</td></tr>
<tr><td><b>Dropout</b></td><td>–</td><td>Randomly silence neurons during training</td></tr>
<tr><td><b>Data augmentation</b></td><td>–</td><td>More (synthetic) data: flips, crops, noise</td></tr></table>
<p><b>λ</b> sets the strength: 0 = no penalty, large = a nearly flat model. Tune it on validation data.</p>
<h2>Cross-validation</h2>
<p>With little data, one validation split is noisy. <b>k-fold cross-validation</b> splits the data into k parts, trains k times (each part takes a turn as validation) and averages the scores.</p>
<div class="callout tip">In the visualizer: degree 1 underfits, 3–4 fits, 9 threads every training point and goes wild in between. Then keep degree 9 and switch on ridge: the curve calms down.</div>
<div class="callout warn">More data is the most reliable cure for overfitting. Regularization is what you use when you can't get it.</div>`,
    quiz: [
      Q("Train accuracy 99%, validation accuracy 70%. This is:", ["Underfitting", "Overfitting", "A perfect model", "Data leakage"], 1, "A large train–validation gap means the model memorized."),
      Q("Which reduces overfitting?", ["A higher-degree polynomial", "More training data", "Training longer", "Removing regularization"], 1, "More data lowers variance."),
      Q("L1 (lasso) regularization tends to:", ["Make all weights larger", "Set some weights exactly to zero", "Do nothing", "Increase variance"], 1, "That makes it a feature selector."),
      Q("A model with high bias:", ["Is too simple to capture the pattern", "Memorizes noise", "Has too many parameters", "Needs more regularization"], 0, "High bias = underfitting."),
      Q("5-fold cross-validation trains the model:", ["Once", "5 times, each with a different validation fold", "5 times on identical data", "On the test set"], 1, "Averaging the 5 scores gives a steadier estimate."),
    ],
    practice: [
      P("Diagnose from a learning curve", "easy", "Train error 2%, validation 3% at 1k rows; 2% and 2.1% at 100k rows. Verdict?", "Look at the gap and the level.", "Good fit, low variance. More data won't help; if 2% is too high the remaining problem is bias (better features or a bigger model)."),
      P("Tune λ", "medium", "Choose the ridge strength for a regression with 200 features and 500 rows.", "Never tune on the test set.", "RidgeCV / GridSearchCV over a log-spaced grid (1e-4 … 1e3) with 5-fold CV on the training data. Standardize features first: the penalty is scale-sensitive. Report the test score once at the end."),
      P("Too many features", "hard", "20,000 gene-expression features, 100 patients. What would you do?", "p ≫ n guarantees overfitting unless constrained.", "Strong L1 or elastic-net regularization, feature selection inside each CV fold (never before splitting), or dimensionality reduction (PCA). Use nested cross-validation to get an honest score."),
    ],
  });

  T({
    id: "decision-trees", title: "Decision Trees & Ensembles", icon: "🌲", summary: "Learn if/else rules from data; random forests and gradient boosting.",
    viz: "decisionTree",
    learn: `
<p>A <b>decision tree</b> is a flowchart learned from data: each node asks a yes/no question about one feature, each leaf gives a prediction.</p>
<pre>if income < 40k:
    if age < 25:  → reject
    else:         → approve
else:             → approve</pre>
<h2>How a tree is built</h2>
<p>Greedily, top-down. At each node try every feature and every threshold, and keep the split that makes the two children <b>purest</b>. Purity is measured with <b>Gini impurity</b> (or entropy):</p>
<pre>gini = 1 − Σ pₖ²      # 0 = one class only, 0.5 = a 50/50 mix</pre>
<p>Repeat on each child until a stopping rule: max depth, minimum samples per leaf, or a pure node. For regression, split to minimize variance and predict the leaf mean.</p>
<h2>Strengths and weaknesses</h2>
<table><tr><th>👍</th><th>👎</th></tr>
<tr><td>Easy to read and explain</td><td>A deep tree memorizes the data (high variance)</td></tr>
<tr><td>No feature scaling; handles mixed types</td><td>Axis-aligned cuts: needs many splits for a diagonal boundary</td></tr>
<tr><td>Captures interactions (e.g. XOR)</td><td>Unstable: small data changes → a different tree</td></tr></table>
<h2>Ensembles: many trees beat one</h2>
<ul><li><b>Bagging / random forest</b>: train hundreds of deep trees, each on a random sample of rows (bootstrap) and a random subset of features per split, then average their votes. Errors of individual trees cancel out, which <b>reduces variance</b>. Trees train in parallel.</li>
<li><b>Gradient boosting</b> (XGBoost, LightGBM, CatBoost): build shallow trees <b>one after another</b>, each fitted to the errors (gradients) left by the trees so far. <b>Reduces bias</b>; usually the most accurate model on tabular data, but needs tuning (learning rate, number of trees, depth).</li></ul>
<div class="callout tip">For spreadsheets and database tables, gradient-boosted trees are still the model to beat, even against deep learning.</div>
<div class="callout tip">In the visualizer: on XOR, depth 1 is useless but depth 2 is perfect. On the blobs, raise the depth to 7 and watch train accuracy hit 100% while test accuracy drops.</div>`,
    quiz: [
      Q("A node with 50% class A and 50% class B has Gini impurity:", ["0", "0.25", "0.5", "1"], 2, "1 − (0.5² + 0.5²) = 0.5, the maximum for two classes."),
      Q("Letting a tree grow to unlimited depth usually causes:", ["Underfitting", "Overfitting", "Faster inference", "Lower variance"], 1, "It carves out a leaf for every noisy point."),
      Q("A random forest reduces variance by:", ["Using one very deep tree", "Averaging many de-correlated trees", "Removing features", "Lowering the learning rate"], 1, "Bootstrap rows + random feature subsets make the trees differ; averaging cancels their errors."),
      Q("In gradient boosting each new tree is trained to:", ["Copy the previous tree", "Correct the errors of the ensemble so far", "Predict a random target", "Maximize depth"], 1, "It fits the residuals / gradients."),
      Q("Do decision trees need feature scaling?", ["Yes, always", "No, splits only compare a feature with a threshold", "Only for classification", "Only for deep trees"], 1, "Ordering is all that matters, so scale is irrelevant."),
    ],
    practice: [
      P("Compute a split", "easy", "A node has 6 A and 4 B. A split gives left (5 A, 1 B) and right (1 A, 3 B). What is the weighted Gini after the split?", "Gini of each child, weighted by size.", "Parent: 1 − (0.6² + 0.4²) = 0.48. Left: 1 − (25/36 + 1/36) ≈ 0.278. Right: 1 − (1/16 + 9/16) = 0.375. Weighted: 0.6·0.278 + 0.4·0.375 ≈ 0.317, so the split reduces impurity by 0.163."),
      P("Titanic survival", "medium", "Compare a single tree, a random forest and gradient boosting on the Titanic dataset.", "Use cross-validation for a fair comparison.", "Encode sex/embarked, impute age. DecisionTree(max_depth=4) ≈ 80%, RandomForest(300 trees) ≈ 82%, HistGradientBoosting ≈ 83%. Plot feature importances: sex, fare/class and age dominate."),
      P("Forest or boosting?", "medium", "You need a strong model today with almost no tuning. Which do you pick?", "Which one is forgiving?", "Random forest: good defaults, hard to overfit by adding trees, parallel training. Reach for boosting when you can afford to tune learning rate, depth and early stopping for the last few points of accuracy."),
    ],
  });

  T({
    id: "clustering", title: "Clustering with K-Means", icon: "🫧", summary: "Unsupervised learning: group similar points with no labels.",
    viz: "kmeans",
    learn: `
<p><b>Clustering</b> finds groups in data that has <b>no labels</b>. <b>K-means</b> is the simplest and most used algorithm: it represents each cluster by its centre (<b>centroid</b>).</p>
<h2>The algorithm (Lloyd's)</h2>
<pre>pick k initial centroids
repeat until assignments stop changing:
    assign:  each point → its nearest centroid
    update:  each centroid → mean of its points</pre>
<p>Each step can only lower the <b>inertia</b> (sum of squared distances from points to their centroid), so the loop always converges, usually in a handful of iterations. Cost per iteration: O(n · k · d).</p>
<h2>Gotchas</h2>
<ul><li><b>It finds a local optimum.</b> A bad random start gives a bad result. Fix: <b>k-means++</b> initialization (spread the first centroids apart) and several restarts; keep the lowest inertia.</li>
<li><b>You must choose k.</b> Plot inertia against k and look for the <b>elbow</b>, or pick the k with the best <b>silhouette score</b>.</li>
<li><b>Scale the features.</b> Distances are dominated by whichever feature has the largest numbers.</li>
<li><b>It assumes round, similar-sized blobs.</b> Rings, crescents and clusters of very different density break it.</li></ul>
<h2>Other clustering methods</h2>
<table><tr><th>Method</th><th>Idea</th><th>Use when</th></tr>
<tr><td><b>DBSCAN</b></td><td>Dense regions are clusters; sparse points are noise</td><td>Odd shapes, outliers, unknown k</td></tr>
<tr><td><b>Hierarchical</b></td><td>Merge the closest clusters step by step into a tree</td><td>You want a hierarchy (dendrogram)</td></tr>
<tr><td><b>Gaussian mixture</b></td><td>Soft assignments with elliptical clusters</td><td>Overlapping clusters, need probabilities</td></tr></table>
<h2>Dimensionality reduction, a close cousin</h2>
<p><b>PCA</b> rotates the data to the directions of greatest variance and keeps the first few, compressing 100 features into, say, 10. Use it to visualize, denoise or speed up other models. <b>t-SNE</b> and <b>UMAP</b> make 2-D maps for exploration.</p>
<div class="callout tip">In the visualizer: press "Re-run" several times with the same k. Sometimes two centroids share one blob and the result is plainly worse. That is the local-optimum problem.</div>`,
    quiz: [
      Q("K-means is an example of:", ["Supervised learning", "Unsupervised learning", "Reinforcement learning", "Regression"], 1, "It uses no labels."),
      Q("The two alternating steps of k-means are:", ["Split and merge", "Assign points to the nearest centroid; move centroids to the mean", "Forward and backward pass", "Sort and search"], 1, "Assign, update, repeat."),
      Q("Different random starts can give different results because k-means:", ["Is non-deterministic by design", "Converges to a local optimum", "Has a bug", "Needs labels"], 1, "Hence k-means++ and multiple restarts."),
      Q("The 'elbow method' helps choose:", ["The learning rate", "The number of clusters k", "The distance metric", "The test set size"], 1, "Find where adding clusters stops reducing inertia much."),
      Q("Which data shape is k-means bad at?", ["Round, well-separated blobs", "Two concentric rings", "Three equal-size spheres", "Evenly spaced groups"], 1, "A centroid-based method can't separate a ring from the disc inside it; try DBSCAN."),
    ],
    practice: [
      P("One iteration by hand", "easy", "Points 1, 2, 9, 10 on a line; centroids start at 1 and 2. Run k-means.", "Assign, then average.", "Assign: {1} to c₁, {2, 9, 10} to c₂. Update: c₁ = 1, c₂ = 7. Assign: {1, 2} / {9, 10}. Update: 1.5 and 9.5. Next assignment is unchanged → converged."),
      P("Customer segmentation", "medium", "Segment shoppers using recency, frequency and monetary value (RFM).", "Scale first; pick k with a plot.", "Log-transform skewed spend, StandardScaler, KMeans(n_init=10) for k = 2…10, plot inertia and silhouette, choose k, then describe each cluster by its mean RFM values and give it a business name ('lapsed big spenders')."),
      P("Compress an image", "medium", "Reduce a photo to 16 colours with k-means.", "What are the points?", "Treat every pixel as a point in RGB space, run k-means with k = 16, replace each pixel with its centroid colour. This is vector quantization: 24 bits per pixel become 4."),
    ],
  });

  T({
    id: "neural-networks", title: "Neural Networks & Backpropagation", icon: "🧠", summary: "Layers of simple units that learn their own features; how backprop trains them.",
    viz: "neuralNet",
    learn: `
<p>A <b>neuron</b> is logistic regression with a twist: a weighted sum followed by a non-linear <b>activation</b>.</p>
<pre>a = activation(w·x + b)</pre>
<p>A <b>neural network</b> stacks neurons in <b>layers</b>. The output of one layer is the input of the next, so later layers build on features discovered by earlier ones (edges → shapes → faces).</p>
<pre>input → [hidden layer] → [hidden layer] → output
h₁ = f(W₁x + b₁)    h₂ = f(W₂h₁ + b₂)    ŷ = g(W₃h₂ + b₃)</pre>
<h2>Why activations matter</h2>
<p>Without a non-linearity, stacked layers collapse into one linear layer. Common choices:</p>
<table><tr><th>Activation</th><th>Formula</th><th>Used for</th></tr>
<tr><td><b>ReLU</b></td><td>max(0, z)</td><td>Default for hidden layers: cheap, gradients don't vanish</td></tr>
<tr><td><b>tanh / sigmoid</b></td><td>squash to (−1, 1) / (0, 1)</td><td>Older networks; sigmoid for a yes/no output</td></tr>
<tr><td><b>Softmax</b></td><td>e^zᵢ / Σ e^zⱼ</td><td>Output layer for multi-class</td></tr></table>
<h2>Training: forward, loss, backward, update</h2>
<ol><li><b>Forward pass</b>: compute the prediction.</li>
<li><b>Loss</b>: compare with the label (cross-entropy or MSE).</li>
<li><b>Backward pass (backpropagation)</b>: apply the <b>chain rule</b> from the output back to the input to get ∂loss/∂w for <i>every</i> weight in one sweep.</li>
<li><b>Update</b>: <code>w ← w − α·∂loss/∂w</code> (SGD, or Adam, which adapts the step per weight).</li></ol>
<pre>for epoch in range(epochs):
    for x, y in batches:
        loss = loss_fn(model(x), y)
        optimizer.zero_grad()
        loss.backward()      # backprop
        optimizer.step()     # gradient step</pre>
<h2>Key ideas</h2>
<ul><li><b>Universal approximation</b>: one wide enough hidden layer can approximate any continuous function. Depth makes it far more efficient.</li>
<li><b>Vanishing gradients</b>: repeated multiplication by small derivatives stalls deep networks. Cures: ReLU, residual (skip) connections, normalization layers, careful initialization.</li>
<li><b>Architectures</b>: CNNs for images (shared filters), RNNs/LSTMs for sequences (now mostly replaced), <b>Transformers</b> for language and almost everything else.</li>
<li>Neural networks shine on <b>unstructured</b> data (images, audio, text) with lots of it. On small tables, trees usually win.</li></ul>
<div class="callout tip">In the visualizer: train on XOR with 1 hidden neuron (fails: it is just a line), then 2, then 4. Each hidden neuron adds one line the network can bend the boundary around.</div>`,
    quiz: [
      Q("Without activation functions, a 10-layer network is equivalent to:", ["A decision tree", "A single linear layer", "A random forest", "Nothing useful at all"], 1, "A composition of linear maps is linear."),
      Q("Backpropagation computes:", ["The forward prediction", "Gradients of the loss with respect to every weight, via the chain rule", "The learning rate", "The test accuracy"], 1, "One backward sweep reuses intermediate results."),
      Q("The usual default activation for hidden layers today is:", ["Sigmoid", "ReLU", "Softmax", "Step"], 1, "max(0, z): cheap and keeps gradients alive."),
      Q("A single neuron cannot learn XOR because:", ["XOR has too few examples", "XOR is not linearly separable", "The learning rate is wrong", "Neurons can't output 0"], 1, "This is the limitation Minsky and Papert highlighted in 1969; a hidden layer fixes it."),
      Q("Vanishing gradients are eased by:", ["More sigmoid layers", "ReLU and residual connections", "A smaller dataset", "Removing the bias"], 1, "Both keep the gradient signal from shrinking as it flows back."),
    ],
    practice: [
      P("Count the parameters", "easy", "A network has layers 784 → 128 → 10 (fully connected, with biases). How many parameters?", "Weights + biases for each layer.", "784·128 + 128 = 100,480; 128·10 + 10 = 1,290. Total 101,770."),
      P("MNIST digits", "medium", "Train a network to recognize handwritten digits at ≥ 97% accuracy.", "A small MLP is enough.", "PyTorch: Flatten → Linear(784, 128) → ReLU → Linear(128, 10); CrossEntropyLoss; Adam(lr=1e-3); batch 64; 5 epochs ≈ 97–98%. A small CNN reaches 99%+."),
      P("Loss is stuck", "hard", "Training loss does not move from its starting value. List what to check.", "Start with the simplest thing.", "Overfit one small batch first (should reach ~0 loss). Check: learning rate (too high → NaN, too low → flat), labels match inputs, last layer and loss agree (logits vs probabilities), inputs normalized, zero_grad called, weights not all initialized to zero, dead ReLUs."),
    ],
  });

  T({
    id: "model-evaluation", title: "Model Evaluation & Metrics", icon: "📊", summary: "Confusion matrix, precision, recall, F1, ROC/AUC, and why accuracy lies.",
    viz: "metrics",
    learn: `
<p>"95% accurate" can describe a great model or a useless one. If 5% of transactions are fraud, a model that says "never fraud" is 95% accurate and catches nothing. Choose the metric that matches what a mistake <b>costs</b>.</p>
<h2>The confusion matrix</h2>
<table><tr><th></th><th>Predicted positive</th><th>Predicted negative</th></tr>
<tr><th>Actually positive</th><td><b>TP</b> true positive</td><td><b>FN</b> false negative (a miss)</td></tr>
<tr><th>Actually negative</th><td><b>FP</b> false positive (false alarm)</td><td><b>TN</b> true negative</td></tr></table>
<h2>Metrics built from it</h2>
<table><tr><th>Metric</th><th>Formula</th><th>Question it answers</th></tr>
<tr><td><b>Accuracy</b></td><td>(TP + TN) / all</td><td>How often am I right? (misleading when classes are imbalanced)</td></tr>
<tr><td><b>Precision</b></td><td>TP / (TP + FP)</td><td>When I say "positive", how often is it true?</td></tr>
<tr><td><b>Recall</b> (sensitivity, TPR)</td><td>TP / (TP + FN)</td><td>Of all real positives, how many did I find?</td></tr>
<tr><td><b>F1</b></td><td>2·P·R / (P + R)</td><td>One number balancing both (harmonic mean)</td></tr>
<tr><td><b>False positive rate</b></td><td>FP / (FP + TN)</td><td>How many negatives did I wrongly flag?</td></tr></table>
<h2>The threshold is a business decision</h2>
<p>Models output a score; you pick the cut-off. Lower threshold → more positives → higher recall, lower precision.</p>
<ul><li><b>Cancer screening</b>: a miss is deadly → favour <b>recall</b>.</li>
<li><b>Spam filter</b>: losing a real email is worse than seeing some spam → favour <b>precision</b>.</li></ul>
<h2>Threshold-free summaries</h2>
<ul><li><b>ROC curve</b>: true positive rate vs false positive rate at every threshold. <b>AUC</b> = area under it = the probability that a random positive is scored above a random negative (0.5 = coin flip, 1 = perfect).</li>
<li><b>Precision–recall curve</b>: more informative than ROC when positives are rare.</li></ul>
<h2>Regression metrics</h2>
<p><b>MAE</b> (mean absolute error, robust to outliers), <b>RMSE</b> (punishes big misses, same units as the target), <b>R²</b> (share of variance explained).</p>
<h2>Beyond the number</h2>
<ul><li>Always compare with a <b>baseline</b> (majority class, last value, simple rules).</li>
<li>Check <b>slices</b>: a model can be 95% overall and 60% for one group of users.</li>
<li>Offline metrics are a proxy; confirm with an <b>A/B test</b> on the real business outcome.</li></ul>
<div class="callout tip">In the visualizer: switch to imbalanced data and set the threshold to 1.0. Accuracy stays at 95% with zero recall.</div>`,
    quiz: [
      Q("TP = 8, FP = 2, FN = 8. Precision is:", ["0.5", "0.8", "0.2", "1.0"], 1, "8 / (8 + 2) = 0.8. Recall here would be 8 / 16 = 0.5."),
      Q("1% of patients have a disease. A model that predicts 'healthy' for everyone has:", ["99% accuracy and 0% recall", "1% accuracy", "100% recall", "50% precision"], 0, "The accuracy paradox: high accuracy, zero usefulness."),
      Q("Lowering the decision threshold generally:", ["Raises precision, lowers recall", "Raises recall, lowers precision", "Changes neither", "Raises both"], 1, "More cases are flagged, so fewer are missed but more are false alarms."),
      Q("An ROC AUC of 0.5 means the model:", ["Is perfect", "Ranks no better than random", "Always predicts positive", "Is 50% accurate"], 1, "It can't tell positives from negatives."),
      Q("For cancer screening, the metric to prioritize is usually:", ["Precision", "Recall", "Accuracy", "Training loss"], 1, "A missed cancer (false negative) costs far more than a follow-up test."),
    ],
    practice: [
      P("Fill in the matrix", "easy", "1,000 emails, 100 are spam. The filter flags 120, of which 90 really are spam. Compute precision, recall, accuracy.", "TP = 90. Work out FP, FN, TN.", "FP = 30, FN = 10, TN = 870. Precision = 90/120 = 0.75; recall = 90/100 = 0.90; accuracy = 960/1000 = 0.96."),
      P("Pick the threshold", "medium", "A missed fraud costs $500; reviewing a false alarm costs $5. How do you set the threshold?", "Minimize expected cost, not error count.", "For each threshold compute cost = 500·FN + 5·FP on validation data and choose the minimum. With a 100:1 cost ratio the best threshold is low: accept many false alarms to catch nearly all fraud."),
      P("Offline win, online loss", "hard", "Your new recommender has a better offline AUC but click-through dropped in the A/B test. Why might that be?", "What does the offline data not capture?", "Offline labels came from the old model's exposures (selection bias); the metric may not match the goal (clicks vs AUC on all items, position effects); train/serve skew in features; novelty and latency effects. Trust the A/B test, then fix the offline evaluation."),
    ],
  });
})();
