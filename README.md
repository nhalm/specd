# specd

A framework for building software with AI agents using spec-driven development. You write specifications that define **what** to build and **why**. AI agents autonomously implement the code, audit it against the specs, and surface issues for your review.

Built for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## What This Is

Most AI coding workflows are conversational — you prompt, the agent codes, you course-correct in real time. That works for small tasks but breaks down on larger projects where requirements are complex and context gets lost between sessions.

specd replaces that with a document-driven workflow:

1. **You write specs** — markdown documents that define behavior, contracts, and interfaces for each component
2. **Agents implement autonomously** — a loop picks work items one at a time, implements them, commits, and moves on
3. **Agents audit their own work** — a separate audit phase compares code against specs and surfaces findings
4. **You make the judgment calls** — ambiguous findings land in `review.md` for your decision before becoming work items

The specs are the source of truth. If code contradicts a spec, the code is wrong. Agents never change specs — only humans do.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+) with npm/npx
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and authenticated

## Quickstart

```bash
cd your-project
npx specd init
```

This prompts for your project name and description, then creates the following in your repo:

- `AGENTS.md` — Agent guidelines (build commands, conventions, how specs work)
- `specs/` — Spec directory with an annotated example
- `.claude/commands/specd/` — Slash commands for the autonomous loop
- `working_tracks.md`, `tracks.md`, `review.md` — Work tracking files
- `loop.sh` — The autonomous implementation loop

Next, open Claude Code and run the interactive setup:

```bash
claude
> /specd:setup
```

Setup analyzes your codebase and walks you through customizing `AGENTS.md` with your build commands and conventions, configuring the validation steps agents run after each implementation (tests, linting, type checking), and writing your first spec.

## Workflow

### 1. Write a spec

Specs live in `specs/` as markdown files. Each spec defines what a component does and why — not how to implement it. See `specs/example-spec.md` for the format.

Use `/specd:plan` inside Claude Code for a collaborative session where you and Claude write and refine specs together. No code gets written in this mode — only markdown.

Specs have a status in `specs/README.md`: **Draft** (being written), **Ready** (complete, agents can implement), or **Implemented** (code matches spec). When your spec is complete, change its status to Ready.

### 2. Populate work items

During `/specd:plan`, break the spec into small, concrete work items in `working_tracks.md`. Each item should be completable in a single agent iteration:

```markdown
## my-feature v0.1

- Add user authentication endpoint
- Add password validation with bcrypt
- Add JWT token generation (blocked: authentication endpoint)
```

Items marked `(blocked: reason)` are skipped until the blocker is resolved.

### 3. Run the loop

```bash
./loop.sh
```

The loop runs autonomously. Each cycle has three phases:

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Review Intake (Haiku)                          │
│ Process review.md → working_tracks.md                   │
├─────────────────────────────────────────────────────────┤
│ Phase 2: Implementation (Sonnet)                        │
│ Pick item → implement → validate → commit → repeat      │
│ Until working_tracks.md is empty or all items blocked   │
├─────────────────────────────────────────────────────────┤
│ Phase 3: Audit (Opus)                                   │
│ Compare specs to code → write findings                  │
│ Clean? → exit. New findings? → next cycle.              │
└─────────────────────────────────────────────────────────┘
```

The loop runs up to 5 cycles. It exits early if the audit finds nothing new or if a fatal error occurs (rate limit, API error, token limit). Each phase uses a different model — fast/cheap for review intake, balanced for implementation, strongest for audit. Models are configurable at the top of `loop.sh`.

Flags:

- `./loop.sh` — Standard: implement + audit Ready specs
- `./loop.sh --skip-audit` — Implement only, no audit phase
- `./loop.sh --full-audit` — Audit both Ready and Implemented specs (catches regressions)

### 4. Review findings

After the loop runs, check two files:

- **`review.md`** — Ambiguous findings the audit wasn't sure about. Read each one, delete any you disagree with, and leave the rest. On the next loop cycle, `/specd:review-intake` converts remaining items into work items in `working_tracks.md`.
- **`tracks.md`** — Completed work. Agents move items here after implementation. This is your done log.

If new work items were generated, run the loop again. When the audit comes back clean and `working_tracks.md` is empty, your spec is implemented.

## Spec Lifecycle

```
Draft → Ready → Implemented
  ↑              ↓ (regression found)
  └──── Ready ←──┘ (version bumped)
```

- **Draft** — Being written. Agents ignore it.
- **Ready** — Complete. Agents can implement and audit against it.
- **Implemented** — Code matches spec. A full audit (`--full-audit`) can demote it back to Ready if regressions are found, with a version bump and new work items.

You control Draft → Ready. The audit system manages Ready ↔ Implemented.

## Command Reference

All commands are available as slash commands inside Claude Code (e.g., `/specd:plan`), or can be piped from the terminal:

```bash
cat .claude/commands/specd/plan.md | claude
```

| Command                | Purpose                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/specd:setup`         | Interactive onboarding. Customizes AGENTS.md, validation steps, and helps write your first spec. Run once after `specd init`.                                |
| `/specd:plan`          | Collaborative spec-writing session. You and Claude work on specs together — no code, only markdown.                                                          |
| `/specd:implement`     | Picks one unblocked item from `working_tracks.md`, implements it, validates, commits, and moves it to `tracks.md`. The loop runs this repeatedly.            |
| `/specd:audit`         | Audits Ready specs against code. Writes confirmed issues to `working_tracks.md`, ambiguous findings to `review.md`, and promotes clean specs to Implemented. |
| `/specd:full-audit`    | Same as audit but also checks Implemented specs for regressions. Demotes specs with issues back to Ready.                                                    |
| `/specd:review-intake` | Converts `review.md` items into work items in `working_tracks.md`. Runs automatically at the start of each loop cycle.                                       |

## Writing Good Specs

A spec defines **what** a component does and **why**, not **how** to implement it. Include:

- **Overview** — What and why in 1-2 sentences
- **Scope** — What it handles and what it explicitly doesn't
- **Dependencies** — Other specs this builds on
- **Specification** — Behavior, contracts, interfaces — detailed enough that an agent can implement without asking questions
- **Changelog** — Version history so agents can catch up on changes

Don't include implementation details (file names, function signatures, variable names). The agent has autonomy on the how. See `specs/example-spec.md` for the full annotated format.

## Updating

```bash
npx specd@latest update
```

Overwrites framework-owned files (`loop.sh`, command prompts) without touching files you've customized (`AGENTS.md`, specs, tracks).

To verify your installation:

```bash
npx specd doctor
```
