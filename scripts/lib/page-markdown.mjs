// A Markdown version of every page (#345), for AI tools and for people who
// paste a page into a chat: /guide/use has /guide/use.md, /guide/ has
// /guide/index.md. The path of the Markdown file is the path of the page's
// source under site/. Each page names it in its head (<link rel="alternate"
// type="text/markdown">, site/.vitepress/config.ts) and llms.txt links them.
//
// Written from the page sources after the VitePress build, so the text is the
// text of the page. What only works in a browser is left out (the relationship
// graph, the example playground, the extension builder) or written as text
// (badges, diagrams as their description, the model list, the home page's
// cards). Links become absolute URLs of the pages, so a copied file still works.
//
// The converter knows each component a page uses. A new one makes the build
// fail (unknownComponents), so it is never published as a raw tag.
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const SITE_URL = 'https://datamodels.jp';

const TEXT = {
  ja: { source: '出典', text: '文章は', note: '注', tip: 'ヒント', warning: '注意', diagram: '図', builder: '拡張ビルダーは、ウェブページで使えます', more: '詳しく' },
  en: { source: 'Source', text: 'Text', note: 'Note', tip: 'Tip', warning: 'Warning', diagram: 'Diagram', builder: 'The extension builder works on the web page', more: 'More' },
};

/** The URL of a page from the path of its source under site/ ('guide/index.md' -> '/guide/'). */
export function pageUrl(relativePath) {
  return `${SITE_URL}/${relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')}`;
}

/** The URL of a page's Markdown version: the path of its source. */
export function markdownUrl(relativePath) {
  return `${SITE_URL}/${relativePath}`;
}

const absolute = (href, base) => {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  return new URL(href, base).href;
};

const attr = (tag, name) => {
  const m = new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)')`).exec(tag);
  return m ? (m[1] ?? m[2]) : undefined;
};

// Remove what a pattern matches until nothing is left, so that removing one
// match cannot join the text around it into a new one (<scr<script>ipt>).
const removeAll = (s, re, fn = () => '') => {
  for (let prev; prev !== s;) { prev = s; s = s.replace(re, fn); }
  return s;
};

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// The inline HTML of one line, outside code spans, as Markdown.
function inlineHtml(text, base, inTable) {
  let s = text;
  s = s.replace(/<svg\b[\s\S]*?<\/svg>/g, '');
  s = s.replace(/<Badge\b[^>]*?\btext="([^"]*)"[^>]*\/>/g, '($1)');
  // The stage badge links to the explanation of the stages: the badge says enough.
  s = s.replace(/<a\b[^>]*class="stage-link"[^>]*>([\s\S]*?)<\/a>/g, '$1');
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (_, attrs, inner) => {
    const href = attr(attrs, 'href');
    const label = inner.trim();
    // A link to a place on the same page (an attribute's own anchor): the text is enough.
    if (!href || href.startsWith('#') || !label) return label;
    return `[${label}](${absolute(decode(href), base)})`;
  });
  s = s.replace(/<\/?(?:span|small|p|strong|em|code|kbd)\b[^>]*>/g, (tag) => {
    if (/^<\/?strong/.test(tag)) return '**';
    if (/^<\/?em/.test(tag)) return '_';
    if (/^<\/?(?:code|kbd)/.test(tag)) return '`';
    return '';
  });
  if (!inTable) s = s.replace(/\s*<br\s*\/?>\s*/g, '  \n');
  return s;
}

// Markdown links and images: absolute URLs.
const links = (s, base) => s.replace(/(\]\()(<[^>]+>|[^)\s]+)/g, (_, open, target) => {
  const t = target.startsWith('<') ? target.slice(1, -1) : target;
  return open + absolute(t, base);
});

// One line outside code blocks: code spans stay as they are (set aside while
// the HTML around them, such as <a ...>`name`</a>, is converted).
function inline(line, base) {
  const inTable = line.trimStart().startsWith('|');
  const spans = [];
  const hidden = line.replace(/`+[^`]*`+/g, (m) => `\u0000${spans.push(m) - 1}\u0000`);
  let s = links(inlineHtml(hidden, base, inTable), base).replace(/\u0000(\d+)\u0000/g, (_, i) => spans[i]);
  // HTML that started the line (<small>* ...) must not turn into a list item.
  if (/^\s*</.test(line) && /^\s*[*+-] /.test(s)) s = s.replace(/^(\s*)([*+-])/, '$1\\$2');
  return s;
}

// The model list of /models/ (ModelIndex), from the data the page gives it.
function modelList(script, base) {
  const m = /const cards = (\[[\s\S]*?\]);?\n/.exec(script ?? '');
  if (!m) throw new Error('ModelIndex: the page has no cards');
  const cards = JSON.parse(m[1]);
  // The names of the models are in the search list (models), the cards have the types.
  const all = /const models = (\[[\s\S]*?\]);?\n/.exec(script);
  const title = new Map((all ? JSON.parse(all[1]) : []).map((x) => [x.href, x.title]));
  let out = '';
  for (const c of cards) {
    out += `## [${c.title}](${absolute(c.href, base)})\n\n${c.summary}\n\n`;
    for (const model of c.models ?? []) out += `- [${model.type}](${absolute(model.href, base)})${title.get(model.href) ? `: ${title.get(model.href)}` : ''}\n`;
    out += '\n';
  }
  return out.trimEnd();
}

// The home page: its hero and cards are in the frontmatter.
function homePage(fm, base, lang) {
  const plain = (s) => removeAll(inline(String(s ?? ''), base), /<[^>]*>/g).replace(/[<>]/g, '');
  const t = TEXT[lang];
  let out = `# ${plain(fm.hero?.text) || fm.title}\n\n`;
  if (fm.hero?.tagline) out += `${plain(fm.hero.tagline)}\n\n`;
  for (const a of fm.hero?.actions ?? []) out += `- [${plain(a.text)}](${absolute(a.link, base)})\n`;
  out += '\n';
  for (const f of fm.features ?? []) {
    out += `## ${plain(f.title)}\n\n${plain(f.details)}\n\n`;
    if (f.link) out += `${t.more}: [${plain(f.linkText ?? f.link)}](${absolute(f.link, base)})\n\n`;
  }
  return out;
}

const KNOWN = new Set(['Badge', 'ExampleTabs', 'ExamplePlayground', 'GraphViewer', 'ModelIndex', 'ExtensionBuilder']);

/** Components (a capitalised tag outside code) that the converter does not know. */
export function unknownComponents(source) {
  const found = new Set();
  let fence = null;
  for (const line of source.split('\n')) {
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (f) { if (!fence) fence = f[1]; else if (line.trim().startsWith(fence)) fence = null; continue; }
    if (fence) continue;
    for (const part of line.split(/`+[^`]*`+/)) for (const [, name] of part.matchAll(/<([A-Z][A-Za-z]+)[\s/>]/g)) if (!KNOWN.has(name)) found.add(name);
  }
  return [...found];
}

/**
 * The Markdown version of one page. source: the page's source; relativePath:
 * its path under site/ ('en/guide/use.md').
 */
export function pageMarkdown(source, relativePath) {
  const lang = relativePath.startsWith('en/') ? 'en' : 'ja';
  const t = TEXT[lang];
  const base = pageUrl(relativePath);
  let fm = {};
  let body = source;
  const front = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (front) { fm = parseYaml(front[1]) ?? {}; body = source.slice(front[0].length); }
  let script;
  body = removeAll(body, /<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>\n?/gi, (_, s) => { script ??= s; return ''; });
  body = removeAll(body, /<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>\n?/gi);

  const out = [];
  let fence = null;          // the fence that opened the code block we are in
  let codeGroup = false;
  let quote = false;         // inside a ::: tip / warning container
  let skip = null;           // a closing tag: drop lines up to and including it
  let svg = null;            // a block <svg>: collect it, write its description
  let labels = {};           // ExampleTabs' tab names
  const push = (line) => out.push(quote && line !== undefined ? (line ? `> ${line}` : '>') : line);

  for (const line of body.split('\n')) {
    if (fence) {
      push(line);
      if (line.trim().startsWith(fence) && line.trim().replace(/[`~]/g, '') === '') fence = null;
      continue;
    }
    if (skip) { if (line.includes(skip)) skip = null; continue; }
    if (svg !== null) {
      svg += `\n${line}`;
      if (line.includes('</svg>')) { const label = attr(svg, 'aria-label'); if (label) push(`_${t.diagram}: ${decode(label)}_`); svg = null; }
      continue;
    }
    const f = /^(\s*)(`{3,}|~{3,})(\S*)\s*(?:\[([^\]]+)\])?\s*$/.exec(line);
    if (f) {
      fence = f[2];
      if (f[4]) { push(`**${f[4]}**`); push(''); }
      push(`${f[1]}${f[2]}${f[3]}`);
      continue;
    }
    const trimmed = line.trim();
    // VitePress containers.
    const c = /^:::+\s*([a-z-]+)?\s*(.*)$/.exec(trimmed);
    if (c) {
      if (c[1] === 'code-group') codeGroup = true;
      else if (!c[1]) { if (codeGroup) codeGroup = false; else quote = false; }
      else { quote = true; push(`**${c[2] || t[c[1]] || t.note}**`); push(""); }
      continue;
    }
    // Components and block HTML.
    if (/^<GraphViewer\b/.test(trimmed)) { if (!trimmed.includes('</GraphViewer>')) skip = '</GraphViewer>'; continue; }
    if (/^<template #try>/.test(trimmed)) { skip = '</template>'; continue; }
    if (/^<ExampleTabs\b/.test(trimmed)) { const l = attr(trimmed, ':labels'); labels = l ? JSON.parse(decode(l)) : {}; continue; }
    const tab = /^<template #([\w-]+)>$/.exec(trimmed);
    if (tab) { push(`**${labels[tab[1]] ?? tab[1]}**`); continue; }
    if (/^<\/(?:template|ExampleTabs|details|div)>$/.test(trimmed) || /^<div\b[^>]*>$/.test(trimmed)) continue;
    if (/^<ExamplePlayground\b/.test(trimmed)) continue;
    if (/^<ModelIndex\b/.test(trimmed)) { push(modelList(script, base)); continue; }
    if (/^<ExtensionBuilder\b/.test(trimmed)) { push(`_${t.builder}: ${base}_`); continue; }
    if (/^<svg\b/.test(trimmed)) {
      if (trimmed.includes('</svg>')) { const label = attr(trimmed, 'aria-label'); if (label) push(`_${t.diagram}: ${decode(label)}_`); } else svg = trimmed;
      continue;
    }
    const det = /^<details\b[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*$/.exec(trimmed);
    if (det) {
      const parts = [...det[1].matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)].map((m) => m[1]);
      const ext = /<a\b[^>]*class="ext"[^>]*href="([^"]+)"/.exec(det[1]) ?? /<a\b[^>]*href="([^"]+)"[^>]*class="ext"/.exec(det[1]);
      const title = parts.length ? parts.join(' — ') : inline(det[1], base);
      push(`### ${inline(title, base).trim()}${ext ? ` (${absolute(decode(ext[1]), base)})` : ''}`);
      continue;
    }
    // A folded section of a guide: its title in bold, the content as it is.
    if (/^<details\b[^>]*>$/.test(trimmed)) continue;
    const sum = /^<summary>([\s\S]*)<\/summary>$/.exec(trimmed);
    if (sum) { push(`**${inline(sum[1], base).trim()}**`); continue; }
    // A paragraph written as HTML (<p class="licence">) is a paragraph of its own.
    if (/^<p\b.*<\/p>$/.test(trimmed)) { push(inline(trimmed, base)); push(''); continue; }
    // Headings: without VitePress' {#id}.
    push(inline(line.replace(/^(#{1,6} .*?)\s*\{#[\w-]+\}\s*$/, '$1'), base));
  }

  // A heading whose section only held what was left out (the graph) goes too.
  for (let i = out.length - 1; i >= 0; i--) {
    const h = /^(#{1,6}) /.exec(out[i] ?? '');
    if (!h) continue;
    let j = i + 1;
    while (j < out.length && out[j].trim() === '') j++;
    const next = /^(#{1,6}) /.exec(out[j] ?? '');
    if (j >= out.length || (next && next[1].length <= h[1].length)) out.splice(i, j - i);
  }
  let md = out.join('\n');
  if (fm.layout === 'home') md = homePage(fm, base, lang) + md;
  if (!/^# /m.test(md)) md = `# ${fm.title ?? ''}\n\n${fm.description ? `${fm.description}\n\n` : ''}${md}`;
  // Where the text comes from and its licence, under the title (as on the page).
  const licence = `${SITE_URL}${lang === 'en' ? '/en' : ''}/LICENSE-CONTENT`;
  md = md.replace(/^(# .*)$/m, `$1\n\n${t.source}: ${base} · ${t.text} [CC BY 4.0](${licence})`);
  // Trailing spaces go, except the two of a line break.
  return md.replace(/[ \t]+$/gm, (m) => (m === '  ' ? m : '')).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

async function sources(dir, rel = '') {
  const out = [];
  for (const e of await readdir(join(dir, rel), { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'public' || e.name === 'node_modules') continue;
    const path = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...await sources(dir, path));
    else if (e.name.endsWith('.md')) out.push(path);
  }
  return out;
}

const exists = (p) => access(p).then(() => true, () => false);

/**
 * Write the Markdown version of every built page into outDir, next to its
 * .html. A file already there (the raw LICENSE-CONTENT.md) is kept. Returns
 * the paths written.
 */
export async function writePageMarkdown(siteDir, outDir) {
  const written = [];
  for (const rel of (await sources(siteDir)).sort()) {
    const html = rel.replace(/\.md$/, '.html');
    if (!await exists(join(outDir, html))) continue;          // not a page of the site
    if (await exists(join(outDir, rel))) continue;            // a published file of its own
    const source = await readFile(join(siteDir, rel), 'utf8');
    const unknown = unknownComponents(source);
    if (unknown.length) throw new Error(`${rel}: no Markdown version for <${unknown.join('>, <')}> (scripts/lib/page-markdown.mjs)`);
    await writeFile(join(outDir, rel), pageMarkdown(source, rel));
    written.push(rel);
  }
  return written;
}
