# CLAUDE.md

This file is for Claude Code specifically. The cross-tool agent guide is at [AGENTS.md](./AGENTS.md) and applies to Claude as well.

## Order of precedence

1. Explicit user instruction in the current session.
2. Saved memories in `~/.claude/projects/-Users-raillyhugo-hunter-brain/memory/` (auto-loaded).
3. This file ([CLAUDE.md](./CLAUDE.md)) for Claude-Code-specific behavior.
4. [AGENTS.md](./AGENTS.md) for project conventions any agent must follow.
5. [docs/](./docs/) for design and architecture.

When two of these conflict, the lower number wins.

## Claude-specific conventions

### When the user is in espanol mode

Hunter (the user, full name Railly Hugo) writes in Spanish frequently. Respond in Spanish when he does. Code, comments, commit messages, and PR descriptions stay in English (project conventions, AGENTS.md). Do not transliterate accents — Stack is full UTF-8.

### Never apologize for the tools

If `agent-browser` errors out, the user wants to know why and how to fix it. Diagnose, do not apologize. Same for `bun install`, `vercel deploy`, etc.

### Bash command preferences

The user prefers bash one-liners that produce a verifiable diff over interactive prompts. When confirming work, end with a verification command, not a "is this OK?" question:

```bash
# Good
git log --pretty="%h %an %ad %s" --date=short -- pe/CON-1993.md | head -5

# Avoid
echo "Did this work?"
```

### File edits

Always prefer `Edit` over `Write` for existing files. `Write` over an existing file loses any in-flight linter changes. If you must `Write`, `Read` first in the same turn so the file state is current.

### Track work with TaskCreate / TaskUpdate

For multi-slice work (anything beyond a single small edit), use the task tools. The user reads them, and they help recover state if a session is interrupted.

### Memory

This project has saved memories the user has explicitly asked you to respect:

- `feedback_no_em_dashes_pr.md` — never use `—` in commits, PRs, READMEs, external text
- `user_name.md` — public attributions are "Railly Hugo", never "Hunter Quispe"
- `feedback_no_coauthor.md` — never add Co-Authored-By Claude to commits
- `pattern_agent_first.md` — CLI-first, agent-first design

These are MEMORY rules. Follow them silently. Do not surface unless directly relevant.

### Tool patterns documented in AGENTS.md

For anything operational (commit identity, frontmatter spec, fetcher classes, scraping etiquette, things that have failed), the source of truth is [AGENTS.md](./AGENTS.md). Read it once per session. Do not duplicate its content here.

## What to do at the start of a new Claude Code session in this repo

1. Run `git log --oneline -5` in both this engine repo and `../legalize-pe` to see the latest state.
2. Run `vercel inspect legalize-pe.crafter.ing 2>&1 | head -10` to confirm production is healthy.
3. Check the federation PR: `gh pr view 17 --repo legalize-dev/legalize`.
4. Look at `audit/recovered-*.md` if any new ones since last session.
5. Read [AGENTS.md](./AGENTS.md) if you have not in this session.

## What Hunter values in agent responses

- Decisions and results, not narration.
- Verification commands at the end.
- Honest framing when something fails. The "webctl deferred V2" finding was valuable precisely because it was empirical.
- Brevity. Three sentences over five.

## What Hunter does not want

- Em dashes.
- "Hunter Quispe" anywhere external.
- Co-authored-by tags.
- Long ceremonial preambles before tool calls.
- Asking permission for safe operations (reading files, running `git log`, running scripts in dry-run mode).
