#!/usr/bin/env bash
# update-report.sh
# Regenerate Documentation/Report.md (and rebuild Report.tex) when the
# repository sees a "major" change. Designed to be invoked either:
#   - manually after a big change       ($ bash scripts/update-report.sh)
#   - from a cron tick (every N hours)  (delivers a summary if work was done)
#
# A change is "major" iff any of the following appears in commits since
# the last successful run:
#   - a new folder under extension/src/implementations/
#   - a change to web-portal/ top-level modules
#   - a new benchmark-results/<agent>/benchmark-report.json
#   - a change to the UserProfile type
#
# Exits 0 with empty stdout when nothing needs to be done (silent watchdog).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

STATE_DIR=".ffa-report-state"
mkdir -p "$STATE_DIR"
LAST_SHA_FILE="$STATE_DIR/last-sha"

CURRENT_SHA="$(git rev-parse HEAD 2>/dev/null || echo none)"
LAST_SHA="$(cat "$LAST_SHA_FILE" 2>/dev/null || echo '')"

if [ "$CURRENT_SHA" = "$LAST_SHA" ]; then
  exit 0
fi

# Collect changed paths since last run (or last 50 commits if first run).
if [ -n "$LAST_SHA" ]; then
  CHANGED="$(git diff --name-only "$LAST_SHA" "$CURRENT_SHA" 2>/dev/null || true)"
else
  CHANGED="$(git log --name-only --pretty=format: -n 50 2>/dev/null | sort -u)"
fi

MAJOR=0
echo "$CHANGED" | grep -qE '^extension/src/implementations/[^/]+/'           && MAJOR=1 || true
echo "$CHANGED" | grep -qE '^web-portal/(src|app)/'                          && MAJOR=1 || true
echo "$CHANGED" | grep -qE '^benchmark-results/[^/]+/benchmark-report\.json' && MAJOR=1 || true
echo "$CHANGED" | grep -qE 'types/index\.ts'                                 && MAJOR=1 || true
# MCP-implementations track (current focus)
echo "$CHANGED" | grep -qE '^mcp-implementations/[^/]+/src/'                 && MAJOR=1 || true
echo "$CHANGED" | grep -qE '^mcp-implementations/shared/'                    && MAJOR=1 || true
echo "$CHANGED" | grep -qE '^benchmark-results/mcp-[^/]+/'                   && MAJOR=1 || true

if [ "$MAJOR" -eq 0 ]; then
  echo "$CURRENT_SHA" > "$LAST_SHA_FILE"
  exit 0
fi

# --- Regenerate the report header timestamp + results table -----------
TODAY="$(date +%Y-%m-%d)"

# Patch the "Last updated" line.
if [ -f Documentation/Report.md ]; then
  sed -i.bak -E "s/^\*\*Last updated:\*\* .*/**Last updated:** ${TODAY}/" \
      Documentation/Report.md && rm -f Documentation/Report.md.bak
fi

# Re-aggregate benchmark numbers into a Markdown snippet.
python - <<'PY' > "$STATE_DIR/results-table.md"
import json, glob, os
rows = []
for p in sorted(glob.glob("benchmark-results/*/benchmark-report.json")):
    try:
        d = json.load(open(p))
    except Exception:
        continue
    rows.append({
      "agent": d.get("agentName", os.path.basename(os.path.dirname(p))),
      "fields": d.get("totalFields", "?"),
      "value": d.get("globalAtomic", {}).get("overallValueAccuracy", "?"),
      "completion": d.get("globalEpisodic", {}).get("formCompletionRate", "?"),
    })
print("| Agent | Total fields | Overall value acc. | Form completion rate |")
print("|-------|--------------|--------------------|----------------------|")
for r in rows:
    v = r["value"]; c = r["completion"]
    vs = f"{v:.2f}%" if isinstance(v, (int, float)) else str(v)
    cs = f"{c:.2f}%" if isinstance(c, (int, float)) else str(c)
    print(f"| {r['agent']} | {r['fields']} | {vs} | {cs} |")
PY

echo "[update-report] Major change detected ($CURRENT_SHA)."
echo "[update-report] Updated Documentation/Report.md timestamp."
echo "[update-report] Fresh results table written to $STATE_DIR/results-table.md."
echo
echo "Changed paths:"
echo "$CHANGED" | sed 's/^/  /'
echo
echo "Next: review Documentation/Report.md, paste the results table above"
echo "into section 5, then rebuild the LaTeX:"
echo "  cd Documentation && pdflatex Report.tex"

echo "$CURRENT_SHA" > "$LAST_SHA_FILE"
