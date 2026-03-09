#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_SH="${SCRIPT_DIR}/install.sh"
VERSION="$(grep '^VERSION=' "$INSTALL_SH" | head -1 | cut -d'"' -f2)"

pass=0
fail=0

assert() {
  local label="$1"
  local condition="$2"
  if eval "$condition"; then
    echo "  PASS  $label"
    pass=$((pass + 1))
  else
    echo "  FAIL  $label"
    fail=$((fail + 1))
  fi
}

make_tmp() {
  mktemp -d "${TMPDIR:-/tmp}/spec-dd-test.XXXXXX"
}

run_init() {
  local dir="$1"
  local name="${2:-TestProject}"
  local desc="${3:-A test project}"
  printf '%s\n%s\n' "$name" "$desc" | bash "$INSTALL_SH" init "$dir" >/dev/null 2>&1
}

run_update() {
  local dir="$1"
  bash "$INSTALL_SH" update "$dir" >/dev/null 2>&1
}

run_doctor() {
  local dir="$1"
  bash "$INSTALL_SH" doctor "$dir" >/dev/null 2>&1
}

# ── init tests ──────────────────────────────────────────────────────

echo ""
echo "== init tests =="

tmp="$(make_tmp)"
run_init "$tmp"

assert "init creates CLAUDE.md" "[ -f '$tmp/CLAUDE.md' ]"
assert "init creates AGENTS.md" "[ -f '$tmp/AGENTS.md' ]"
assert "init creates loop.sh" "[ -f '$tmp/loop.sh' ]"
assert "init creates specs/README.md" "[ -f '$tmp/specs/README.md' ]"
assert "init creates specs/example-spec.md" "[ -f '$tmp/specs/example-spec.md' ]"
assert "init creates tracks.md" "[ -f '$tmp/tracks.md' ]"
assert "init creates review.md" "[ -f '$tmp/review.md' ]"
assert "init creates planning_prompt.md" "[ -f '$tmp/planning_prompt.md' ]"
assert "init creates working_tracks.md" "[ -f '$tmp/working_tracks.md' ]"
assert "init creates .claude/commands/implement.md" "[ -f '$tmp/.claude/commands/implement.md' ]"
assert "init creates .claude/commands/audit.md" "[ -f '$tmp/.claude/commands/audit.md' ]"
assert "init creates .claude/commands/full-audit.md" "[ -f '$tmp/.claude/commands/full-audit.md' ]"
assert "init creates .claude/commands/review-intake.md" "[ -f '$tmp/.claude/commands/review-intake.md' ]"

assert "init replaces {PROJECT_NAME} in AGENTS.md" \
  "grep -q 'TestProject' '$tmp/AGENTS.md' && ! grep -q '{PROJECT_NAME}' '$tmp/AGENTS.md'"

assert "init replaces {PROJECT_NAME} in specs/README.md" \
  "grep -q 'TestProject' '$tmp/specs/README.md' && ! grep -q '{PROJECT_NAME}' '$tmp/specs/README.md'"

assert "init replaces {PROJECT_NAME} in tracks.md" \
  "grep -q 'TestProject' '$tmp/tracks.md' && ! grep -q '{PROJECT_NAME}' '$tmp/tracks.md'"

assert "init replaces {One-line project description} in specs/README.md" \
  "grep -q 'A test project' '$tmp/specs/README.md' && ! grep -q '{One-line project description}' '$tmp/specs/README.md'"

assert "init creates .spec-dd-version with correct version" \
  "[ \"\$(cat '$tmp/.spec-dd-version')\" = '$VERSION' ]"

assert "init makes loop.sh executable" \
  "[ -x '$tmp/loop.sh' ]"

rm -rf "$tmp"

# init skips existing files
tmp="$(make_tmp)"
echo "DO NOT OVERWRITE" > "$tmp/CLAUDE.md"
run_init "$tmp"
assert "init skips files that already exist" \
  "[ \"\$(cat '$tmp/CLAUDE.md')\" = 'DO NOT OVERWRITE' ]"
rm -rf "$tmp"

# ── update tests ────────────────────────────────────────────────────

echo ""
echo "== update tests =="

# update overwrites framework-owned files
tmp="$(make_tmp)"
run_init "$tmp"
echo "CORRUPTED" > "$tmp/loop.sh"
run_update "$tmp"
assert "update overwrites framework-owned files (loop.sh restored)" \
  "! grep -q 'CORRUPTED' '$tmp/loop.sh'"
rm -rf "$tmp"

# update skips scaffold files
tmp="$(make_tmp)"
run_init "$tmp"
echo "CUSTOM CONTENT" >> "$tmp/AGENTS.md"
run_update "$tmp"
assert "update skips scaffold files (AGENTS.md preserved)" \
  "grep -q 'CUSTOM CONTENT' '$tmp/AGENTS.md'"
rm -rf "$tmp"

# update replaces header in working_tracks.md but preserves content below ---
tmp="$(make_tmp)"
run_init "$tmp"
# Add content below the --- separator
echo "" >> "$tmp/working_tracks.md"
echo "## My Custom Work Item" >> "$tmp/working_tracks.md"
echo "- [ ] Do something" >> "$tmp/working_tracks.md"
run_update "$tmp"
assert "update preserves content below --- in working_tracks.md" \
  "grep -q 'My Custom Work Item' '$tmp/working_tracks.md'"
assert "update preserves header structure in working_tracks.md" \
  "grep -q '^---$' '$tmp/working_tracks.md'"
rm -rf "$tmp"

# update skips working_tracks.md when no --- separator exists
tmp="$(make_tmp)"
run_init "$tmp"
echo "No separator here" > "$tmp/working_tracks.md"
run_update "$tmp"
assert "update skips working_tracks.md when no --- separator" \
  "[ \"\$(cat '$tmp/working_tracks.md')\" = 'No separator here' ]"
rm -rf "$tmp"

# update handles multiple --- separators correctly
tmp="$(make_tmp)"
run_init "$tmp"
printf '# Working Tracks\n\n---\n\n## Section 1\n\n---\n\n## Section 2\n' > "$tmp/working_tracks.md"
run_update "$tmp"
assert "update handles multiple --- separators (preserves second ---)" \
  "grep -q 'Section 2' '$tmp/working_tracks.md'"
assert "update handles multiple --- separators (preserves Section 1)" \
  "grep -q 'Section 1' '$tmp/working_tracks.md'"
rm -rf "$tmp"

# update deletes files in REMOVED list
tmp="$(make_tmp)"
run_init "$tmp"
echo "old guide" > "$tmp/GUIDE.md"
run_update "$tmp"
assert "update deletes files in REMOVED list" \
  "[ ! -f '$tmp/GUIDE.md' ]"
rm -rf "$tmp"

# update creates .spec-dd-version
tmp="$(make_tmp)"
run_init "$tmp"
rm -f "$tmp/.spec-dd-version"
run_update "$tmp"
assert "update creates .spec-dd-version" \
  "[ -f '$tmp/.spec-dd-version' ] && [ \"\$(cat '$tmp/.spec-dd-version')\" = '$VERSION' ]"
rm -rf "$tmp"

# update creates working_tracks.md if it doesn't exist
tmp="$(make_tmp)"
run_init "$tmp"
rm -f "$tmp/working_tracks.md"
run_update "$tmp"
assert "update creates working_tracks.md if it doesn't exist" \
  "[ -f '$tmp/working_tracks.md' ]"
rm -rf "$tmp"

# update creates new scaffold files that didn't exist in prior version
tmp="$(make_tmp)"
run_init "$tmp"
rm -f "$tmp/planning_prompt.md"
run_update "$tmp"
assert "update creates missing scaffold files" \
  "[ -f '$tmp/planning_prompt.md' ]"
rm -rf "$tmp"

# ── doctor tests ────────────────────────────────────────────────────

echo ""
echo "== doctor tests =="

tmp="$(make_tmp)"
run_init "$tmp"
doctor_output="$(bash "$INSTALL_SH" doctor "$tmp" 2>&1 || true)"
assert "doctor reports all files present on clean init" \
  "echo '$doctor_output' | grep -q 'PASS.*loop.sh' && echo '$doctor_output' | grep -q 'PASS.*CLAUDE.md' && echo '$doctor_output' | grep -q 'PASS.*AGENTS.md'"
rm -rf "$tmp"

tmp="$(make_tmp)"
run_init "$tmp"
rm "$tmp/loop.sh"
assert "doctor fails when a required file is missing" \
  "! run_doctor '$tmp'"
rm -rf "$tmp"

# ── summary ─────────────────────────────────────────────────────────

echo ""
echo "== Results: ${pass} passed, ${fail} failed =="

[ "$fail" -eq 0 ] || exit 1
