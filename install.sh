#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATES_DIR="${SCRIPT_DIR}/templates"
VERSION="0.1.0"

# Files that get overwritten on update
FRAMEWORK_OWNED=(
  "loop.sh"
  ".claude/commands/spec-dd.implement.md"
  ".claude/commands/spec-dd.audit.md"
  ".claude/commands/spec-dd.full-audit.md"
  ".claude/commands/spec-dd.review-intake.md"
  ".claude/commands/spec-dd.setup.md"
)

# Files installed once, never overwritten
SCAFFOLD=(
  "CLAUDE.md"
  "AGENTS.md"
  "specs/README.md"
  "specs/example-spec.md"
  "tracks.md"
  "review.md"
  "planning_prompt.md"
)

# Files where the header (everything up to and including first ---) is
# framework-owned and updated, but content below --- is preserved
HEADER_UPDATABLE=(
  "working_tracks.md"
)

# Files removed in this version (cleanup from prior installs)
REMOVED=(
  "GUIDE.md"
  ".claude/commands/implement.md"
  ".claude/commands/audit.md"
  ".claude/commands/full-audit.md"
  ".claude/commands/review-intake.md"
  ".claude/commands/setup.md"
)

# Map template source path to destination path
# Most files are 1:1 except claude/ -> .claude/
src_for() {
  local dest="$1"
  case "$dest" in
    .claude/*) echo "${dest/.claude\//claude/}" ;;
    *)         echo "$dest" ;;
  esac
}

usage() {
  echo "spec-dd — Spec-driven development framework for AI agents"
  echo ""
  echo "Usage: $0 <command> [target-dir]"
  echo ""
  echo "Commands:"
  echo "  init   [dir]   Initialize a project with the spec-dd framework (default: cwd)"
  echo "  update [dir]   Update framework-owned files to the latest version"
  echo "  doctor [dir]   Check that all expected files are in place"
}

do_init() {
  local target="${1:-.}"
  target="$(cd "$target" && pwd)"

  printf "Project name: "
  read -r project_name
  if [ -z "$project_name" ]; then
    echo "Error: Project name is required." >&2
    exit 1
  fi

  printf "One-line project description: "
  read -r description
  if [ -z "$description" ]; then
    echo "Error: Project description is required." >&2
    exit 1
  fi

  local copied=0
  local skipped=0

  # Install all files (framework + scaffold + header-updatable)
  all_files=("${FRAMEWORK_OWNED[@]}" "${SCAFFOLD[@]}" "${HEADER_UPDATABLE[@]}")
  for dest in "${all_files[@]}"; do
    local src
    src="$(src_for "$dest")"
    local src_path="${TEMPLATES_DIR}/${src}"
    local dest_path="${target}/${dest}"

    if [ -f "$dest_path" ]; then
      echo "  SKIP  ${dest} (already exists)"
      skipped=$((skipped + 1))
      continue
    fi

    mkdir -p "$(dirname "$dest_path")"

    # Copy with placeholder replacement
    sed -e "s/{PROJECT_NAME}/${project_name}/g" \
        -e "s/{One-line project description}/${description}/g" \
        "$src_path" > "$dest_path"

    echo "  CREATE  ${dest}"
    copied=$((copied + 1))
  done

  # Ensure loop.sh is executable
  if [ -f "${target}/loop.sh" ]; then
    chmod +x "${target}/loop.sh"
  fi

  # Write version file
  echo "$VERSION" > "${target}/.spec-dd-version"
  echo "  CREATE  .spec-dd-version"

  echo ""
  echo "Done. ${copied} files created, ${skipped} skipped."

  # Check for repomirror
  if ! command -v repomirror &>/dev/null; then
    echo ""
    echo "Warning: repomirror not found. Install it with: npm install -g repomirror"
  fi
}

do_update() {
  local target="${1:-.}"
  target="$(cd "$target" && pwd)"

  local version_file="${target}/.spec-dd-version"
  if [ -f "$version_file" ]; then
    echo "Current version: $(cat "$version_file")"
  else
    echo "No .spec-dd-version found (first update)."
  fi
  echo "Updating to: ${VERSION}"
  echo ""

  local updated=0
  local skipped=0
  local deleted=0

  # Overwrite framework-owned files
  for dest in "${FRAMEWORK_OWNED[@]}"; do
    local src
    src="$(src_for "$dest")"
    local src_path="${TEMPLATES_DIR}/${src}"
    local dest_path="${target}/${dest}"

    if [ ! -f "$src_path" ]; then
      echo "  MISSING  ${dest} (template not found)"
      continue
    fi

    mkdir -p "$(dirname "$dest_path")"
    cp "$src_path" "$dest_path"
    echo "  UPDATE  ${dest}"
    updated=$((updated + 1))
  done

  # Scaffold files: create if missing, skip if exists
  for dest in "${SCAFFOLD[@]}"; do
    local dest_path="${target}/${dest}"
    if [ -f "$dest_path" ]; then
      echo "  SKIP  ${dest} (scaffold — not overwritten)"
      skipped=$((skipped + 1))
    else
      local src
      src="$(src_for "$dest")"
      local src_path="${TEMPLATES_DIR}/${src}"
      mkdir -p "$(dirname "$dest_path")"
      cp "$src_path" "$dest_path"
      echo "  CREATE  ${dest} (new in this version)"
      updated=$((updated + 1))
    fi
  done

  # Update headers on header-updatable files (preserve content below ---)
  for dest in "${HEADER_UPDATABLE[@]}"; do
    local src
    src="$(src_for "$dest")"
    local src_path="${TEMPLATES_DIR}/${src}"
    local dest_path="${target}/${dest}"

    if [ ! -f "$dest_path" ]; then
      # File doesn't exist yet — install it fresh
      mkdir -p "$(dirname "$dest_path")"
      cp "$src_path" "$dest_path"
      echo "  CREATE  ${dest}"
      updated=$((updated + 1))
      continue
    fi

    # Bail if the existing file has no --- separator (can't safely split)
    if ! grep -q '^---$' "$dest_path"; then
      echo "  SKIP  ${dest} (no --- separator found — cannot update header safely)"
      skipped=$((skipped + 1))
      continue
    fi

    # Extract new header (everything up to and including first ---)
    local new_header
    new_header="$(sed '/^---$/q' "$src_path")"

    # Extract existing content (everything after first ---)
    local existing_content
    existing_content="$(sed '1,/^---$/d' "$dest_path")"

    # Combine
    printf '%s\n%s' "$new_header" "$existing_content" > "$dest_path"
    echo "  UPDATE  ${dest} (header only)"
    updated=$((updated + 1))
  done

  # Remove obsolete files
  for dest in "${REMOVED[@]}"; do
    local dest_path="${target}/${dest}"
    if [ -f "$dest_path" ]; then
      rm "$dest_path"
      echo "  DELETE  ${dest}"
      deleted=$((deleted + 1))
    fi
  done

  # Ensure loop.sh is executable
  if [ -f "${target}/loop.sh" ]; then
    chmod +x "${target}/loop.sh"
  fi

  # Update version file
  echo "$VERSION" > "${target}/.spec-dd-version"

  echo ""
  echo "Done. ${updated} updated, ${skipped} skipped (scaffold), ${deleted} deleted."
}

do_doctor() {
  local target="${1:-.}"
  target="$(cd "$target" && pwd)"

  local pass=0
  local fail=0

  check() {
    local label="$1"
    local ok="$2"
    if [ "$ok" = "true" ]; then
      echo "  PASS  ${label}"
      pass=$((pass + 1))
    else
      echo "  FAIL  ${label}"
      fail=$((fail + 1))
    fi
  }

  echo "Checking files..."
  echo ""

  all_files=("${FRAMEWORK_OWNED[@]}" "${SCAFFOLD[@]}" "${HEADER_UPDATABLE[@]}")
  for dest in "${all_files[@]}"; do
    if [ -f "${target}/${dest}" ]; then
      check "$dest" "true"
    else
      check "$dest" "false"
    fi
  done

  echo ""

  # loop.sh executable
  if [ -x "${target}/loop.sh" ]; then
    check "loop.sh is executable" "true"
  else
    check "loop.sh is executable" "false"
  fi

  # Version file
  local version_file="${target}/.spec-dd-version"
  if [ -f "$version_file" ]; then
    check ".spec-dd-version ($(cat "$version_file"))" "true"
  else
    check ".spec-dd-version exists" "false"
  fi

  # Claude CLI
  if command -v claude &>/dev/null; then
    check "claude CLI available" "true"
  else
    check "claude CLI available" "false"
  fi

  # repomirror
  if command -v repomirror &>/dev/null; then
    check "repomirror available" "true"
  else
    check "repomirror available" "false"
  fi

  echo ""
  echo "${pass} passed, ${fail} failed."

  [ "$fail" -eq 0 ] || exit 1
}

# --- Main ---

command="${1:-}"
shift || true
target="${1:-.}"

case "$command" in
  init)   do_init "$target" ;;
  update) do_update "$target" ;;
  doctor) do_doctor "$target" ;;
  *)      usage; [ -n "$command" ] && exit 1 || exit 0 ;;
esac
