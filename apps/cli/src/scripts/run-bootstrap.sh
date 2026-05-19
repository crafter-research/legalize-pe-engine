#!/usr/bin/env bash
# Consume bootstrap-plan.tsv and create one Crafternauta commit per row.
#
# Usage:
#   ./run-bootstrap.sh <corpus_repo_path> <plan.tsv>
#
# Each row format (tab-separated):
#   relativePath \t identifier \t title \t publication_date \t git_safe_date \t year

set -euo pipefail

CORPUS="${1:?corpus repo path required}"
PLAN="${2:?plan TSV required}"

if [[ ! -d "$CORPUS/.git" ]]; then
  echo "Error: $CORPUS is not a git repo" >&2
  exit 1
fi

if [[ ! -f "$PLAN" ]]; then
  echo "Error: plan file $PLAN not found" >&2
  exit 1
fi

# Absolute paths
CORPUS_ABS=$(cd "$CORPUS" && pwd)
PLAN_ABS=$(cd "$(dirname "$PLAN")" && pwd)/$(basename "$PLAN")

TOTAL=$(wc -l < "$PLAN_ABS" | tr -d ' ')
echo "Bootstrapping $TOTAL norms into $CORPUS_ABS..."

COUNT=0
START=$(date +%s)
cd "$CORPUS_ABS"

while IFS=$'\t' read -r REL_PATH IDENT TITLE PUB_DATE GIT_DATE YEAR; do
  if [[ -z "$REL_PATH" ]]; then continue; fi
  COUNT=$((COUNT + 1))

  git add "$REL_PATH" 2>/dev/null

  MSG="[bootstrap] ${TITLE} — versión original ${YEAR}

Source-Id: ${IDENT}
Source-Date: ${PUB_DATE}
Norm-Id: ${IDENT}
"

  GIT_AUTHOR_NAME="Crafternauta" \
  GIT_AUTHOR_EMAIL="the.crafter.station@gmail.com" \
  GIT_AUTHOR_DATE="${GIT_DATE}" \
  GIT_COMMITTER_NAME="Crafternauta" \
  GIT_COMMITTER_EMAIL="the.crafter.station@gmail.com" \
  GIT_COMMITTER_DATE="${GIT_DATE}" \
    git commit -q -m "$MSG"

  if (( COUNT % 100 == 0 )); then
    ELAPSED=$(($(date +%s) - START))
    echo "  ... $COUNT/$TOTAL (${ELAPSED}s)"
  fi
done < "$PLAN_ABS"

ELAPSED=$(($(date +%s) - START))
echo ""
echo "✓ Created $COUNT Crafternauta commits in ${ELAPSED}s"
