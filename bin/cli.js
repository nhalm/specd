#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const VERSION = require(path.join(__dirname, '..', 'package.json')).version;

const FRAMEWORK_OWNED_FILES = [
  'loop.sh',
  '.claude/commands/implement.md',
  '.claude/commands/audit.md',
  '.claude/commands/full-audit.md',
  '.claude/commands/review-intake.md',
];

const SCAFFOLD_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'GUIDE.md',
  'specs/README.md',
  'specs/example-spec.md',
  'tracks.md',
  'working_tracks.md',
  'review.md',
  'planning_prompt.md',
];

const REMOVED = [];

const TEMPLATE_MAP = [
  { src: 'claude/commands/implement.md', dest: '.claude/commands/implement.md' },
  { src: 'claude/commands/audit.md', dest: '.claude/commands/audit.md' },
  { src: 'claude/commands/full-audit.md', dest: '.claude/commands/full-audit.md' },
  { src: 'claude/commands/review-intake.md', dest: '.claude/commands/review-intake.md' },
  { src: 'CLAUDE.md', dest: 'CLAUDE.md' },
  { src: 'AGENTS.md', dest: 'AGENTS.md' },
  { src: 'GUIDE.md', dest: 'GUIDE.md' },
  { src: 'loop.sh', dest: 'loop.sh' },
  { src: 'planning_prompt.md', dest: 'planning_prompt.md' },
  { src: 'specs/README.md', dest: 'specs/README.md' },
  { src: 'specs/example-spec.md', dest: 'specs/example-spec.md' },
  { src: 'tracks.md', dest: 'tracks.md' },
  { src: 'working_tracks.md', dest: 'working_tracks.md' },
  { src: 'review.md', dest: 'review.md' },
];

function createPrompt() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const pending = [];
  const waiting = [];
  let closed = false;

  rl.on('line', (line) => {
    if (waiting.length > 0) {
      waiting.shift()(line.trim());
    } else {
      pending.push(line.trim());
    }
  });

  rl.on('close', () => {
    closed = true;
    while (waiting.length > 0) {
      waiting.shift()('');
    }
  });

  return {
    ask(question) {
      process.stdout.write(question);
      if (pending.length > 0) {
        const answer = pending.shift();
        process.stdout.write(answer + '\n');
        return Promise.resolve(answer);
      }
      if (closed) {
        return Promise.resolve('');
      }
      return new Promise((resolve) => {
        waiting.push((answer) => {
          process.stdout.write(answer + '\n');
          resolve(answer);
        });
      });
    },
    close() {
      rl.close();
    },
  };
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.md', '.sh', '.json', '.txt', '.yml', '.yaml', ''].includes(ext);
}

function copyFileWithReplacements(srcPath, destPath, replacements) {
  const content = fs.readFileSync(srcPath, 'utf8');
  let output = content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    output = output.split(placeholder).join(value);
  }
  fs.writeFileSync(destPath, output, 'utf8');
}

function commandExists(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function init() {
  const cwd = process.cwd();
  const prompt = createPrompt();

  try {
    const projectName = await prompt.ask('Project name: ');
    if (!projectName) {
      console.error('Project name is required.');
      process.exit(1);
    }

    const description = await prompt.ask('One-line project description: ');
    if (!description) {
      console.error('Project description is required.');
      process.exit(1);
    }

    const replacements = {
      '{PROJECT_NAME}': projectName,
      '{One-line project description}': description,
    };

    let copied = 0;
    let skipped = 0;

    for (const entry of TEMPLATE_MAP) {
      const srcPath = path.join(TEMPLATES_DIR, entry.src);
      const destPath = path.join(cwd, entry.dest);

      if (fs.existsSync(destPath)) {
        console.log(`  SKIP  ${entry.dest} (already exists)`);
        skipped++;
        continue;
      }

      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });

      if (isTextFile(srcPath)) {
        copyFileWithReplacements(srcPath, destPath, replacements);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }

      console.log(`  CREATE  ${entry.dest}`);
      copied++;
    }

    const loopPath = path.join(cwd, 'loop.sh');
    if (fs.existsSync(loopPath)) {
      fs.chmodSync(loopPath, 0o755);
    }

    fs.writeFileSync(path.join(cwd, '.spec-dd-version'), VERSION, 'utf8');
    console.log(`  CREATE  .spec-dd-version`);

    console.log(`\nDone. ${copied} files created, ${skipped} skipped.`);

    if (!commandExists('npx repomirror --help')) {
      console.log('\nWarning: repomirror is not available. Install it with: npm install -g repomirror');
    }
  } finally {
    prompt.close();
  }
}

function update() {
  const cwd = process.cwd();

  const versionFile = path.join(cwd, '.spec-dd-version');
  if (fs.existsSync(versionFile)) {
    const currentVersion = fs.readFileSync(versionFile, 'utf8').trim();
    console.log(`Current version: ${currentVersion}`);
  } else {
    console.log('No .spec-dd-version found (first update).');
  }

  console.log(`Updating to: ${VERSION}\n`);

  let updated = 0;
  let skippedScaffold = 0;
  let deleted = 0;

  for (const relPath of FRAMEWORK_OWNED_FILES) {
    const entry = TEMPLATE_MAP.find((e) => e.dest === relPath);
    if (!entry) {
      console.log(`  MISSING  ${relPath} (no template mapping)`);
      continue;
    }
    const srcPath = path.join(TEMPLATES_DIR, entry.src);
    const destPath = path.join(cwd, relPath);

    if (!fs.existsSync(srcPath)) {
      console.log(`  MISSING  ${relPath} (template not found)`);
      continue;
    }

    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });

    fs.copyFileSync(srcPath, destPath);
    console.log(`  UPDATE  ${relPath}`);
    updated++;
  }

  for (const relPath of SCAFFOLD_FILES) {
    console.log(`  SKIP  ${relPath} (scaffold — not overwritten)`);
    skippedScaffold++;
  }

  for (const relPath of REMOVED) {
    const destPath = path.join(cwd, relPath);
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
      console.log(`  DELETE  ${relPath}`);
      deleted++;
    }
  }

  const loopPath = path.join(cwd, 'loop.sh');
  if (fs.existsSync(loopPath)) {
    fs.chmodSync(loopPath, 0o755);
  }

  fs.writeFileSync(path.join(cwd, '.spec-dd-version'), VERSION, 'utf8');

  console.log(`\nDone. ${updated} updated, ${skippedScaffold} skipped (scaffold), ${deleted} deleted.`);
}

function doctor() {
  const cwd = process.cwd();
  const allFiles = [...FRAMEWORK_OWNED_FILES, ...SCAFFOLD_FILES];
  let pass = 0;
  let fail = 0;

  function check(label, ok) {
    if (ok) {
      console.log(`  PASS  ${label}`);
      pass++;
    } else {
      console.log(`  FAIL  ${label}`);
      fail++;
    }
  }

  console.log('Checking files...\n');

  for (const relPath of allFiles) {
    const fullPath = path.join(cwd, relPath);
    check(relPath, fs.existsSync(fullPath));
  }

  console.log('');

  const loopPath = path.join(cwd, 'loop.sh');
  try {
    const stats = fs.statSync(loopPath);
    check('loop.sh is executable', !!(stats.mode & 0o111));
  } catch {
    check('loop.sh is executable', false);
  }

  const versionFile = path.join(cwd, '.spec-dd-version');
  if (fs.existsSync(versionFile)) {
    const version = fs.readFileSync(versionFile, 'utf8').trim();
    check(`.spec-dd-version (${version})`, true);
  } else {
    check('.spec-dd-version exists', false);
  }

  check('claude CLI available', commandExists('which claude'));
  check('repomirror available', commandExists('which repomirror') || commandExists('npm list -g repomirror'));

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
}

const command = process.argv[2];

switch (command) {
  case 'init':
    init().catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
    break;
  case 'update':
    update();
    break;
  case 'doctor':
    doctor();
    break;
  default:
    console.log('spec-dd - Spec-driven development framework for AI agents\n');
    console.log('Usage: spec-dd <command>\n');
    console.log('Commands:');
    console.log('  init     Initialize a new project with the spec-dd framework');
    console.log('  update   Update framework-owned files to the latest version');
    console.log('  doctor   Check that all expected files are in place');
    process.exit(command ? 1 : 0);
}
