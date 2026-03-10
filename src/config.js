export const VERSION = "0.1.0";

/** Files that get overwritten on update */
export const FRAMEWORK_OWNED = [
  "loop.sh",
  ".claude/commands/specd/implement.md",
  ".claude/commands/specd/audit.md",
  ".claude/commands/specd/full-audit.md",
  ".claude/commands/specd/review-intake.md",
  ".claude/commands/specd/setup.md",
  ".claude/commands/specd/plan.md",
];

/** Files installed once, never overwritten */
export const SCAFFOLD = [
  "CLAUDE.md",
  "AGENTS.md",
  "specs/README.md",
  "specs/example-spec.md",
  "specd_history.md",
  "specd_review.md",
];

/** Files where the header (up to first ---) is updated but content below is preserved */
export const HEADER_UPDATABLE = ["specd_work_list.md"];

/** Files removed in this version (cleanup from prior installs) */
export const REMOVED = [
  "GUIDE.md",
  ".claude/commands/implement.md",
  ".claude/commands/audit.md",
  ".claude/commands/full-audit.md",
  ".claude/commands/review-intake.md",
  ".claude/commands/setup.md",
  "planning_prompt.md",
  "tracks.md",
  "working_tracks.md",
  "review.md",
];

/** Old → new file renames. Applied during update before other steps. */
export const MIGRATIONS = [
  ["tracks.md", "specd_history.md"],
  ["working_tracks.md", "specd_work_list.md"],
  ["review.md", "specd_review.md"],
];

/** All installable files */
export const ALL_FILES = [...FRAMEWORK_OWNED, ...SCAFFOLD, ...HEADER_UPDATABLE];

/**
 * Map destination path to template source path.
 * Most files are 1:1 except .claude/ -> claude/
 */
export function srcFor(dest) {
  if (dest.startsWith(".claude/")) {
    return dest.replace(".claude/", "claude/");
  }
  return dest;
}
