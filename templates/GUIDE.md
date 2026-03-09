# Spec-Driven Development: Getting Started

This skeleton implements a workflow where **humans write specs** and **AI agents implement them**. Specs define WHAT to build and WHY. Agents decide HOW.

## How It Works

```
You write specs ──→ Agent reads specs ──→ Agent writes code ──→ You review
      ↑                                                             │
      └─────────── adjust specs if needed ──────────────────────────┘
```

There are two modes of working:

1. **Planning mode** — You and an AI work together on specs (no code). Use `planning_prompt.md`.
2. **Loop mode** — An AI agent implements specs autonomously via a three-phase cycle. Use `loop.sh`.

## Quick Start

### 1. Copy the skeleton

```bash
cp -r spec-dd-framework/ /path/to/your-new-project/
cd /path/to/your-new-project/
```

### 2. Personalize the placeholders

Replace `{PROJECT_NAME}` in these files:
- `AGENTS.md` — header
- `specs/README.md` — header and description
- `tracks.md` — header

Replace `{One-line project description}` in `specs/README.md`.

### 3. Customize AGENTS.md

This file tells agents how to behave in your project. Edit it to match your stack:

- **Build & Test section** — Add your build commands, test runner, linter invocations.
- **Conventions section** — Add your naming conventions, project-specific patterns.
- **Interfaces and Dependencies** — Adjust for your language's abstraction patterns (interfaces, protocols, traits, etc.).

### 4. Customize validation in implement.md

Edit `.claude/commands/implement.md` to add your project's validation steps (test commands, lint checks, type checking).

### 5. Delete the example spec

Remove `specs/example-spec.md` once you understand the format, or keep it as a reference. Either way, remove its row from `specs/README.md`.

### 6. Write your first real spec

Create a new file in `specs/` following the format in `example-spec.md`:

```
specs/your-feature.md
```

Start at **Draft** status — just the overview and empty specification section. Then work it up to **Ready** before letting agents implement it.

Add it to the phase table in `specs/README.md`.

### 7. Populate working_tracks.md

When a spec reaches "Ready", add work items to `working_tracks.md`:

```markdown
## your-feature v0.2

- First implementation item
- Second implementation item
- Third item (blocked: other-spec)
```

Break specs into small, focused items. Each item should be one iteration of work. If an item has "and" in it, it's probably too big — split it.

### 8. Run the loop

```bash
./loop.sh
```

The loop runs three phases per cycle:

1. **Review intake** — Processes `review.md` items into `working_tracks.md`
2. **Implementation** — Picks one unblocked item from `working_tracks.md`, implements it, moves it to `tracks.md`. Repeats until all items are done or blocked.
3. **Audit** — Verifies Ready specs against code. If findings exist, adds them to `working_tracks.md` and starts a new cycle.

The loop exits when the audit finds nothing new, or after 5 cycles.

**Flags:**
- `./loop.sh --skip-audit` — Skip the audit phase (implement only)
- `./loop.sh --full-audit` — Audit both Ready and Implemented specs

## File Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Entry point for Claude Code — points to AGENTS.md |
| `AGENTS.md` | Agent guidelines: spec authority, loop system, conventions |
| `specs/README.md` | Spec index with status legend and phase tables |
| `specs/*.md` | Individual spec files |
| `working_tracks.md` | Execution queue — remaining work items |
| `tracks.md` | Done log — completed work items |
| `review.md` | Ambiguous audit findings awaiting human judgment |
| `planning_prompt.md` | Prompt for human+AI spec writing sessions |
| `loop.sh` | Shell script that runs the three-phase loop |
| `.claude/commands/implement.md` | Agent prompt for implementing one work item |
| `.claude/commands/audit.md` | Agent prompt for auditing Ready specs |
| `.claude/commands/full-audit.md` | Agent prompt for auditing Ready + Implemented specs |
| `.claude/commands/review-intake.md` | Agent prompt for processing review.md |

## The Spec Lifecycle

```
Draft ──→ Ready ──→ Implemented
                ↖────────────↙
              (audit finds issues)
```

| Stage | What happens | Who |
|-------|-------------|-----|
| **Draft** | Being specified. Use `planning_prompt.md` to iterate with AI assist. | Human |
| **Ready** | Spec is complete. Detailed enough for an agent to implement. | Human marks status |
| **Implemented** | Fully implemented. Code matches spec. | `/audit` promotes when clean |

**Status transitions:**
- Humans move specs Draft → Ready
- `/audit` promotes clean Ready specs to Implemented
- `/full-audit` can demote Implemented specs back to Ready if regressions are found

## Writing Good Specs

### What to include

- **Overview** — What and why in 1-2 sentences
- **Scope** — What it does AND what it explicitly doesn't do
- **Dependencies** — Other specs this depends on
- **Specification** — Behavior, contracts, interfaces. Detailed enough that an agent doesn't need to ask questions.
- **Changelog** — Version history so agents can catch up on changes

### What NOT to include

- Implementation details (file structure, function names, variable names)
- Code snippets as requirements (use them only as illustrative examples)
- Multiple ways to do something — pick one and specify it

### Spec size

A spec should cover one coherent component or feature. If you find yourself writing 2000+ lines, consider splitting into multiple specs with explicit dependencies.

## Tips

- **Start small.** Write 2-3 specs for your foundation (project structure, build system, testing). Get those to "Implemented" before writing more.
- **One item per loop iteration.** The commands enforce this. Small items = reliable progress.
- **Blocked items are fine.** Mark them with `(blocked: ...)` and the agent will skip them.
- **Review agent commits.** The loop generates commits. Review them like you would any PR.
- **Specs evolve.** Bump the version, add a changelog entry, and agents will adapt.
- **Use review.md for ambiguity.** When audit finds something unclear, it goes to review.md for your judgment before becoming a work item.
