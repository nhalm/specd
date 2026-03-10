#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import { init, update, doctor } from "./commands.js";
import { VERSION } from "./config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");

function usage() {
  console.log("specd — Spec-driven development framework for AI agents");
  console.log("");
  console.log("Usage: specd <command> [target-dir]");
  console.log("");
  console.log("Commands:");
  console.log("  init   [dir]   Initialize a project with the specd framework (default: cwd)");
  console.log("  update [dir]   Update framework-owned files to the latest version");
  console.log("  doctor [dir]   Check that all expected files are in place");
  console.log("");
  console.log("Options:");
  console.log("  --dry-run      Preview update changes without modifying files");
  console.log("  --overwrite    Overwrite locally modified framework files during update");
  console.log("  --help, -h     Show this help message");
  console.log("  --version, -v  Show version number");
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  process.on("SIGINT", () => {
    console.log("\nAborted.");
    process.exit(0);
  });

  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith("--"));
  const positional = args.filter((a) => !a.startsWith("-"));
  const [command, targetArg] = positional;
  const targetDir = resolve(targetArg || ".");
  const dryRun = flags.includes("--dry-run");

  if (flags.includes("--help") || flags.includes("-h")) {
    usage();
    return;
  }

  if (flags.includes("--version") || flags.includes("-v")) {
    console.log(VERSION);
    return;
  }

  switch (command) {
    case "init": {
      if (!existsSync(targetDir)) {
        console.error(`Error: Directory not found: ${targetDir}`);
        process.exit(1);
      }

      const projectName = await prompt("Project name (e.g., my-app): ");
      if (!projectName) {
        console.error("Error: Project name is required.");
        process.exit(1);
      }

      const description = await prompt(
        "One-line project description (e.g., A task management API): ",
      );
      if (!description) {
        console.error("Error: Project description is required.");
        process.exit(1);
      }

      const result = init(targetDir, TEMPLATES_DIR, { projectName, description });
      result.messages.forEach((m) => console.log(m));
      break;
    }

    case "update": {
      if (!existsSync(targetDir)) {
        console.error(`Error: Directory not found: ${targetDir}`);
        process.exit(1);
      }

      const overwrite = flags.includes("--overwrite");
      const result = update(targetDir, TEMPLATES_DIR, { dryRun, overwrite });
      result.messages.forEach((m) => console.log(m));
      if (result.conflicts.length > 0) process.exit(1);
      break;
    }

    case "doctor": {
      if (!existsSync(targetDir)) {
        console.error(`Error: Directory not found: ${targetDir}`);
        process.exit(1);
      }

      const result = doctor(targetDir);
      result.messages.forEach((m) => console.log(m));
      if (result.fail > 0) process.exit(1);
      break;
    }

    default:
      if (command) {
        console.error(`Error: Unknown command "${command}"`);
      }
      usage();
      if (command) process.exit(1);
      break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
