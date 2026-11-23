// The toolkit commands on the hand-written pages (guides, toolkit, in both
// languages) work with the release this repository pins in package.json:
// every @geolonia/datamodels@<version> names that release, and every
// `npx @geolonia/datamodels@… <command> --option` in a shell code block uses a
// command and options that the installed toolkit's --help lists.
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
const BIN = join(TOOLKIT, 'bin', 'datamodels.mjs');
const SHELL = new Set(['bash', 'sh', 'shell', 'console']);

/** The hand-written Markdown pages: tracked by git, so the generated ones (.gitignore) are left out. */
async function pages() {
  const { stdout } = await run('git', ['ls-files', '--', 'site/*.md'], { cwd: ROOT });
  return stdout.split('\n').filter(Boolean);
}

/** The shell code blocks of a page: [{ line, text }], with lines continued by a backslash joined. */
function shellBlocks(markdown) {
  const out = [];
  let fence = null;
  markdown.split('\n').forEach((line, i) => {
    if (fence === null) {
      const open = /^\s*(`{3,}|~{3,})\s*(\w*)/.exec(line);
      if (open) fence = { marker: open[1], lang: open[2], lines: [] };
      return;
    }
    const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
    if (close && close[1][0] === fence.marker[0] && close[1].length >= fence.marker.length) {
      if (SHELL.has(fence.lang)) out.push(...fence.lines);
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
    const word = m[3];
    if (word !== undefined && (/^(\||&&|;|>|>>|2>|#)/.test(word))) break;
    out.push(m[1] ?? m[2] ?? word);
  }
  return out;
}

/** The commands and, for each, its options, as the installed toolkit's --help lists them. */
async function helpOf() {
  const help = async (...args) => (await run(process.execPath, [BIN, ...args, '--help'])).stdout;
  const options = (text) => new Set([...text.matchAll(/^ +(?:-\w, )?(--[\w-]+)/gm)].map((m) => m[1]));
  const top = await help();
  const commands = [...top.split(/^commands:$/m)[1].matchAll(/^ {2}([a-z][\w-]*)/gm)].map((m) => m[1]).filter((c) => c !== 'help');
  const out = new Map([['', options(top)]]);
  for (const c of commands) out.set(c, options(await help(c)));
  return out;
}

const all = await pages();
const help = await helpOf();

test(`the pages name ${PACKAGE}@${pinned}, the release package.json pins`, async () => {
  const wrong = [];
  for (const file of all) {
    (await readFile(join(ROOT, file), 'utf8')).split('\n').forEach((line, i) => {
      // A version number, not a placeholder such as X.Y.Z.
      for (const m of line.matchAll(/@geolonia\/datamodels@(\d+\.\d+\.\d+[\w.-]*)/g)) {
        if (m[1] !== pinned) wrong.push(`${file}:${i + 1}: ${m[0]}`);
      }
    });
  }
  assert.deepEqual(wrong, [], `name ${pinned} on these pages, the release in package.json`);
});

test('the toolkit commands on the pages use commands and options the toolkit has', async () => {
  const problems = [];
  let seen = 0;
  for (const file of all) {
    for (const { line, text } of shellBlocks(await readFile(join(ROOT, file), 'utf8'))) {
      const at = text.indexOf(`npx ${PACKAGE}@`);
      if (at === -1) continue;
      seen++;
      const [, ...args] = words(text.slice(at + 4));
      const command = args[0] && !args[0].startsWith('-') ? args[0] : '';
      const where = `${file}:${line}: datamodels ${args.join(' ')}`;
      const known = help.get(command);
      if (!known) { problems.push(`${where}: no command ${command}`); continue; }
      for (const a of args) {
        const option = /^--[\w-]+/.exec(a)?.[0];
        if (option && option !== '--' && !known.has(option)) problems.push(`${where}: ${command || 'datamodels'} has no option ${option}`);
      }
    }
  }
  assert.ok(seen > 20, `only ${seen} toolkit commands found on the pages: is the parsing broken?`);
  assert.deepEqual(problems, []);
});
