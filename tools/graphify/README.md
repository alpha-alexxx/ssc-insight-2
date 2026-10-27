# graphify (local knowledge graph)

Upstream [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) ships as a
`/graphify` agent skill: it turns a folder of code, docs, papers and screenshots into a
queryable knowledge graph (`graphify-out/graph.json`), a readable audit report
(`GRAPH_REPORT.md`) and an interactive `graph.html`. Every edge is tagged
`EXTRACTED`, `INFERRED` or `AMBIGUOUS`, so you can tell what was found from what was guessed.

This project runs the same pipeline **offline**, with no API key:

| Stage | Who does it | Cost |
| --- | --- | --- |
| Detect corpus | `graphify.detect` | free |
| Code extraction | `graphify.extract` (tree-sitter AST) | free, deterministic |
| Doc/image extraction | an agent subagent per chunk (this harness's model) | inside the session |
| Build, cluster, analyze, report | `graphify.build` / `cluster` / `analyze` / `report` | free |

## Why a project-local environment

`graphify` was previously installed as a global `uv` tool, pinned to a Python 3.12 that
was later removed — the `graphify.exe` shim stayed behind and failed with
`No Python at ...\Python312\python.exe`. `.graphify-venv/` (Python 3.13, `graphifyy[sql]`)
keeps the toolchain reproducible per checkout and immune to that class of breakage.

## What this repo now has

- `graphify-out/graph.json` — 1,285 nodes / 3,198 edges / 75 communities (1,039 AST symbols +
  229 extracted concepts, 9 hyperedges), committed so queries work without a rebuild.
- `graphify-out/GRAPH_REPORT.md` — god nodes, surprising connections, ambiguous edges,
  knowledge gaps, suggested questions.
- `graphify-out/graph.html` — self-contained interactive graph.
- `graphify 0.9.96` on `PATH` (the broken uv tool env tied to the deleted Python 3.12 was
  reinstalled against Python 3.13), plus this checkout's `.graphify-venv` (~140 MB, gitignored).

## Regenerate the graph

```powershell
pwsh tools/graphify/bootstrap.ps1                                 # create/refresh .graphify-venv
.\.graphify-venv\Scripts\python.exe tools\graphify\extract_ast.py # detect + AST extraction
#   semantic pass: dispatch subagents, one graphify-out/.graphify_chunk_NN.json each
.\.graphify-venv\Scripts\python.exe tools\graphify\build_graph.py # merge, cluster, report, HTML
```

The semantic pass uses the extraction prompt from the installed skill
(`C:\Users\ankit\.agents\skills\graphify\SKILL.md`, "Step B2"): one chunk of ~20 files per
subagent, each writing valid JSON with `nodes`, `edges` and `hyperedges`, `confidence`
plus `confidence_score` on every edge (EXTRACTED 1.0; INFERRED one of 0.95/0.85/0.75/0.65/0.55;
AMBIGUOUS 0.1–0.3). Images get a vision pass instead of a code pass.

`.graphifyignore` keeps generated output and this toolchain out of the corpus, so a rebuild
does not graph the graph.

## Query it

```powershell
$g = ".\.graphify-venv\Scripts\graphify.exe"   # or the global `graphify`
& $g god-nodes                                   # architectural hubs
& $g query "how does AI quota reservation work?" # BFS over the graph
& $g query "backup import flow" --dfs
& $g path "MockForm" "repository" --undirected    # this graph is undirected; path defaults to directed
& $g explain "reserveAiUsage"
& $g affected "readBody"                         # reverse: what depends on X
```

The CLI also exports `graph.html`, `graph.svg`, GraphML, Cypher (Neo4j/FalkorDB), an
Obsidian vault (`export obsidian`) and an agent-crawlable wiki (`export wiki`) from the
same `graphify-out/graph.json`.

## Notes

- AST extraction falls back to sequential inside the DSH sandbox (the parallel
  `ProcessPoolExecutor` cannot open its pipes); ~2 minutes for this repo's 153 code files.
- The report's token line is an estimate: subagents do not report usage back, so it
  approximates the semantic pass from source and chunk sizes.
- `graphify extract . --code-only` reproduces the deterministic half in one command; the
  full `graphify extract` path wants an LLM API key (Anthropic/OpenAI/Gemini/DeepSeek/Ollama).
