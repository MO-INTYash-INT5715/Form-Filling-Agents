# Repository Policies

## 1. Benchmark artifact policy

Benchmark outputs are intentionally versioned in this repository.

- Keep JSON artifacts in:
  - `benchmark-results/`
  - `extension/benchmark-results/`
- Do **not** remove benchmark JSONs as part of cleanup.
- When adding new benchmark runs, keep agent/form naming consistent with existing conventions.

## 2. Lockfile policy

This repository uses lockfiles at multiple package roots:

- `package-lock.json` (root)
- `extension/package-lock.json`
- `web-portal/package-lock.json`

Rule:
- If dependencies are changed in a package, update and commit that package's lockfile in the same change.

## 3. Documentation source-of-truth policy

- Canonical documentation index: `Documentation/README.md`
- `Documentation/DOCUMENTATION-INDEX.md` is a compatibility pointer only.
- Root `README.md` should contain concise, accurate run commands and link to canonical docs instead of duplicating long guides.

## 4. Knowledge graph freshness policy

- `KnowledgeGraph/KnowledgeGraph.md` should reflect the committed state.
- Update it when architecture, status, blockers, or recommended next step materially changes.
