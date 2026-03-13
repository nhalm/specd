import { spawnSync } from "node:child_process";

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
