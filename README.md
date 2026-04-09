# specd

[![CI](https://github.com/nhalm/specd/actions/workflows/test.yml/badge.svg)](https://github.com/nhalm/specd/actions/workflows/test.yml)
[![GitHub Release](https://img.shields.io/github/v/release/nhalm/specd)](https://github.com/nhalm/specd/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A framework for building software with AI agents using spec-driven development. You describe what you want to build, Claude writes the specifications, and agents autonomously decide how to implement it — then audit their own work against the specs.

Built for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## What This Is

Most AI coding workflows are conversational — you prompt, the agent codes, you course-correct in real time. That works for small tasks but breaks down on larger projects where requirements are complex and context gets lost between sessions.

specd replaces that with a document-driven workflow:

1. **You describe what to build** — in a planning session with Claude, which writes the specs for you
2. **Agents implement autonomously** — a loop picks work items one at a time, implements them, commits, and moves on
3. **Agents audit their own work** — a separate audit phase compares code against specs and surfaces findings
4. **You make the judgment calls** — ambiguous findings land in `specd_review.md` for your decision before becoming work items

The specs are the source of truth. If code contradicts a spec, the code is wrong. Agents never change specs — only humans do.

## Why Specs and Loops

AI agents are good at writing code but bad at deciding what to write. Without a clear target, they drift — adding features you didn't ask for, making architectural decisions you'd disagree with, or solving the wrong problem entirely. The longer they run autonomously, the worse this gets.

Specs solve the direction problem. A spec is a short document that pins down behavior, contracts, and interfaces for one component. It's specific enough that there's no ambiguity about what "done" looks like, but says nothing about implementation. The agent can't drift because the spec is the acceptance criteria — the audit phase checks code against it and flags anything that doesn't match.

The loop solves the continuity problem. In a normal conversation, context resets every session. You re-explain what you're building, where you left off, what's already done. With a loop, the agent reads the work list, picks the next item, reads the relevant spec for full context, implements, validates, and records what it did. The next iteration picks up exactly where the last one left off — no context loss, no re-explaining.

The review file (`specd_review.md`) solves the judgment problem. Not everything is black and white. When the audit finds a mismatch between spec and code but can't tell which one is wrong, it doesn't guess — it writes the finding to `specd_review.md` and moves on. You review these between loop runs: delete the ones you disagree with, leave the rest. On the next cycle, remaining items become work items. This is the human-in-the-loop — you're not reviewing every line of code, you're only making the calls that require human judgment.

Together they create a feedback cycle: specs steer, agents implement, audits verify, and ambiguous findings route to you. Each loop cycle either makes progress or surfaces a decision. The system handles the straightforward work autonomously and escalates the rest.

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
- `specd_work_list.md`, `specd_review.md` — Work tracking files
- `loop.sh` — The autonomous implementation loop

Next, open Claude Code and run the interactive setup:

```bash
claude
> /specd:setup
```

Setup analyzes your codebase and walks you through customizing `AGENTS.md` with your build commands and conventions, configuring the validation steps agents run after each implementation (tests, linting, type checking), and writing your first spec.

### Installing from source

If you prefer to install globally from source:

```bash
git clone git@github.com:nhalm/specd.git
cd specd && make install
```

`make install` runs `npm install` and `npm link`, making the `specd` command available globally. Other make targets: `make check` (lint + format), `make test` (vitest), `make fix` (auto-fix).

## How It Works In Practice

The key idea: **specs define what to build, not how to build it.** You describe behavior, contracts, and interfaces. Agents decide the implementation — file structure, function names, patterns, everything. This is what makes autonomous implementation possible: the spec is a target to hit, not a script to follow.

You don't write specs by hand. You talk to Claude:

```
> /specd:plan
```

Then describe what you want in plain language:

- "I need a REST API for managing user accounts with email/password auth"
- "Add a caching layer in front of the database queries — Redis-based, with TTL per entity type"
- "The payment webhook handler is getting too complex, I want to refactor it into a state machine"

Claude studies your codebase, asks clarifying questions about edge cases and design decisions, then writes the spec. You review it, push back on things that don't seem right, and iterate. The conversation is where the real design happens — the spec is just the artifact that captures it.

A good spec says things like "authentication endpoint returns a JWT with user ID and role claims, tokens expire after 1 hour, refresh tokens expire after 30 days." It does **not** say "create a file called `auth.js` with a function called `generateToken`." The agent figures out the how.

## Workflow

### 1. Plan with Claude

Run `/specd:plan` and describe what you want built. Claude writes the spec and breaks it into work items in `specd_work_list.md`:

```markdown
## my-feature v0.1

- Add user authentication endpoint
- Add password validation with bcrypt
- Add JWT token generation (blocked: authentication endpoint)
```

Items marked `(blocked: reason)` are skipped until the blocker is resolved.

When the spec is ready, change its status to **Ready** in `specs/README.md`. This signals to agents that they can start implementing.

### 2. Run the loop

```bash
./loop.sh
```

The loop runs autonomously. Each cycle has three phases:

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Review Intake (Haiku)                          │
│ Process specd_review.md → specd_work_list.md                   │
├─────────────────────────────────────────────────────────┤
│ Phase 2: Implementation (Sonnet)                        │
│ Pick item → implement → validate → commit → repeat      │
│ Until specd_work_list.md is empty or all items blocked   │
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

### 3. Review findings

After the loop runs, check two files:

- **`specd_review.md`** — Ambiguous findings the audit wasn't sure about. Read each one, delete any you disagree with, and leave the rest. On the next loop cycle, `/specd:review-intake` converts remaining items into work items in `specd_work_list.md`.

If new work items were generated, run the loop again. When the audit comes back clean and `specd_work_list.md` is empty, your spec is implemented.

### 4. Iterate

Need to change something? Run `/specd:plan` again. Describe what's wrong or what you want different — Claude updates the spec, bumps the version, and generates new work items. Run the loop again.

This is the cycle: **plan → loop → review → plan**. You steer with natural language, specs capture the decisions, agents do the implementation.

## Work Tracking

specd uses two files to track work. You'll see them referenced throughout the commands and loop output.

**`specd_work_list.md`** is the todo list. Every remaining work item lives here — spec implementations, audit findings, and promoted review items. Agents read this at the start of each iteration to pick the next task. When an item is done, the agent removes it. This file is intentionally kept small so agents can read it in full.

**`specd_review.md`** is the human decision queue. When the audit finds something ambiguous — it's not sure if the code or the spec is wrong — it writes the finding here instead of creating a work item. You review these between loop runs: delete findings you disagree with, leave the rest. On the next cycle, `/specd:review-intake` converts remaining items into work items in `specd_work_list.md`.

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

| Command                | Purpose                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/specd:setup`         | Interactive onboarding. Customizes AGENTS.md, validation steps, and helps write your first spec. Run once after `specd init`.                                       |
| `/specd:plan`          | Collaborative planning session. Describe what you want, Claude writes the spec and work items. The primary way to create and update specs.                          |
| `/specd:implement`     | Picks one unblocked item from `specd_work_list.md`, implements it, validates, and commits. The loop runs this repeatedly.                                           |
| `/specd:audit`         | Audits Ready specs against code. Writes confirmed issues to `specd_work_list.md`, ambiguous findings to `specd_review.md`, and promotes clean specs to Implemented. |
| `/specd:full-audit`    | Same as audit but also checks Implemented specs for regressions. Demotes specs with issues back to Ready.                                                           |
| `/specd:review-intake` | Converts `specd_review.md` items into work items in `specd_work_list.md`. Runs automatically at the start of each loop cycle.                                       |

## Writing Good Specs

Specs are written by `/specd:plan`, but it helps to know what makes a good one. A spec defines **what** a component does and **why**, not **how** to implement it:

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
