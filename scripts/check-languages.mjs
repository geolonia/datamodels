// Keep the Japanese and English pages of the site in step. The words are
// written separately in each language (not translated sentence by sentence),
// so this compares what both must share:
//
//   - headings: the same levels in the same order, with the same {#id}s
//   - code blocks: the same code, apart from comments and strings with
//     Japanese in them (a block marked <!-- languages: own code --> is skipped)
//   - links: the same targets, apart from the language part of a URL and
//     the #fragment (headings without an {#id} get anchors in their own words)
//   - boxes (::: tip, ::: warning, ::: code-group): the same kinds, in order
//
//   node scripts/check-languages.mjs                 every page pair
//   node scripts/check-languages.mjs --base <ref>    also: a page changed in one language only
//
// A pull request that changes one language on purpose (a rewrite of the
// Japanese, say) says so in its description with a line starting
// "One language only:" and the reason; the workflow passes the description in
// PR_BODY. The meaning of the words is not checked: that stays with review.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './lib/models.mjs';
import { GENERATED_GUIDES } from './lib/site.mjs';
import { reportFailures } from './lib/ci-summary.mjs';

// Generated pages are checked through their generator, not here.
const GENERATED = new Set(GENERATED_GUIDES.map((g) => `guide/${g}.md`));
const OWN_CODE = '<!-- languages: own code -->';
// The reason is on the same line: an empty one does not count.
const ONE_LANGUAGE = /^One language only:[ \t]*\S/m;

/**
 * Split a page into prose and fenced code blocks, as CommonMark does: a fence
 * of three or more backticks or tildes, closed by a run of the same marker at
 * least as long, with nothing but spaces after it (a block left open runs to
 * the end). A block right after <!-- languages: own code --> is marked own.
 */
function splitCode(body) {
  const code = [];
  const prose = [];
  let open = null;
  for (const line of body.split('\n')) {
    if (open) {
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (close && close[1][0] === open.marker[0] && close[1].length >= open.marker.length) { code.push(open.block); open = null; }
      else open.block.src += `${line}\n`;
      continue;
    }
    const start = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    // A backtick fence's info string has no backtick.
    if (start && !(start[1][0] === '`' && start[2].includes('`'))) {
      const own = prose.slice(-2).some((l) => l.includes(OWN_CODE));
      open = { marker: start[1], block: { lang: start[2].trim().split(/[\s[{]/)[0], src: '', own } };
      continue;
    }
    prose.push(line);
  }
  if (open) code.push(open.block);
  return { prose: prose.join('\n'), code };
}

/** The parts of a page that both languages share. */
export function shape(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const { prose, code } = splitCode(body);
  return {
    headings: [...prose.matchAll(/^(#{1,6})[ \t].*?(?:\{#([^}]+)\})?[ \t]*$/gm)].map((m) => m[1].length + (m[2] ? `#${m[2]}` : '')),
    links: [...new Set([...prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => linkTarget(m[1])))].sort(),
    boxes: [...prose.matchAll(/^:{3,}[ \t]*([\w-]+)/gm)].map((m) => m[1]),
    code,
  };
}

/** A link without its language: /en/guide/x and /guide/x, docs.example.com/ja/ and /en/ are the same target. */
export function linkTarget(href) {
  const noFragment = href.replace(/#.*$/, '');
  if (noFragment.startsWith('/')) return noFragment.replace(/^\/en(?=\/|$)/, '') || '/';
  return noFragment.replace(/\/lang\/(ja|en)(?=\/|$)/, '').replace(/\/(ja|en|ja-jp|en-us)(?=\/|$)/i, '');
}

const JAPANESE = /[^\x00-\x7f]/;
const STRING = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g;

/**
 * A code block's lines without comments, and the string literals left in
 * them. Strings are taken out first, so a # or // inside one is not a comment.
 */
function codeParts(src) {
  const skeleton = [];
  const strings = [];
  for (const line of src.split('\n')) {
    const found = [];
    // Each string becomes a numbered placeholder, then comments are cut from what is left.
    const tokens = line.replace(STRING, (s) => `"\u0000${found.push(s) - 1}\u0000"`);
    if (/^\s*(#|\/\/)(?!!)/.test(tokens)) continue;
    const code = tokens.replace(/\s+(#|\/\/)\s.*$/, '').trimEnd();
    if (!code) continue;
    for (const [, i] of code.matchAll(/"\u0000(\d+)\u0000"/g)) strings.push(found[Number(i)]);
    skeleton.push(code.replace(/"\u0000\d+\u0000"/g, '""'));
  }
  return { skeleton, strings };
}

/** How the code of two blocks differs, or null. */
export function codeDifference(ja, en) {
  const a = codeParts(ja), b = codeParts(en);
  const line = a.skeleton.findIndex((l, i) => l !== b.skeleton[i]);
  if (line >= 0 || a.skeleton.length !== b.skeleton.length) {
    const i = line >= 0 ? line : Math.min(a.skeleton.length, b.skeleton.length);
    return `ja "${a.skeleton[i] ?? '(end)'}", en "${b.skeleton[i] ?? '(end)'}"`;
  }
  // A string may be in each page's language; any other string is the same in both.
  const s = a.strings.findIndex((x, i) => x !== b.strings[i] && !JAPANESE.test(x) && !JAPANESE.test(b.strings[i]));
  return s >= 0 ? `ja ${a.strings[s]}, en ${b.strings[s]}` : null;
}

/** The problems of one page pair: "what: how" lines. */
export function comparePages(jaText, enText) {
  const ja = shape(jaText), en = shape(enText);
  const problems = [];
  if (ja.headings.join(' ') !== en.headings.join(' ')) problems.push(`headings differ: ja ${ja.headings.join(' ')}; en ${en.headings.join(' ')}`);
  const onlyJa = ja.links.filter((l) => !en.links.includes(l)), onlyEn = en.links.filter((l) => !ja.links.includes(l));
  if (onlyJa.length) problems.push(`links only in Japanese: ${onlyJa.join(', ')}`);
  if (onlyEn.length) problems.push(`links only in English: ${onlyEn.join(', ')}`);
  if (ja.boxes.join(' ') !== en.boxes.join(' ')) problems.push(`boxes differ: ja ${ja.boxes.join(' ') || '(none)'}; en ${en.boxes.join(' ') || '(none)'}`);
  if (ja.code.length !== en.code.length) problems.push(`${ja.code.length} code block(s) in Japanese, ${en.code.length} in English`);
  else ja.code.forEach((c, i) => {
    if (c.lang !== en.code[i].lang) problems.push(`code block ${i + 1}: ${c.lang || '(no language)'} in Japanese, ${en.code[i].lang || '(no language)'} in English`);
    else if (!c.own && !en.code[i].own) {
      const d = codeDifference(c.src, en.code[i].src);
      if (d) problems.push(`code block ${i + 1} differs: ${d}`);
    }
  });
  return problems;
}

/** Japanese pages (relative to site/) with their English path, from a list of files. */
export function pagePairs(files) {
  return files
    .filter((f) => f.startsWith('site/') && !f.startsWith('site/en/') && f.endsWith('.md'))
    .map((f) => f.slice('site/'.length))
    .filter((p) => !GENERATED.has(p))
    .map((p) => ({ page: p, ja: `site/${p}`, en: `site/en/${p}` }));
}

/** English pages without a Japanese one (generated pages left out). */
export function missingJapanese(files) {
  return files.filter((f) => f.startsWith('site/en/') && f.endsWith('.md')).map((f) => f.slice('site/en/'.length))
    .filter((page) => !GENERATED.has(page) && !files.includes(`site/${page}`))
    .map((page) => `${page}: no Japanese page`);
}

/** Whether a pull request description says it changes one language on purpose, with a reason on that line. */
export const oneLanguageAllowed = (body) => ONE_LANGUAGE.test(body ?? '');

/** Pages changed in one language only, from the changed files of a pull request. */
export function oneSided(changed, pairs) {
  const set = new Set(changed);
  return pairs.filter((p) => set.has(p.ja) !== set.has(p.en)).map((p) => `${p.page}: changed in ${set.has(p.ja) ? 'Japanese' : 'English'} only`);
}

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

async function main() {
  const i = process.argv.indexOf('--base');
  const base = i > 0 ? process.argv[i + 1] : undefined;
  if (i > 0 && !base) throw new Error('--base needs a git ref, for example origin/main');
  const files = git('ls-files', 'site').split('\n').filter(Boolean);
  const pairs = pagePairs(files);
  const problems = [];
  for (const p of pairs) {
    if (!files.includes(p.en)) { problems.push(`${p.page}: no English page (${p.en})`); continue; }
    const found = comparePages(await readFile(join(ROOT, p.ja), 'utf8'), await readFile(join(ROOT, p.en), 'utf8'));
    problems.push(...found.map((f) => `${p.page}: ${f}`));
  }
  problems.push(...missingJapanese(files));
  let notes = [];
  if (base) {
    let changed;
    try { changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean); } catch (e) {
      throw new Error(`cannot compare with ${base}: ${String(e.stderr || e.message).trim()}. Fetch the base branch first, for example: git fetch origin main`);
    }
    notes = oneSided(changed, pairs);
    if (notes.length && oneLanguageAllowed(process.env.PR_BODY)) {
      console.log(`one language only, as the pull request says:\n${notes.map((n) => `  ${n}`).join('\n')}`);
      notes = [];
    }
  }
  const all = [...problems, ...notes];
  if (!all.length) { console.log(`languages ok: ${pairs.length} page pair(s)${base ? `, changed together against ${base}` : ''}`); return; }
  for (const p of all) console.error(`  ${p}`);
  console.error(`Language check failed: ${all.length} problem(s).`);
  await reportFailures('Japanese and English pages differ', all, 'Change both languages in the same pull request. When a change is meant for one language only, add a line "One language only: <reason>" to the pull request description. CONTRIBUTING, "Pull request steps".');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
