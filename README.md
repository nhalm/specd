# spec-dd

A framework for building software with AI agents using spec-driven development. You write specifications that define **what** to build and **why**. AI agents autonomously implement the code, audit it against the specs, and surface issues for your review.

Built for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## What This Is

Most AI coding workflows are conversational — you prompt, the agent codes, you course-correct in real time. That works for small tasks but breaks down on larger projects where requirements are complex and context gets lost between sessions.

spec-dd replaces that with a document-driven workflow:

1. **You write specs** — markdown documents that define behavior, contracts, and interfaces for each component
2. **Agents implement autonomously** — a loop picks work items one at a time, implements them, commits, and moves on
3. **Agents audit their own work** — a separate audit phase compares code against specs and surfaces findings
4. **You make the judgment calls** — ambiguous findings land in a review file for your decision before becoming work items

The specs are the source of truth. If code contradicts a spec, the code is wrong. Agents never change specs — only humans do.

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and authenticated
- [repomirror](https://www.npmjs.com/package/repomirror) (optional, for loop visualization)

## Install

Clone this repo, then run the install script targeting your project:

```bash
git clone git@github.com:nhalm/spec-dd-framework.git
./spec-dd-framework/install.sh init /path/to/your-project
```

Prompts for your project name and description, then scaffolds the full framework into your repo. Works with new or existing projects.

## Getting Started

After installing, open Claude Code in your project and run the setup command:

```bash
cd your-project
claude
> /spec-dd:setup
```

This analyzes your codebase and walks you through customizing:

- **`AGENTS.md`** — Build commands, test runner, language conventions
- **`.claude/commands/spec-dd/implement.md`** — Validation steps (test suite, linter, type checker)
- **First spec** — Helps you write your first spec based on what you want to build

## Usage

### Planning — write and refine specs

Start a planning session to work on specs collaboratively with Claude. No code gets written — only markdown.

```bash
cat .claude/commands/spec-dd/plan.md | claude
```

Or from inside Claude Code:

```
/spec-dd:plan
```

Use this to design new features, audit existing specs against code, and break work into items in `working_tracks.md`.

### Implementing — autonomous loop

Once specs are Ready and `working_tracks.md` has work items, run the loop:

```bash
./loop.sh                # Standard: implement + audit Ready specs
./loop.sh --skip-audit   # Implement only, no audit phase
./loop.sh --full-audit   # Audit both Ready and Implemented specs
```

The loop runs autonomously — agents implement, commit, and move on. Review commits after the fact.

### Manual commands

You can also run individual phases from inside Claude Code:

| Command | Purpose |
|---------|---------|
| `/spec-dd:setup` | Interactive project setup after install |
| `/spec-dd:plan` | Collaborative spec writing and analysis |
| `/spec-dd:implement` | Implement one work item from working_tracks.md |
| `/spec-dd:audit` | Audit Ready specs against code |
| `/spec-dd:full-audit` | Audit Ready + Implemented specs |
| `/spec-dd:review-intake` | Process review.md items into working_tracks.md |

## What Gets Installed

### Specs (you write these)

| File | Purpose |
|------|---------|
| `specs/README.md` | Index of all specs with status (Draft / Ready / Implemented) |
| `specs/*.md` | Individual spec files — one per component or feature |
| `specs/example-spec.md` | Annotated example showing the spec format |

Specs go through a lifecycle: **Draft** (being written) → **Ready** (complete, agents can implement) → **Implemented** (code matches spec). You control Draft → Ready. The audit system manages Ready ↔ Implemented.

### Work tracking (agents manage these)

| File | Purpose |
|------|---------|
| `working_tracks.md` | Execution queue — every remaining work item in one place |
| `tracks.md` | Done log — completed work items, organized by spec and version |
| `review.md` | Ambiguous audit findings that need your judgment before becoming work items |

`working_tracks.md` is the single source of truth for what needs doing. Items are small, one-iteration units of work. Blocked items are annotated with `(blocked: reason)` and skipped until unblocked.

### Configuration

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Entry point for Claude Code — points to AGENTS.md |
| `AGENTS.md` | Agent behavior guidelines: spec authority, loop system, conventions |

## How the Loop Works

Each cycle has three phases:

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

The loop runs up to 5 cycles. It exits early if the audit finds nothing new (all specs match their code) or if a fatal error occurs (rate limit, API error, token limit).

Each phase uses a different model — fast/cheap for review intake, balanced for implementation, strongest for audit. Models are configurable at the top of `loop.sh`.

## Updating the Framework

Pull the latest version of this repo and run update against your project:

```bash
cd spec-dd-framework && git pull
./install.sh update /path/to/your-project
```

Overwrites framework-owned files (loop.sh, command prompts) without touching files you've customized (AGENTS.md, specs, tracks). If a framework version removes a file, update cleans it up automatically.

To check your installation:

```bash
./spec-dd-framework/install.sh doctor /path/to/your-project
```

## Writing Good Specs

A spec defines **what** a component does and **why**, not **how** to implement it. Include:

- **Overview** — What and why in 1-2 sentences
- **Scope** — What it handles and what it explicitly doesn't
- **Dependencies** — Other specs this builds on
- **Specification** — Behavior, contracts, interfaces — detailed enough that an agent can implement without asking questions
- **Changelog** — Version history so agents can catch up on changes

Don't include implementation details (file names, function signatures, variable names). The agent has autonomy on the how.

See `specs/example-spec.md` for the full annotated format.
