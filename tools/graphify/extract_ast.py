"""Step 1-2 of the local graphify pipeline: detect the corpus and extract code with tree-sitter.

Deterministic and free: no API key, no network, no LLM. Writes
graphify-out/.graphify_detect.json and graphify-out/.graphify_ast.json.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path("graphify-out")


def main() -> None:
    from graphify.detect import detect
    from graphify.extract import collect_files, extract

    OUT.mkdir(exist_ok=True)
    detection = detect(Path("."))
    (OUT / ".graphify_detect.json").write_text(
        json.dumps(detection, ensure_ascii=False), encoding="utf-8"
    )

    counts = {k: len(v) for k, v in detection.get("files", {}).items() if v}
    print(f"Corpus: {detection.get('total_files')} files / ~{detection.get('total_words'):,} words")
    print("  " + ", ".join(f"{k}: {v}" for k, v in counts.items()))

    code_files: list[Path] = []
    for entry in detection.get("files", {}).get("code", []):
        path = Path(entry)
        code_files.extend(collect_files(path) if path.is_dir() else [path])

    if not code_files:
        print("No code files detected; nothing for AST extraction.")
        return

    result = extract(code_files, root=Path(".").resolve())
    (OUT / ".graphify_ast.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"AST: {len(result['nodes'])} nodes, {len(result['edges'])} edges from {len(code_files)} files")


if __name__ == "__main__":
    main()
