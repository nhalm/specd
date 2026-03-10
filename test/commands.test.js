import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { init, update, doctor } from "../src/commands.js";
import { ALL_FILES } from "../src/config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "templates");

function makeTmp() {
  return mkdtempSync(join(tmpdir(), "specd-test-"));
}

function runInit(dir, name = "TestProject", desc = "A test project") {
  return init(dir, TEMPLATES_DIR, { projectName: name, description: desc });
}

describe("init", () => {
  let tmp;

  beforeEach(() => {
    tmp = makeTmp();
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("creates all expected files", () => {
    runInit(tmp);

    expect(existsSync(join(tmp, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(tmp, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(tmp, "loop.sh"))).toBe(true);
    expect(existsSync(join(tmp, "specs/README.md"))).toBe(true);
    expect(existsSync(join(tmp, "specs/example-spec.md"))).toBe(true);
    expect(existsSync(join(tmp, "specd_history.md"))).toBe(true);
    expect(existsSync(join(tmp, "specd_review.md"))).toBe(true);
    expect(existsSync(join(tmp, "specd_work_list.md"))).toBe(true);
    expect(existsSync(join(tmp, ".claude/commands/specd/implement.md"))).toBe(true);
    expect(existsSync(join(tmp, ".claude/commands/specd/audit.md"))).toBe(true);
    expect(existsSync(join(tmp, ".claude/commands/specd/full-audit.md"))).toBe(true);
    expect(existsSync(join(tmp, ".claude/commands/specd/review-intake.md"))).toBe(true);
    expect(existsSync(join(tmp, ".claude/commands/specd/setup.md"))).toBe(true);
    expect(existsSync(join(tmp, ".claude/commands/specd/plan.md"))).toBe(true);
  });

  it("replaces {PROJECT_NAME} in AGENTS.md", () => {
    runInit(tmp);
    const content = readFileSync(join(tmp, "AGENTS.md"), "utf-8");
    expect(content).toContain("TestProject");
    expect(content).not.toContain("{PROJECT_NAME}");
  });

  it("replaces {PROJECT_NAME} in specs/README.md", () => {
    runInit(tmp);
    const content = readFileSync(join(tmp, "specs/README.md"), "utf-8");
    expect(content).toContain("TestProject");
    expect(content).not.toContain("{PROJECT_NAME}");
  });

  it("replaces {PROJECT_NAME} in specd_history.md", () => {
    runInit(tmp);
    const content = readFileSync(join(tmp, "specd_history.md"), "utf-8");
    expect(content).toContain("TestProject");
    expect(content).not.toContain("{PROJECT_NAME}");
  });

  it("replaces {One-line project description} in specs/README.md", () => {
    runInit(tmp);
    const content = readFileSync(join(tmp, "specs/README.md"), "utf-8");
    expect(content).toContain("A test project");
    expect(content).not.toContain("{One-line project description}");
  });

  it("creates .specd-version with correct version", () => {
    runInit(tmp);
    const version = readFileSync(join(tmp, ".specd-version"), "utf-8");
    expect(version).toBe("0.1.0");
  });

  it("makes loop.sh executable", () => {
    runInit(tmp);
    const stats = statSync(join(tmp, "loop.sh"));
    expect(stats.mode & 0o100).toBeTruthy();
  });

  it("skips files that already exist", () => {
    writeFileSync(join(tmp, "CLAUDE.md"), "DO NOT OVERWRITE");
    runInit(tmp);
    expect(readFileSync(join(tmp, "CLAUDE.md"), "utf-8")).toBe("DO NOT OVERWRITE");
  });

  it("returns correct counts", () => {
    const result = runInit(tmp);
    expect(result.copied).toBeGreaterThan(0);
    expect(result.skipped).toBe(0);
  });

  it("reports exact file counts", () => {
    const result = runInit(tmp);
    expect(result.copied).toBe(ALL_FILES.length);
    expect(result.skipped).toBe(0);
  });

  it("handles special characters in project name", () => {
    init(tmp, TEMPLATES_DIR, {
      projectName: "My Project (Beta)",
      description: "A $pecial & <project>",
    });
    const agents = readFileSync(join(tmp, "AGENTS.md"), "utf-8");
    expect(agents).toContain("My Project (Beta)");
    const readme = readFileSync(join(tmp, "specs/README.md"), "utf-8");
    expect(readme).toContain("A $pecial & <project>");
  });
});

describe("update", () => {
  let tmp;

  beforeEach(() => {
    tmp = makeTmp();
    runInit(tmp);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("overwrites framework-owned files", () => {
    writeFileSync(join(tmp, "loop.sh"), "CORRUPTED");
    update(tmp, TEMPLATES_DIR);
    const content = readFileSync(join(tmp, "loop.sh"), "utf-8");
    expect(content).not.toContain("CORRUPTED");
  });

  it("skips scaffold files", () => {
    const agentsPath = join(tmp, "AGENTS.md");
    const original = readFileSync(agentsPath, "utf-8");
    writeFileSync(agentsPath, original + "\nCUSTOM CONTENT");
    update(tmp, TEMPLATES_DIR);
    expect(readFileSync(agentsPath, "utf-8")).toContain("CUSTOM CONTENT");
  });

  it("preserves content below --- in specd_work_list.md", () => {
    const wtPath = join(tmp, "specd_work_list.md");
    const original = readFileSync(wtPath, "utf-8");
    writeFileSync(wtPath, original + "\n## My Custom Work Item\n- [ ] Do something\n");
    update(tmp, TEMPLATES_DIR);
    const updated = readFileSync(wtPath, "utf-8");
    expect(updated).toContain("My Custom Work Item");
    expect(updated).toContain("---");
  });

  it("skips specd_work_list.md when no --- separator exists", () => {
    writeFileSync(join(tmp, "specd_work_list.md"), "No separator here");
    update(tmp, TEMPLATES_DIR);
    expect(readFileSync(join(tmp, "specd_work_list.md"), "utf-8")).toBe("No separator here");
  });

  it("handles multiple --- separators correctly", () => {
    writeFileSync(
      join(tmp, "specd_work_list.md"),
      "# Working Tracks\n\n---\n\n## Section 1\n\n---\n\n## Section 2\n",
    );
    update(tmp, TEMPLATES_DIR);
    const content = readFileSync(join(tmp, "specd_work_list.md"), "utf-8");
    expect(content).toContain("Section 1");
    expect(content).toContain("Section 2");
  });

  it("deletes files in REMOVED list", () => {
    writeFileSync(join(tmp, "GUIDE.md"), "old guide");
    update(tmp, TEMPLATES_DIR);
    expect(existsSync(join(tmp, "GUIDE.md"))).toBe(false);
  });

  it("creates .specd-version", () => {
    const versionPath = join(tmp, ".specd-version");
    rmSync(versionPath, { force: true });
    update(tmp, TEMPLATES_DIR);
    expect(existsSync(versionPath)).toBe(true);
    expect(readFileSync(versionPath, "utf-8")).toBe("0.1.0");
  });

  it("creates specd_work_list.md if it doesn't exist", () => {
    rmSync(join(tmp, "specd_work_list.md"), { force: true });
    update(tmp, TEMPLATES_DIR);
    expect(existsSync(join(tmp, "specd_work_list.md"))).toBe(true);
  });

  it("creates missing scaffold files", () => {
    rmSync(join(tmp, "specd_review.md"), { force: true });
    update(tmp, TEMPLATES_DIR);
    expect(existsSync(join(tmp, "specd_review.md"))).toBe(true);
  });

  it("skips specd_work_list.md with --- inside content but no separator line", () => {
    writeFileSync(join(tmp, "specd_work_list.md"), "some content with --- in the middle");
    update(tmp, TEMPLATES_DIR);
    expect(readFileSync(join(tmp, "specd_work_list.md"), "utf-8")).toBe(
      "some content with --- in the middle",
    );
  });

  it("handles specd_work_list.md ending with --- and no trailing newline", () => {
    writeFileSync(join(tmp, "specd_work_list.md"), "# Header\n\n---");
    update(tmp, TEMPLATES_DIR);
    const content = readFileSync(join(tmp, "specd_work_list.md"), "utf-8");
    expect(content).toContain("---");
  });

  it("returns correct counts for clean update", () => {
    const result = update(tmp, TEMPLATES_DIR);
    expect(result.updated).toBeGreaterThan(0);
    expect(result.deleted).toBe(0);
  });

  it("migrates tracks.md to specd_history.md", () => {
    rmSync(join(tmp, "specd_history.md"), { force: true });
    writeFileSync(join(tmp, "tracks.md"), "# Old History\n- item one\n");
    update(tmp, TEMPLATES_DIR);
    expect(existsSync(join(tmp, "tracks.md"))).toBe(false);
    expect(readFileSync(join(tmp, "specd_history.md"), "utf-8")).toContain("item one");
  });

  it("migrates working_tracks.md to specd_work_list.md with header update", () => {
    rmSync(join(tmp, "specd_work_list.md"), { force: true });
    writeFileSync(
      join(tmp, "working_tracks.md"),
      "# Old Header\n---\n\n## my-spec v0.1\n- do thing\n",
    );
    update(tmp, TEMPLATES_DIR);
    expect(existsSync(join(tmp, "working_tracks.md"))).toBe(false);
    const content = readFileSync(join(tmp, "specd_work_list.md"), "utf-8");
    expect(content).toContain("do thing");
    expect(content).toContain("---");
  });

  it("migrates review.md to specd_review.md", () => {
    rmSync(join(tmp, "specd_review.md"), { force: true });
    writeFileSync(join(tmp, "review.md"), "# Review\n## some-spec\nfinding here\n");
    update(tmp, TEMPLATES_DIR);
    expect(existsSync(join(tmp, "review.md"))).toBe(false);
    expect(readFileSync(join(tmp, "specd_review.md"), "utf-8")).toContain("finding here");
  });

  it("skips migration when new file already exists", () => {
    writeFileSync(join(tmp, "tracks.md"), "OLD CONTENT");
    update(tmp, TEMPLATES_DIR);
    expect(existsSync(join(tmp, "tracks.md"))).toBe(false);
    expect(readFileSync(join(tmp, "specd_history.md"), "utf-8")).not.toContain("OLD CONTENT");
  });
});

describe("doctor", () => {
  let tmp;

  beforeEach(() => {
    tmp = makeTmp();
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("reports all files present on clean init", () => {
    runInit(tmp);
    const result = doctor(tmp);
    expect(result.fail).toBe(0);
    expect(result.pass).toBeGreaterThan(0);
  });

  it("fails when a required file is missing", () => {
    runInit(tmp);
    rmSync(join(tmp, "loop.sh"));
    const result = doctor(tmp);
    expect(result.fail).toBeGreaterThan(0);
  });

  it("detects non-executable loop.sh", () => {
    runInit(tmp);
    chmodSync(join(tmp, "loop.sh"), 0o644);
    const result = doctor(tmp);
    expect(result.fail).toBeGreaterThan(0);
  });

  it("detects missing .specd-version", () => {
    runInit(tmp);
    rmSync(join(tmp, ".specd-version"));
    const result = doctor(tmp);
    expect(result.fail).toBeGreaterThan(0);
  });

  it("reports correct pass/fail counts with one missing file", () => {
    runInit(tmp);
    rmSync(join(tmp, "CLAUDE.md"));
    const result = doctor(tmp);
    expect(result.fail).toBe(1);
  });
});

describe("error handling", () => {
  it("init throws when templates directory is missing", () => {
    const tmp = makeTmp();
    try {
      expect(() =>
        init(tmp, "/nonexistent/templates", {
          projectName: "Test",
          description: "Test",
        }),
      ).toThrow();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
