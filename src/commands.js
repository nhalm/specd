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
import {
  VERSION,
  FRAMEWORK_OWNED,
  SCAFFOLD,
  HEADER_UPDATABLE,
  REMOVED,
  ALL_FILES,
  srcFor,
} from "./config.js";

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

  writeFileSync(join(targetDir, ".spec-dd-version"), VERSION);
  messages.push("  CREATE  .spec-dd-version");
  messages.push("");
  messages.push(`Done. ${copied} files created, ${skipped} skipped.`);

  return { copied, skipped, messages };
}

export function update(targetDir, templatesDir) {
  let updated = 0;
  let skipped = 0;
  let deleted = 0;
  const messages = [];

  const versionFile = join(targetDir, ".spec-dd-version");
  if (existsSync(versionFile)) {
    messages.push(`Current version: ${readFileSync(versionFile, "utf-8").trim()}`);
  } else {
    messages.push("No .spec-dd-version found (first update).");
  }
  messages.push(`Updating to: ${VERSION}`);
  messages.push("");

  // Overwrite framework-owned files
  for (const dest of FRAMEWORK_OWNED) {
    const srcPath = join(templatesDir, srcFor(dest));
    const destPath = join(targetDir, dest);

    if (!existsSync(srcPath)) {
      messages.push(`  MISSING  ${dest} (template not found)`);
      continue;
    }

    ensureDir(destPath);
    writeFileSync(destPath, readFileSync(srcPath, "utf-8"));
    messages.push(`  UPDATE  ${dest}`);
    updated++;
  }

  // Scaffold files: create if missing, skip if exists
  for (const dest of SCAFFOLD) {
    const destPath = join(targetDir, dest);
    if (existsSync(destPath)) {
      messages.push(`  SKIP  ${dest} (scaffold — not overwritten)`);
      skipped++;
    } else {
      const srcPath = join(templatesDir, srcFor(dest));
      ensureDir(destPath);
      writeFileSync(destPath, readFileSync(srcPath, "utf-8"));
      messages.push(`  CREATE  ${dest} (new in this version)`);
      updated++;
    }
  }

  // Update headers on header-updatable files
  for (const dest of HEADER_UPDATABLE) {
    const srcPath = join(templatesDir, srcFor(dest));
    const destPath = join(targetDir, dest);

    if (!existsSync(destPath)) {
      ensureDir(destPath);
      writeFileSync(destPath, readFileSync(srcPath, "utf-8"));
      messages.push(`  CREATE  ${dest}`);
      updated++;
      continue;
    }

    const existing = readFileSync(destPath, "utf-8");
    if (!existing.includes("\n---\n") && !existing.endsWith("\n---\n")) {
      // Check for --- on its own line
      const lines = existing.split("\n");
      const hasSeparator = lines.some((line) => line === "---");
      if (!hasSeparator) {
        messages.push(`  SKIP  ${dest} (no --- separator found — cannot update header safely)`);
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

    writeFileSync(destPath, newHeader + "\n" + existingContent);
    messages.push(`  UPDATE  ${dest} (header only)`);
    updated++;
  }

  // Remove obsolete files
  for (const dest of REMOVED) {
    const destPath = join(targetDir, dest);
    if (existsSync(destPath)) {
      unlinkSync(destPath);
      messages.push(`  DELETE  ${dest}`);
      deleted++;
    }
  }

  const loopPath = join(targetDir, "loop.sh");
  if (existsSync(loopPath)) {
    chmodSync(loopPath, 0o755);
  }

  writeFileSync(versionFile, VERSION);

  messages.push("");
  messages.push(`Done. ${updated} updated, ${skipped} skipped (scaffold), ${deleted} deleted.`);

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

  const versionFile = join(targetDir, ".spec-dd-version");
  if (existsSync(versionFile)) {
    const ver = readFileSync(versionFile, "utf-8").trim();
    messages.push(`  PASS  .spec-dd-version (${ver})`);
    pass++;
  } else {
    messages.push("  FAIL  .spec-dd-version exists");
    fail++;
  }

  messages.push("");
  messages.push(`${pass} passed, ${fail} failed.`);

  return { pass, fail, messages };
}
