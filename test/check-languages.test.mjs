// The Japanese and English pages share headings, code, links and boxes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparePages, linkTarget, oneSided, pagePairs } from '../scripts/check-languages.mjs';

const ja = `---
title: 使い方
---

# 使い方

モデルで JSON を検証します（[URL とバージョン](/guide/urls#versions)、[API キー](https://docs.example.com/ja/api#キー)）。

## 手順 {#steps}

\`\`\`bash
# 作成する
curl -X POST "$BROKER/entities" -d '{"name": "通行止め"}'   # ブローカーへ
\`\`\`

::: tip 注意
短い説明です。
:::
`;

const en = `---
title: Using the models
---

# Using the models

Validate JSON with a model ([URLs and versions](/en/guide/urls#versions), [API keys](https://docs.example.com/en/api#keys)).

## Steps {#steps}

\`\`\`bash
# Create
curl -X POST "$BROKER/entities" -d '{"name": "Road closed"}'   # to the broker
\`\`\`

::: tip Note
A short note.
:::
`;

test('pages that say the same in their own words pass', () => {
  assert.deepEqual(comparePages(ja, en), []);
});

test('a changed command is found, even when the comments differ', () => {
  const p = comparePages(ja, en.replace('-X POST', '-X PATCH'));
  assert.equal(p.length, 1);
  assert.match(p[0], /code block 1 differs: ja "curl -X POST/);
});

test('a string without Japanese must be the same in both', () => {
  assert.match(comparePages(ja, en.replace('"$BROKER/entities"', '"$BROKER/types"')).join('\n'), /code block 1 differs/);
});

test('a missing section, another {#id} or another number of code blocks is found', () => {
  assert.match(comparePages(ja, en.replace('## Steps {#steps}', '## Steps {#how}')).join('\n'), /headings differ: ja 1 2#steps; en 1 2#how/);
  assert.match(comparePages(ja + '\n## 補足\n', en).join('\n'), /headings differ/);
  assert.match(comparePages(ja + '\n```json\n{}\n```\n', en).join('\n'), /2 code block\(s\) in Japanese, 1 in English/);
});

test('a link in one language only is found; the language part and the fragment are not compared', () => {
  assert.deepEqual(comparePages(ja, en.replace('(/en/guide/urls#versions)', '(/en/guide/urls)')), []);
  assert.match(comparePages(ja, en.replace('/en/guide/urls#versions', '/en/guide/use')).join('\n'), /links only in Japanese: \/guide\/urls\n.*links only in English: \/guide\/use/);
  assert.equal(linkTarget('https://semver.org/lang/ja/'), linkTarget('https://semver.org/'));
  assert.equal(linkTarget('https://docs.github.com/ja/pages/x'), linkTarget('https://docs.github.com/en/pages/x'));
  assert.equal(linkTarget('/en/'), '/');
});

test('boxes must be of the same kinds, in the same order', () => {
  assert.match(comparePages(ja, en.replace('::: tip Note', '::: warning Note')).join('\n'), /boxes differ: ja tip; en warning/);
});

test('a code block marked as own code in either language is not compared', () => {
  const other = en.replace('-X POST', '-X PATCH');
  assert.deepEqual(comparePages(ja.replace('```bash', '<!-- languages: own code -->\n```bash'), other), []);
  // The language of the block is still compared.
  assert.match(comparePages(ja.replace('```bash', '<!-- languages: own code -->\n```sh'), other).join('\n'), /code block 1: sh in Japanese, bash in English/);
});

test('page pairs leave out generated and English pages; one-sided changes are listed', () => {
  const pairs = pagePairs(['site/index.md', 'site/en/index.md', 'site/guide/use.md', 'site/en/guide/use.md', 'site/guide/standards.md', 'site/public/x.svg', 'README.md']);
  assert.deepEqual(pairs.map((p) => p.page), ['index.md', 'guide/use.md']);
  assert.deepEqual(oneSided(['site/guide/use.md', 'site/index.md', 'site/en/index.md', 'scripts/x.mjs'], pairs), ['guide/use.md: changed in Japanese only']);
  assert.deepEqual(oneSided(['site/en/guide/use.md'], pairs), ['guide/use.md: changed in English only']);
});
