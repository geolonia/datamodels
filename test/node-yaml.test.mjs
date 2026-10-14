// node.yaml: datamodels.jp's settings in the toolkit's node format, read by the
// toolkit's commands and by the site's build (#226).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { readNode } from '@geolonia/datamodels/build';
import { ROOT, NODE, BASE_URL } from '../scripts/lib/models.mjs';
import { CATALOG_LICENSE, CATALOG_PUBLISHER, CATALOG_TEXTS } from '../scripts/lib/publish.mjs';

test('node.yaml holds the settings the site publishes', async () => {
  const node = await readNode(ROOT);
  assert.deepEqual(node, NODE);
  assert.equal(BASE_URL, 'https://datamodels.jp');
  assert.equal(node.iris, 'slash');
  assert.deepEqual(node.languages, ['ja', 'en']);
  assert.deepEqual(CATALOG_PUBLISHER, { name: { ja: '株式会社Geolonia', en: 'Geolonia Inc.' }, url: 'https://geolonia.com/' });
  assert.deepEqual(CATALOG_LICENSE, { license: 'CC0-1.0', licenseUrl: 'https://datamodels.jp/LICENSE-CONTENT' });
  // The site's name and the home page's tagline, in both languages.
  assert.deepEqual(CATALOG_TEXTS.title, { ja: 'datamodels.jp', en: 'datamodels.jp' });
  // Corrections in place stay possible until the launch (#30).
  assert.equal(node.prerelease, true);
});

test('the description in node.yaml is the tagline of the home page, so the two copies cannot drift', async () => {
  for (const [lang, page] of [['ja', 'site/index.md'], ['en', 'site/en/index.md']]) {
    const front = YAML.parse((await readFile(join(ROOT, page), 'utf8')).split(/^---$/m)[1]);
    const tagline = front.hero.tagline.replace(/<span class="nowrap">(.*?)<\/span>/g, '$1');
    assert.doesNotMatch(tagline, /</, `${page}: no other markup`);
    assert.equal(CATALOG_TEXTS.description[lang], tagline, page);
  }
});
