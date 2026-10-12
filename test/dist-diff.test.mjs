// dist-diff: two builds of the same commit compare equal; anything else is listed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { compareDirs, lineDiff, markdownReport } from '../scripts/dist-diff.mjs';

async function tree(files) {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-dist-diff-test-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return dir;
}

async function compare(a, b) {
  const [x, y] = [await tree(a), await tree(b)];
  try {
    return await compareDirs(x, y);
  } finally {
    await rm(x, { recursive: true, force: true });
    await rm(y, { recursive: true, force: true });
  }
}

const page = (hash) => `<script>window.__VP_HASH_MAP__=JSON.parse("{\\"about.md\\":\\"${hash}\\"}")</script><script src="/assets/app.${hash === 'CAEmknld' ? 'cgvjHgVP' : 'i6Xd8v88'}.js"></script>`;

test('build time and VitePress hashes are not differences', async () => {
  const r = await compare({
    'catalog.json': '{\n  "generatedAt": "2026-10-12T23:14:04.309Z",\n  "x": 1\n}',
    'index.html': page('CAEmknld'),
    'assets/about.md.CAEmknld.js': 'export default 1',
    'assets/about.md.CAEmknld.lean.js': 'export default 1',
    'assets/app.cgvjHgVP.js': 'import "./about.md.CAEmknld.js"',
  }, {
    'catalog.json': '{\n  "generatedAt": "2026-10-12T23:14:12.608Z",\n  "x": 1\n}',
    'index.html': page('BK-6rf1M'),
    'assets/about.md.BK-6rf1M.js': 'export default 1',
    'assets/about.md.BK-6rf1M.lean.js': 'export default 1',
    'assets/app.i6Xd8v88.js': 'import "./about.md.BK-6rf1M.js"',
  });
  assert.deepEqual(r, { total: 5, added: [], removed: [], changed: [] });
});

test('added, removed and changed files are listed; a changed chunk keeps its name without the hash', async () => {
  const r = await compare({
    'a.json': '{"generatedAt": "1"}',
    'gone.txt': 'x',
    'og.png': Buffer.from([0x89, 0x50, 1]),
    'assets/about.md.CAEmknld.js': 'export default 1',
  }, {
    'a.json': '{"generatedAt": "2"}',
    'new.txt': 'y',
    'og.png': Buffer.from([0x89, 0x50, 2, 3]),
    'assets/about.md.BK-6rf1M.js': 'export default 2',
  });
  assert.deepEqual(r.added, ['new.txt']);
  assert.deepEqual(r.removed, ['gone.txt']);
  // generatedAt is ignored in catalog.json only.
  assert.deepEqual(r.changed.map((c) => c.path), ['a.json', 'assets/about.md.[hash].js', 'og.png']);
  assert.deepEqual(r.changed[1].diff, ['-export default 1', '+export default 2']);
  assert.deepEqual(r.changed[2], { path: 'og.png', binary: true, sizes: [3, 4] });
  assert.match(markdownReport(r, 'HEAD'), /1 added, 1 removed, 3 changed/);
});

test('lineDiff shows changed lines only, clipped around the change', () => {
  const long = 'a'.repeat(500);
  const d = lineDiff(`same\n${long}X${long}\nsame\nkeep`, `same\n${long}Y${long}\nsame\nkeep\nnew`);
  assert.equal(d.length, 4);
  assert.match(d[0], /^-…a+Xa+…$/);
  assert.match(d[1], /^\+…a+Ya+…$/);
  assert.ok(d[0].length < 200);
  assert.deepEqual(d.slice(2), ['…', '+new']);
});
