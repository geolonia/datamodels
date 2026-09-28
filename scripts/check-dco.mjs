// Developer Certificate of Origin: every commit of a pull request carries a
// Signed-off-by line for its author (git commit -s). https://developercertificate.org/
//
//   node scripts/check-dco.mjs <base> <head>     for example origin/main HEAD
//
// Merge commits are skipped (they add no content of their own), and so are
// commits by Dependabot, which cannot sign off.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reportFailures } from './lib/ci-summary.mjs';

const BOTS = /^(dependabot\[bot\]|49699333\+dependabot\[bot\]@users\.noreply\.github\.com)$/i;

/** Commits in base..head that lack a sign-off by their author. */
export function unsignedCommits(commits) {
  return commits.filter((c) => {
    if (BOTS.test(c.authorName) || BOTS.test(c.authorEmail)) return false;
    const signers = [...c.body.matchAll(/^Signed-off-by: .+ <([^>]+)>\s*$/gim)].map((m) => m[1].trim().toLowerCase());
    return !signers.includes(c.authorEmail.trim().toLowerCase());
  });
}

function commitsBetween(base, head, cwd) {
  // Fields separated by NUL, commits by the record separator; bodies may hold anything else.
  const out = execFileSync('git', ['log', '--no-merges', '--format=%H%x00%an%x00%ae%x00%B%x1e', `${base}..${head}`], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out.split('\x1e').map((r) => r.replace(/^\n/, '')).filter(Boolean).map((r) => {
    const [sha, authorName, authorEmail, body] = r.split('\x00');
    return { sha, authorName, authorEmail, body: body ?? '' };
  });
}

async function main() {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) throw new Error('usage: node scripts/check-dco.mjs <base> <head>');
  let commits;
  try {
    commits = commitsBetween(base, head, process.cwd());
  } catch (e) {
    throw new Error(`cannot list commits ${base}..${head}: ${String(e.stderr || e.message).trim()}. Fetch the full history first (actions/checkout with fetch-depth: 0).`);
  }
  const missing = unsignedCommits(commits);
  if (!missing.length) {
    console.log(`DCO ok: ${commits.length} commit(s) signed off`);
    return;
  }
  const lines = missing.map((c) => `${c.sha.slice(0, 7)}: no "Signed-off-by: ${c.authorName} <${c.authorEmail}>" (${c.body.split('\n')[0]})`);
  console.error(`DCO check failed: ${missing.length} commit(s) not signed off by their author:`);
  for (const l of lines) console.error(`  ${l}`);
  console.error('Sign off with `git commit -s`. For commits already pushed: `git rebase --signoff <base>`, then push with --force-with-lease.');
  await reportFailures('Commits without sign-off (DCO)', lines, 'Every commit needs `Signed-off-by:` with its author\'s name and email: commit with `git commit -s`. To fix pushed commits, run `git rebase --signoff origin/main` and push with `--force-with-lease`. See CONTRIBUTING.md.');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
