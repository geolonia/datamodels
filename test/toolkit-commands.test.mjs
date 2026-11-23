// The toolkit commands on the hand-written pages (guides, toolkit, in both
// languages) work with the release this repository pins in package.json:
// - every @geolonia/datamodels@<version> on a page names that release. A page
//   that cites an older release fails on purpose; placeholders such as X.Y.Z
//   and <version> are left alone.
// - every toolkit command in a code block (npx @geolonia/datamodels@…, npx -y,
//   npm exec, pnpm dlx, or npx datamodels in a project) uses a command and
//   options that the installed toolkit's --help lists.
// Not checked: commands in inline code, positional arguments and option values.
// What the commands print is checked in datamodels-toolkit (test/golden/docs/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { ROOT } from '../scripts/lib/models.mjs';

const run = promisify(execFile);
const PACKAGE = '@geolonia/datamodels';
const manifest = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const pinned = { ...manifest.dependencies, ...manifest.devDependencies }[PACKAGE];
const TOOLKIT = dirname(fileURLToPath(import.meta.resolve(`${PACKAGE}/package.json`)));
const installed = JSON.parse(await readFile(join(TOOLKIT, 'package.json'), 'utf8')).version;
const BIN = join(TOOLKIT, 'bin', 'datamodels.mjs');
// A run of the toolkit: what comes after it is the command line.
const RUNS = /(?:@geolonia\/datamodels(?:@[\w.<>-]+)?|\b(?:npx|npm exec|pnpm exec|pnpm|yarn)\s+datamodels)(?=\s|$)/g;
// What may stand after @geolonia/datamodels@ instead of the release: a placeholder.
const PLACEHOLDER = /^(?:[XYZ](?:\.[XYZ])*|<[\w.-]+>)$/;

/** The hand-written Markdown pages: in git or new, but not the generated ones that .gitignore lists. */
async function pages() {
  const { stdout } = await run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'site/*.md'], { cwd: ROOT });
  return [...new Set(stdout.split('\n').filter(Boolean))].sort();
}

/** The lines in the code blocks of a page, of any language: [{ line, text }], with lines continued by a backslash joined. */
function codeLines(markdown) {
  const out = [];
  let fence = null;
  markdown.split('\n').forEach((line, i) => {
    if (fence === null) {
      const open = /^\s*(`{3,}|~{3,})/.exec(line);
      if (open) fence = { marker: open[1], lines: [] };
      return;
    }
    const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
    if (close && close[1][0] === fence.marker[0] && close[1].length >= fence.marker.length) {
      out.push(...fence.lines);
      fence = null;
      return;
    }
    const last = fence.lines.at(-1);
    if (last?.text.endsWith('\\')) last.text = `${last.text.slice(0, -1)} ${line.trim()}`;
    else fence.lines.push({ line: i + 1, text: line });
  });
  return out;
}

/** Words of a shell command up to its end (|, &&, ;, a redirect or a comment), with quotes removed. */
function words(text) {
  const out = [];
  for (const m of text.matchAll(/'([^']*)'|"((?:[^"\\]|\\.)*)"|(\S+)/g)) {
    if (m[3] !== undefined && /^(\||&&|;|<|>|\d?>|#)/.test(m[3])) break;
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

/** The commands and, for each, its options (long and short), as the installed toolkit's --help lists them. */
async function readHelp() {
  const help = async (...args) => (await run(process.execPath, [BIN, ...args, '--help'])).stdout;
  const options = (text) => new Set([...text.matchAll(/^ +(-\w)?(?:, )?(--[\w-]+)?/gm)].flatMap((m) => [m[1], m[2]]).filter(Boolean));
  const top = await help();
  const list = top.split(/^commands:$/m)[1] ?? '';
  const commands = [...list.matchAll(/^ {2}([a-z][\w-]*)/gm)].map((m) => m[1]);
  assert.ok(commands.length > 5, `could not read the commands from datamodels --help: has its format changed?\n${top}`);
  const out = new Map([['', options(top)]]);
  for (const c of commands) out.set(c, c === 'help' ? options(top) : options(await help(c)));
  return out;
}

const all = await pages();

test(`the installed toolkit is ${PACKAGE}@${pinned}, as package.json pins it`, () => {
  assert.match(pinned ?? '', /^\d+\.\d+\.\d+$/, `package.json should pin an exact release of ${PACKAGE}, not ${pinned}`);
  assert.equal(installed, pinned, 'node_modules has another release than package.json: run pnpm install');
});

test(`the pages name ${PACKAGE}@${pinned}, the release package.json pins`, async () => {
  const wrong = [];
  for (const file of all) {
    (await readFile(join(ROOT, file), 'utf8')).split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/@geolonia\/datamodels@([\w.<>^~-]+)/g)) {
        const version = m[1].replace(/\.+$/, ''); // not the full stop of a sentence
        if (version !== pinned && !PLACEHOLDER.test(version)) wrong.push(`${file}:${i + 1}: ${PACKAGE}@${version}`);
      }
    });
  }
  assert.deepEqual(wrong, [], `name ${pinned} on these pages, the release in package.json`);
});

test('the toolkit commands on the pages use commands and options the toolkit has', async () => {
  const help = await readHelp();
  const commands = [...help.keys()].filter(Boolean).join(', ');
  const problems = [];
  let seen = 0;
  for (const file of all) {
    for (const { line, text } of codeLines(await readFile(join(ROOT, file), 'utf8'))) {
      if (/^\s*#/.test(text)) continue; // a comment
      for (const m of text.matchAll(RUNS)) {
        // Not a run: npm install @geolonia/datamodels, and the like.
        if (/\b(?:install|add|i)\s+(?:-\S+\s+)*$/.test(text.slice(0, m.index))) continue;
        seen++;
        const args = words(text.slice(m.index + m[0].length));
        const command = args.find((a) => !a.startsWith('-')) ?? '';
        const where = `${file}:${line}: datamodels ${args.join(' ')}`;
        const known = help.get(command);
        if (!known) { problems.push(`${where}: no command ${command} (the toolkit has ${commands})`); continue; }
        if (command === 'help') {
          const about = args[args.indexOf('help') + 1];
          if (about && !help.has(about)) problems.push(`${where}: no command ${about} (the toolkit has ${commands})`);
          continue;
        }
        for (const a of args) {
          const option = /^--[\w-]+|^-\w$/.exec(a)?.[0];
          if (option && !known.has(option)) problems.push(`${where}: ${command || 'datamodels'} has no option ${option} (it has ${[...known].join(', ')})`);
        }
      }
    }
  }
  assert.ok(seen > 20, `only ${seen} toolkit commands found on the pages: is the parsing broken?`);
  assert.deepEqual(problems, [], 'fix these commands on the pages, or the toolkit release they name');
});
