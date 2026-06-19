# Agent State — Form-Filling-Agents

> **⚠️ READ THIS FIRST.** This file is a handoff document for any AI coding agent (or human) continuing work on this repository. It captures: the project goal, what was decided, what was implemented, the exact current state of every changed file, known issues, and the prioritized TODO list with concrete next steps.
>
> **Last updated:** 2026-06-18 (post-refinement)
> **Last agent:** ZCode (builtin:zai-start-plan/GLM-5.2)
> **Working directory:** `C:\Code\Form-Filling-Agents`
> **Branch:** `master`

---

## 1. What This Project Is (and the Product Goal)

The repo is a **3-track research/benchmark monorepo** (`extension/`, `web-portal/`, `mcp-implementations/`) that benchmarks 5 agent strategies (rule-based, embedding-matcher, llm-structured, vlm-agent, hybrid) against the **FormFactory** academic dataset (25 forms, ~259 fields). The benchmark/ablation machinery is mature.

**THE PRODUCT GOAL (the user's stated focus):**
> Automatically fill forms from a user-profile → **flag whatever data we don't have** in the user-profile → **ask for human verification before submitting** → **show the prefilled form**.

This was confirmed via user Q&A to be built on the **`web-portal/` track** (Next.js), with a **review page + Approve button** UX, and a **screenshot + field table** preview format. The benchmark/ablation work is preserved (conservative cleanup).

---

## 2. Architecture Decisions (LOCKED — do not re-litigate)

| Decision | Rationale |
|---|---|
| Product surface = `web-portal/` | Already parses docs → `UserProfile`, scrapes forms, runs profile-driven agents, has a dashboard. Fewest gaps. |
| Cleanup = **conservative** | Remove only dead/stale code; KEEP the entire benchmark/ablation harness intact. (Currently DEFERRED — see TODOs.) |
| Verification UX = review page + Approve button | Dedicated `/dashboard/review` page with preview + editable fills + ⚠ missing-data section + Approve gate. |
| Preview format = screenshot + field table | Reuse existing Playwright screenshot + editable per-field table. |
| "Missing" definition | `required === true && valueFilled === undefined`. Optional-skipped fields are NOT "missing" — they don't block submission. |
| Out of scope (deferred) | `browser-mcp`/`skyvern-mcp` build-out; shared provider abstraction; making the in-browser extension the product surface; real auth (current `lib/auth.ts` is a base64 demo-user stub). |

### The New User Flow (implemented in Phase 1)
1. **Dashboard** (`/dashboard`) → enter form URL + pick strategy → "Fill Form"
2. **POST `/api/fill`** → scrape form → run agent → Playwright fills + screenshots → returns `{ record, verification }`
3. **Redirect:** single strategy → `/dashboard/review?runId=...`; "Run All 3" → `/dashboard/fill?strategy=all&url=...` (side-by-side compare of ReviewPanels)
4. **Review page** shows: screenshot preview, editable filled-fields table, ⚠ Missing Required Data section
5. User edits auto-filled values + fills missing required fields → clicks **✓ Approve & Submit** (disabled until all required-missing fields have values)
6. **POST `/api/submit`** → merges fills + overrides + user-supplied missing values → Playwright applies all + clicks submit → returns success/failure + post-submit screenshot

---

## 3. Implementation Status

### ✅ DONE — Phase 1 (The Final Goal): COMPLETE, REFINED & TYPE-CHECKED
All code type-checks clean (`npx tsc --noEmit` in `web-portal/`). The 5 remaining TS errors are **pre-existing and unrelated** (see §5).

> **Key architectural note (post-refinement):** Verification data is stored in the **browser's `sessionStorage`** (written by `dashboard/page.tsx` after `/api/fill` responds, read by `review/page.tsx`). The server-side in-memory `VerificationRecord` store is kept for telemetry/export purposes only — it is **NOT** used in the review/submit flow. This avoids `Verification not found` errors caused by Next.js HMR wiping in-memory state, or serverless instances not sharing memory.

#### Files MODIFIED (7):

**`web-portal/src/types/telemetry.ts`**
- Added `required?: boolean` and `isMissing?: boolean` to `FieldTelemetry`.
- Added `VerificationStatus = 'pending' | 'approved' | 'cancelled'`.
- Added `VerificationRecord` interface: `{ runId, strategy, formUrl, formTitle?, fields, missingFields, screenshotBase64?, createdAt, status, resolvedAt? }`.
- Extended `TelemetryStore` with `verifications: VerificationRecord[]`.

**`web-portal/src/telemetry/tracker.ts`**
- Updated imports to include `VerificationRecord`, `VerificationStatus`.
- `store` now initialized with `verifications: []`.
- Added: `createVerification(run)` (computes `missingFields` from `required && valueFilled===undefined`, stamps `isMissing`), `getVerifications()`, `getVerificationById(runId)`, `resolveVerification(runId, status)`.
- Updated `clearStore()` and `exportJson()` to include verifications.

**`web-portal/src/agents/runner.ts`** (rewritten)
- `applyFillsAndScreenshot()` runs headless Playwright to capture a screenshot. Uses `domcontentloaded` + 1.5s SPA wait (not `networkidle`). Selector resolution: ID first, name fallback.
- `runAgent()` returns `RunAgentResult = { record, verification }`.
- `runAllStrategies()` returns `RunAgentResult[]`.

**`web-portal/app/api/fill/route.ts`** (full rewrite)
- Removed `executeInBrowser` from request body.
- For `strategy === 'all'`: returns `{ strategy, results: [{record, verification}] }`.
- For single strategy: returns `{ strategy, record, verification }`.

**`web-portal/src/scraper/form-scraper.ts`**
- `required` flag honors both `el.required` and `aria-required="true"`. Catches forms that express required-ness via ARIA.
- Uses `waitUntil: 'domcontentloaded'` + 1.5s wait (not `networkidle` — live sites with long-polling would hang forever).

**`web-portal/app/dashboard/fill/page.tsx`** (full rewrite — was the compare-view regression)
- Old code read `/api/fill` response as `AgentRunRecord[]`; new response is `{results:[{record,verification}]}`. Rewritten to consume the new shape.
- Now renders **side-by-side `ReviewPanel`s** (one per strategy) instead of the old post-hoc `ResultsTable`. "Run All 3" becomes a true compare-and-pick-one review.
- `fetchOne(runId)` now hits `/api/verification?runId=` (was `/api/telemetry?id=`).
- `handleSubmit(runId, overrides, missing)` POSTs to `/api/submit`.

**`web-portal/app/dashboard/page.tsx`**
- `handleFill`: single strategy → `/dashboard/review?runId=...`; "all" → `/dashboard/fill?strategy=all&url=...` (compare page). No more wasted first-fetch.
- `AgentRunRecord` import retained — still used by `recentRuns` state.

**`web-portal/app/api/submit/route.ts`** — **REWRITTEN for live-browser session model**
- Auth-gated. Loads verification record.
- **Merge priority:** `missingSupplied > overrides > original valueFilled`.
- Launches **headed (visible) Chromium** (`headless: false`) with `--start-maximized`, realistic `userAgent`, `--disable-blink-features=AutomationControlled` to avoid bot-detection on live sites.
- Uses `waitUntil: 'domcontentloaded'` + 2s wait (replaces `networkidle` which hangs on live sites with long-polling/streaming).
- Selector resolution: tries `#id` first, falls back to `[name="..."]`, then JS `evaluate()` fallback for custom inputs on live sites.
- Does **NOT** auto-submit — leaves the browser window open for user to review and submit manually.
- Returns `{ success, fieldsApplied, fillErrors }`.

#### Files CREATED (4):

**`web-portal/components/dashboard/ReviewPanel.tsx`** — the core review UI.
- Props: `{ record, onSubmit, onCancel }`. `record` is a `VerificationRecord` fetched from `/api/verification`.
- State: `overrides` (editable auto-filled values), `missingSupplied` (user-typed missing values), `submitting`.
- Renders: header with "Open Form & Fill Data" button → screenshot preview (base64 PNG) → ⚠ missing-data section (yellow card, required-field inputs) → editable filled-fields table.
- `allMissingFilled` gates the action button — disabled until all `isMissing` fields have values.
- Button label: **"Open Form & Fill Data"** — launches a headed browser, does NOT auto-submit.

**`web-portal/app/dashboard/review/page.tsx`** — the review page.
- Reads `runId` from query params.
- Loads verification data from `sessionStorage` (key: `verification_{runId}`) — **no server fetch**.
- Shows error if sessionStorage entry is missing (e.g. page refreshed directly).
- On submit: merges overrides + missing values client-side, POSTs `{ formUrl, fields }` to `/api/submit`.
- Shows green launch banner; cleans up sessionStorage entry; navigates back after 2s.
- Wrapped in `<Suspense>` (uses `useSearchParams`).

**`web-portal/app/api/verification/route.ts`** — GET endpoint.
- Auth-gated. Returns `VerificationRecord` by `runId`, 404 if not found.

**`web-portal/app/api/submit/route.ts`** — POST endpoint (stateless, live-browser model).
- Auth-gated. Accepts `{ formUrl, fields }` directly from client — **no server-side lookup**.
- Launches headed Chromium (`headless: false`, `--start-maximized`, realistic `userAgent`, `--disable-blink-features=AutomationControlled`).
- Uses `waitUntil: 'domcontentloaded'` + 2s SPA wait (not `networkidle`).
- Multi-level selector fallback: `#id` → `[name=...]` → JS `evaluate()` fallback for custom inputs.
- Does NOT auto-submit — browser stays open for user.
- Returns `{ success, fieldsApplied, fillErrors }`.

---

## 4. Current TODO List (AUTHORITATIVE — pick up here)

```text
[pending][low]   Phase 0: Cleanup dead code + stale artifacts (DEFERRED per user request)
[completed][high] Phase 1A-1F: Product feature (DONE)
[pending][low]   Phase 2: Add ablation metrics (flag-accuracy, human-edit rate, time-to-approval) + docs
```

### 🔴 IMMEDIATE NEXT STEPS (in priority order):

#### Step 1 — End-to-end smoke test (DO THIS FIRST)
The code type-checks but has NOT been runtime-tested. Before anything else:
1. Start FormFactory: `cd C:\Code\formfactory && python app.py` (port 5000)
2. `cd C:\Code\Form-Filling-Agents\web-portal && npm run dev` (port 3001)
3. Log in (any creds work — `lib/auth.ts` is a stub: `alice@example.com` / `demo`)
4. Dashboard → URL `http://localhost:5000/academic-research/job-application` → strategy `rule-based` → Fill
5. **Verify:** redirects to `/dashboard/review`, screenshot shows, filled-fields table populates, ⚠ missing section appears for required-but-unfilled fields
6. Fill missing fields → Approve & Submit → verify Playwright applies + submits (check FormFactory logs)

**Likely runtime issues to watch for:**
- The scraper's `el.required` may not catch all "required" fields (some forms use `aria-required` or server-side validation). If missing-section is empty on a form you expect to have required fields, check `form-scraper.ts:67`.
- `applyAndSubmit`'s submit-button selector may miss forms using `<button>` without `type="submit"`. Fallback `form.requestSubmit()` handles most.
- The `AgentRunRecord` import in `dashboard/page.tsx:8` may now be unused — remove if lint complains.

#### Step 2 — Phase 0 Cleanup (deferred but approved)
These were verified safe to remove during exploration (verification details in §6):
- `extension/src/agents/form-agents.ts` + generated `extension/public/js/agents/*` (no source imports; only docs reference it)
- React popup/options Next.js pipeline (`extension/src/popup/*`, `extension/src/options/*`, `extension/next.config.js`, `build:next` script, tailwind config) — manifest ships the **vanilla** `public/{popup,options}.html`; Next `dist/next` is empty
- `scratch/`, `Testing-Bedrock-Response/`, `KnowledgeGraph/` (top-level dirs)
- Ad-hoc scripts: `web-portal/test-enhanced.ts`, `web-portal/test-scraper-filler.{ts,js}`, `extension/scripts/{diagnostic.ts,fallback-runner.js,fix.js}`
- **Update doc references** when removing: `Documentation/05-WEB-PORTAL.md:164-167` references `test-enhanced.ts`; `extension/src/implementations/rule-based/README.md:3` notes "refactored from form-agents.ts"
- **Fix broken README.md links** (lines 123-138): `Documentation/README.md`→`01-OVERVIEW.md`; `RUNNING_AND_BENCHMARKING.md`→`04-BENCHMARKING.md`; `IMPLEMENTATION-HISTORY.md`→`02-ARCHITECTURE.md`; `MCP-ISSUE-DIAGNOSIS.md`→`10-MCP-DIAGNOSIS.md`; `GEMINI-INTEGRATION-DOCUMENTATION.md`→`09-GEMINI.md`; `LOCAL-LLM-SETUP.md`→`08-LOCAL-LLM-SETUP.md`; `Documentation/REPOSITORY_POLICIES.md`→`12-REPOSITORY_POLICIES.md`
- Stale `benchmark-results/**` showing `0.00%` (runs done without FormFactory running) — clear content, keep folder
- Duplicate profile: `mcp-implementations/shared/user-profile.json` duplicates `web-portal/data/test-profile.json` — extract to `shared/test-profile.json` as single source

#### Step 3 — Phase 2 Ablation (when product flow is validated)
The benchmark harness (`extension/src/benchmark/`, `extension/scripts/ablation-study.ts`) measures value-accuracy/cost/runtime per agent. Add product-specific dimensions:
- **Flag-accuracy metric**: precision/recall of the "missing data" flag vs. ground-truth unfilled-required fields. Add to `shared/scorer.ts` + `extension/src/benchmark/evaluation.ts`.
- **Human-edit rate**: share of fields a user overrides on review (add `edited: boolean` to submitted records).
- **Time-to-approval**: wall clock from preview render to Approve click.
- New doc: `Documentation/15-PRODUCT-EVAL.md`. Aggregate via `scripts/aggregate-ablation.ts`.

---

## 5. Known Issues (PRE-EXISTING — not introduced by Phase 1)

These 5 TypeScript errors exist in `web-portal/` **before and after** my changes. They are unrelated to the product feature:
```
benchmark.ts(24,10): HybridAgent not exported from './src/agents/hybrid'
src/agents/llm-structured.ts(82,72): Cannot find module '@aws-sdk/client-bedrock-runtime'
src/agents/vlm-agent.ts(24,12): 'name' type '"vlm-agent"' not assignable to AgentStrategyName
src/agents/vlm-agent.ts(54,72): Cannot find module '@aws-sdk/client-bedrock-runtime'
src/filler/form-filler-enhanced.ts(9,34): Cannot find module '../agents/smart-matcher'
```
- AWS SDK errors = `npm install` not run in web-portal, or dep missing from `web-portal/package.json` (it's in root + extension).
- `smart-matcher` / `HybridAgent` = orphaned references to modules that were never created/ported. These files (`benchmark.ts`, `form-filler-enhanced.ts`, `vlm-agent.ts`) are NOT in the active product path.

**Other pre-existing issues (not errors):**
- `lib/auth.ts` is a base64 demo-user stub — NOT production auth.
- The `/dashboard/fill` compare-view regression (response-shape mismatch) was **FIXED** in the refinement pass — the page now consumes `{results:[{record,verification}]}` and renders side-by-side `ReviewPanel`s.

---

## 6. Cleanup Verification Details (reference for Phase 0)

Verified safe during exploration:
- `form-agents.ts`: grep for `from '...form-agents'` → **no source imports**. Referenced only in: docs, generated `public/js/agents/*`, `extension/README.md`, `.github/copilot-instructions.md`.
- React popup: manifest `action.default_popup = "popup.html"` (vanilla). Next `distDir: 'dist/next'` is empty. `build:next` (`next build && next export`) output is unused. Vanilla `public/popup.js` sends `FILL_FORM`; React `src/popup/page.tsx` only sends `DETECT_FORM` (broken).
- Ad-hoc scripts: `test-enhanced.ts` referenced at `Documentation/05-WEB-PORTAL.md:164-167`.

---

## 7. Key File Reference (the product surface)

```
web-portal/
├── app/
│   ├── api/
│   │   ├── fill/route.ts           [MODIFIED] POST → {record, verification}
│   │   ├── submit/route.ts         [NEW]      POST → apply+submit via Playwright
│   │   ├── verification/route.ts   [NEW]      GET ?runId= → VerificationRecord
│   │   └── telemetry/route.ts      [unchanged] GET runs/parses
│   └── dashboard/
│       ├── page.tsx                [MODIFIED] handleFill → /dashboard/review
│       ├── review/page.tsx         [NEW]      review flow entry
│       └── fill/page.tsx           [unchanged] ⚠ compare view now broken — see §5
├── components/dashboard/
│   ├── ReviewPanel.tsx             [NEW]      core review UI
│   ├── ResultsTable.tsx            [unchanged] old post-hoc table
│   └── FillForm.tsx                [unchanged]
└── src/
    ├── agents/runner.ts            [MODIFIED] returns {record, verification}
    ├── scraper/form-scraper.ts     [unchanged] already had required flag
    ├── telemetry/tracker.ts        [MODIFIED] +verification CRUD
    └── types/telemetry.ts          [MODIFIED] +VerificationRecord, +required/isMissing
```

---

## 8. How to Run / Validate

```bash
# 1. FormFactory (separate repo, hosts the 25 benchmark forms)
cd C:\Code\formfactory && python app.py    # port 5000

# 2. Web portal
cd C:\Code\Form-Filling-Agents\web-portal
npm install        # if not done
npm run dev        # port 3001

# 3. Type-check
cd web-portal && npx tsc --noEmit   # expect only the 5 pre-existing errors in §5

# 4. Smoke the product flow
# Browser → http://localhost:3001 → login (any) → Dashboard → fill a form → review → approve
```

---

## 9. Guardrails for the Next Agent

1. **Do NOT remove or rewrite the benchmark/ablation harness** (`extension/src/benchmark/`, `extension/scripts/ablation-study.ts`, `shared/scorer.ts`). It's the research core.
2. **The product lives in `web-portal/`.** Don't build product features in `extension/` (its React popup is broken and uses a minimal flat profile — deferred).
3. **Preserve the `RunAgentResult = {record, verification}` return shape** in runner.ts — both `/api/fill` and the review flow depend on it.
4. **"Missing" = required && valueFilled===undefined.** Don't flag optional-skipped fields as missing (they shouldn't block submission).
5. **Submit is gated behind `/api/submit`.** Never auto-submit in `/api/fill` or runner.ts.
6. When in doubt about whether something is dead code, check §6 and grep for imports first.
