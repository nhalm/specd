import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "..", ".env");
    const contents = readFileSync(envPath, "utf-8");
    const vars = {};
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
    return vars;
  } catch {
    return {};
  }
}

const envVars = loadEnv();

export default class ClaudeCliProvider {
  constructor(options) {
    this.providerId = options.id || "claude-cli";
    this.config = options.config || {};
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt) {
    const result = spawnSync("claude", [
      "-p",
      prompt,
      "--output-format",
      "json",
      "--dangerously-skip-permissions",
      "--max-turns",
      "1",
    ], {
      timeout: 180_000,
      encoding: "utf-8",
      env: {
        ...process.env,
        ...envVars,
        CLAUDECODE: "",
      },
    });

    if (result.error) {
      return { error: `claude failed: ${result.error.message}` };
    }

    if (result.status !== 0) {
      return {
        error: `claude exited with status ${result.status}: ${result.stderr?.slice(0, 500)}`,
      };
    }

    try {
      const parsed = JSON.parse(result.stdout);
      return {
        output: parsed.result || "",
        cost: parsed.total_cost_usd || 0,
        tokenUsage: {
          total:
            (parsed.usage?.input_tokens || 0) +
            (parsed.usage?.output_tokens || 0),
          prompt: parsed.usage?.input_tokens || 0,
          completion: parsed.usage?.output_tokens || 0,
        },
      };
    } catch {
      return { output: result.stdout };
    }
  }
}
