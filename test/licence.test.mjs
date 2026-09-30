// The licence page (/LICENSE-CONTENT in both languages, from LICENSE-CONTENT.md)
// and the CC0 line on model pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSubjects, ROOT } from '../scripts/lib/models.mjs';
import { generateSitePages } from '../scripts/lib/site.mjs';
import { CATALOG_LICENSE } from '../scripts/lib/publish.mjs';

const subjects = await loadSubjects();
const source = await readFile(join(ROOT, 'LICENSE-CONTENT.md'), 'utf8');
const region = (lang) => source.match(new RegExp(`<!-- #region ${lang} -->([\\s\\S]*?)<!-- #endregion ${lang} -->`))?.[1] ?? '';

test('LICENSE-CONTENT.md has a Japanese and an English region, each naming the three licences', () => {
  for (const lang of ['ja', 'en']) {
    const text = region(lang);
    for (const licence of ['CC0 1.0', 'CC BY 4.0', 'Apache-2.0']) assert.ok(text.includes(licence), `${lang}: ${licence}`);
  }
  assert.doesNotMatch(region('ja'), /\b(the|and|licence)\b/i, 'no English sentences in the Japanese region');
  // The raw file keeps the full legal texts after the two regions.
  assert.ok(source.indexOf('CC0 1.0 Universal\n\n    CREATIVE COMMONS') > source.indexOf('<!-- #endregion en -->'));
  assert.ok(source.includes('Creative Commons Attribution 4.0 International Public License'));
});

test('each language has a licence page at the URL the schemas and catalog.json name', async () => {
  assert.equal(new URL(CATALOG_LICENSE.licenseUrl).pathname, '/LICENSE-CONTENT');
  for (const s of subjects) for (const m of s.models) {
    const url = m.schema['x-license-url'];
    if (url !== undefined) assert.equal(url, CATALOG_LICENSE.licenseUrl, `${m.type}: x-license-url`);
  }
  assert.match(await readFile(join(ROOT, 'site', 'LICENSE-CONTENT.md'), 'utf8'), /<!--@include: \.\.\/LICENSE-CONTENT\.md#ja-->/);
  assert.match(await readFile(join(ROOT, 'site', 'en', 'LICENSE-CONTENT.md'), 'utf8'), /<!--@include: \.\.\/\.\.\/LICENSE-CONTENT\.md#en-->/);
});

test('a model page says the files in its URL table are CC0, before the graph and the attributes, and links the page in its language', async () => {
  await generateSitePages(subjects);
  for (const [lang, prefix] of [['ja', ''], ['en', '/en']]) {
    for (const s of subjects) for (const m of s.models) {
      const page = await readFile(join(ROOT, 'site', prefix.slice(1), 'models', s.name, m.type, 'index.md'), 'utf8');
      const cc0 = page.indexOf(`[CC0 1.0](${prefix}/LICENSE-CONTENT)`);
      assert.ok(cc0 > page.indexOf('| JSON Schema |'), `${lang} ${m.type}: CC0 line after the URL table`);
      const next = page.search(/^## /m);
      assert.ok(next === -1 || cc0 < next, `${lang} ${m.type}: CC0 line before the first section`);
      assert.ok(page.includes(`(${prefix}/LICENSE-CONTENT)</small>`), `${lang} ${m.type}: footer links the page in its language`);
    }
  }
});
