#!/usr/bin/env bash
# Consume a TSV plan and create [reform] commits on the corpus repo
# with Crafternauta bot identity.
#
# Plan row format (tab-separated):
#   relativePath \t reform_identifier \t reform_title \t publication_date \t git_safe_date \t affected_articles_csv \t commit_subject
#
# Usage:
#   ./run-reform.sh <corpus_repo_path> <plan.tsv>

set -euo pipefail

CORPUS="${1:?corpus repo path required}"
PLAN="${2:?plan TSV required}"

if [[ ! -d "$CORPUS/.git" ]]; then
  echo "Error: $CORPUS is not a git repo" >&2
  exit 1
fi

CORPUS_ABS=$(cd "$CORPUS" && pwd)
PLAN_ABS=$(cd "$(dirname "$PLAN")" && pwd)/$(basename "$PLAN")

TOTAL=$(wc -l < "$PLAN_ABS" | tr -d ' ')
echo "Creating $TOTAL [reform] commits in $CORPUS_ABS..."

COUNT=0
START=$(date +%s)
cd "$CORPUS_ABS"

while IFS=$'\t' read -r REL_PATH REFORM_ID REFORM_TITLE PUB_DATE GIT_DATE AFFECTED_ARTS SUBJECT; do
  if [[ -z "$REL_PATH" ]]; then continue; fi
  COUNT=$((COUNT + 1))

  git add "$REL_PATH" 2>/dev/null

  MSG="${SUBJECT}

Source-Id: ${REFORM_ID}
Source-Date: ${PUB_DATE}
Norm-Id: CON-1993
"

  GIT_AUTHOR_NAME="Crafternauta" \
  GIT_AUTHOR_EMAIL="the.crafter.station@gmail.com" \
  GIT_AUTHOR_DATE="${GIT_DATE}" \
  GIT_COMMITTER_NAME="Crafternauta" \
  GIT_COMMITTER_EMAIL="the.crafter.station@gmail.com" \
  GIT_COMMITTER_DATE="${GIT_DATE}" \
    git commit -q -m "$MSG"

  if (( COUNT % 10 == 0 )); then
    ELAPSED=$(($(date +%s) - START))
    echo "  ... $COUNT/$TOTAL (${ELAPSED}s)"
  fi
done < "$PLAN_ABS"

ELAPSED=$(($(date +%s) - START))
echo ""
echo "✓ Created $COUNT [reform] commits in ${ELAPSED}s"
