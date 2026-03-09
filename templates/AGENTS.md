# {PROJECT_NAME} Agent Guidelines

## Spec Authority

**Specs are prescriptive, not descriptive.** The spec defines what code MUST do.

- **Spec is source of truth.** If code contradicts the spec, the code is wrong — refactor it.
- **Read the full spec on version changes.** When the spec version is newer than tracks.md, re-read the entire spec — not just the changelog. The changelog summarizes what changed, but context lives in the full spec.
- **Don't build on broken foundations.** If existing code uses the wrong model (e.g., wrong ID scheme, wrong data flow), fix it first. Don't add new features on top of incorrect code.
- **Spec index:** `specs/README.md` lists all specifications organized by phase. Only specs with status "Ready" should be implemented.
- **Changelogs are immutable.** When creating new changelog entries, old entries never change.

## Loop System

The autonomous loop is defined in `loop.sh`. Commands live in `.claude/commands/`:

| Command          | Purpose                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `/specd:implement`     | Pick one unblocked work item, implement it, validate, record completion        |
| `/specd:audit`         | 3-phase spec-vs-code audit. Writes findings to working_tracks.md and review.md |
| `/specd:review-intake` | Process review.md items into working_tracks.md                                 |

## working_tracks.md (Remaining Work)

The single execution queue for all work — spec implementations, audit findings, and promoted review items. **Read it in full** at the start of each iteration — it is kept small. Pick an unblocked item, implement it, then move it to tracks.md.

## tracks.md (Done Log)

tracks.md is the archive of completed work. It does NOT contain remaining items — those live in working_tracks.md.

**Never read tracks.md in full — it exceeds context limits.** Use targeted reads:

1. **Find your section:** `Grep` for `## <your-spec>` to get the line number
2. **Read your section:** `Read` with `offset` and `limit` (typically 30-50 lines) starting from that line number
3. **Write updates:** Use `Edit` to modify only your section — never rewrite the file
4. **After completing a work item:** Move it from working_tracks.md to tracks.md under the matching spec version section

## review.md (Human Decisions)

Ambiguous findings from audits that need human judgment. Items sit here until the human reviews them. On next loop start, `/specd:review-intake` promotes remaining items to working_tracks.md (human deletes items they disagree with before restarting).

## Build & Test

- Run `make check` for linting and formatting, `make test` for the test suite
- Validate with the full test suite, not just unit tests. If integration tests fail, that's a real failure — do not dismiss them.

## Conventions

- Follow patterns in existing code for naming, structure, and style
- Match the language and framework conventions of the project
- See specs/ for directory layout and project structure specs

### Interfaces and Dependencies

- **Use interfaces for external dependencies.** Database access, HTTP clients, external services — anything that crosses a boundary.
- **Mock at boundaries, not internals.** Mock the interface, not implementation details.
- **Dependency injection over globals.** Pass dependencies explicitly rather than importing singletons.
