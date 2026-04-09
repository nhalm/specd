# {PROJECT_NAME} Agent Guidelines

## Spec Authority

**Specs are prescriptive, not descriptive.** The spec defines what code MUST do.

- **Spec is source of truth.** If code contradicts the spec, the code is wrong — refactor it.
- **Read the full spec on version changes.** When a spec version changes, re-read the entire spec.
- **Don't build on broken foundations.** If existing code uses the wrong model (e.g., wrong ID scheme, wrong data flow), fix it first. Don't add new features on top of incorrect code.
- **Spec index:** `specs/README.md` lists all specifications organized by phase. Only specs with status "Ready" should be implemented.
## Loop System

The autonomous loop is defined in `loop.sh`. Commands live in `.claude/commands/`:

| Command          | Purpose                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `/specd:implement`     | Pick one unblocked work item, implement it, validate, record completion        |
| `/specd:audit`         | 3-phase spec-vs-code audit. Writes findings to specd_work_list.md and specd_review.md |
| `/specd:review-intake` | Process specd_review.md items into specd_work_list.md                                 |
| `/specd:full-audit`    | Like audit but covers Ready AND Implemented specs — demotes Implemented specs with findings |

## specd_work_list.md (Remaining Work)

The single execution queue for all work — spec implementations, audit findings, and promoted review items. **Read it in full** at the start of each iteration — it is kept small. Pick an unblocked item, implement it, then remove it from the list.

## specd_review.md (Human Decisions)

Ambiguous findings from audits that need human judgment. Items sit here until the human reviews them. On next loop start, `/specd:review-intake` promotes remaining items to specd_work_list.md (human deletes items they disagree with before restarting).

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
