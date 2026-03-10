import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
  chmodSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import {
  VERSION,
  FRAMEWORK_OWNED,
  SCAFFOLD,
  HEADER_UPDATABLE,
  REMOVED,
  MIGRATIONS,
  ALL_FILES,
  srcFor,
} from "./config.js";

function computeChecksum(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return createHash("sha256").update(content).digest("hex");
}

function loadChecksums(targetDir) {
  const checksumFile = join(targetDir, ".specd-checksums.json");
  if (existsSync(checksumFile)) {
    return JSON.parse(readFileSync(checksumFile, "utf-8"));
  }
  return {};
}

function saveChecksums(targetDir, checksums) {
  writeFileSync(
    join(targetDir, ".specd-checksums.json"),
    JSON.stringify(checksums, null, 2) + "\n",
  );
}

function readTemplate(templatesDir, dest) {
  const src = srcFor(dest);
  return readFileSync(join(templatesDir, src), "utf-8");
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function init(targetDir, templatesDir, { projectName, description }) {
  let copied = 0;
  let skipped = 0;
  const messages = [];

  for (const dest of ALL_FILES) {
    const destPath = join(targetDir, dest);

    if (existsSync(destPath)) {
      messages.push(`  SKIP  ${dest} (already exists)`);
      skipped++;
      continue;
    }

    let content = readTemplate(templatesDir, dest);
    content = content.replaceAll("{PROJECT_NAME}", projectName);
    content = content.replaceAll("{One-line project description}", description);

    ensureDir(destPath);
    writeFileSync(destPath, content);
    messages.push(`  CREATE  ${dest}`);
    copied++;
  }

  const loopPath = join(targetDir, "loop.sh");
  if (existsSync(loopPath)) {
    chmodSync(loopPath, 0o755);
  }

  writeFileSync(join(targetDir, ".specd-version"), VERSION);
  messages.push("  CREATE  .specd-version");

  // Compute and save checksums for all created files
  const checksums = {};
  for (const dest of ALL_FILES) {
    const destPath = join(targetDir, dest);
    if (existsSync(destPath)) {
      checksums[dest] = computeChecksum(destPath);
    }
  }
  saveChecksums(targetDir, checksums);
  messages.push("  CREATE  .specd-checksums.json");

  messages.push("");
  messages.push(`Done. ${copied} files created, ${skipped} skipped.`);

  return { copied, skipped, messages };
}

export function update(targetDir, templatesDir, { dryRun = false } = {}) {
  let updated = 0;
  let skipped = 0;
  let deleted = 0;
  const messages = [];

  const pfx = (label) => (dryRun ? `WOULD ${label}` : label);

  const storedChecksums = loadChecksums(targetDir);
  const newChecksums = { ...storedChecksums };

  const versionFile = join(targetDir, ".specd-version");
  if (existsSync(versionFile)) {
    messages.push(`Current version: ${readFileSync(versionFile, "utf-8").trim()}`);
  } else {
    messages.push("No .specd-version found (first update).");
  }
  messages.push(`Updating to: ${VERSION}`);
  messages.push("");

  // Migrate renamed files (old → new) before other steps
  for (const [oldName, newName] of MIGRATIONS) {
    const oldPath = join(targetDir, oldName);
    const newPath = join(targetDir, newName);
    if (existsSync(oldPath) && !existsSync(newPath)) {
      if (!dryRun) {
        ensureDir(newPath);
        writeFileSync(newPath, readFileSync(oldPath, "utf-8"));
        unlinkSync(oldPath);
      }
      messages.push(`  ${pfx("RENAME")}  ${oldName} → ${newName}`);
    }
  }

  // Overwrite framework-owned files
  for (const dest of FRAMEWORK_OWNED) {
    const srcPath = join(templatesDir, srcFor(dest));
    const destPath = join(targetDir, dest);

    if (!existsSync(srcPath)) {
      messages.push(`  MISSING  ${dest} (template not found)`);
      continue;
    }

    // Check for local modifications
    if (existsSync(destPath) && storedChecksums[dest]) {
      const currentChecksum = computeChecksum(destPath);
      if (currentChecksum !== storedChecksums[dest]) {
        messages.push(`  ${pfx("WARN")}  ${dest} (modified locally — overwriting)`);
      }
    }

    if (!dryRun) {
      ensureDir(destPath);
      writeFileSync(destPath, readFileSync(srcPath, "utf-8"));
    }
    messages.push(`  ${pfx("UPDATE")}  ${dest}`);
    updated++;
  }

  // Scaffold files: create if missing, skip if exists
  for (const dest of SCAFFOLD) {
    const destPath = join(targetDir, dest);
    if (existsSync(destPath)) {
      messages.push(`  ${pfx("SKIP")}  ${dest} (scaffold — not overwritten)`);
      skipped++;
    } else {
      const srcPath = join(templatesDir, srcFor(dest));
      if (!dryRun) {
        ensureDir(destPath);
        writeFileSync(destPath, readFileSync(srcPath, "utf-8"));
      }
      messages.push(`  ${pfx("CREATE")}  ${dest} (new in this version)`);
      updated++;
    }
  }

  // Update headers on header-updatable files
  for (const dest of HEADER_UPDATABLE) {
    const srcPath = join(templatesDir, srcFor(dest));
    const destPath = join(targetDir, dest);

    if (!existsSync(destPath)) {
      if (!dryRun) {
        ensureDir(destPath);
        writeFileSync(destPath, readFileSync(srcPath, "utf-8"));
      }
      messages.push(`  ${pfx("CREATE")}  ${dest}`);
      updated++;
      continue;
    }

    const existing = readFileSync(destPath, "utf-8");
    if (!existing.includes("\n---\n") && !existing.endsWith("\n---\n")) {
      // Check for --- on its own line
      const lines = existing.split("\n");
      const hasSeparator = lines.some((line) => line === "---");
      if (!hasSeparator) {
        messages.push(
          `  ${pfx("SKIP")}  ${dest} (no --- separator found — cannot update header safely)`,
        );
        skipped++;
        continue;
      }
    }

    const template = readFileSync(srcPath, "utf-8");
    const templateLines = template.split("\n");
    const separatorIdx = templateLines.indexOf("---");
    const newHeader = templateLines.slice(0, separatorIdx + 1).join("\n");

    const existingLines = existing.split("\n");
    const existingSepIdx = existingLines.indexOf("---");
    const existingContent = existingLines.slice(existingSepIdx + 1).join("\n");

    if (!dryRun) {
      writeFileSync(destPath, newHeader + "\n" + existingContent);
    }
    messages.push(`  ${pfx("UPDATE")}  ${dest} (header only)`);
    updated++;
  }

  // Remove obsolete files
  for (const dest of REMOVED) {
    const destPath = join(targetDir, dest);
    if (existsSync(destPath)) {
      if (!dryRun) {
        unlinkSync(destPath);
      }
      messages.push(`  ${pfx("DELETE")}  ${dest}`);
      deleted++;
    }
  }

  if (!dryRun) {
    const loopPath = join(targetDir, "loop.sh");
    if (existsSync(loopPath)) {
      chmodSync(loopPath, 0o755);
    }

    writeFileSync(versionFile, VERSION);

    // Recompute and save checksums for all files
    for (const dest of ALL_FILES) {
      const destPath = join(targetDir, dest);
      if (existsSync(destPath)) {
        newChecksums[dest] = computeChecksum(destPath);
      } else {
        delete newChecksums[dest];
      }
    }
    saveChecksums(targetDir, newChecksums);
  }

  messages.push("");
  if (dryRun) {
    messages.push("Dry run complete. No files were modified.");
  } else {
    messages.push(`Done. ${updated} updated, ${skipped} skipped (scaffold), ${deleted} deleted.`);
  }

  return { updated, skipped, deleted, messages };
}

export function doctor(targetDir) {
  let pass = 0;
  let fail = 0;
  const messages = [];

  messages.push("Checking files...");
  messages.push("");

  for (const dest of ALL_FILES) {
    if (existsSync(join(targetDir, dest))) {
      messages.push(`  PASS  ${dest}`);
      pass++;
    } else {
      messages.push(`  FAIL  ${dest}`);
      fail++;
    }
  }

  messages.push("");

  const loopPath = join(targetDir, "loop.sh");
  if (existsSync(loopPath)) {
    const stats = statSync(loopPath);
    if (stats.mode & 0o100) {
      messages.push("  PASS  loop.sh is executable");
      pass++;
    } else {
      messages.push("  FAIL  loop.sh is executable");
      fail++;
    }
  } else {
    messages.push("  FAIL  loop.sh is executable");
    fail++;
  }

  const versionFile = join(targetDir, ".specd-version");
  if (existsSync(versionFile)) {
    const projectVersion = readFileSync(versionFile, "utf-8").trim();
    messages.push(`  PASS  .specd-version (${projectVersion})`);
    pass++;
    if (projectVersion !== VERSION) {
      messages.push(
        `  WARN  Version mismatch: project ${projectVersion}, framework ${VERSION} (run 'specd update')`,
      );
      fail++;
    }
  } else {
    messages.push("  FAIL  .specd-version exists");
    fail++;
  }

  messages.push("");
  messages.push(`${pass} passed, ${fail} failed.`);

  return { pass, fail, messages };
}
