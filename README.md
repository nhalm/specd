# spec-dd

Spec-driven development framework for AI agents. Humans write specs, agents implement them.

## Install

```bash
cd your-project
npx spec-dd init
```

This prompts for your project name, copies the framework files, and fills in placeholders.

## Update

```bash
npx spec-dd update
```

Overwrites framework-owned files (loop.sh, command prompts) without touching your customized files (AGENTS.md, specs, tracks).

## Check

```bash
npx spec-dd doctor
```

Validates all expected files are present and dependencies are available.

## How It Works

```
You write specs ──→ Agents implement ──→ Audit verifies ──→ You review
      ↑                                                          │
      └──────────── adjust specs if needed ──────────────────────┘
```

The autonomous loop runs three phases per cycle:

1. **Review intake** — Processes human decisions from `review.md` into the work queue
2. **Implementation** — Picks one item from `working_tracks.md`, implements it, moves it to `tracks.md`
3. **Audit** — Verifies specs against code, surfaces findings for the next cycle

```bash
./loop.sh                # Standard loop (audit Ready specs only)
./loop.sh --skip-audit   # Implement only, no audit
./loop.sh --full-audit   # Audit both Ready and Implemented specs
```

## Key Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent guidelines — spec authority, conventions |
| `specs/README.md` | Spec index with status and phase tables |
| `working_tracks.md` | Work queue — remaining items |
| `tracks.md` | Done log — completed items |
| `review.md` | Ambiguous findings awaiting human judgment |
| `loop.sh` | Three-phase autonomous loop |
| `.claude/commands/` | Agent prompts for each loop phase |

See [GUIDE.md](templates/GUIDE.md) for the full getting-started walkthrough.
