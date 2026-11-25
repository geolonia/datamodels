// The Markdown version of each page (#345): what a page becomes, and that every
// page of the site can be converted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { pageMarkdown, unknownComponents, pageUrl, markdownUrl, expandIncludes } from '../scripts/lib/page-markdown.mjs';
import { ROOT } from '../scripts/lib/models.mjs';

const page = (body, fm = 'title: T') => `---\n${fm}\n---\n\n${body}\n`;

test('URLs: the page and its Markdown version, from the path of the source', () => {
  assert.equal(pageUrl('en/guide/use.md'), 'https://datamodels.jp/en/guide/use');
  assert.equal(pageUrl('guide/index.md'), 'https://datamodels.jp/guide/');
  assert.equal(markdownUrl('guide/index.md'), 'https://datamodels.jp/guide/index.md');
});

test('the source line and licence come under the title, in the language of the page', () => {
  const en = pageMarkdown(page('# Using\n\nText.'), 'en/guide/use.md');
  assert.match(en, /^# Using\n\nSource: https:\/\/datamodels\.jp\/en\/guide\/use · Text \[CC BY 4\.0\]\(https:\/\/datamodels\.jp\/en\/LICENSE-CONTENT\)\n\nText\.\n$/);
  const ja = pageMarkdown(page('# 使い方'), 'guide/use.md');
  assert.match(ja, /出典: https:\/\/datamodels\.jp\/guide\/use · 文章は \[CC BY 4\.0\]\(https:\/\/datamodels\.jp\/LICENSE-CONTENT\)/);
});

test('a page without a heading gets its title and description', () => {
  assert.match(pageMarkdown(page('Text.', 'title: Hello\ndescription: About it'), 'en/x.md'), /^# Hello\n\nSource: .*\n\nAbout it\n\nText\.\n$/);
});

test('links become absolute; links to a place on the page keep it', () => {
  const md = pageMarkdown(page('# T\n\nSee [URLs](/en/guide/urls), [this](#a), [next](./csv) and [x](https://example.com/).'), 'en/guide/use.md');
  assert.ok(md.includes('[URLs](https://datamodels.jp/en/guide/urls)'));
  assert.ok(md.includes('[this](https://datamodels.jp/en/guide/use#a)'));
  assert.ok(md.includes('[next](https://datamodels.jp/en/guide/csv)'));
  assert.ok(md.includes('[x](https://example.com/)'));
});

test('heading ids, badges and inline HTML become plain Markdown', () => {
  const md = pageMarkdown(page([
    '# Road <a class="stage-link" href="/guide/rules#stages" title="x"><Badge type="warning" text="draft" /></a>',
    '## Attributes {#attributes}',
    '| <a id="name" href="#name">`name`</a><span class="req" title="required">*</span> | A name<br><span class="iri">`https://x/name`</span> |',
    '<p class="licence">File: <a href="/mapping/a.yaml">a.yaml</a></p>',
    '<small>* is required.</small>',
  ].join('\n')), 'en/models/a/Road/index.md');
  assert.match(md, /^# Road \(draft\)$/m);
  assert.match(md, /^## Attributes$/m);
  assert.ok(md.includes('| `name`* | A name<br>`https://x/name` |'), md);
  assert.ok(md.includes('File: [a.yaml](https://datamodels.jp/mapping/a.yaml)'));
  assert.ok(md.includes('\\* is required.'), 'not a list item');
});

test('code blocks stay as they are, with the code group tab as a label', () => {
  const md = pageMarkdown(page('# T\n\n::: code-group\n\n```js [Node.js]\nconst a = `<a href="/x">x</a>`; // ${{ x }}\n```\n\n:::'), 'en/x.md');
  assert.ok(md.includes('**Node.js**\n\n```js\nconst a = `<a href="/x">x</a>`; // ${{ x }}\n```'), md);
  assert.ok(!md.includes(':::'));
});

test('tip and warning boxes become quotes', () => {
  const md = pageMarkdown(page('# T\n\n::: warning Pre-release\nMay change.\n:::\n\nAfter.'), 'en/x.md');
  assert.ok(md.includes('> **Pre-release**\n>\n> May change.\n\nAfter.'), md);
});

test('what only works in a browser is left out, the examples stay', () => {
  const md = pageMarkdown(page([
    '<script setup>', 'const playground = {}', '</script>',
    '# T',
    '## Graph {#graph}',
    '<GraphViewer :width="1" :height="1" title="T">', '<div><svg><text>x</text></svg></div>', '</GraphViewer>',
    '## Example {#example}',
    `<ExampleTabs :labels='{"simple":"key-values","ngsi":"normalized","try":"Try it"}'>`,
    '<template #simple>', '', '```json', '{"id":"a"}', '```', '', '</template>',
    '<template #try>', '', '<ExamplePlayground v-bind="playground" />', '', '</template>',
    '</ExampleTabs>',
  ].join('\n')), 'en/models/a/T/index.md');
  assert.ok(!md.includes('Graph'), 'the heading of an empty section goes too');
  assert.ok(md.includes('**key-values**\n\n```json\n{"id":"a"}\n```'), md);
  assert.ok(!/Try it|playground|<[A-Z]|<\/?template|<\/?div/.test(md), md);
});

test('a diagram becomes its description; a standard in <details> a heading with its link', () => {
  const md = pageMarkdown(page([
    '# T',
    '<svg class="flow-diagram" viewBox="0 0 1 1" role="img" aria-label="A goes to B">', '<rect/>', '</svg>',
    '<details id="mapping-eei"><summary><span class="name">EEI</span><span class="meta">2 of 3</span><a class="ext" href="https://example.com/eei" title="Open"><svg viewBox="0 0 1 1"><path d=""/></svg></a></summary>',
    '', 'Text.', '', '</details>',
  ].join('\n')), 'en/x.md');
  assert.ok(md.includes('_Diagram: A goes to B_'));
  assert.ok(md.includes('### EEI — 2 of 3 (https://example.com/eei)'), md);
  assert.ok(!md.includes('<'), md);
});

test('a component the converter does not know is reported', () => {
  assert.deepEqual(unknownComponents('<Foo bar="1" />\n`<Type>` and\n```\n<Bar/>\n::: info\n```\n<Badge text="x" />\n::: details More\n:::'), ['<Foo>', '::: details']);
});

// The hand-written pages, as git tracks them: the generated ones are rewritten by other
// test files at the same time (generateSitePages), and the build converts them.
const handWritten = () => execFileSync('git', ['ls-files', '-z', '--', 'site/*.md'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter(Boolean).map((f) => f.slice('site/'.length));

// The pages in the repository (hand-written; the generated ones are checked by the build).
test('every page converts, with no component tag, script or container left', async () => {
  for (const rel of handWritten()) {
    // Read as the build reads it: with its includes expanded.
    const source = expandIncludes(await readFile(join(ROOT, 'site', rel), 'utf8'), dirname(join(ROOT, 'site', rel)));
    assert.deepEqual(unknownComponents(source), [], rel);
    const md = pageMarkdown(source, rel);
    const outside = md.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '').replace(/`+[^`\n]*`+/g, '');
    assert.ok(!/<(?:[A-Z][A-Za-z]+|script|template|div|svg|span|details|summary)\b|^:::/m.test(outside), `${rel}: ${/<(?:[A-Z][A-Za-z]+|script|template|div|svg|span|details|summary)\b|^:::.*/m.exec(outside)?.[0]}`);
    assert.match(md, /^# \S/, rel);
  }
});

test('a script or style split by another one is removed too, in any case', () => {
  const md = pageMarkdown(page('# T\n\n<scr<script>x</script>ipt>alert(1)</script>\n<STYLE>a{}</STYLE\t bar>\n<script>b</script\n x>\nText.'), 'en/x.md');
  assert.ok(!/<script|<style|alert/i.test(md), md);
  assert.ok(md.includes('Text.'));
});

test('lines of a code block are kept, also comments that look like headings', () => {
  const md = pageMarkdown(page('# T\n\n```bash\n# install\n# run\nnpm i\n\n\n# end\n```'), 'en/x.md');
  assert.ok(md.includes('```bash\n# install\n# run\nnpm i\n\n\n# end\n```'), md);
});

test('a page without a heading gets its title above its code, not inside it', () => {
  const md = pageMarkdown(page('```bash\n# install\nnpm i\n```', 'title: Setup'), 'en/x.md');
  assert.match(md, /^# Setup\n\nSource: [^\n]+\n\n```bash\n# install\nnpm i\n```\n$/);
});

test('comments for the authors and empty anchors are left out; comments in code stay', () => {
  const md = pageMarkdown(page('# T\n\n<!-- languages: own code -->\n<!--\nlong\n-->\n<div id="extensions" class="old-anchor"></div>\nText.\n\n```html\n<!-- kept -->\n```'), 'en/x.md');
  assert.ok(!/languages|long|old-anchor/.test(md), md);
  assert.ok(md.includes('<!-- kept -->'));
});

test('the home page title is one line, also where the hero breaks it', () => {
  const en = pageMarkdown(page('', 'layout: home\ntitle: x\nhero:\n  text: <span>Data</span> models<br>at <b>stable</b> URLs'), 'en/index.md');
  assert.match(en, /^# Data models at stable URLs\n\nSource: /);
  // Japanese has no spaces between words.
  const ja = pageMarkdown(page('', 'layout: home\ntitle: x\nhero:\n  text: 日本で使える<br>データモデル'), 'index.md');
  assert.match(ja, /^# 日本で使えるデータモデル\n\n出典: /);
});

test('an included region is expanded (the licence page)', () => {
  const md = pageMarkdown(expandIncludes(readFileSync(join(ROOT, 'site', 'en', 'LICENSE-CONTENT.md'), 'utf8'), join(ROOT, 'site', 'en')), 'en/LICENSE-CONTENT.md');
  assert.ok(md.includes('CC BY 4.0') && md.length > 2000, md.slice(0, 500));
  assert.ok(!md.includes('<!--'), 'no include or region markers');
});

const fenced = (text) => {
  const lines = [];
  let fence = null;
  for (const line of text.split('\n')) {
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) { if (f && line.trim().replace(/[`~]/g, '') === '') fence = null; else lines.push(line); }
    else if (f) fence = f[1];
  }
  return lines;
};

test('every line of every code block of a page is in its Markdown version', () => {
  for (const rel of handWritten()) {
    const source = expandIncludes(readFileSync(join(ROOT, 'site', rel), 'utf8'), dirname(join(ROOT, 'site', rel)));
    const md = fenced(pageMarkdown(source, rel));
    // A tip box quotes its lines with "> ".
    const missing = fenced(source).filter((l) => !md.includes(l) && !md.includes(`> ${l}`));
    assert.deepEqual(missing, [], rel);
  }
});

test('a script or style in a code block stays, and is not taken for the page data', () => {
  const md = pageMarkdown(page('<script setup>\nconst cards = []\n</script>\n\n# T\n\n```html\n<script type="application/ld+json">{"a":1}</script>\n<style>p{}</style>\n```'), 'en/x.md');
  assert.ok(md.includes('```html\n<script type="application/ld+json">{"a":1}</script>\n<style>p{}</style>\n```'), md);
  assert.ok(!md.includes('const cards'));
});

test('a fence with highlights or a title is a code block; the language stays', () => {
  const md = pageMarkdown(page('# T\n\n```js {1,3}\nconst a = `<a href="/x">x</a>`;\n```\n\nAfter [x](/y).\n\n```json title="x" [Tab]\n{}\n```'), 'en/x.md');
  assert.ok(md.includes('```js\nconst a = `<a href="/x">x</a>`;\n```'), md);
  assert.ok(md.includes('After [x](https://datamodels.jp/y).'), md);
  assert.ok(md.includes('**Tab**\n\n```json\n{}\n```'), md);
});

test('a tilde fence may have backticks in its info string; a closing fence uses the same character', () => {
  const md = pageMarkdown(page('# T\n\n~~~html title=`example`\n<script>alert(1)</script>\n~~~\n\n~~~html\n~~~```\n<script>keep()</script>\n~~~~\n\nAfter.'), 'en/x.md');
  assert.ok(md.includes('~~~html\n<script>alert(1)</script>\n~~~'), md);
  assert.ok(md.includes('~~~html\n~~~```\n<script>keep()</script>\n~~~~\n\nAfter.'), md);
});
