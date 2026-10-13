// node.yaml: datamodels.jp's settings in the toolkit's node format, read by the
// toolkit's commands and by the site's build (#226).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readNode } from '@geolonia/datamodels/build';
import { ROOT, NODE, BASE_URL } from '../scripts/lib/models.mjs';
import { CATALOG_LICENSE, CATALOG_PUBLISHER } from '../scripts/lib/publish.mjs';

test('node.yaml holds the settings the site publishes', async () => {
  const node = await readNode(ROOT);
  assert.deepEqual(node, NODE);
  assert.equal(BASE_URL, 'https://datamodels.jp');
  assert.equal(node.iris, 'slash');
  assert.deepEqual(node.languages, ['ja', 'en']);
  assert.deepEqual(CATALOG_PUBLISHER, { name: { ja: '株式会社Geolonia', en: 'Geolonia Inc.' }, url: 'https://geolonia.com/' });
  assert.deepEqual(CATALOG_LICENSE, { license: 'CC0-1.0', licenseUrl: 'https://datamodels.jp/LICENSE-CONTENT' });
  // Corrections in place stay possible until the launch (#30).
  assert.equal(node.prerelease, true);
});
