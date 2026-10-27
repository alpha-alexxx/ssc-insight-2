"""Build graphify-out/ for this repo from a local AST extraction plus semantic chunks.

No LLM/API key is required: AST extraction is deterministic (tree-sitter) and the
semantic fragments are produced by agent subagents, one JSON chunk per file group.
See tools/graphify/README.md for the full workflow.
"""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

OUT = Path("graphify-out")
ROOT = Path(".").resolve()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    detection = load(OUT / ".graphify_detect.json")
    ast = load(OUT / ".graphify_ast.json")

    chunks = sorted(OUT.glob(".graphify_chunk_*.json"))
    semantic_nodes: list[dict] = []
    semantic_edges: list[dict] = []
    hyperedges: list[dict] = []
    for chunk in chunks:
        data = load(chunk)
        semantic_nodes.extend(data.get("nodes") or [])
        semantic_edges.extend(data.get("edges") or [])
        hyperedges.extend(data.get("hyperedges") or [])

    # Subagents do not report token usage back, so approximate the semantic pass:
    # ~4 chars per token for text files, a flat 1.5k tokens per image, and the
    # same 4-chars-per-token rate for the JSON they wrote.
    text_chars = 0
    image_count = 0
    for f in detection.get("files", {}).get("document", []):
        path = Path(f)
        if path.is_file():
            text_chars += len(path.read_text(encoding="utf-8", errors="ignore"))
    for f in detection.get("files", {}).get("image", []):
        if Path(f).is_file():
            image_count += 1
    input_tokens = text_chars // 4 + image_count * 1500
    output_tokens = sum(c.stat().st_size for c in chunks) // 4

    extraction = {
        "nodes": (ast.get("nodes") or []) + semantic_nodes,
        "edges": (ast.get("edges") or []) + semantic_edges,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
    (OUT / ".graphify_extract.json").write_text(
        json.dumps(extraction, ensure_ascii=False), encoding="utf-8"
    )
    print(
        f"Extraction: {len(extraction['nodes'])} nodes / {len(extraction['edges'])} edges "
        f"({len(ast.get('nodes') or [])} AST + {len(semantic_nodes)} semantic, {len(chunks)} chunks)"
    )

    import networkx as nx

    from graphify.analyze import god_nodes, suggest_questions, surprising_connections
    from graphify.build import build_from_json
    from graphify.cluster import cluster, label_communities_by_hub, score_all
    from graphify.export import attach_hyperedges, to_html, to_json
    from graphify.report import generate

    G = build_from_json(extraction, root=ROOT)
    if hyperedges:
        attach_hyperedges(G, hyperedges)
        print(f"Hyperedges: {len(hyperedges)}")
    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    communities = cluster(G)
    cohesion = score_all(G, communities)
    labels = label_communities_by_hub(G, communities)
    gods = god_nodes(G, top_n=10)
    surprises = surprising_connections(G, communities)
    questions = suggest_questions(G, communities, labels)

    token_cost = {
        "input": extraction["input_tokens"],
        "output": extraction["output_tokens"],
    }
    report = generate(
        G,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        detection,
        token_cost,
        str(ROOT),
        suggested_questions=questions,
    )
    (OUT / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")

    to_json(G, communities, str(OUT / "graph.json"), community_labels=labels)
    to_html(G, communities, str(OUT / "graph.html"), community_labels=labels)
    (OUT / ".graphify_labels.json").write_text(
        json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT / ".graphify_analysis.json").write_text(
        json.dumps(
            {
                "communities": {str(k): v for k, v in communities.items()},
                "cohesion": {str(k): v for k, v in cohesion.items()},
                "gods": gods,
                "surprises": surprises,
                "questions": questions,
                "built_at": datetime.now(timezone.utc).isoformat(),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    sizes = {p.name: p.stat().st_size for p in OUT.iterdir() if p.is_file()}
    print("Communities:", len(communities))
    print("Outputs:", ", ".join(f"{k} ({v // 1024} KB)" for k, v in sorted(sizes.items())))

    # The driver reads these step files; keep the cache dir report-only.
    cache = OUT / "cache"
    if cache.exists():
        shutil.rmtree(cache, ignore_errors=True)


if __name__ == "__main__":
    main()
