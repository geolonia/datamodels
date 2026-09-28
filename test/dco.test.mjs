// DCO: every non-merge commit of a pull request is signed off by its author.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unsignedCommits } from '../scripts/check-dco.mjs';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const script = join(root, 'scripts', 'check-dco.mjs');

test('unsignedCommits: author sign-off required, other signers and bots handled', () => {
  const c = (authorName, authorEmail, body) => ({ sha: 'abc1234', authorName, authorEmail, body });
  const commits = [
    c('Ann', 'ann@example.com', 'Fix\n\nSigned-off-by: Ann <ann@example.com>\n'),
    c('Ann', 'ANN@example.com', 'Case\n\nSigned-off-by: Ann <ann@example.com>'),
    c('Bob', 'bob@example.com', 'No sign-off'),
    c('Bob', 'bob@example.com', 'Wrong signer\n\nSigned-off-by: Ann <ann@example.com>'),
    c('dependabot[bot]', '49699333+dependabot[bot]@users.noreply.github.com', 'Bump x'),
  ];
  assert.deepEqual(unsignedCommits(commits).map((x) => x.body.split('\n')[0]), ['No sign-off', 'Wrong signer']);
});

// A throwaway repository; commit signing is off there so the test needs no key.
async function repo() {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-dco-'));
  const git = (args, env = {}) => execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'Ann', GIT_AUTHOR_EMAIL: 'ann@example.com', GIT_COMMITTER_NAME: 'Ann', GIT_COMMITTER_EMAIL: 'ann@example.com', ...env } });
  git(['init', '-q', '-b', 'main']);
  await writeFile(join(dir, 'a.txt'), 'a');
  git(['add', '.']); git(['commit', '-q', '-m', 'base']);
  git(['checkout', '-q', '-b', 'feature']);
  return { dir, git };
}

test('a branch of signed-off commits and a merge passes', async () => {
  const { dir, git } = await repo();
  try {
    await writeFile(join(dir, 'b.txt'), 'b'); git(['add', '.']); git(['commit', '-q', '-s', '-m', 'signed']);
    git(['checkout', '-q', 'main']); await writeFile(join(dir, 'c.txt'), 'c'); git(['add', '.']); git(['commit', '-q', '-m', 'on main']);
    git(['checkout', '-q', 'feature']); git(['merge', '-q', '--no-edit', 'main']);
    const r = spawnSync(process.execPath, [script, 'main', 'feature'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /DCO ok: 1 commit\(s\) signed off/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('an unsigned commit fails and names it', async () => {
  const { dir, git } = await repo();
  try {
    await writeFile(join(dir, 'b.txt'), 'b'); git(['add', '.']); git(['commit', '-q', '-m', 'forgot to sign']);
    const r = spawnSync(process.execPath, [script, 'main', 'feature'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no "Signed-off-by: Ann <ann@example\.com>" \(forgot to sign\)/);
    assert.match(r.stderr, /git rebase --signoff/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('an unknown base fails instead of passing', async () => {
  const { dir } = await repo();
  try {
    const r = spawnSync(process.execPath, [script, 'origin/no-such-branch', 'feature'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /cannot list commits origin\/no-such-branch\.\.feature/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
