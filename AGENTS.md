# AGENTS.md

## Code graph

Before a bulk read of the tree, query the local Graphify code graph and open only the files it points to.

1. If the `graphify` command is missing, install the CLI: `pip install graphifyy`.
2. If `graphify-out/` is missing or stale, refresh it from the repo root: `graphify update .`.
3. Read `graphify-out/GRAPH_REPORT.md` for the map, then run `graphify query "..."` for the question at hand.
4. Open only the files the report or query names.

Graph builds stay code-only. Leave `ANTHROPIC_API_KEY` unset (unset it if the environment already has it) so the build does not call a model. `graphify update .` re-extracts changed code from the AST and does not need an LLM. Do not commit `graphify-out/`.
