# Knowledge Graph — Maintenance Guide

> **Universal file.** Drop this into any project's `KnowledgeGraph/` folder unchanged.
> It explains how to maintain the entire `KnowledgeGraph/` system for any agent or developer.

---

## What Is This System?

The `KnowledgeGraph/` folder is a persistent, structured context cache that lives in the repo root. Instead of re-reading large source files at the start of every session, agents and developers read small, curated files from this folder.

```
KnowledgeGraph/
├── KnowledgeGraph.md          ← Repo-specific: protocol + architecture + active state
├── TokensInstructions.md      ← Universal: how to run efficient sessions
├── TokensGraphing.md          ← Universal: how to maintain this folder (this file)
└── graph/                     ← Structured data cache
    ├── modules.json           ← All core modules, selectors, signal models
    ├── experiments.json       ← All experiment scripts + result summary
    ├── build-and-config.json  ← Build, deploy, dependencies
    ├── decisions-and-gotchas.json ← Bugs, typos, key decisions, do-not-load list
    └── token-cost-map.json    ← Token cost per file (use to decide what to load)
```

> **Core principle:** Build the graph once, query it cheaply forever.

The graph replaces expensive per-session re-reads (3,000–50,000+ tokens) with cheap structured lookups (~200–800 tokens each).

---

## What Goes in Each File

### `KnowledgeGraph.md` (repo-specific)

Keep under **200 lines**. Include:

| Section                             | Content                                                |
| ----------------------------------- | ------------------------------------------------------ |
| **Session Start Protocol**          | How agents should use the graph files                  |
| **Which graph file for which task** | Routing table for agents                               |
| **Project Overview**                | Stack, domain, deploy target                           |
| **Architecture Map**                | Directory tree + what lives where                      |
| **Key Decisions**                   | Non-obvious choices + implications                     |
| **Active State**                    | Current sprint, focus, blockers — update every session |
| **Graph Update Rules**              | When/how to update this file                           |

**Do NOT store:** raw code, full file contents, temporary notes, anything that changes daily.

### `graph/*.json` (repo-specific, structured data)

Each file covers one domain:

| File                         | Contains                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `modules.json`               | Every core module, selector, signal model — file, size, exports, interfaces       |
| `experiments.json`           | Every experiment script, its purpose, key results, and current status             |
| `build-and-config.json`      | Python deps, cluster SLURM config, env setup, run commands                        |
| `decisions-and-gotchas.json` | Known bugs, key architectural decisions, do-not-load list                         |
| `token-cost-map.json`        | Token cost estimate per file, tiered by safe-to-load vs never-load                |

**Do NOT store:** raw code, full file contents, experiment raw outputs (link to `experiments/results/` instead).

### `TokensInstructions.md` and `TokensGraphing.md` (universal — never modify)

These files should be copied unchanged to every new project. Never put repo-specific content in them.

---

## When to Update the Graph (Regraph Triggers)

### High Priority — update within the same session

| Event                                | What to update                                                   |
| ------------------------------------ | ---------------------------------------------------------------- |
| New experiment script added          | `graph/experiments.json`, Architecture Map in `KnowledgeGraph.md` |
| New core module or selector added    | `graph/modules.json`                                             |
| Experiment completes with new result | `graph/experiments.json`, Active State in `KnowledgeGraph.md`   |
| Non-obvious bug or gotcha discovered | `graph/decisions-and-gotchas.json`                               |
| Non-obvious decision made            | `graph/decisions-and-gotchas.json`                               |
| Session ends (always)                | `Active State` in `KnowledgeGraph.md`                            |

### Medium Priority — update at end of session

| Event                                    | What to update                                                   |
| ---------------------------------------- | ---------------------------------------------------------------- |
| Dependency added or removed              | `graph/build-and-config.json`                                    |
| Refactor changes directory structure     | Architecture Map in `KnowledgeGraph.md`, relevant `graph/*.json` |
| Token cost estimate for a file was wrong | `graph/token-cost-map.json`                                      |

### Do NOT Update For

- In-progress or half-complete work (wait until it's shipped)
- Code-level details readable directly from the source file
- Temporary notes or experimental results (point to `experiments/results/` instead)

---

## How to Update

**Instruct the agent in-session:**

```
"Update KnowledgeGraph/graph/experiments.json — E7 weighted ensemble is complete, Net SR +0.42."
"Update the Active State in KnowledgeGraph/KnowledgeGraph.md — E7 is done, E6 re-run is next."
```

**Or edit the JSON/Markdown files directly** — they are plain text.

**Golden rule:** If you had to explain something to the agent at the start of this session that it didn't already know, add it to the graph so you never explain it again.

---

## Token Savings Model

| Approach                                          | Tokens loaded per session |
| ------------------------------------------------- | ------------------------- |
| No graph — re-read relevant source files          | 3,000–50,000+             |
| Graph — read `KnowledgeGraph.md` + 1–2 JSON files | 800–2,000                 |
| **Savings per session**                           | **~2,000–48,000 tokens**  |

Savings compound across sessions. A mature, well-maintained graph provides value on every single session for the lifetime of the project.

---

## Graph Health Check

Run at the start of any new sprint or after a long break:

1. Does the **Architecture Map** reflect the current directory structure?
2. Does **Active State** reflect the current focus — not last sprint's?
3. Are there stale **Key Decisions** that were later reversed?
4. Are all `graph/*.json` file paths still valid?
5. Are the `token-cost-map.json` cost estimates still accurate?

Update any stale data before starting work. A stale graph is worse than no graph — it actively misleads the agent.

---

## Porting to a New Repository

1. Copy the entire `KnowledgeGraph/` folder to the new repo root.
2. **Delete** the contents of `KnowledgeGraph.md` → fill in with the new repo's data.
3. **Delete** all `graph/*.json` files → create new ones by exploring the new repo.
4. Keep `TokensInstructions.md` and `TokensGraphing.md` **unchanged**.
5. Commit the folder — the graph is persistent project infrastructure, not a scratch file.

**Minimal viable graph for a new repo:**

```
KnowledgeGraph.md          ← Overview + architecture map + active state
graph/experiments.json     ← All experiment scripts + results
graph/decisions-and-gotchas.json ← Key decisions + do-not-load list
graph/token-cost-map.json  ← Cost per file
```

Add the other data files as the project matures and you learn which information is repeatedly asked for.
