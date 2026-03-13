# Review Findings — 2026-03-13

Comprehensive review of the specd project by three independent agents: core project, templates/docs, and evals. Findings are grouped by category with severity, detailed explanation, and fix path for each.

---

## Bugs

### 1. ✅ Partial-write bug on FRAMEWORK_OWNED conflict during update

**Severity:** High
**File:** `src/commands.js` lines 143-176, 252-267

**Problem:** The `update` command iterates over FRAMEWORK*OWNED files and overwrites each one sequentially. If a file later in the list has a local modification (triggering a conflict), the function returns early with the conflict list. However, files processed \_before* the conflicting file have already been overwritten on disk, but the `.specd` checksums file is never updated (the save is skipped when conflicts exist, line 252).

On the next `update` run, those already-overwritten files will have an on-disk checksum that doesn't match the stored checksum in `.specd`. The update command interprets this as a local modification — reporting a false "CONFLICT" for files that the framework itself wrote.

**Example scenario:**

1. User runs `specd update`
2. `implement.md` is overwritten successfully (file 1 of 7)
3. `audit.md` is overwritten successfully (file 2 of 7)
4. `plan.md` has a local modification — conflict detected, function returns
5. `.specd` checksums are NOT saved
6. Next `specd update` — `implement.md` and `audit.md` now show as "CONFLICT" because their on-disk checksums don't match the stale `.specd` file

**Fix:** Two-pass approach. First pass: scan all FRAMEWORK_OWNED files for conflicts without writing anything. If any conflicts exist, report them and exit. Second pass: only if no conflicts, write all files and save checksums. This makes the operation atomic — either everything updates or nothing does.

---

### 2. ✅ `.env.example` excluded from git by `.env.*` pattern

**Severity:** Medium
**File:** `.gitignore` line 11

**Problem:** The `.gitignore` pattern `.env.*` matches `.env.example`, preventing it from being tracked. Contributors who clone the repo won't see the example file and won't know they need an `ANTHROPIC_API_KEY` to run behavioral evals.

**Fix:** Add `!.env.example` after the `.env.*` line in `.gitignore`. This negates the pattern for that specific file.

```
.env
.env.*
!.env.example
```

---

## Template and Documentation Fixes

### 3. ✅ `specd_work_list.md` "POPULATED BY" comment omits `/specd:plan`

**Severity:** Medium
**File:** `templates/specd_work_list.md` line 17

**Problem:** The comment says: `POPULATED BY: /specd:audit command, /specd:review-intake command, and humans during spec phase.` This omits `/specd:plan`, which is explicitly described as a primary populator of the work list. The plan command's instructions say "The work list is the primary deliverable of planning" and "Write work items as you go."

**Fix:** Update line 17 to: `POPULATED BY: /specd:plan command (during spec phase), /specd:audit command, /specd:review-intake command, and humans.`

---

### 4. ✅ `specs/README.md` uses legacy "Tracks" terminology

**Severity:** Medium
**File:** `templates/specs/README.md` lines 13 and 39

**Problem:** Two places still use the old "Tracks" naming from before the rename to `specd_history.md`:

- Line 13: `**Tracks** — [specd_history.md](../specd_history.md) records what's been implemented`
- Line 39: `## Tracks (Done Log)`

Every other file in the system uses "history" or "specd_history.md". The REMOVED list in config.js includes `tracks.md`, confirming this is legacy.

**Fix:** Replace both occurrences:

- Line 13: `**History** — [specd_history.md](../specd_history.md) records what's been implemented`
- Line 39: `## History (Done Log)`

---

### 5. ✅ `specs/README.md` contradicts `specd_history.md` on entry format

**Severity:** Medium
**File:** `templates/specs/README.md` vs `templates/specd_history.md` line 3

**Problem:** The `specd_history.md` template comment says: `Completed work items, newest first. Do not group by spec — just append at the top.` The AGENTS.md (line 31) agrees: entries are single lines in reverse chronological order.

However, the root `README.md` (line 167) says specd_history.md entries are "organized by spec and version." This is wrong — history is a flat reverse-chronological list, not grouped.

**Fix:** Update the root README.md to say entries are in reverse chronological order (newest first), matching the template and AGENTS.md.

---

### 6. ✅ `AGENTS.md` command table missing `full-audit`

**Severity:** Medium
**File:** `templates/AGENTS.md` lines 17-21

**Problem:** The "Loop System" command table lists three commands: `implement`, `audit`, and `review-intake`. It omits `full-audit`, which is part of the loop system (it's an alternative audit mode that covers both Ready and Implemented specs). The table also omits `plan` and `setup`, but those are interactive commands outside the loop, so omitting them is arguably intentional.

`full-audit` should be in the table because `loop.sh` can invoke it and agents need to know it exists.

**Fix:** Add a row for `full-audit`:

```
| `/specd:full-audit`   | Like audit but covers Ready AND Implemented specs — demotes Implemented specs with findings |
```

---

### 7. ✅ `plan.md` incomplete list of files it modifies

**Severity:** Low
**File:** `templates/claude/commands/specd/plan.md` line 7

**Problem:** Line 7 says: `We do **not** write code unless explicitly asked to do so. We only modify *.md files and specd_work_list.md.` This omits two files that the plan command's own instructions say to write to:

- `specd_decisions.jsonl` — the Decision Logging section (line 66) says to log decisions here
- `specs/README.md` — step 4 (line 15) says to update the spec entry in the index table

**Fix:** Update line 7 to: `We do **not** write code unless explicitly asked to do so. We only modify *.md files, specd_work_list.md, and specd_decisions.jsonl.`

(No need to list `specs/README.md` separately since it's a `.md` file.)

---

### 8. ✅ Root `README.md` omits `specd_decisions.jsonl`

**Severity:** Medium
**File:** `README.md`

**Problem:** The README's quickstart file list and "Work Tracking" section describe three files: `specd_work_list.md`, `specd_history.md`, and `specd_review.md`. The new `specd_decisions.jsonl` file is not mentioned anywhere in the README.

**Fix:** Add `specd_decisions.jsonl` to:

1. The quickstart file list (around line 53) with a one-line description
2. The "Work Tracking" section (around line 162) with a brief explanation of what it captures

---

## Eval Gaps

### 9. ✅ `full-audit.md` and `review-intake.md` have zero test coverage

**Severity:** High
**File:** `evals/promptfooconfig.yaml`

**Problem:** Two of the five loop commands have no behavioral tests at all:

- `full-audit.md` — differs from `audit.md` in that it covers Implemented specs too and can demote them back to Ready. This is important behavior to verify.
- `review-intake.md` — processes human-reviewed findings into work items. The decision about whether to promote or drop a finding, and the decision_by attribution (human name from git config), are untested.

**Fix:** Add tests for both commands:

**full-audit tests:**

- Given a mix of Ready and Implemented specs, it audits both (unlike regular audit which skips Implemented)
- When an Implemented spec has findings, it bumps the version and demotes status to Ready
- Decisions are logged with `"source": "full-audit"`

**review-intake tests:**

- Given findings in `specd_review.md`, it creates concrete work items in `specd_work_list.md`
- Empty `specd_review.md` produces `REVIEW_INTAKE_COMPLETE: true` immediately
- Decisions are logged with `"source": "review-intake"` and `decision_by` from git config

---

### 10. ✅ Audit tests lack source code context

**Severity:** Medium
**File:** `evals/load-templates.mjs`

**Problem:** The audit command is designed to compare specs against code, but the eval scaffolding provides no source code files in the context. The audit tests effectively test "can the model follow prompt structure" rather than "can the model audit a spec against code."

**Fix:** Add realistic source code files to the scaffolded context for audit tests. For example, an `src/auth.js` file that partially implements the auth spec — with one or two deliberate mismatches for the audit to find. This would test that the audit identifies real findings.

The `load-templates.mjs` `buildContext` function already supports `extra_files`, so audit test cases can include source code via that mechanism:

```yaml
extra_files:
  - path: src/auth.js
    content: |
      // Auth implementation with deliberate spec mismatch
      // Uses argon2 instead of bcrypt (spec says bcrypt)
      ...
```

---

### 11. ✅ No tests for LOOP_COMPLETE / TASK_COMPLETE signals

**Severity:** Medium
**File:** `evals/promptfooconfig.yaml`

**Problem:** The implement command outputs `TASK_COMPLETE: true` after each item and `LOOP_COMPLETE: true` when all items are done or blocked. These are the signals that `loop.sh` uses to control iteration. Similarly, audit outputs `AUDIT_COMPLETE: true` and `AUDIT_CLEAN: true`. None of these are tested.

These signals are critical — if the model doesn't output them, the autonomous loop breaks.

**Fix:** Add assertion checks for these signals:

**Implement tests:**

- After completing a work item, response should mention `TASK_COMPLETE: true`
- When all remaining items are blocked, response should mention `LOOP_COMPLETE: true`

**Audit tests:**

- After completing audit, response should mention `AUDIT_COMPLETE: true`
- When no findings, response should mention `AUDIT_CLEAN: true`

Use `icontains` assertions for these since the model should include them verbatim.

---

### 12. ✅ `setup.md` has minimal test coverage

**Severity:** Low
**File:** `evals/promptfooconfig.yaml`

**Problem:** The setup command has 5 interactive steps (build/test commands, conventions, validation steps, first spec, cleanup) but only 1 test covering step 1. Steps 2-5 are untested.

**Fix:** Add tests for at least the high-value steps:

- **Step 2 (conventions):** Given a Go codebase, does it propose Go-specific conventions?
- **Step 3 (validation):** Does it propose customizing the implement.md validation section?
- **Step 4 (first spec):** Does it offer to help write the first spec?

Step 5 (cleanup) is less important to test since it's just deleting the example file.

---

## Unit Test Gaps

### 13. ✅ No explicit test for `specd_decisions.jsonl` creation on init

**Severity:** Low
**File:** `test/commands.test.js`

**Problem:** The init test checks for every file explicitly but does not include `specd_decisions.jsonl`. The file count test (line 112) would implicitly catch a missing file, but there's no explicit assertion like the other files have.

**Fix:** Add to the init test's file existence checks:

```js
expect(existsSync(join(tmp, "specd_decisions.jsonl"))).toBe(true);
```

---

### 14. ✅ No test for dry-run mode

**Severity:** Medium
**File:** `test/commands.test.js`

**Problem:** The `update` function accepts a `dryRun` option but there's no test verifying it works — that it returns the right messages without modifying files on disk.

**Fix:** Add a test that:

1. Runs `init`, then modifies a framework file
2. Runs `update` with `dryRun: true`
3. Asserts the modified file is NOT overwritten
4. Asserts the result messages include "WOULD" prefixes

---

### 15. ✅ No test for doctor version-mismatch warning

**Severity:** Low
**File:** `test/commands.test.js`

**Problem:** The `doctor` command checks if the `.specd` version matches the installed version and warns on mismatch (`commands.js` lines 330-335). This path is untested.

**Fix:** Add a test that writes a `.specd` file with a different version string and verifies the doctor reports a failure with a version mismatch message.

---

### 16. ✅ `template-refs.test.js` doesn't check `loop.sh` references

**Severity:** Low
**File:** `test/template-refs.test.js`

**Problem:** The reference validation test only checks `.md` files for references. `loop.sh` references command paths like `.claude/commands/specd/implement.md` but is not checked. If a command file were renamed, `loop.sh` would silently break.

**Fix:** Extend `getAllTemplateMarkdown` (or add a parallel function) to also scan `loop.sh` for file path references and validate them.

---

## Low Priority

### 17. ✅ `setup.md` doesn't mention `specd_decisions.jsonl`

**Severity:** Low
**File:** `templates/claude/commands/specd/setup.md`

**Problem:** Setup is the onboarding command that walks users through customizing their project. It covers AGENTS.md, implement.md, first spec, and cleanup — but never mentions `specd_decisions.jsonl`. Since decisions are a cross-cutting concern, new users should know the file exists.

**Fix:** Add a brief mention during Step 1 (AGENTS.md walkthrough) or as a note at the end: "Your project also includes `specd_decisions.jsonl` — the AI logs decisions here as it works. See AGENTS.md for details."

---

### 18. ✅ `specs/README.md` doesn't mention `specd_decisions.jsonl`

**Severity:** Low
**File:** `templates/specs/README.md`

**Problem:** The specs README documents how specs work, including the work list, history, and review files. It does not mention the decision log. Since decisions capture spec-related reasoning (scoping choices, audit judgments, version bumps), a brief mention would help users understand the full picture.

**Fix:** Add a short section or a line in the "How Specs Work" overview: "Decision reasoning is logged in [specd_decisions.jsonl](../specd_decisions.jsonl) — see AGENTS.md for format."

---

### 19. ✅ Makefile `set -a` is bash-specific

**Severity:** Low
**File:** `Makefile` line 35

**Problem:** The `test-behavioral` target uses `set -a && . ./.env && set +a` which relies on bash behavior. Make uses `/bin/sh` by default, which on some systems may not support `set -a`.

**Fix:** Either add `SHELL := /bin/bash` at the top of the Makefile, or use a different approach:

```makefile
test-behavioral:
	export $$(cat .env | xargs) && cd evals && npx promptfoo eval
```

Or keep the current approach and add the SHELL directive since the project already requires bash (lefthook, loop.sh).

---

### 20. ✅ Code fence language blocklist in evals is incomplete

**Severity:** Low
**File:** `evals/promptfooconfig.yaml` line 55

**Problem:** The `not-regex` assertion for code blocks checks: `js|javascript|typescript|ts|python|go|rust`. This misses commonly generated languages like `sql`, `java`, `shell`, `bash`, `ruby`, `php`, `c`, `cpp`, `csharp`.

**Fix:** Expand the pattern:

````yaml
- type: not-regex
  value: "```(?:js|javascript|typescript|ts|python|go|rust|java|sql|shell|bash|ruby|php|c|cpp|csharp)\\n"
````

Or use a simpler approach — check that the response doesn't contain _any_ code block with a language annotation, with exceptions for `markdown` (used for spec format examples):

````yaml
- type: not-regex
  value: "```(?!markdown|\\n)[a-z]"
````
