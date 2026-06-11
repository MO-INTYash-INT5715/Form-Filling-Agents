# Benchmark Runbook — Form-Filling Agents (FFA)

> **One document. Everything you need to go from a fresh clone to a published ablation report.**

---

## Table of Contents

1. [Repository layout](#1-repository-layout)
2. [System requirements](#2-system-requirements)
3. [One-time setup](#3-one-time-setup)
4. [Understanding the data](#4-understanding-the-data)
5. [Configuring a provider / model](#5-configuring-a-provider--model)
6. [Running the benchmarks](#6-running-the-benchmarks)
7. [Aggregating results](#7-aggregating-results)
8. [What the output means](#8-what-the-output-means)
9. [File-upload forms — dummy fixtures](#9-file-upload-forms--dummy-fixtures)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Repository layout

```
C:\Code\FFA\
  extension\                  Chrome extension benchmark harness
    scripts\ablation-study.ts
    src\benchmark\
      dataset-loader.ts       reads formfactory data/data1 + data/data2
      evaluation.ts
  web-portal\                 Next.js portal benchmark
    benchmark.ts
    data\test-profile.json    <- single user profile used by portal + MCP
  mcp-implementations\        MCP protocol runners
    shared\runner.ts
    shared\user-profile.json  <- kept in sync with web-portal/data/test-profile.json
  shared\
    scorer.ts                 unified BLEU + accuracy scorer
    cost-model.ts             $/1M token rates by provider:model
    provider-utils.ts         model guard (10-30B for Bedrock)
  scripts\
    aggregate-ablation.ts     aggregates *.jsonl -> master report
    setup-test-fixtures.py    generates dummy PDF/PNG upload files
  test-fixtures\              auto-generated dummy files (PDFs, PNGs)
  Documentation\              all docs live here
    ablation-records\         per-run JSONL (written by harnesses)
C:\Code\formfactory\          FormFactory Flask app (separate repo)
  data\
    data1\<form>.json         gold answers  (50 instances each)
    data2\<form>.txt          input documents (one per instance, narrative text)
  templates\*.html            form HTML pages
```

---

## 2. System requirements

| Requirement | Version |
|-------------|---------|
| Node.js | >= 18 |
| Python | >= 3.9 |
| npm | >= 9 |

Playwright browser binaries are downloaded during setup (step 3.4).

---

## 3. One-time setup

Run these steps ONCE per machine. After that, skip directly to section 6.

### 3.1 Verify the FormFactory repo

```powershell
Test-Path C:\Code\formfactory
```

If missing, clone it (ask the project owner for the URL).

### 3.2 Install FFA Node dependencies

```powershell
cd C:\Code\FFA
npm ci
```

### 3.3 Install FormFactory Python dependencies

```powershell
cd C:\Code\formfactory
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
```

### 3.4 Install Playwright browsers

```powershell
cd C:\Code\FFA
npx playwright install --with-deps chromium
```

### 3.5 Generate dummy file-upload fixtures

Several FormFactory forms have file upload fields (resume, pitch deck, artwork image, medical bills, etc.).
The harnesses need real files at known paths so Playwright can upload them.

```powershell
cd C:\Code\FFA
python scripts\setup-test-fixtures.py
```

This creates test-fixtures\ with 13 minimal valid PDF and PNG files.
See section 9 for the full list.

### 3.6 Set up environment variables

```powershell
Copy-Item .env.example .env
notepad .env
```

Minimum keys to fill in:

```
LLM_PROVIDER=ollama
LLM_MODEL=mistral:13b
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=

FORMFACTORY_DATA=C:\Code\formfactory
FORMFACTORY_SERVER=http://localhost:5000
```

---

## 4. Understanding the data

### How instances are structured

The FormFactory dataset has 25 form types across 8 domains.

**data/data1/<form>.json** — array of 50 gold-answer objects. Each is a flat dict
mapping field labels to correct values. Example (Background_check.json, instance 1):

```json
{
  "First Name": "John",
  "Last Name": "Doe",
  "SSN": "123-45-6789",
  "Date of Birth": "1985-04-15",
  "Street Address": "123 Elm St"
}
```

**data/data2/<form>.txt** — 50 narrative input documents, one per instance.
These are "source texts" the agent reads to fill the form — cover letters,
authorization statements, or narratives written in natural language that contain
all the values the agent needs to extract and fill in. Example (Background_check.txt, instance 1):

> I, John Michael Doe, hereby authorize the complete background check process.
> My personal details: 123 Elm St, Springfield, IL 62704, DOB April 15 1985, SSN 123-45-6789...

### The two personas: dataset instances vs. Alice Zhang

| Where used | Persona | Source |
|-----------|---------|--------|
| Extension benchmark | Per-instance (John Doe, Jane Smith, ...) | formfactory/data/data1+2/ |
| Web-portal benchmark | Alice Jane Zhang | web-portal/data/test-profile.json |
| MCP benchmark | Alice Jane Zhang | mcp-implementations/shared/user-profile.json |

The extension uses the formfactory dataset directly (50 real instances per form
with matching gold answers). The web-portal and MCP runners use the single Alice
Zhang test profile which covers all 25 form domains.

### Domain-specific fields

Several forms have fields that go beyond standard personal information.
These are covered by dedicated sections in the test profile:

| Form | Profile section | Extra files |
|------|----------------|-------------|
| Art Exhibition / Literary Magazine | arts.* | arts.artworkImageFile, arts.manuscriptFile |
| Medical Research / Health Insurance | health.* | health.medicalBillsFile |
| NDA / Contractor Onboarding | legal.* | — |
| Startup Funding | startup.* | startup.pitchDeckFile |
| Paper Submission | academic.* | academic.paperFile |
| Conference Speaker | conference.* | professional.cvFile |
| Scholarship / Student Registration | scholarship.* | academic.transcriptFile, academic.recommendationLetterFile |
| Rental Application | rental.* | rental.idProofFile, rental.incomeProofFile |
| Membership Application | membership.* | professional.resumeFile |
| Manufacturing Order | manufacturing.* | — |
| Project Bid | construction.* | — |
| Bug Report / IT Support | bugReport.* / itSupport.* | itSupport.attachments |

---

## 5. Configuring a provider / model

Edit C:\Code\FFA\.env to switch providers:

```
LLM_PROVIDER   = ollama | bedrock | openai | gemini
LLM_MODEL      = <model identifier>
LLM_BASE_URL   = <API base URL>
LLM_API_KEY    = <API key>
```

Provider quick-reference:

| Provider | LLM_PROVIDER | LLM_BASE_URL | LLM_MODEL example |
|----------|-------------|--------------|-------------------|
| Ollama (local) | ollama | http://localhost:11434/v1 | mistral:13b |
| AWS Bedrock (gateway) | bedrock | your gateway URL | llama3-13b |
| OpenAI | openai | https://api.openai.com/v1 | gpt-4o-mini |
| Gemini | gemini | gateway or native URL | gemini-1.5-flash-002 |

Bedrock model guard: if LLM_PROVIDER=bedrock, the benchmark refuses to run unless
LLM_MODEL contains a parameter-count token like 13b. Allowed range: 10-30B.
See shared/provider-utils.ts and Documentation/MODEL-SELECTION.md to change this.

---

## 6. Running the benchmarks

All commands assume: cd C:\Code\FFA

### 6.0 Load .env into PowerShell

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -notmatch '^\s*#' -and $_ -match '=') {
    $p = $_ -split '=', 2
    Set-Item "env:\$($p[0].Trim())" $p[1].Trim()
  }
}
```

### 6.1 Start the FormFactory Flask server (separate terminal)

```powershell
cd C:\Code\formfactory
.\.venv\Scripts\Activate
python -m flask run --host 127.0.0.1 --port 5000
```

Verify: curl http://localhost:5000 — should return HTML.

### 6.2 Extension benchmark

Reads formfactory dataset directly (data/data1 + data/data2).

```powershell
# Quick smoke (1 instance per form, ~2-5 min):
$env:INSTANCES = '1'
npx tsx extension\scripts\ablation-study.ts --quick

# Standard run (5 instances per form, ~10-20 min):
$env:INSTANCES = '5'
npx tsx extension\scripts\ablation-study.ts

# Full paper-scale (50 instances, ~2-4 hours):
$env:INSTANCES = '50'
npx tsx extension\scripts\ablation-study.ts
```

Output:
- Per-instance JSONL: Documentation\ablation-records\extension-*.jsonl
- Per-agent HTML report: extension\benchmark-results\<agent>\

### 6.3 Web-portal benchmark

Navigates real FormFactory pages (needs Flask running) using Alice Zhang profile.

```powershell
# Quick (1 instance per form):
npx tsx web-portal\benchmark.ts --instances 1

# Specific agent:
npx tsx web-portal\benchmark.ts --instances 1 --agent llm-structured

# Full run (all agents):
npx tsx web-portal\benchmark.ts --instances 5
```

Output: Documentation\ablation-records\portal-*.jsonl

### 6.4 MCP benchmark

```powershell
# PlaywrightMCP only, 1 run:
npx tsx mcp-implementations\shared\runner.ts --impls playwright-mcp --runs 1

# All implementations, 3 runs each:
npx tsx mcp-implementations\shared\runner.ts --runs 3
```

Output:
- Documentation\ablation-records\mcp-*.jsonl
- benchmark-results\mcp-results.json

---

## 7. Aggregating results

```powershell
npx tsx scripts\aggregate-ablation.ts
```

Reads every *.jsonl under Documentation\ablation-records\ and writes:
- Documentation\ABLATION-MASTER-REPORT.md  (leaderboard, human-readable)
- Documentation\ablation-master-data.json  (machine-readable, for charts)

---

## 8. What the output means

| Metric | Description |
|--------|-------------|
| fillRate | % of form fields that received any value (0-100) |
| valueAccuracy | % of filled fields matching the gold answer |
| llmTimeMs | Wall time for LLM call(s) per form instance |
| estimatedCostUSD | Based on token counts * provider rates in shared/cost-model.ts |

perFieldType breaks down valueAccuracy by field category:
- Text, email, date, number: exact or substring match
- Textarea/Description: BLEU-4 >= 20 threshold
- Checkbox: boolean equality
- Radio/Select: case-insensitive exact match

The master report ranks configs by valueAccuracy * fillRate / 100 (combined score)
and shows cost per instance, helping you pick the best agent for a given budget.

---

## 9. File-upload forms — dummy fixtures

Run once: python scripts\setup-test-fixtures.py

| File | Used by form | HTML field |
|------|-------------|------------|
| alice-zhang-resume.pdf | Membership (B14), Speaker (C13) | resume, cv |
| alice-zhang-cover-letter.pdf | Job Application (A11) | cover letter |
| alice-zhang-research-paper.pdf | Paper Submission (A14) | paper_file |
| alice-zhang-transcript.pdf | Scholarship/Student Reg (A13) | transcript |
| alice-zhang-recommendation-letter.pdf | Scholarship (A13) | recommendationLetter |
| alice-zhang-pitch-deck.pdf | Startup Funding (B11) | pitch_deck |
| alice-zhang-id-proof.pdf | Rental Application (B12) | id_proof |
| alice-zhang-income-proof.pdf | Rental Application (B12) | income_proof |
| alice-zhang-credentials.pdf | Membership (B14) | credentials |
| alice-zhang-manuscript.pdf | Literary Magazine (C12) | manuscript |
| alice-zhang-medical-bills.pdf | Health Insurance (F13) | medicalBills |
| alice-zhang-artwork.png | Art Exhibition (C11) | artwork_image |
| alice-zhang-screenshot.png | Bug Report (D11), IT Support (D12) | attachments, screenshots |

All files are minimal valid PDFs/PNGs containing Alice Zhang fictional data.
Paths are stored in the test profile under *File keys
(e.g. professional.resumeFile, arts.artworkImageFile).
Files are git-ignored (add test-fixtures/ to .gitignore if needed).

---

## 10. Troubleshooting

**"No instances loaded"**
- Confirm FORMFACTORY_DATA=C:\Code\formfactory is set.
- Confirm data/data1/ and data/data2/ exist inside that path.

**Flask server not reachable**
- The portal and MCP benchmarks need Flask at http://localhost:5000.
- Check: curl http://localhost:5000
- Fix: activate venv first with .\.venv\Scripts\Activate

**"Model validation failed"**
- For Bedrock: LLM_MODEL must include a parameter count like 13b.
- Or use LLM_PROVIDER=ollama (no guard).
- See Documentation/MODEL-SELECTION.md for full details.

**tsx / esbuild transform errors**
- Run npm ci in FFA root.
- Check TypeScript compiles: npx tsc --noEmit

**Playwright timeout on form submission**
- Set PLAYWRIGHT_TIMEOUT=60000 for multi-page forms.

**Cost estimates show $0**
- Populate shared/cost-model.ts with your provider's real pricing.
- Ollama is always $0 by design.
