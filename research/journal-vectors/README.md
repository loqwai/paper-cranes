# Journal vectors: does a vector store over the journals help?

A measured answer to Aaron's 2026-11-24 question: "see if a vector store approach like mindmeld uses
but in Cloudflare vectorize of the journals would help".

**Verdict:** not enough to build Vectorize yet. Vectors help with vague, paraphrased questions and put
the right passage at rank 1 more often. At recall@3, the best hybrid beats the keyword retriever
Field Guide is shipping by only +0.05 (95% CI −0.08 to +0.21, n=38). The bar was +0.10.

## What was measured

- **Corpus:** `journals/`, `docs/`, every `shaders/**/*.md`, and `.claude/skills/sun-set/JOURNEY.md`.
  That is 210 files and 1.76 MB, cut into 1772 heading-scoped chunks (`chunk.js`).
- **Questions:** 38 in `questions.json`, each with gold file and line ranges. They are drawn from
  Aaron's own words (mindmeld sessions 102145, 102906, 103381, 103488, plus
  `~/.claude/orchestrate/paper-cranes/preferences.md`) and the three consumers: the VJ MCP `guide`
  tool, the `/partner` live-show lane, and Aaron asking from his phone. 15 are paraphrase-heavy.
- **Retrievers** (`retrievers.js`), all over the same chunks:
  - (a) Plain BM25.
  - (b) Field Guide's `guide` retriever, ported from `vite-plugins/vj-mcp/guide.js`. It is BM25 with
    stemming, synonyms and titles counted three times. It was not yet pushed at the time of this run.
  - (c) bge-m3 vectors through local Ollama, the model mindmeld uses.
  - (d) Hybrid: mindmeld's reciprocal rank fusion (`src/mcp/rrf.ts`, k=60, lexical pool 2×, vector
    pool 3×), over BM25 + vectors and over Field Guide + vectors.
  - A random-chunk control: the mean over 200 shuffles.
- **Gold v1** is the gold written before any retriever ran. **Gold v2** adds 15 passages to 11
  questions. Each added passage also answers its question, and was found by reading every
  retriever's top 3 on the misses, for all retrievers alike. Both tables are in `results/`.

## Results (gold v2, recall@3 / MRR@10)

| Retriever | all (38) | paraphrase (15) | literal (23) | r@1 all |
|---|---|---|---|---|
| random | 0.01 / 0.00 | 0.01 | 0.00 | 0.00 |
| (a) BM25 | 0.66 / 0.54 | 0.47 | 0.78 | 0.42 |
| (b) Field Guide | 0.71 / 0.57 | 0.47 | 0.87 | 0.42 |
| (c) vectors | 0.68 / 0.65 | 0.60 | 0.74 | 0.58 |
| (d) hybrid BM25+vec | 0.71 / 0.64 | 0.60 | 0.78 | 0.53 |
| (d2) hybrid FG+vec | **0.76 / 0.68** | **0.73** | 0.78 | 0.58 |

Under gold v1, the order is the same (FG 0.66, hybrid FG+vec 0.68).

## Run it

```sh
node research/journal-vectors/eval.js                 # local Ollama bge-m3 at 127.0.0.1:11434
node research/journal-vectors/eval.js --gold v1
node research/journal-vectors/inspect.js para-car     # each retriever's top 3 for a question
```

Embedding 1772 chunks takes about 60 s on the local GPU, and the result is cached in `out/` (gitignored).

## If it is built later

- The cost is close to nothing. 1772 × 1024 dims is 1.8 M stored dimensions, against 5 M free and 10 M
  on Paid. The ingest is about 450 k tokens, about $0.005 on Workers AI `@cf/baai/bge-m3`. Queries
  are within the free allocation.
- At this size Vectorize is optional. The whole index fits in about 7 MB of float32 (about 1.8 MB
  as int8), so a Worker could brute-force cosine over a bundled asset and embed only the query
  through Workers AI.
- The cheap win available now: put a vector arm behind `guide` and a `recall` tool, fused with RRF,
  for questions in Aaron's own words. The keyword arm stays first for named things (shader names,
  knob numbers, flags).
