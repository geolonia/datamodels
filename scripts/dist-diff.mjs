// Compare the built site (dist/) of a base git ref with the working tree's, so
// a pull request that should not change the site can show that it does not
// (#226), and one that should shows exactly what it changes.
//
//   node scripts/dist-diff.mjs [--base <git ref>]          (default origin/main)
//   node scripts/dist-diff.mjs --base-dist <dir> --head-dist <dir>   (no builds)
//
// The base is built in a temporary git worktree of that ref, with its own
// `npm ci`; the working tree is built in place (`npm run build`). Either side
// can be given as an already built folder instead (--base-dist, --head-dist).
// Exit 0: identical; 1: something differs; 2: a build or git step failed.
//
// Only content that differs between two builds of the same commit is ignored,
// and it is listed here:
//   - catalog.json "generatedAt": the build time (catalogHead in
//     scripts/lib/publish.mjs).
//   - VitePress content hashes under assets/ (about.md.CAEmknld.js): a change
//     to one page renames its chunk, and the new name reaches every page
//     through the hash map inlined in each HTML file and through the chunks
//     that import it. Files are compared under their name without the hash
//     (about.md.[hash].js), and the hashes in file contents are replaced by
//     [hash]; the content of every chunk is still compared.
import { readdir, readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Volatile values, by file: the pattern's match is replaced before comparing. */
export const VOLATILE = [
  { file: 'catalog.json', value: 'generatedAt', why: 'the build time', pattern: /("generatedAt":\s*")[^"]*(")/g, replace: '$1[build time]$2' },
];

// name.HASH.ext or name.HASH.lean.ext, HASH being Vite's 8-character content hash.
const HASHED = /^(.+)\.([A-Za-z0-9_-]{8})((?:\.lean)?\.[A-Za-z0-9]+)$/;
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|wasm|zip|gz)$/i;

async function walk(dir, base = dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full, base)));
    else files.push(relative(base, full).split(sep).join('/'));
  }
  return files;
}

/** Map normalized path -> real path for one tree, and collect the hashes it uses. */
function indexTree(files, tokens) {
  const byNorm = new Map();
  const groups = new Map();
  for (const f of files) {
    const m = f.startsWith('assets/') ? HASHED.exec(f.slice(f.lastIndexOf('/') + 1)) : null;
    const norm = m ? `${f.slice(0, f.lastIndexOf('/') + 1)}${m[1]}.[hash]${m[3]}` : f;
    if (!groups.has(norm)) groups.set(norm, []);
    groups.get(norm).push({ f, token: m?.[2] });
  }
  for (const [norm, list] of groups) {
    // Two files that differ only in their hash keep their real names.
    if (list.length > 1) for (const { f } of list) byNorm.set(f, f);
    else {
      byNorm.set(norm, list[0].f);
      const { f, token } = list[0];
      if (token) tokens.add(JSON.stringify([HASHED.exec(f.slice(f.lastIndexOf('/') + 1))[1], token]));
    }
  }
  return byNorm;
}

function isBinary(path, buf) {
  return BINARY.test(path) || buf.includes(0);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces a hash only where it names its own file: in a reference to the file
 * (about.md.CAEmknld.js) and as the value of the file's key in VitePress's hash
 * map ("about.md":"CAEmknld", also escaped inside JSON.parse). The same letters
 * anywhere else in a file stay, so a real change is never hidden (#261).
 */
function normalizer(tokens) {
  const alts = [...tokens].map((j) => JSON.parse(j)).flatMap(([name, hash]) => {
    const n = escape(name), h = escape(hash);
    return [`(${n}\\.)${h}(?![A-Za-z0-9_-])`, `("${n}":")${h}(?=")`, `(\\\\"${n}\\\\":\\\\")${h}(?=\\\\")`];
  });
  const re = alts.length ? new RegExp(alts.join('|'), 'g') : null;
  return (path, text) => {
    let t = re ? text.replace(re, (...m) => `${m.slice(1, 1 + alts.length).find((g) => g !== undefined)}[hash]`) : text;
    for (const v of VOLATILE) if (v.file === path) t = t.replace(v.pattern, v.replace);
    return t;
  };
}

/**
 * Compare two built trees.
 * @returns {Promise<{ total: number, added: string[], removed: string[], changed: { path: string, binary?: boolean, sizes?: number[], diff?: string[] }[] }>}
 */
export async function compareDirs(baseDir, headDir) {
  const tokens = new Set();
  const base = indexTree(await walk(baseDir), tokens);
  const head = indexTree(await walk(headDir), tokens);
  const normalize = normalizer(tokens);
  const added = [...head.keys()].filter((k) => !base.has(k)).sort();
  const removed = [...base.keys()].filter((k) => !head.has(k)).sort();
  const changed = [];
  for (const path of [...base.keys()].filter((k) => head.has(k)).sort()) {
    const a = await readFile(join(baseDir, base.get(path)));
    const b = await readFile(join(headDir, head.get(path)));
    if (isBinary(path, a) || isBinary(path, b)) {
      if (!a.equals(b)) changed.push({ path, binary: true, sizes: [a.length, b.length] });
      continue;
    }
    const ta = normalize(path, a.toString('utf8'));
    const tb = normalize(path, b.toString('utf8'));
    if (ta !== tb) changed.push({ path, diff: lineDiff(ta, tb) });
  }
  return { total: new Set([...base.keys(), ...head.keys()]).size, added, removed, changed };
}

/** Clip a long line to the part around `at`. */
function clip(line, at = 0, width = 160) {
  if (line.length <= width) return line;
  const start = Math.max(0, Math.min(at - 40, line.length - width));
  return `${start > 0 ? '…' : ''}${line.slice(start, start + width)}${start + width < line.length ? '…' : ''}`;
}

/** A short line diff: changed lines only, long lines clipped around the change, at most `max` lines. */
export function lineDiff(a, b, max = 30) {
  const x = a.split('\n');
  const y = b.split('\n');
  let p = 0;
  while (p < x.length && p < y.length && x[p] === y[p]) p++;
  let s = 0;
  while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
  const xs = x.slice(p, x.length - s);
  const ys = y.slice(p, y.length - s);
  // Longest common subsequence of the differing middle, when it is small enough.
  const ops = [];
  if (xs.length * ys.length <= 4e6) {
    const L = Array.from({ length: xs.length + 1 }, () => new Uint32Array(ys.length + 1));
    for (let i = xs.length - 1; i >= 0; i--) for (let j = ys.length - 1; j >= 0; j--) {
      L[i][j] = xs[i] === ys[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
    let i = 0, j = 0;
    while (i < xs.length || j < ys.length) {
      if (i < xs.length && j < ys.length && xs[i] === ys[j]) { ops.push([' ']); i++; j++; }
      else if (i < xs.length && (j === ys.length || L[i + 1][j] >= L[i][j + 1])) ops.push(['-', xs[i++]]);
      else ops.push(['+', ys[j++]]);
    }
  } else {
    for (const l of xs) ops.push(['-', l]);
    for (const l of ys) ops.push(['+', l]);
  }
  // Pair each removed line with the added line in the same run, to clip both around the change.
  const out = [];
  for (let k = 0; k < ops.length;) {
    if (ops[k][0] === ' ') { k++; continue; }
    const minus = [], plus = [];
    for (; k < ops.length && ops[k][0] !== ' '; k++) (ops[k][0] === '-' ? minus : plus).push(ops[k][1]);
    if (out.length) out.push('…');
    for (let i = 0; i < Math.max(minus.length, plus.length); i++) {
      const m = minus[i], q = plus[i];
      let at = 0;
      if (m !== undefined && q !== undefined) while (at < m.length && m[at] === q[at]) at++;
      if (m !== undefined) out.push(`-${clip(m, at)}`);
      if (q !== undefined) out.push(`+${clip(q, at)}`);
    }
  }
  return out.length > max ? [...out.slice(0, max), `… ${out.length - max} more line(s)`] : out;
}

function fence(lines) {
  const longest = Math.max(2, ...lines.join('\n').match(/`+/g)?.map((m) => m.length) ?? [0]);
  const f = '`'.repeat(longest + 1);
  return `${f}diff\n${lines.join('\n')}\n${f}`;
}

const MAX_LISTED = 200;
const MAX_DIFFS = 40;

export function textReport(r, label) {
  const n = r.added.length + r.removed.length + r.changed.length;
  const out = [`dist/ compared with ${label}: ${n ? `${r.added.length} added, ${r.removed.length} removed, ${r.changed.length} changed` : 'no differences'} (${r.total} files)`];
  for (const [name, list] of [['added', r.added], ['removed', r.removed]]) {
    if (list.length) out.push(`\n${name}:`, ...list.map((f) => `  ${f}`));
  }
  if (r.changed.length) out.push('\nchanged:');
  for (const c of r.changed) {
    out.push(`  ${c.path}${c.binary ? ` (binary, ${c.sizes[0]} -> ${c.sizes[1]} bytes)` : ''}`);
    if (c.diff) out.push(...c.diff.map((l) => `    ${l}`));
  }
  return out.join('\n');
}

export function markdownReport(r, label) {
  const n = r.added.length + r.removed.length + r.changed.length;
  const out = [`### dist/ compared with ${label}`, ''];
  out.push(n ? `**${r.added.length} added, ${r.removed.length} removed, ${r.changed.length} changed** of ${r.total} files. Informational: content changes are expected to change dist/.` : `**No differences** in ${r.total} files.`);
  out.push('', `Ignored: ${VOLATILE.map((v) => `${v.value} in \`${v.file}\` (${v.why})`).join(', ')}; VitePress content hashes in \`assets/\` file names, shown as \`[hash]\`.`, '');
  const list = (title, files) => {
    if (!files.length) return;
    out.push(`#### ${title} (${files.length})`, '', ...files.slice(0, MAX_LISTED).map((f) => `- \`${f}\``));
    if (files.length > MAX_LISTED) out.push(`- … ${files.length - MAX_LISTED} more`);
    out.push('');
  };
  list('Added', r.added);
  list('Removed', r.removed);
  if (r.changed.length) {
    out.push(`#### Changed (${r.changed.length})`, '');
    for (const c of r.changed.slice(0, MAX_DIFFS)) {
      if (c.binary) { out.push(`- \`${c.path}\` (binary, ${c.sizes[0]} → ${c.sizes[1]} bytes)`); continue; }
      out.push(`<details><summary><code>${c.path}</code></summary>`, '', fence(c.diff), '', '</details>', '');
    }
    for (const c of r.changed.slice(MAX_DIFFS)) out.push(`- \`${c.path}\``);
    out.push('');
  }
  return out.join('\n');
}

function run(cmd, args, cwd) {
  // The builds must not write their own reports into this job's summary.
  const env = { ...process.env };
  delete env.GITHUB_STEP_SUMMARY;
  const r = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) {
    const log = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-40).join('\n');
    throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd} (exit ${r.status ?? r.error?.message})\n${log}`);
  }
  return r.stdout.trim();
}

async function main() {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  const baseRef = arg('--base') ?? 'origin/main';
  let baseDist = arg('--base-dist');
  let headDist = arg('--head-dist');
  const started = Date.now();
  let tmp;
  let worktree;
  let label = baseDist ?? baseRef;
  try {
    if (!baseDist) {
      const sha = run('git', ['rev-parse', '--verify', `${baseRef}^{commit}`], ROOT);
      label = `${baseRef} (${sha.slice(0, 7)})`;
      tmp = await mkdtemp(join(tmpdir(), 'datamodels-dist-diff-'));
      worktree = join(tmp, 'base');
      console.error(`building ${label} in ${worktree}`);
      run('git', ['worktree', 'add', '--detach', worktree, sha], ROOT);
      run('npm', ['ci', '--no-audit', '--no-fund'], worktree);
      run('npm', ['run', 'build'], worktree);
      baseDist = join(worktree, 'dist');
    }
    if (!headDist) {
      console.error('building the working tree');
      run('npm', ['run', 'build'], ROOT);
      headDist = join(ROOT, 'dist');
    }
    const r = await compareDirs(baseDist, headDist);
    console.log(textReport(r, label));
    console.error(`done in ${Math.round((Date.now() - started) / 1000)} s`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdownReport(r, label)}\n`);
    return r.added.length + r.removed.length + r.changed.length ? 1 : 0;
  } finally {
    if (worktree) spawnSync('git', ['worktree', 'remove', '--force', worktree], { cwd: ROOT });
    if (tmp) await rm(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code), (err) => {
    console.error(err.message);
    process.exit(2);
  });
}
