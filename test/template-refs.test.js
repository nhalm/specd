import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "templates");

function getAllTemplateMarkdown() {
  const results = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith(".md")) results.push(full);
    }
  };
  walk(TEMPLATES_DIR);
  return results;
}

// Extract backtick-quoted file paths from markdown content.
function extractFilePaths(content) {
  const paths = new Set();
  const backtickRe = /`([^`\n]+?\.(?:md|sh|js|ts|json|yml|yaml))`/g;
  let match;
  while ((match = backtickRe.exec(content)) !== null) {
    const path = match[1];
    if (path.includes("(") || path.includes(")")) continue;
    if (path.startsWith("http")) continue;
    if (path.includes("→")) continue;
    if (path.includes(" ") && !path.includes("/")) continue;
    paths.add(path);
  }
  return [...paths];
}

// Extract /specd:command references from markdown content.
function extractCommandRefs(content) {
  const commands = new Set();
  const re = /\/specd:([a-z-]+)/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    commands.add(match[1]);
  }
  return [...commands];
}

// Resolve a referenced path to the templates directory.
function resolveTemplatePath(refPath) {
  const normalized = refPath.replace(/^\.claude\//, "claude/");
  return join(TEMPLATES_DIR, normalized);
}

// Extract file path references from shell scripts.
function extractShellFilePaths(content) {
  const paths = new Set();
  // Match .claude/commands/... paths
  const re = /(?:cat\s+["']?|")(\.[a-zA-Z0-9_/.-]+\.md)["']?/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    paths.add(match[1]);
  }
  return [...paths];
}

describe("template reference validation", () => {
  const allFiles = getAllTemplateMarkdown();

  for (const file of allFiles) {
    const relative = file.slice(TEMPLATES_DIR.length + 1);
    const content = readFileSync(file, "utf-8");
    const filePaths = extractFilePaths(content);
    const commandRefs = extractCommandRefs(content);

    for (const ref of filePaths) {
      it(`${relative} references valid file: ${ref}`, () => {
        const resolved = resolveTemplatePath(ref);
        expect(
          existsSync(resolved),
          `${relative} references \`${ref}\` but ${resolved} does not exist`,
        ).toBe(true);
      });
    }

    for (const cmd of commandRefs) {
      it(`${relative} references valid command: /specd:${cmd}`, () => {
        const cmdFile = join(TEMPLATES_DIR, "claude", "commands", "specd", `${cmd}.md`);
        expect(
          existsSync(cmdFile),
          `${relative} references /specd:${cmd} but ${cmdFile} does not exist`,
        ).toBe(true);
      });
    }
  }

  // Validate loop.sh file path references
  const loopShPath = join(TEMPLATES_DIR, "loop.sh");
  if (existsSync(loopShPath)) {
    const loopContent = readFileSync(loopShPath, "utf-8");
    const shellPaths = extractShellFilePaths(loopContent);

    for (const ref of shellPaths) {
      it(`loop.sh references valid file: ${ref}`, () => {
        const resolved = resolveTemplatePath(ref);
        expect(
          existsSync(resolved),
          `loop.sh references \`${ref}\` but ${resolved} does not exist`,
        ).toBe(true);
      });
    }
  }
});
