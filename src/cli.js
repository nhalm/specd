#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { init, update, doctor } from "./commands.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");

function usage() {
  console.log("spec-dd — Spec-driven development framework for AI agents");
  console.log("");
  console.log("Usage: spec-dd <command> [target-dir]");
  console.log("");
  console.log("Commands:");
  console.log("  init   [dir]   Initialize a project with the spec-dd framework (default: cwd)");
  console.log("  update [dir]   Update framework-owned files to the latest version");
  console.log("  doctor [dir]   Check that all expected files are in place");
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
  const [command, targetArg] = process.argv.slice(2);
  const targetDir = resolve(targetArg || ".");

  switch (command) {
    case "init": {
      const projectName = await prompt("Project name: ");
      if (!projectName) {
        console.error("Error: Project name is required.");
        process.exit(1);
      }

      const description = await prompt("One-line project description: ");
      if (!description) {
        console.error("Error: Project description is required.");
        process.exit(1);
      }

      const result = init(targetDir, TEMPLATES_DIR, { projectName, description });
      result.messages.forEach((m) => console.log(m));
      break;
    }

    case "update": {
      const result = update(targetDir, TEMPLATES_DIR);
      result.messages.forEach((m) => console.log(m));
      break;
    }

    case "doctor": {
      const result = doctor(targetDir);
      result.messages.forEach((m) => console.log(m));
      if (result.fail > 0) process.exit(1);
      break;
    }

    default:
      usage();
      if (command) process.exit(1);
      break;
  }
}

main();
